require('dotenv').config();
const connectDb = require('../config/db');
const { ensureAllCourseStudyDocs } = require('./studyDocs');

const run = async () => {
  await connectDb({ skipSeed: true });
  const result = await ensureAllCourseStudyDocs();
  console.log(`Study documents ready for ${result.courses} courses (${result.sections} sections checked).`);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
