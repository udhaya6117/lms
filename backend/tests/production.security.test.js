process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.CLIENT_ORIGIN = 'http://localhost:3000';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const sanitizeBody = require('../src/middleware/sanitize.middleware');
const { originAllowed } = require('../src/middleware/csrf.middleware');
const { safeErrorMessage } = require('../src/middleware/error.middleware');
const { cookieOptions } = require('../src/utils/tokens');
const {
  assertProductionSecrets,
  shouldSeedOnEmpty,
} = require('../src/config/secrets');
const { login, createUsers } = require('./authHelper');

const fakeReq = (headers = {}) => ({
  get: (name) => headers[name] || headers[name.toLowerCase()] || '',
});

describe('production security guards', () => {
  it('refuses to start production with missing or matching secrets', () => {
    assert.throws(
      () =>
        assertProductionSecrets({
          NODE_ENV: 'production',
          JWT_ACCESS_SECRET: 'a-production-access-secret-32chars-min',
          JWT_REFRESH_SECRET: 'a-production-refresh-secret-32chars-min',
        }),
      /MONGODB_URI|CLIENT_ORIGIN/
    );

    assert.doesNotThrow(() =>
      assertProductionSecrets({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/lms',
        VERCEL_URL: 'lms-demo.vercel.app',
        JWT_ACCESS_SECRET: 'a-production-access-secret-32chars-min',
        JWT_REFRESH_SECRET: 'a-production-refresh-secret-32chars-min',
      })
    );

    assert.throws(
      () =>
        assertProductionSecrets({
          NODE_ENV: 'production',
          MONGODB_URI: 'mongodb://127.0.0.1:27017/lms',
          CLIENT_ORIGIN: 'https://lms.example',
          JWT_ACCESS_SECRET: 'same-production-secret-32chars-min!!',
          JWT_REFRESH_SECRET: 'same-production-secret-32chars-min!!',
        }),
      /different/
    );

    assert.throws(
      () =>
        assertProductionSecrets({
          NODE_ENV: 'production',
          MONGODB_URI: 'mongodb://127.0.0.1:27017/lms',
          CLIENT_ORIGIN: 'https://lms.example',
          JWT_ACCESS_SECRET: 'a-production-access-secret-32chars-min',
          JWT_REFRESH_SECRET: 'a-production-refresh-secret-32chars-min',
          USE_MEMORY_DB: 'true',
        }),
      /USE_MEMORY_DB/
    );
  });

  it('does not auto-seed production unless SEED_ON_EMPTY is explicitly true', () => {
    assert.equal(shouldSeedOnEmpty({ NODE_ENV: 'production' }), false);
    assert.equal(shouldSeedOnEmpty({ NODE_ENV: 'production', SEED_ON_EMPTY: 'true' }), true);
    assert.equal(shouldSeedOnEmpty({ NODE_ENV: 'development' }), true);
  });

  it('requires an allowed origin for cookie auth in production', () => {
    assert.equal(originAllowed(fakeReq({}), { NODE_ENV: 'production' }), false);
    assert.equal(
      originAllowed(fakeReq({ Origin: 'http://localhost:3000' }), { NODE_ENV: 'production' }),
      true
    );
    assert.equal(
      originAllowed(fakeReq({ Origin: 'https://evil.example' }), { NODE_ENV: 'production' }),
      false
    );
  });

  it('keeps the refresh cookie httpOnly and scoped to /api/auth', () => {
    const options = cookieOptions();
    assert.equal(options.httpOnly, true);
    assert.equal(options.path, '/api/auth');
    assert.ok(['lax', 'strict', 'none'].includes(options.sameSite));
  });

  it('strips HTML from user text but leaves passwords intact', () => {
    const req = {
      body: {
        name: 'Hi <script>x</script>Ann',
        password: 'Pass<script>word1',
        content: '<b>My</b> answer about APIs',
      },
    };
    sanitizeBody(req, {}, () => {});
    assert.equal(req.body.name, 'Hi xAnn');
    assert.equal(req.body.password, 'Pass<script>word1');
    assert.equal(req.body.content, 'My answer about APIs');
  });

  it('hides unexpected error details in production', () => {
    assert.equal(
      safeErrorMessage(500, 'boom stack trace', { NODE_ENV: 'production' }),
      'An unexpected error occurred'
    );
    assert.equal(safeErrorMessage(400, 'Validation failed', { NODE_ENV: 'production' }), 'Validation failed');
  });

  it('sends security headers on public health checks', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-frame-options'], 'DENY');
    assert.ok(res.headers['referrer-policy']);
  });
});

describe('production security API surfaces', { concurrency: 1 }, () => {
  let memory;

  before(async () => {
    memory = await MongoMemoryServer.create();
    await mongoose.connect(memory.getUri('lms_prod_security'));
    await createUsers();
  });

  after(async () => {
    await mongoose.disconnect();
    if (memory) await memory.stop();
  });

  it('never returns password or refresh hashes from login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: 'student@test.com', password: 'Student@123' });
    assert.equal(res.status, 200);
    const payload = JSON.stringify(res.body);
    assert.equal(payload.includes('Student@123'), false);
    assert.equal(Object.hasOwn(res.body.data.user, 'password'), false);
    assert.equal(Object.hasOwn(res.body.data.user, 'refreshTokenHash'), false);
    assert.match(String(res.headers['set-cookie'] || ''), /refreshToken=/);
    assert.match(String(res.headers['set-cookie'] || ''), /HttpOnly/i);
    assert.match(String(res.headers['set-cookie'] || ''), /Path=\/api\/auth/i);
  });

  it('rejects refresh from a foreign site even with a valid cookie', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: 'trainer@test.com', password: 'Trainer@123' });
    const cookies = loginRes.headers['set-cookie'];
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Origin', 'https://evil.example')
      .set('Cookie', cookies);
    assert.equal(res.status, 403);
  });
});
