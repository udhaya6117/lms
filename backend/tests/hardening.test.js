process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.CLIENT_ORIGIN = 'http://localhost:3000';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { stripHtml } = require('../src/utils/sanitize');
const {
  assertProductionSecrets,
  assertSafeSeedPasswords,
  seedCredentials,
} = require('../src/config/secrets');

describe('production hardening', () => {
  it('strips HTML and control characters from user text', () => {
    assert.equal(
      stripHtml('<script>alert(1)</script>Safe answer about APIs'),
      'alert(1)Safe answer about APIs'
    );
    assert.equal(stripHtml('Hello <b>world</b>'), 'Hello world');
    assert.equal(stripHtml('plain text'), 'plain text');
  });

  it('rejects cookie auth requests from a foreign origin', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: 'trainer@test.com', password: 'Trainer@123' });
    assert.equal(res.status, 403);
    assert.match(res.body.message, /origin/i);
  });

  it('allows same-origin cookie auth preflight to reach validation', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:3000')
      .send({ email: 'not-an-email', password: '' });
    assert.equal(res.status, 400);
  });

  it('blocks weak production secrets and default demo seed passwords', () => {
    const weak = {
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/lms',
      CLIENT_ORIGIN: 'https://lms.example',
      JWT_ACCESS_SECRET: 'change_this_access_secret',
      JWT_REFRESH_SECRET: 'change_this_refresh_secret',
    };
    assert.throws(() => assertProductionSecrets(weak), /JWT/);

    const strong = {
      ...weak,
      JWT_ACCESS_SECRET: 'a-production-access-secret-32chars-min',
      JWT_REFRESH_SECRET: 'a-production-refresh-secret-32chars-min',
    };
    assert.doesNotThrow(() => assertProductionSecrets(strong));

    assert.throws(
      () => assertSafeSeedPasswords({ NODE_ENV: 'production', SEED_ADMIN_PASSWORD: 'Admin@123' }),
      /demo passwords/
    );
    assert.doesNotThrow(() =>
      assertSafeSeedPasswords({
        NODE_ENV: 'production',
        SEED_ADMIN_PASSWORD: 'UniqueAdminPass!234',
        SEED_TRAINER_PASSWORD: 'UniqueTrainerPass!234',
        SEED_STUDENT_PASSWORD: 'UniqueStudentPass!234',
      })
    );

    const previousAdmin = process.env.SEED_ADMIN_PASSWORD;
    process.env.SEED_ADMIN_PASSWORD = 'UniqueAdminPass!234';
    assert.equal(seedCredentials().adminPassword, 'UniqueAdminPass!234');
    if (previousAdmin === undefined) delete process.env.SEED_ADMIN_PASSWORD;
    else process.env.SEED_ADMIN_PASSWORD = previousAdmin;
  });
});
