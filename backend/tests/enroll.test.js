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
const Course = require('../src/models/Course');
const { login, auth, createUsers } = require('./authHelper');

describe('Course enrollment', { concurrency: 1 }, () => {
  let memory;
  let trainer;
  let student;
  let student2;
  let publishedId;
  let draftId;

  before(async () => {
    memory = await MongoMemoryServer.create();
    await mongoose.connect(memory.getUri('lms_enroll'));
    const users = await createUsers();
    trainer = await login('trainer@test.com', 'Trainer@123');
    student = await login('student@test.com', 'Student@123');
    student2 = await login('student2@test.com', 'Student@123');

    const published = await Course.create({
      title: 'Available Course',
      description: 'A published course students may enroll in once.',
      trainer: users.trainer._id,
      status: 'PUBLISHED',
      isPublished: true,
      price: 0,
    });
    const draft = await Course.create({
      title: 'Draft Course',
      description: 'This course is not available for enrollment yet.',
      trainer: users.trainer._id,
      status: 'DRAFT',
      isPublished: false,
      price: 0,
    });
    publishedId = published._id;
    draftId = draft._id;
  });

  after(async () => {
    await mongoose.disconnect();
    if (memory) await memory.stop();
  });

  it('allows only students to enroll in a published course', async () => {
    const asTrainer = await request(app)
      .post(`/api/courses/${publishedId}/enroll`)
      .set(auth(trainer.token));
    assert.equal(asTrainer.status, 403);

    const first = await request(app)
      .post(`/api/courses/${publishedId}/enroll`)
      .set(auth(student.token));
    assert.equal(first.status, 201);
    assert.equal(String(first.body.data.course._id || first.body.data.course), String(publishedId));
  });

  it('rejects a second enrollment by the same student', async () => {
    const again = await request(app)
      .post(`/api/courses/${publishedId}/enroll`)
      .set(auth(student.token));
    assert.equal(again.status, 409);
    assert.match(again.body.message, /already enrolled/i);
  });

  it('allows a different student to enroll in the same course', async () => {
    const other = await request(app)
      .post(`/api/courses/${publishedId}/enroll`)
      .set(auth(student2.token));
    assert.equal(other.status, 201);
  });

  it('rejects unpublished courses and unknown ids', async () => {
    const draft = await request(app)
      .post(`/api/courses/${draftId}/enroll`)
      .set(auth(student.token));
    assert.equal(draft.status, 400);

    const missing = await request(app)
      .post('/api/courses/64b7f2c2c2c2c2c2c2c2c2c2/enroll')
      .set(auth(student.token));
    assert.equal(missing.status, 404);

    const invalid = await request(app)
      .post('/api/courses/not-an-id/enroll')
      .set(auth(student.token));
    assert.equal(invalid.status, 400);
  });
});
