"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.execute = execute;
exports.assignManager = assignManager;
exports.assignAU = assignAU;
Object.defineProperty(exports, "alterState", {
  enumerable: true,
  get: function get() {
    return _languageCommon.alterState;
  }
});
Object.defineProperty(exports, "dataPath", {
  enumerable: true,
  get: function get() {
    return _languageCommon.dataPath;
  }
});
Object.defineProperty(exports, "dataValue", {
  enumerable: true,
  get: function get() {
    return _languageCommon.dataValue;
  }
});
Object.defineProperty(exports, "each", {
  enumerable: true,
  get: function get() {
    return _languageCommon.each;
  }
});
Object.defineProperty(exports, "field", {
  enumerable: true,
  get: function get() {
    return _languageCommon.field;
  }
});
Object.defineProperty(exports, "fields", {
  enumerable: true,
  get: function get() {
    return _languageCommon.fields;
  }
});
Object.defineProperty(exports, "lastReferenceValue", {
  enumerable: true,
  get: function get() {
    return _languageCommon.lastReferenceValue;
  }
});
Object.defineProperty(exports, "merge", {
  enumerable: true,
  get: function get() {
    return _languageCommon.merge;
  }
});
Object.defineProperty(exports, "sourceValue", {
  enumerable: true,
  get: function get() {
    return _languageCommon.sourceValue;
  }
});

var _languageCommon = require("language-common");

var _axios = _interopRequireDefault(require("axios"));

var _path = require("path");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
function execute() {
  for (var _len = arguments.length, operations = new Array(_len), _key = 0; _key < _len; _key++) {
    operations[_key] = arguments[_key];
  }

  var initialState = {
    references: [],
    data: null
  };
  return function (state) {
    return _languageCommon.execute.apply(void 0, [login].concat(operations))(_objectSpread(_objectSpread({}, initialState), state));
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
  var _state$configuration = state.configuration,
      host = _state$configuration.host,
      userName = _state$configuration.userName,
      password = _state$configuration.password,
      scope = _state$configuration.scope,
      client_secret = _state$configuration.client_secret,
      client_id = _state$configuration.client_id,
      tenant_id = _state$configuration.tenant_id,
      grant_type = _state$configuration.grant_type,
      api = _state$configuration.api;
  var data = {
    grant_type: grant_type,
    client_id: client_id,
    client_secret: client_secret,
    scope: scope,
    userName: userName,
    password: password
  };
  var body = JSON.stringify({
    user: {
      user_name: user,
      password: password
    }
  });
  var params = {
    method: 'POST',
    url: "".concat(url, "/api/v2/tokens"),
    headers: {
      'Content-Type': 'application/json'
    },
    body: body
  };
  return post("".concat(host).concat(tenant_id, "/oauth2/v2.0/token"), {
    headers: {
      'Content-Type': 'application/json'
    },
    form: data
  }, function (state) {
    console.log('Authentication successful');
    return _objectSpread(_objectSpread({}, state), {}, {
      access_token: state.data.access_token
    });
  })(state);
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


function assignManager() {
  return function (state) {
    return new Promise(function (resolve, reject) {
      // 1.2 ASSIGN USER TO MANAGER
      var supervisorEmail = employee.fields['Supervisor email'];

      if (supervisorEmail) {
        var userPrincipalName = supervisorEmail.replace('@', '_') + '%23EXT%23@w4wtest.onmicrosoft.com'; // Replace # with %23
        // We (1) make a get to fetch the supervisor id.

        return get("".concat(api, "/users/").concat(userPrincipalName), {
          headers: {
            authorization: "Bearer ".concat(state.access_token)
          },
          options: {
            successCodes: [200, 201, 202, 203, 204, 404]
          }
        }, function (state) {
          if (!state.data.error) {
            // (2) if we find it,
            var id = state.data.id;
            var data = {
              '@odata.id': "".concat(api, "/users/").concat(id)
            };
            console.log("Assigning ".concat(fields['First name Last name'], " (").concat(fields['Employee #'], ") to manager ").concat(supervisorEmail, " ..."));
            resolve(put("".concat(api, "/users/").concat(employee.id, "/manager/$ref"), {
              headers: {
                authorization: "Bearer ".concat(state.access_token),
                'Content-Type': 'application/json'
              },
              options: {
                successCodes: [200, 201, 202, 203, 204, 404]
              },
              body: data
            }, function (state) {})(state));
          } else {
            console.log("Manager ".concat(supervisorEmail, " not found..."));
            resolve(state);
          }
        })(state);
      }

      resolve(state);
    });
  };
}

function assignAU() {
  return function (state) {
    return new Promise(function (resolve, reject) {
      // 1.3 ADD USER AS MEMBER TO ADMINISTRATIVE UNIT
      var idsValue = Object.values(state.administrativeUnitsMap);
      var administrativeUnitID = state.administrativeUnitsMap[employee.fields.Division]; // Mapping AU name to correct ID

      if (administrativeUnitID) {
        // (a) First we make a request to see if the employee has membership to any administrative unit...
        return post("".concat(api, "/users/").concat(employee.id, "/checkMemberObjects"), {
          headers: {
            authorization: "Bearer ".concat(state.access_token),
            'Content-Type': 'application/json'
          },
          options: {
            successCodes: [200, 201, 202, 203, 204, 404]
          },
          body: {
            ids: idsValue
          }
        }, function (state) {
          console.log('state', state.data);
          var value = state.data.body.value; // ... (b1) if he has, we remove him from the administrative unit...

          if (value.length > 0) {
            console.log("Removing member from the administrative unit ".concat(value[0], "..."));
            return del("".concat(api, "/directory/administrativeUnits/").concat(value[0], "/members/").concat(employee.id, "/$ref"), {
              headers: {
                authorization: "Bearer ".concat(state.access_token),
                'Content-Type': 'application/json'
              },
              options: {
                successCodes: [200, 201, 202, 203, 204, 404]
              }
            }, function (state) {})(state).then(function (response) {
              // ... (c) We add him to the new administrative unit.
              console.log("Adding member to the administrative units ".concat(employee.fields.Division, "..."));
              var data = {
                '@odata.id': "".concat(api, "/directoryObjects/").concat(employee.id)
              };
              resolve(post("".concat(api, "/directory/administrativeUnits/").concat(administrativeUnitID, "/members/$ref"), {
                headers: {
                  authorization: "Bearer ".concat(state.access_token),
                  'Content-Type': 'application/json'
                },
                options: {
                  successCodes: [200, 201, 202, 203, 204, 404]
                },
                body: data
              }, function (state) {})(state));
            });
          } else {
            // ... (b2) if he has not, we add him still.
            console.log("Adding member to the administrative units ".concat(employee.fields.Division, "..."));
            var data = {
              '@odata.id': "".concat(api, "/directoryObjects/").concat(employee.id)
            };
            resolve(post("".concat(api, "/directory/administrativeUnits/").concat(administrativeUnitID, "/members/$ref"), {
              headers: {
                authorization: "Bearer ".concat(state.access_token),
                'Content-Type': 'application/json'
              },
              options: {
                successCodes: [200, 201, 202, 203, 204, 404]
              },
              body: data
            }, function (state) {})(state));
          }
        })(state);
      }

      resolve(state);
    });
  };
}

function assignGroup() {
  return function (state) {
    return new Promise(function (resolve, reject) {
      // 1.4 ADD USER AS MEMBER TO GROUP.
      var groupIdsValue = Object.values(state.groupMap);
      var groupID = state.groupMap[employee.fields['Email User Type']]; // Mapping group name to correct ID

      if (groupID) {
        // (a) First we make a request to see if the employee has membership to any group...
        return post("".concat(api, "/users/").concat(employee.id, "/checkMemberObjects"), {
          headers: {
            authorization: "Bearer ".concat(state.access_token),
            'Content-Type': 'application/json'
          },
          options: {
            successCodes: [200, 201, 202, 203, 204, 404]
          },
          body: {
            ids: groupIdsValue
          }
        }, function (state) {
          var value = state.data.body.value; // ... (b1) if he has, we remove him from the group...

          if (value.length > 0) {
            console.log("Removing member from the group ".concat(value[0], "..."));
            return del("".concat(api, "/groups/").concat(value[0], "/members/").concat(employee.id, "/$ref"), {
              headers: {
                authorization: "Bearer ".concat(state.access_token),
                'Content-Type': 'application/json'
              },
              options: {
                successCodes: [200, 201, 202, 203, 204, 404]
              }
            }, function (state) {})(state).then(function (response) {
              // ... (c) We add him to the new group.
              console.log("Adding member to the new group ".concat(employee.fields['Email User Type'], "..."));
              var data = {
                '@odata.id': "".concat(api, "/directoryObjects/").concat(employee.id)
              };
              resolve(post("".concat(api, "/groups/").concat(groupID, "/members/$ref"), {
                headers: {
                  authorization: "Bearer ".concat(state.access_token),
                  'Content-Type': 'application/json'
                },
                options: {
                  successCodes: [200, 201, 202, 203, 204, 404]
                },
                body: data
              }, function (state) {})(state));
            });
          } else {
            // ... (b2) if he has not, we add him still.
            console.log("Adding member to the group ".concat(employee.fields['Email User Type'], "..."));
            var data = {
              '@odata.id': "".concat(api, "/directoryObjects/").concat(employee.id)
            };
            resolve(post("".concat(api, "/groups/").concat(groupID, "/members/$ref"), {
              headers: {
                authorization: "Bearer ".concat(state.access_token),
                'Content-Type': 'application/json'
              },
              options: {
                successCodes: [200, 201, 202, 203, 204, 404]
              },
              body: data
            }, function (state) {})(state));
          }
        })(state);
      }

      resolve(state);
    });
  };
} // Note that we expose the entire axios package to the user here.


exports.axios = _axios["default"]; // What functions do you want from the common adaptor?
