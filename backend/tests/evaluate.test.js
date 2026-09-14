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
const Submission = require('../src/models/Submission');
const { login, auth, createUsers } = require('./authHelper');

describe('Trainer evaluation', { concurrency: 1 }, () => {
  let memory;
  let trainer;
  let trainer2;
  let student;
  let assignmentId;
  let submissionId;

  before(async () => {
    memory = await MongoMemoryServer.create();
    await mongoose.connect(memory.getUri('lms_evaluate'));
    const users = await createUsers();
    trainer = await login('trainer@test.com', 'Trainer@123');
    trainer2 = await login('trainer2@test.com', 'Trainer@123');
    student = await login('student@test.com', 'Student@123');

    const course = await Course.create({
      title: 'Evaluation Course',
      description: 'Owned by the first trainer for submission review tests.',
      trainer: users.trainer._id,
      status: 'PUBLISHED',
      isPublished: true,
    });
    const assignment = await Assignment.create({
      course: course._id,
      title: 'Practical write-up',
      description: 'Students submit work for marks and feedback.',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      maxMarks: 100,
    });
    await Enrollment.create({ course: course._id, student: users.student._id });
    const submission = await Submission.create({
      assignment: assignment._id,
      student: users.student._id,
      content: 'Here is the enrolled student work ready for trainer review.',
      status: 'SUBMITTED',
    });
    assignmentId = assignment._id;
    submissionId = submission._id;
  });

  after(async () => {
    await mongoose.disconnect();
    if (memory) await memory.stop();
  });

  it('lets the owning trainer view submissions in SUBMITTED status', async () => {
    const asStudent = await request(app)
      .get(`/api/assignments/${assignmentId}/submissions`)
      .set(auth(student.token));
    assert.equal(asStudent.status, 403);

    const asOther = await request(app)
      .get(`/api/assignments/${assignmentId}/submissions`)
      .set(auth(trainer2.token));
    assert.equal(asOther.status, 403);

    const list = await request(app)
      .get(`/api/assignments/${assignmentId}/submissions`)
      .set(auth(trainer.token));
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].status, 'SUBMITTED');
    assert.equal(list.body.data[0].marks, null);
    assert.equal(list.body.data[0].feedback, '');
    assert.ok(list.body.data[0].student?.name);
  });

  it('rejects invalid marks and other trainers evaluating', async () => {
    const tooHigh = await request(app)
      .put(`/api/submissions/${submissionId}/evaluate`)
      .set(auth(trainer.token))
      .send({ marks: 150, feedback: 'Too high' });
    assert.equal(tooHigh.status, 400);

    const asStudent = await request(app)
      .put(`/api/submissions/${submissionId}/evaluate`)
      .set(auth(student.token))
      .send({ marks: 80, feedback: 'Not allowed' });
    assert.equal(asStudent.status, 403);

    const asOther = await request(app)
      .put(`/api/submissions/${submissionId}/evaluate`)
      .set(auth(trainer2.token))
      .send({ marks: 80, feedback: 'Not your course' });
    assert.equal(asOther.status, 403);
  });

  it('saves marks, feedback, and sets status to EVALUATED', async () => {
    const res = await request(app)
      .put(`/api/submissions/${submissionId}/evaluate`)
      .set(auth(trainer.token))
      .send({ marks: 88, feedback: 'Clear structure and good coverage.' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.marks, 88);
    assert.equal(res.body.data.feedback, 'Clear structure and good coverage.');
    assert.equal(res.body.data.status, 'EVALUATED');

    const list = await request(app)
      .get(`/api/assignments/${assignmentId}/submissions`)
      .set(auth(trainer.token));
    assert.equal(list.body.data[0].status, 'EVALUATED');
    assert.equal(list.body.data[0].marks, 88);
    assert.equal(list.body.data[0].feedback, 'Clear structure and good coverage.');
  });
});
