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
const Enrollment = require('../src/models/Enrollment');
const { login, auth, createUsers } = require('./authHelper');

const payload = {
  title: 'Weekly practical',
  description: 'Submit a written solution covering this week’s outcomes.',
  dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  maxMarks: 100,
};

describe('Course assignments', { concurrency: 1 }, () => {
  let memory;
  let trainer;
  let trainer2;
  let student;
  let ownCourse;
  let otherCourse;

  before(async () => {
    memory = await MongoMemoryServer.create();
    await mongoose.connect(memory.getUri('lms_assignments'));
    const users = await createUsers();
    trainer = await login('trainer@test.com', 'Trainer@123');
    trainer2 = await login('trainer2@test.com', 'Trainer@123');
    student = await login('student@test.com', 'Student@123');

    ownCourse = await Course.create({
      title: 'Owned API Course',
      description: 'Course owned by the first trainer for assignment tests.',
      trainer: users.trainer._id,
      status: 'PUBLISHED',
      isPublished: true,
    });
    otherCourse = await Course.create({
      title: 'Other Trainer Course',
      description: 'Course owned by a different trainer account.',
      trainer: users.trainer2._id,
      status: 'PUBLISHED',
      isPublished: true,
    });
  });

  after(async () => {
    await mongoose.disconnect();
    if (memory) await memory.stop();
  });

  it('POST requires title, description, dueDate, and maxMarks', async () => {
    const res = await request(app)
      .post(`/api/courses/${ownCourse._id}/assignments`)
      .set(auth(trainer.token))
      .send({});
    assert.equal(res.status, 400);
    const fields = (res.body.errors || []).map((item) => item.field);
    assert.ok(fields.includes('title'));
    assert.ok(fields.includes('description'));
    assert.ok(fields.includes('dueDate'));
    assert.ok(fields.includes('maxMarks'));
  });

  it('lets the owning trainer create an assignment', async () => {
    const denied = await request(app)
      .post(`/api/courses/${ownCourse._id}/assignments`)
      .set(auth(student.token))
      .send(payload);
    assert.equal(denied.status, 403);

    const created = await request(app)
      .post(`/api/courses/${ownCourse._id}/assignments`)
      .set(auth(trainer.token))
      .send(payload);
    assert.equal(created.status, 201);
    assert.equal(created.body.data.title, payload.title);
    assert.equal(created.body.data.description, payload.description);
    assert.equal(created.body.data.maxMarks, 100);
    assert.ok(created.body.data.dueDate);
    assert.equal(String(created.body.data.course), String(ownCourse._id));
  });

  it('blocks a trainer from creating assignments on another trainer course', async () => {
    const res = await request(app)
      .post(`/api/courses/${otherCourse._id}/assignments`)
      .set(auth(trainer.token))
      .send(payload);
    assert.equal(res.status, 403);
  });

  it('GET returns assignments for the owner and enrolled students only', async () => {
    const owner = await request(app)
      .get(`/api/courses/${ownCourse._id}/assignments`)
      .set(auth(trainer.token));
    assert.equal(owner.status, 200);
    assert.equal(owner.body.data.length, 1);
    assert.equal(owner.body.data[0].title, payload.title);

    const otherTrainer = await request(app)
      .get(`/api/courses/${ownCourse._id}/assignments`)
      .set(auth(trainer2.token));
    assert.equal(otherTrainer.status, 403);

    const unenrolled = await request(app)
      .get(`/api/courses/${ownCourse._id}/assignments`)
      .set(auth(student.token));
    assert.equal(unenrolled.status, 403);

    await Enrollment.create({ course: ownCourse._id, student: student.user._id || student.user.id });
    const enrolled = await request(app)
      .get(`/api/courses/${ownCourse._id}/assignments`)
      .set(auth(student.token));
    assert.equal(enrolled.status, 200);
    assert.equal(enrolled.body.data[0].title, payload.title);
  });

  it('returns 404 for an unknown course', async () => {
    const res = await request(app)
      .get('/api/courses/64b7f2c2c2c2c2c2c2c2c2c2/assignments')
      .set(auth(trainer.token));
    assert.equal(res.status, 404);
  });
});
