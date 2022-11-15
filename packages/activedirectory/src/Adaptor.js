/** @module Adaptor */
import {
  execute as commonExecute,
  composeNextState,
  expandReferences,
} from 'language-common';
import axios from 'axios';
import { resolve } from 'path';

/**
 * Execute a sequence of operations.
 * Wraps `language-common/execute`, and prepends initial state for http.
 * @example
 * execute(
 *   create('foo'),
 *   delete('bar')
 * )(state)
 * @constructor
 * @param {Operations} operations - Operations to be performed.
 * @returns {Operation}
 */
export function execute(...operations) {
  const initialState = {
    references: [],
    data: null,
  };

  return state => {
    return commonExecute(
      login,
      ...operations
    )({
      ...initialState,
      ...state,
    });
  };
}

/**
 * Logs in to Azure AD.
 * @example
 *  login(state)
 * @function
 * @param {State} state - Runtime state.
 * @returns {State}
 */
function login(state) {
  const {
    host,
    userName,
    password,
    scope,
    client_secret,
    client_id,
    tenant_id,
    grant_type,
    api,
  } = state.configuration;

  const data = {
    grant_type,
    client_id,
    client_secret,
    scope,
    userName,
    password,
  };

  const body = JSON.stringify({
    user: {
      user_name: user,
      password,
    },
  });

  const params = {
    method: 'POST',
    url: `${url}/api/v2/tokens`,
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  };

  return post(
    `${host}${tenant_id}/oauth2/v2.0/token`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
      form: data,
    },
    state => {
      console.log('Authentication successful');
      return { ...state, access_token: state.data.access_token };
    }
  )(state);
}

/**
 * Assign a manager... WRITE ME!
 * @public
 * @example
 * execute(
 *   assignManager(params)
 * )(state)
 * @constructor
 * @param {object} params - data to make the fetch
 * @returns {Operation}
 */
export function assignManager() {
  return state => {
    return new Promise((resolve, reject) => {
      // 1.2 ASSIGN USER TO MANAGER
      const supervisorEmail = employee.fields['Supervisor email'];
      if (supervisorEmail) {
        const userPrincipalName =
          supervisorEmail.replace('@', '_') +
          '%23EXT%23@w4wtest.onmicrosoft.com'; // Replace # with %23
        // We (1) make a get to fetch the supervisor id.
        return get(
          `${api}/users/${userPrincipalName}`,
          {
            headers: {
              authorization: `Bearer ${state.access_token}`,
            },
            options: {
              successCodes: [200, 201, 202, 203, 204, 404],
            },
          },
          state => {
            if (!state.data.error) {
              // (2) if we find it,
              const { id } = state.data;
              const data = {
                '@odata.id': `${api}/users/${id}`,
              };
              console.log(
                `Assigning ${fields['First name Last name']} (${fields['Employee #']}) to manager ${supervisorEmail} ...`
              );
              resolve(
                put(
                  `${api}/users/${employee.id}/manager/$ref`,
                  {
                    headers: {
                      authorization: `Bearer ${state.access_token}`,
                      'Content-Type': 'application/json',
                    },
                    options: {
                      successCodes: [200, 201, 202, 203, 204, 404],
                    },
                    body: data,
                  },
                  state => {}
                )(state)
              );
            } else {
              console.log(`Manager ${supervisorEmail} not found...`);
              resolve(state);
            }
          }
        )(state);
      }
      resolve(state);
    });
  };
}

export function assignAU() {
  return state => {
    return new Promise((resolve, reject) => {
      // 1.3 ADD USER AS MEMBER TO ADMINISTRATIVE UNIT
      const idsValue = Object.values(state.administrativeUnitsMap);
      const administrativeUnitID =
        state.administrativeUnitsMap[employee.fields.Division]; // Mapping AU name to correct ID
      if (administrativeUnitID) {
        // (a) First we make a request to see if the employee has membership to any administrative unit...
        return post(
          `${api}/users/${employee.id}/checkMemberObjects`,
          {
            headers: {
              authorization: `Bearer ${state.access_token}`,
              'Content-Type': 'application/json',
            },
            options: {
              successCodes: [200, 201, 202, 203, 204, 404],
            },
            body: { ids: idsValue },
          },
          state => {
            console.log('state', state.data);
            const { value } = state.data.body;
            // ... (b1) if he has, we remove him from the administrative unit...

            if (value.length > 0) {
              console.log(
                `Removing member from the administrative unit ${value[0]}...`
              );
              return del(
                `${api}/directory/administrativeUnits/${value[0]}/members/${employee.id}/$ref`,
                {
                  headers: {
                    authorization: `Bearer ${state.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  options: {
                    successCodes: [200, 201, 202, 203, 204, 404],
                  },
                },
                state => {}
              )(state).then(response => {
                // ... (c) We add him to the new administrative unit.
                console.log(
                  `Adding member to the administrative units ${employee.fields.Division}...`
                );
                const data = {
                  '@odata.id': `${api}/directoryObjects/${employee.id}`,
                };
                resolve(
                  post(
                    `${api}/directory/administrativeUnits/${administrativeUnitID}/members/$ref`,
                    {
                      headers: {
                        authorization: `Bearer ${state.access_token}`,
                        'Content-Type': 'application/json',
                      },
                      options: {
                        successCodes: [200, 201, 202, 203, 204, 404],
                      },
                      body: data,
                    },
                    state => {}
                  )(state)
                );
              });
            } else {
              // ... (b2) if he has not, we add him still.
              console.log(
                `Adding member to the administrative units ${employee.fields.Division}...`
              );
              const data = {
                '@odata.id': `${api}/directoryObjects/${employee.id}`,
              };
              resolve(
                post(
                  `${api}/directory/administrativeUnits/${administrativeUnitID}/members/$ref`,
                  {
                    headers: {
                      authorization: `Bearer ${state.access_token}`,
                      'Content-Type': 'application/json',
                    },
                    options: {
                      successCodes: [200, 201, 202, 203, 204, 404],
                    },
                    body: data,
                  },
                  state => {}
                )(state)
              );
            }
          }
        )(state);
      }
      resolve(state);
    });
  };
}

function assignGroup() {
  return state => {
    return new Promise((resolve, reject) => {
      // 1.4 ADD USER AS MEMBER TO GROUP.
      const groupIdsValue = Object.values(state.groupMap);
      const groupID = state.groupMap[employee.fields['Email User Type']]; // Mapping group name to correct ID
      if (groupID) {
        // (a) First we make a request to see if the employee has membership to any group...
        return post(
          `${api}/users/${employee.id}/checkMemberObjects`,
          {
            headers: {
              authorization: `Bearer ${state.access_token}`,
              'Content-Type': 'application/json',
            },
            options: {
              successCodes: [200, 201, 202, 203, 204, 404],
            },
            body: { ids: groupIdsValue },
          },
          state => {
            const { value } = state.data.body;
            // ... (b1) if he has, we remove him from the group...
            if (value.length > 0) {
              console.log(`Removing member from the group ${value[0]}...`);
              return del(
                `${api}/groups/${value[0]}/members/${employee.id}/$ref`,
                {
                  headers: {
                    authorization: `Bearer ${state.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  options: {
                    successCodes: [200, 201, 202, 203, 204, 404],
                  },
                },
                state => {}
              )(state).then(response => {
                // ... (c) We add him to the new group.
                console.log(
                  `Adding member to the new group ${employee.fields['Email User Type']}...`
                );
                const data = {
                  '@odata.id': `${api}/directoryObjects/${employee.id}`,
                };
                resolve(
                  post(
                    `${api}/groups/${groupID}/members/$ref`,
                    {
                      headers: {
                        authorization: `Bearer ${state.access_token}`,
                        'Content-Type': 'application/json',
                      },
                      options: {
                        successCodes: [200, 201, 202, 203, 204, 404],
                      },
                      body: data,
                    },
                    state => {}
                  )(state)
                );
              });
            } else {
              // ... (b2) if he has not, we add him still.
              console.log(
                `Adding member to the group ${employee.fields['Email User Type']}...`
              );
              const data = {
                '@odata.id': `${api}/directoryObjects/${employee.id}`,
              };
              resolve(
                post(
                  `${api}/groups/${groupID}/members/$ref`,
                  {
                    headers: {
                      authorization: `Bearer ${state.access_token}`,
                      'Content-Type': 'application/json',
                    },
                    options: {
                      successCodes: [200, 201, 202, 203, 204, 404],
                    },
                    body: data,
                  },
                  state => {}
                )(state)
              );
            }
          }
        )(state);
      }
      resolve(state);
    });
  };
}

// Note that we expose the entire axios package to the user here.
exports.axios = axios;

// What functions do you want from the common adaptor?
export {
  alterState,
  dataPath,
  dataValue,
  each,
  field,
  fields,
  lastReferenceValue,
  merge,
  sourceValue,
} from 'language-common';
