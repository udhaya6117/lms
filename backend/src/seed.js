require('dotenv').config();
const mongoose = require('mongoose');
const connectDb = require('./config/db');
const populateCampus = require('./store/campusSeed');
const User = require('./models/User');
const Course = require('./models/Course');
const Enrollment = require('./models/Enrollment');
const Assignment = require('./models/Assignment');
const Submission = require('./models/Submission');
const Category = require('./models/Category');
const Section = require('./models/Section');
const Lesson = require('./models/Lesson');
const Quiz = require('./models/Quiz');
const Question = require('./models/Question');

const run = async () => {
  await connectDb({ skipSeed: true });
  await mongoose.connection.dropDatabase();

  const counts = await populateCampus({
    User,
    Course,
    Enrollment,
    Assignment,
    Submission,
    Category,
    Section,
    Lesson,
    Quiz,
    Question,
  });

  console.log('Campus seed complete (MongoDB).');
  console.log(`  ${counts.trainers} trainers · ${counts.students} students · ${counts.courses} courses`);
  if (counts.walkthrough) {
    console.log(`  Walkthrough course: ${counts.walkthrough}`);
  }
  const { logDemoAccounts } = require('./config/secrets');
  logDemoAccounts('  ');
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
