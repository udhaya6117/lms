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
const Assignment = require('../src/models/Assignment');
const Enrollment = require('../src/models/Enrollment');
const { login, auth, createUsers } = require('./authHelper');

const content = 'This is my enrolled submission covering APIs and tests.';

describe('Assignment submission', { concurrency: 1 }, () => {
  let memory;
  let trainer;
  let student;
  let openAssignment;
  let lateAssignment;

  before(async () => {
    memory = await MongoMemoryServer.create();
    await mongoose.connect(memory.getUri('lms_submit'));
    const users = await createUsers();
    trainer = await login('trainer@test.com', 'Trainer@123');
    student = await login('student@test.com', 'Student@123');

    const course = await Course.create({
      title: 'Submission Course',
      description: 'Published course used to test assignment submissions.',
      trainer: users.trainer._id,
      status: 'PUBLISHED',
      isPublished: true,
    });

    openAssignment = await Assignment.create({
      course: course._id,
      title: 'Open assignment',
      description: 'Due in the future so an enrolled student can submit.',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      maxMarks: 100,
    });
    lateAssignment = await Assignment.create({
      course: course._id,
      title: 'Late assignment',
      description: 'Due date is already in the past so late work is rejected.',
      dueDate: new Date(Date.now() - 60 * 60 * 1000),
      maxMarks: 50,
    });

    await Enrollment.create({ course: course._id, student: users.student._id });
  });

  after(async () => {
    await mongoose.disconnect();
    if (memory) await memory.stop();
  });

  it('rejects trainers and students who are not enrolled', async () => {
    const asTrainer = await request(app)
      .post(`/api/assignments/${openAssignment._id}/submit`)
      .set(auth(trainer.token))
      .send({ content });
    assert.equal(asTrainer.status, 403);

    const outsider = await login('student2@test.com', 'Student@123');
    const unenrolled = await request(app)
      .post(`/api/assignments/${openAssignment._id}/submit`)
      .set(auth(outsider.token))
      .send({ content });
    assert.equal(unenrolled.status, 403);
    assert.match(unenrolled.body.message, /enrolled/i);
  });

  it('rejects submissions after the due date', async () => {
    const late = await request(app)
      .post(`/api/assignments/${lateAssignment._id}/submit`)
      .set(auth(student.token))
      .send({ content });
    assert.equal(late.status, 400);
    assert.match(late.body.message, /due date/i);
  });

  it('accepts one on-time submission from an enrolled student', async () => {
    const first = await request(app)
      .post(`/api/assignments/${openAssignment._id}/submit`)
      .set(auth(student.token))
      .send({ content });
    assert.equal(first.status, 201);
    assert.equal(first.body.data.status, 'SUBMITTED');
    assert.equal(String(first.body.data.assignment), String(openAssignment._id));

    const again = await request(app)
      .post(`/api/assignments/${openAssignment._id}/submit`)
      .set(auth(student.token))
      .send({ content });
    assert.equal(again.status, 409);
  });

  it('rejects unknown and invalid assignment ids', async () => {
    const missing = await request(app)
      .post('/api/assignments/64b7f2c2c2c2c2c2c2c2c2c2/submit')
      .set(auth(student.token))
      .send({ content });
    assert.equal(missing.status, 404);

    const invalid = await request(app)
      .post('/api/assignments/not-an-id/submit')
      .set(auth(student.token))
      .send({ content });
    assert.equal(invalid.status, 400);
  });
});
