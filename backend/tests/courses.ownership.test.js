process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.ACCESS_TOKEN_TTL = '15m';
process.env.REFRESH_TOKEN_TTL = '7d';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const { login, auth, createUsers } = require('./authHelper');

const body = {
  title: 'Owned Course',
  description: 'A course that belongs only to the creating trainer.',
  documentTitle: 'Section 1 notes',
  documentContent: 'Starter study document for the owned course.',
};

describe('Course ownership API', { concurrency: 1 }, () => {
  let memory;
  let trainer;
  let trainer2;
  let student;
  let mine;
  let theirs;

  before(async () => {
    memory = await MongoMemoryServer.create();
    await mongoose.connect(memory.getUri('lms_courses'));
    await createUsers();
    trainer = await login('trainer@test.com', 'Trainer@123');
    trainer2 = await login('trainer2@test.com', 'Trainer@123');
    student = await login('student@test.com', 'Student@123');
  });

  after(async () => {
    await mongoose.disconnect();
    if (memory) await memory.stop();
  });

  it('POST /api/courses creates a course owned by the trainer', async () => {
    const denied = await request(app).post('/api/courses').set(auth(student.token)).send(body);
    assert.equal(denied.status, 403);

    const created = await request(app).post('/api/courses').set(auth(trainer.token)).send(body);
    assert.equal(created.status, 201);
    assert.equal(String(created.body.data.trainer._id || created.body.data.trainer), trainer.user.id || trainer.user._id);
    mine = created.body.data;

    const other = await request(app)
      .post('/api/courses')
      .set(auth(trainer2.token))
      .send({
        title: 'Second Trainer Course',
        description: 'Owned by a different trainer account.',
        documentTitle: 'Other notes',
        documentContent: 'Starter study document for the second trainer.',
      });
    assert.equal(other.status, 201);
    theirs = other.body.data;
  });

  it('GET /api/courses returns only the trainer own courses', async () => {
    const res = await request(app).get('/api/courses').set(auth(trainer.token));
    assert.equal(res.status, 200);
    const ids = res.body.data.map((item) => String(item._id));
    assert.ok(ids.includes(String(mine._id)));
    assert.equal(ids.includes(String(theirs._id)), false);
  });

  it('GET /api/courses/:id allows the owner and blocks the other trainer', async () => {
    const own = await request(app).get(`/api/courses/${mine._id}`).set(auth(trainer.token));
    assert.equal(own.status, 200);
    assert.equal(own.body.data.title, body.title);

    const blocked = await request(app).get(`/api/courses/${theirs._id}`).set(auth(trainer.token));
    assert.equal(blocked.status, 403);
  });

  it('PUT /api/courses/:id updates owned courses only', async () => {
    const updated = await request(app)
      .put(`/api/courses/${mine._id}`)
      .set(auth(trainer.token))
      .send({ title: 'Owned Course Updated', description: body.description });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.title, 'Owned Course Updated');

    const hijack = await request(app)
      .put(`/api/courses/${theirs._id}`)
      .set(auth(trainer.token))
      .send({ title: 'Hijacked', description: 'Must not overwrite another trainer course.' });
    assert.equal(hijack.status, 403);
  });

  it('DELETE /api/courses/:id deletes owned courses only', async () => {
    const blocked = await request(app)
      .delete(`/api/courses/${theirs._id}`)
      .set(auth(trainer.token));
    assert.equal(blocked.status, 403);

    const stillThere = await request(app)
      .get(`/api/courses/${theirs._id}`)
      .set(auth(trainer2.token));
    assert.equal(stillThere.status, 200);

    const removed = await request(app)
      .delete(`/api/courses/${mine._id}`)
      .set(auth(trainer.token));
    assert.equal(removed.status, 200);

    const gone = await request(app).get(`/api/courses/${mine._id}`).set(auth(trainer.token));
    assert.equal(gone.status, 404);
  });
});
