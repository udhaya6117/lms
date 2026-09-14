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

const courseBody = {
  title: 'Node API Design',
  description: 'Build authenticated Express APIs with validation and RBAC.',
  documentTitle: 'Section 1 notes',
  documentContent: 'Starter study document covering APIs, auth, and RBAC.',
};

describe('LMS assignment scenarios', { concurrency: 1 }, () => {
  let memory;
  let trainer;
  let trainer2;
  let student;
  let student2;
  let ownedCourse;
  let foreignCourse;
  let assignment;

  before(async () => {
    memory = await MongoMemoryServer.create();
    await mongoose.connect(memory.getUri('lms_test'));
    await createUsers();
    trainer = await login('trainer@test.com', 'Trainer@123');
    trainer2 = await login('trainer2@test.com', 'Trainer@123');
    student = await login('student@test.com', 'Student@123');
    student2 = await login('student2@test.com', 'Student@123');
  });

  after(async () => {
    await mongoose.disconnect();
    if (memory) await memory.stop();
  });

  it('rejects missing and invalid credentials', async () => {
    const missing = await request(app).get('/api/courses');
    assert.equal(missing.status, 401);

    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: 'trainer@test.com', password: 'wrong-password' });
    assert.equal(bad.status, 401);
  });

  it('lets a trainer create a published-later course and another trainer create their own', async () => {
    const mine = await request(app)
      .post('/api/courses')
      .set(auth(trainer.token))
      .send(courseBody);
    assert.equal(mine.status, 201);
    ownedCourse = mine.body.data;

    const approve = await request(app)
      .put(`/api/courses/${ownedCourse._id}`)
      .set(auth(trainer.token))
      .send({ title: courseBody.title, description: courseBody.description });
    assert.equal(approve.status, 200);

    const other = await request(app)
      .post('/api/courses')
      .set(auth(trainer2.token))
      .send({
        title: 'Other Trainer Course',
        description: 'This course belongs to a different trainer.',
        documentTitle: 'Isolation notes',
        documentContent: 'Study document for the second trainer course.',
      });
    assert.equal(other.status, 201);
    foreignCourse = other.body.data;
  });

  it('prevents a trainer from modifying or deleting another trainer course', async () => {
    const update = await request(app)
      .put(`/api/courses/${foreignCourse._id}`)
      .set(auth(trainer.token))
      .send({
        title: 'Hijacked title',
        description: 'Should not be allowed to overwrite this course.',
      });
    assert.equal(update.status, 403);

    const remove = await request(app)
      .delete(`/api/courses/${foreignCourse._id}`)
      .set(auth(trainer.token));
    assert.equal(remove.status, 403);
  });

  it('returns 400 for invalid ids and 404 for unknown courses', async () => {
    const invalid = await request(app)
      .get('/api/courses/not-an-id')
      .set(auth(student.token));
    assert.equal(invalid.status, 400);

    const missing = await request(app)
      .get('/api/courses/64b7f2c2c2c2c2c2c2c2c2c2')
      .set(auth(student.token));
    assert.equal(missing.status, 404);
  });

  it('publishes the owned course via admin so students can enroll', async () => {
    const admin = await login('admin@test.com', 'Admin@123');
    const res = await request(app)
      .post(`/api/courses/${ownedCourse._id}/approve`)
      .set(auth(admin.token));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'PUBLISHED');
  });

  it('enrolls a student once and rejects a second enrollment', async () => {
    const first = await request(app)
      .post(`/api/courses/${ownedCourse._id}/enroll`)
      .set(auth(student.token));
    assert.equal(first.status, 201);

    const second = await request(app)
      .post(`/api/courses/${ownedCourse._id}/enroll`)
      .set(auth(student.token));
    assert.equal(second.status, 409);
  });

  it('rejects assignment submit when the student is not enrolled', async () => {
    const created = await request(app)
      .post(`/api/courses/${ownedCourse._id}/assignments`)
      .set(auth(trainer.token))
      .send({
        title: 'Weekly practical',
        description: 'Submit a short written solution for this week.',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        maxMarks: 100,
      });
    assert.equal(created.status, 201);
    assignment = created.body.data;

    const res = await request(app)
      .post(`/api/assignments/${assignment._id}/submit`)
      .set(auth(student2.token))
      .send({ content: 'I am not enrolled but I am trying to submit work anyway.' });
    assert.equal(res.status, 403);
  });

  it('rejects late submissions', async () => {
    const late = await request(app)
      .post(`/api/courses/${ownedCourse._id}/assignments`)
      .set(auth(trainer.token))
      .send({
        title: 'Expired assignment',
        description: 'This assignment due date is already in the past.',
        dueDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        maxMarks: 50,
      });
    assert.equal(late.status, 201);

    const res = await request(app)
      .post(`/api/assignments/${late.body.data._id}/submit`)
      .set(auth(student.token))
      .send({ content: 'This work is being submitted after the due date on purpose.' });
    assert.equal(res.status, 400);
  });

  it('accepts an enrolled student submission and blocks another student from reading it', async () => {
    const submit = await request(app)
      .post(`/api/assignments/${assignment._id}/submit`)
      .set(auth(student.token))
      .send({ content: 'Here is my enrolled submission covering APIs and tests.' });
    assert.equal(submit.status, 201);
    const submissionId = submit.body.data._id;

    const peek = await request(app)
      .get(`/api/submissions/${submissionId}`)
      .set(auth(student2.token));
    assert.equal(peek.status, 403);
  });

  it('rejects marks outside the assignment range', async () => {
    const list = await request(app)
      .get(`/api/assignments/${assignment._id}/submissions`)
      .set(auth(trainer.token));
    assert.equal(list.status, 200);
    const submissionId = list.body.data[0]._id;

    const res = await request(app)
      .put(`/api/submissions/${submissionId}/evaluate`)
      .set(auth(trainer.token))
      .send({ marks: 150, feedback: 'Too high' });
    assert.equal(res.status, 400);
  });

  it('lets the owning trainer evaluate with valid marks', async () => {
    const list = await request(app)
      .get(`/api/assignments/${assignment._id}/submissions`)
      .set(auth(trainer.token));
    const submissionId = list.body.data[0]._id;

    const res = await request(app)
      .put(`/api/submissions/${submissionId}/evaluate`)
      .set(auth(trainer.token))
      .send({ marks: 88, feedback: 'Clear structure and good coverage.' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'EVALUATED');
    assert.equal(res.body.data.marks, 88);
  });

  it('stores student submission text without HTML tags', async () => {
    const created = await request(app)
      .post(`/api/courses/${ownedCourse._id}/assignments`)
      .set(auth(trainer.token))
      .send({
        title: 'Sanitized write-up',
        description: 'Submit text that must be stored without HTML markup.',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        maxMarks: 40,
      });
    assert.equal(created.status, 201);

    const submit = await request(app)
      .post(`/api/assignments/${created.body.data._id}/submit`)
      .set(auth(student.token))
      .send({
        content: '<script>alert(1)</script>This enrolled write-up covers APIs.',
      });
    assert.equal(submit.status, 201);
    assert.equal(submit.body.data.content.includes('<script>'), false);
    assert.match(submit.body.data.content, /This enrolled write-up covers APIs/);
  });
});
