import chai from 'chai';
const { expect } = chai;

import nock from 'nock';
import ClientFixtures, { fixtures } from './ClientFixtures';

import Adaptor from '../src';
const { execute, post } = Adaptor;

describe('execute', () => {
  it('executes each operation in sequence', done => {
    let state = {
      configuration: {
        host: '',
        userName: '',
        password: '',
        scope: '',
        client_secret: '',
        client_id: '',
        tenant_id: '',
        grant_type: '',
      },
    };
    let operations = [
      () => ({ counter: 1 }),
      () => ({ counter: 2 }),
      () => ({ counter: 3 }),
    ];

    execute(...operations)(state)
      .then(finalState => {
        console.log('finale state', finalState);
        expect(finalState).to.eql({ counter: 3 });
      })
      .then(done)
      .catch(done);
  });

  it('assigns references, data to the initialState', () => {
    let state = {};

    let finalState = execute()(state);

    execute()(state).then(finalState => {
      expect(finalState).to.eql({ references: [], data: null });
    });
  });
});

describe('post', () => {
  before(() => {
    nock('https://fake.server.com').post('/api').reply(200, { foo: 'bar' });
  });

  it('calls the callback', () => {
    let state = {
      configuration: {
        username: 'hello',
        password: 'there',
      },
    };

    return execute(
      post({
        url: 'https://fake.server.com/api',
        headers: null,
        body: { a: 1 },
      })
    )(state).then(state => {
      let responseBody = state.response.body;
      // Check that the post made it's way to the request as a string.
      expect(responseBody).to.eql({ foo: 'bar' });
    });
  });
});
