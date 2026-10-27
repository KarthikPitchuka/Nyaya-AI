import assert from 'node:assert/strict';
import jwt from 'jwt-simple';
import { after, test } from 'node:test';
import { getCyberJwtSecret, requireCyberAuth } from '../src/middleware/cyberAuth.js';
import { requireFirebaseAuth } from '../src/middleware/firebaseAuth.js';

const originalJwtSecret = process.env.JWT_SECRET;
const testSecret = 'test-secret-for-cyber-auth-tests-32-bytes';
process.env.JWT_SECRET = testSecret;

after(() => {
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
});

const createResponse = () => {
    const response = {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
    return response;
};

const createRequest = (authorization = '') => ({
    get(name) {
        return name.toLowerCase() === 'authorization' ? authorization : undefined;
    }
});

test('official routes reject requests without a bearer token', () => {
    const res = createResponse();
    let nextCalled = false;

    requireCyberAuth(createRequest(), res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test('the sample JWT secret is not accepted as configuration', () => {
    process.env.JWT_SECRET = 'REPLACE_WITH_A_RANDOM_SECRET_AT_LEAST_32_CHARACTERS_LONG';
    assert.equal(getCyberJwtSecret(), null);
    process.env.JWT_SECRET = testSecret;
});

test('official routes reject expired tokens', () => {
    const token = jwt.encode({
        id: 'official-id',
        role: 'Agent',
        exp: Math.floor(Date.now() / 1000) - 1
    }, testSecret, 'HS256');
    const res = createResponse();
    let nextCalled = false;

    requireCyberAuth(createRequest(`Bearer ${token}`), res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test('official routes attach a valid signed session to the request', () => {
    const token = jwt.encode({
        id: 'official-id',
        role: 'Agent',
        exp: Math.floor(Date.now() / 1000) + 60
    }, testSecret, 'HS256');
    const req = createRequest(`Bearer ${token}`);
    const res = createResponse();
    let nextCalled = false;

    requireCyberAuth(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(req.cyberUser.id, 'official-id');
    assert.equal(res.body, null);
});

test('personal report routes reject missing Firebase bearer tokens', async () => {
    const res = createResponse();
    let nextCalled = false;

    await requireFirebaseAuth(createRequest(), res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});
