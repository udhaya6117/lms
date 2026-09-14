process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.ACCESS_TOKEN_TTL = '15m';
process.env.REFRESH_TOKEN_TTL = '7d';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Course = require('../src/models/Course');
const Assignment = require('../src/models/Assignment');
const Enrollment = require('../src/models/Enrollment');
const Submission = require('../src/models/Submission');
const { login, auth, createUsers } = require('./authHelper');
const { errorHandler } = require('../src/middleware/error.middleware');

const content = 'Enrolled student submission used for error-path checks.';

describe('Required API error scenarios', { concurrency: 1 }, () => {
  let memory;
  let trainer;
  let trainer2;
  let student;
  let student2;
  let courseId;
  let otherCourseId;
  let assignmentId;
  let lateAssignmentId;
  let submissionId;

  before(async () => {
    memory = await MongoMemoryServer.create();
    await mongoose.connect(memory.getUri('lms_errors'));
    const users = await createUsers();
    trainer = await login('trainer@test.com', 'Trainer@123');
    trainer2 = await login('trainer2@test.com', 'Trainer@123');
    student = await login('student@test.com', 'Student@123');
    student2 = await login('student2@test.com', 'Student@123');

    const course = await Course.create({
      title: 'Error Path Course',
      description: 'Published course used to verify assignment error responses.',
      trainer: users.trainer._id,
      status: 'PUBLISHED',
      isPublished: true,
    });
    const other = await Course.create({
      title: 'Other Trainer Course',
      description: 'Must not be editable by the first trainer.',
      trainer: users.trainer2._id,
      status: 'PUBLISHED',
      isPublished: true,
    });
    const open = await Assignment.create({
      course: course._id,
      title: 'Open assignment',
      description: 'Still open so an enrolled student can submit once.',
      dueDate: new Date(Date.now() + 86400000),
      maxMarks: 100,
    });
    const late = await Assignment.create({
      course: course._id,
      title: 'Late assignment',
      description: 'Due date has already passed for this assignment.',
      dueDate: new Date(Date.now() - 3600000),
      maxMarks: 50,
    });
    await Enrollment.create({ course: course._id, student: users.student._id });
    const submission = await Submission.create({
      assignment: open._id,
      student: users.student._id,
      content,
      status: 'SUBMITTED',
    });

    courseId = course._id;
    otherCourseId = other._id;
    assignmentId = open._id;
    lateAssignmentId = late._id;
    submissionId = submission._id;
  });

  after(async () => {
    await mongoose.disconnect();
    if (memory) await memory.stop();
  });

  it('returns 409 when a student enrolls in the same course twice', async () => {
    const first = await request(app)
      .post(`/api/courses/${courseId}/enroll`)
      .set(auth(student.token));
    assert.equal(first.status, 409);
    assert.match(first.body.message, /already enrolled/i);
    assert.equal(first.body.success, false);
  });

  it('returns 403 when a student reads another student submission', async () => {
    const res = await request(app)
      .get(`/api/submissions/${submissionId}`)
      .set(auth(student2.token));
    assert.equal(res.status, 403);
    assert.match(res.body.message, /another student's submission/i);
  });

  it('returns 403 when a student submits without enrollment', async () => {
    const res = await request(app)
      .post(`/api/assignments/${assignmentId}/submit`)
      .set(auth(student2.token))
      .send({ content });
    assert.equal(res.status, 403);
    assert.match(res.body.message, /enrolled/i);
  });

  it('returns 403 when a trainer modifies or deletes another trainer course', async () => {
    const update = await request(app)
      .put(`/api/courses/${otherCourseId}`)
      .set(auth(trainer.token))
      .send({ title: 'Hijacked', description: 'Must not overwrite another trainer course.' });
    assert.equal(update.status, 403);

    const remove = await request(app)
      .delete(`/api/courses/${otherCourseId}`)
      .set(auth(trainer.token));
    assert.equal(remove.status, 403);
  });

  it('returns 400/404 for invalid or missing course and assignment ids', async () => {
    const badCourse = await request(app).get('/api/courses/not-an-id').set(auth(student.token));
    assert.equal(badCourse.status, 400);

    const missingCourse = await request(app)
      .get('/api/courses/64b7f2c2c2c2c2c2c2c2c2c2')
      .set(auth(student.token));
    assert.equal(missingCourse.status, 404);

    const badAssignment = await request(app)
      .post('/api/assignments/not-an-id/submit')
      .set(auth(student.token))
      .send({ content });
    assert.equal(badAssignment.status, 400);

    const missingAssignment = await request(app)
      .post('/api/assignments/64b7f2c2c2c2c2c2c2c2c2c2/submit')
      .set(auth(student.token))
      .send({ content });
    assert.equal(missingAssignment.status, 404);
  });

  it('returns 400 for assignment submission after the due date', async () => {
    const res = await request(app)
      .post(`/api/assignments/${lateAssignmentId}/submit`)
      .set(auth(student.token))
      .send({ content });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /due date/i);
  });

  it('returns 400 for marks outside 0 to maxMarks', async () => {
    const high = await request(app)
      .put(`/api/submissions/${submissionId}/evaluate`)
      .set(auth(trainer.token))
      .send({ marks: 150, feedback: 'Too high' });
    assert.equal(high.status, 400);

    const low = await request(app)
      .put(`/api/submissions/${submissionId}/evaluate`)
      .set(auth(trainer.token))
      .send({ marks: -1, feedback: 'Too low' });
    assert.equal(low.status, 400);
  });

  it('returns 401 for missing, invalid, and expired tokens', async () => {
    const missing = await request(app).get('/api/courses');
    assert.equal(missing.status, 401);

    const invalid = await request(app)
      .get('/api/courses')
      .set(auth('not-a-real-jwt'));
    assert.equal(invalid.status, 401);

    const expired = jwt.sign(
      { sub: student.user._id || student.user.id, role: 'student' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '-10s' }
    );
    const stale = await request(app).get('/api/courses').set(auth(expired));
    assert.equal(stale.status, 401);
    assert.match(stale.body.message, /expired|invalid/i);

    const badLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@test.com', password: 'wrong-password' });
    assert.equal(badLogin.status, 401);
  });

  it('returns consistent validation, not-found, and unexpected-error payloads', async () => {
    const validation = await request(app)
      .post('/api/courses')
      .set(auth(trainer.token))
      .send({ title: 'x' });
    assert.equal(validation.status, 400);
    assert.equal(validation.body.success, false);
    assert.ok(Array.isArray(validation.body.errors));
    assert.ok(validation.body.errors.length > 0);

    const unknownRoute = await request(app).get('/api/does-not-exist').set(auth(student.token));
    assert.equal(unknownRoute.status, 404);
    assert.equal(unknownRoute.body.success, false);

    const fakeRes = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    errorHandler(new Error('boom'), {}, fakeRes, () => {});
    assert.equal(fakeRes.statusCode, 500);
    assert.equal(fakeRes.body.success, false);

    const dupRes = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    errorHandler({ code: 11000, keyValue: { email: 'a@b.com' }, message: 'dup' }, {}, dupRes, () => {});
    assert.equal(dupRes.statusCode, 409);
  });
});
