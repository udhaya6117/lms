const request = require('supertest');
const User = require('../src/models/User');
const app = require('../src/app');

const login = async (email, password) => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  if (!res.body?.data?.accessToken) {
    throw new Error(res.body?.message || `Login failed for ${email}`);
  }
  return {
    token: res.body.data.accessToken,
    user: res.body.data.user,
    cookies: res.headers['set-cookie'],
  };
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const createUsers = async () => {
  const admin = await User.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'Admin@123',
    role: 'admin',
  });
  const trainer = await User.create({
    name: 'Test Trainer',
    email: 'trainer@test.com',
    password: 'Trainer@123',
    role: 'trainer',
  });
  const trainer2 = await User.create({
    name: 'Other Trainer',
    email: 'trainer2@test.com',
    password: 'Trainer@123',
    role: 'trainer',
  });
  const student = await User.create({
    name: 'Test Student',
    email: 'student@test.com',
    password: 'Student@123',
    role: 'student',
  });
  const student2 = await User.create({
    name: 'Other Student',
    email: 'student2@test.com',
    password: 'Student@123',
    role: 'student',
  });
  return { admin, trainer, trainer2, student, student2 };
};

module.exports = { login, auth, createUsers };
