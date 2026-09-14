const bcrypt = require('bcryptjs');
const seedWalkthrough = require('./walkthroughSeed');
const { ensureAllCourseStudyDocs } = require('./studyDocs');

const TRAINERS = [
  ['Priya Sharma', 'trainer@lms.com'],
  ['Arun Kumar', 'trainer2@lms.com'],
  ['Lakshmi Iyer', 'lakshmi.iyer@lms.com'],
  ['Vikram Shah', 'vikram.shah@lms.com'],
  ['Ananya Reddy', 'ananya.reddy@lms.com'],
  ['Farhan Qureshi', 'farhan.qureshi@lms.com'],
  ['Nisha Menon', 'nisha.menon@lms.com'],
  ['Sanjay Gupta', 'sanjay.gupta@lms.com'],
  ['Divya Krishnan', 'divya.krishnan@lms.com'],
  ['Rohit Banerjee', 'rohit.banerjee@lms.com'],
  ['Hannah Cole', 'hannah.cole@lms.com'],
  ['James Okonkwo', 'james.okonkwo@lms.com'],
];

const FIRST = [
  'Kiran', 'Meera', 'Rahul', 'Aisha', 'Dev', 'Sneha', 'Omar', 'Pooja', 'Aditya', 'Fatima',
  'Nikhil', 'Isha', 'Karthik', 'Zara', 'Vivek', 'Anjali', 'Imran', 'Kavya', 'Harsh', 'Leela',
  'Yusuf', 'Tara', 'Arjun', 'Nandini', 'Sameer', 'Riya', 'Neel', 'Maya', 'Varun', 'Shruti',
];
const LAST = [
  'Nair', 'Patel', 'Singh', 'Khan', 'Das', 'Rao', 'Joshi', 'Pillai', 'Chopra', 'Bose',
  'Fernandes', 'Hussain', 'Iyer', 'Kapoor', 'Dutta',
];

const COURSE_CATALOG = [
  ['Introduction to React', 'Build component-driven UIs, hooks, and REST integration for production apps.', 0],
  ['Advanced React Patterns', 'Context, performance, and maintainable frontend architecture.', 0],
  ['Node.js API Design', 'Express APIs with authentication, validation, and role-based access.', 1],
  ['MongoDB for Educators', 'Document modeling, indexes, and query patterns for LMS data.', 1],
  ['UI Engineering', 'Accessible layouts, design systems, and state management.', 2],
  ['Python for Data', 'Data wrangling, notebooks, and reporting for academic teams.', 3],
  ['Cloud Fundamentals', 'Deploy Node services, env config, and health checks.', 4],
  ['Cybersecurity Basics', 'Auth threats, OWASP, and secure API design.', 5],
  ['SQL and Reporting', 'Relational modeling and dashboards for academic operations.', 6],
  ['Mobile App Foundations', 'React Native basics for course companion apps.', 7],
  ['Product Design for LMS', 'Flows for enrollment, submission, and evaluation.', 8],
  ['DevOps for Faculty Tools', 'CI, logs, and zero-downtime deploys for teaching platforms.', 9],
  ['English for Technical Writing', 'Clear assignment briefs and feedback comments.', 10],
  ['Statistics for Assessment', 'Marks distribution, fairness, and simple analytics.', 11],
  ['Full-Stack Capstone', 'End-to-end LMS feature delivery in a team setting.', 0],
  ['TypeScript in Teams', 'Typing APIs and React apps so large cohorts stay safe.', 2],
];

const ASSIGNMENTS = [
  ['Weekly practical', 'Submit a short written solution covering this week’s learning outcomes.', 100],
  ['Checkpoint quiz write-up', 'Explain two design decisions and one trade-off in 300+ words.', 50],
];

async function populateCampus({
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
}) {
  const { seedCredentials, assertSafeSeedPasswords } = require('../config/secrets');
  assertSafeSeedPasswords();
  const creds = seedCredentials();
  const studentHash = await bcrypt.hash(creds.studentPassword, 10);
  const trainerHash = await bcrypt.hash(creds.trainerPassword, 10);
  const adminHash = await bcrypt.hash(creds.adminPassword, 10);

  await User.create({
    name: 'Platform Admin',
    email: creds.adminEmail,
    password: adminHash,
    role: 'admin',
    isActive: true,
  });

  const trainers = [];
  for (const [name, email] of TRAINERS) {
    trainers.push(
      await User.create({
        name,
        email,
        password: trainerHash,
        role: 'trainer',
        isActive: true,
      })
    );
  }

  const students = [];
  for (let i = 1; i <= 72; i += 1) {
    const first = FIRST[(i - 1) % FIRST.length];
    const last = LAST[(i - 1) % LAST.length];
    const email = i === 1 ? 'student@lms.com' : i === 2 ? 'student2@lms.com' : `student${i}@lms.com`;
    students.push(
      await User.create({
        name: `${first} ${last}`,
        email,
        password: studentHash,
        role: 'student',
        isActive: i % 23 !== 0,
      })
    );
  }

  const catDev = await Category.create({ name: 'Development', description: 'Programming and software engineering' });
  const catData = await Category.create({ name: 'Data', description: 'Analytics and databases' });
  const catCloud = await Category.create({ name: 'Cloud & Security', description: 'Ops, cloud, and security' });
  const catDesign = await Category.create({ name: 'Design', description: 'Product and interface design' });
  const catCats = [catDev, catDev, catDev, catData, catDesign, catData, catCloud, catCloud, catData, catDev, catDesign, catCloud, catDesign, catData, catDev, catDev];
  const levels = ['Beginner', 'Advanced', 'Intermediate', 'Beginner', 'Intermediate', 'Beginner', 'Beginner', 'Intermediate', 'Beginner', 'Beginner', 'Intermediate', 'Advanced', 'Beginner', 'Intermediate', 'Advanced', 'Intermediate'];
  const prices = [0, 1999, 1499, 0, 0, 999, 0, 0, 0, 1299, 0, 0, 0, 0, 0, 799];

  const courses = [];
  for (let i = 0; i < COURSE_CATALOG.length; i += 1) {
    const [title, description, trainerIndex] = COURSE_CATALOG[i];
    const published = title !== 'Full-Stack Capstone';
    courses.push(
      await Course.create({
        title,
        description,
        trainer: trainers[trainerIndex]._id,
        category: catCats[i]._id,
        level: levels[i],
        price: prices[i],
        durationHours: 4 + (i % 8),
        status: title === 'Full-Stack Capstone' ? 'PENDING_REVIEW' : published ? 'PUBLISHED' : 'DRAFT',
        isPublished: published,
      })
    );
  }

  const assignments = [];
  for (const course of courses) {
    for (let a = 0; a < ASSIGNMENTS.length; a += 1) {
      const [title, description, maxMarks] = ASSIGNMENTS[a];
      assignments.push(
        await Assignment.create({
          course: course._id,
          title: `${title} — ${course.title}`,
          description,
          dueDate: new Date(Date.now() + (10 + a * 7) * 24 * 60 * 60 * 1000).toISOString(),
          maxMarks,
        })
      );
    }
  }

  for (let i = 0; i < students.length; i += 1) {
    const picks = [i % courses.length, (i + 3) % courses.length, (i + 7) % courses.length];
    const unique = [...new Set(picks)];
    for (const courseIndex of unique) {
      const course = courses[courseIndex];
      if (!course.isPublished) continue;
      if (Number(course.price) > 0) continue;
      const dayOffset = i % 12;
      const when = new Date();
      when.setHours(10 + (i % 8), (i * 7) % 60, 0, 0);
      when.setDate(when.getDate() - dayOffset);
      await Enrollment.create({
        course: course._id,
        student: students[i]._id,
        enrolledAt: when,
      });

      const courseAssignments = assignments.filter(
        (item) => String(item.course) === String(course._id)
      );
      const firstAssignment = courseAssignments[0];
      if (firstAssignment && i % 3 !== 0) {
        const submission = await Submission.create({
          assignment: firstAssignment._id,
          student: students[i]._id,
          content: `${students[i].name} completed the ${firstAssignment.title} practical with notes on components, APIs, and testing.`,
          status: i % 2 === 0 ? 'EVALUATED' : 'SUBMITTED',
          submittedAt: new Date().toISOString(),
          marks: i % 2 === 0 ? 60 + (i % 35) : null,
          feedback: i % 2 === 0 ? 'Solid structure. Add more edge-case coverage next time.' : '',
        });
        void submission;
      }
    }
  }

  const react = courses[0];
  const s1 = await Section.create({ course: react._id, title: 'Section 1 — Foundations', order: 1 });
  const s2 = await Section.create({ course: react._id, title: 'Section 2 — Data & APIs', order: 2 });
  await Lesson.create({
    course: react._id,
    section: s1._id,
    title: 'Introduction',
    type: 'TEXT',
    content: 'Welcome to React. Components are functions that return UI.',
    durationMin: 6,
    order: 1,
  });
  await Lesson.create({
    course: react._id,
    section: s1._id,
    title: 'Hooks',
    type: 'TEXT',
    content: 'useState and useEffect drive local state and side effects.',
    durationMin: 12,
    order: 2,
  });
  await Lesson.create({
    course: react._id,
    section: s2._id,
    title: 'Context API',
    type: 'TEXT',
    content: 'Context avoids prop drilling for auth and theme state.',
    durationMin: 10,
    order: 3,
  });
  await Lesson.create({
    course: react._id,
    section: s2._id,
    title: 'Calling REST APIs',
    type: 'VIDEO',
    videoUrl: 'https://www.youtube.com/embed/dGcsHMXbSOA',
    content: 'Fetch JSON from your LMS API and render loading/error states.',
    durationMin: 14,
    order: 4,
  });
  const quiz = await Quiz.create({
    course: react._id,
    title: 'React checkpoint',
    passingScore: 70,
    timeLimitMin: 10,
    maxAttempts: 3,
  });
  await Question.create({
    quiz: quiz._id,
    text: 'Which hook stores local component state?',
    type: 'MCQ',
    options: ['useEffect', 'useState', 'useMemo', 'useRef'],
    correctIndex: 1,
    marks: 25,
  });
  await Question.create({
    quiz: quiz._id,
    text: 'JSX must return a single parent node.',
    type: 'TF',
    options: ['True', 'False'],
    correctIndex: 0,
    marks: 25,
  });
  await Question.create({
    quiz: quiz._id,
    text: 'Context is the best tool for every prop.',
    type: 'TF',
    options: ['True', 'False'],
    correctIndex: 1,
    marks: 25,
  });
  await Question.create({
    quiz: quiz._id,
    text: 'useEffect runs after render.',
    type: 'TF',
    options: ['True', 'False'],
    correctIndex: 0,
    marks: 25,
  });

  const walkthrough = await seedWalkthrough({
    User,
    Course,
    Enrollment,
    Assignment,
    Submission,
    Category,
  });

  await ensureAllCourseStudyDocs();

  return {
    trainers: trainers.length,
    students: students.length,
    courses: courses.length + (walkthrough ? 1 : 0),
    walkthrough: walkthrough?.course || null,
  };
}

module.exports = populateCampus;
