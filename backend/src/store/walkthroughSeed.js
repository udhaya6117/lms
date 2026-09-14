const Notification = require('../models/Notification');
const Review = require('../models/Review');
const LessonProgress = require('../models/LessonProgress');
const Lesson = require('../models/Lesson');
const Certificate = require('../models/Certificate');
const Payment = require('../models/Payment');

const daysFromNow = (days) => new Date(Date.now() + days * 86400000);
const daysAgo = (days) => new Date(Date.now() - days * 86400000);

async function ensureEnroll(Enrollment, courseId, studentId, when) {
  const existing = await Enrollment.findOne({ course: courseId, student: studentId });
  if (existing) return existing;
  return Enrollment.create({
    course: courseId,
    student: studentId,
    enrolledAt: when || daysAgo(5),
  });
}

async function ensureSubmission(Submission, payload) {
  const existing = await Submission.findOne({
    assignment: payload.assignment,
    student: payload.student,
  });
  if (existing) return existing;
  return Submission.create(payload);
}

async function seedWalkthrough({ User, Course, Enrollment, Assignment, Submission, Category }) {
  const admin = await User.findOne({ email: 'admin@lms.com' });
  const trainer = await User.findOne({ email: 'trainer@lms.com' });
  const trainer2 = await User.findOne({ email: 'trainer2@lms.com' });
  const student = await User.findOne({ email: 'student@lms.com' });
  const student2 = await User.findOne({ email: 'student2@lms.com' });
  if (!admin || !trainer || !trainer2 || !student || !student2) return null;

  const extras = await User.find({
    role: 'student',
    email: { $nin: ['student@lms.com', 'student2@lms.com'] },
    isActive: true,
  }).limit(4);

  const category = await Category.findOne({ name: 'Development' });
  const walkthrough = await Course.create({
    title: 'Wrench Wise — Assignment Walkthrough',
    description:
      'Demo course for reviewers. Follow it to see the full assignment path: enroll, view work, submit once, reject late work, and evaluate with marks plus feedback.',
    trainer: trainer._id,
    category: category?._id || null,
    level: 'Beginner',
    price: 0,
    durationHours: 6,
    status: 'PUBLISHED',
    isPublished: true,
    reviewComment: '',
  });

  const graded = await Assignment.create({
    course: walkthrough._id,
    title: '1. Graded example — Authorization practical',
    description:
      'Already marked. Open this as the student to see EVALUATED status, marks, and trainer feedback.',
    dueDate: daysFromNow(12),
    maxMarks: 100,
  });
  const waiting = await Assignment.create({
    course: walkthrough._id,
    title: '2. Waiting for marks — Enrollment rules',
    description:
      'Submitted and waiting. Sign in as the trainer, open Review submissions, and save marks plus feedback.',
    dueDate: daysFromNow(16),
    maxMarks: 50,
  });
  const openWork = await Assignment.create({
    course: walkthrough._id,
    title: '3. Your turn — Submit a solution',
    description:
      'Not submitted yet. As the demo student, type at least 10 characters and submit. A second submit returns 409.',
    dueDate: daysFromNow(21),
    maxMarks: 100,
  });
  const lateWork = await Assignment.create({
    course: walkthrough._id,
    title: '4. Late work — Due date has passed',
    description:
      'Overdue on purpose. The student form is blocked and POST /submit returns 400. Late work is never accepted.',
    dueDate: daysAgo(3),
    maxMarks: 40,
  });

  await ensureEnroll(Enrollment, walkthrough._id, student._id, daysAgo(8));
  for (const extra of extras) {
    await ensureEnroll(Enrollment, walkthrough._id, extra._id, daysAgo(6));
  }

  await ensureSubmission(Submission, {
    assignment: graded._id,
    student: student._id,
    content:
      'Roles are enforced on the API. Trainers can only change their own courses. Students must be enrolled before they submit, and marks stay within 0 to maxMarks.',
    status: 'EVALUATED',
    submittedAt: daysAgo(4),
    marks: 88,
    feedback: 'Clear RBAC write-up. Ownership checks and the 409 duplicate-enroll case are covered well.',
  });
  await ensureSubmission(Submission, {
    assignment: waiting._id,
    student: student._id,
    content:
      'Unique enrollment is { course, student }. A second enroll returns 409. A different student can still join the same course.',
    status: 'SUBMITTED',
    submittedAt: daysAgo(1),
    marks: null,
    feedback: '',
  });

  if (extras[0]) {
    await ensureSubmission(Submission, {
      assignment: waiting._id,
      student: extras[0]._id,
      content: `${extras[0].name} submitted the enrollment-rules write-up covering duplicate enroll and isolation.`,
      status: 'SUBMITTED',
      submittedAt: daysAgo(2),
    });
  }
  if (extras[1]) {
    await ensureSubmission(Submission, {
      assignment: openWork._id,
      student: extras[1]._id,
      content: `${extras[1].name} already turned in the open assignment so the trainer queue is not empty.`,
      status: 'SUBMITTED',
      submittedAt: daysAgo(1),
    });
  }
  if (extras[2]) {
    await ensureSubmission(Submission, {
      assignment: graded._id,
      student: extras[2]._id,
      content: `${extras[2].name} also completed the authorization practical.`,
      status: 'EVALUATED',
      submittedAt: daysAgo(3),
      marks: 74,
      feedback: 'Good start. Call out the 403 cases for the other trainer and the other student.',
    });
  }

  const react = await Course.findOne({ title: 'Introduction to React' });
  if (react) {
    await ensureEnroll(Enrollment, react._id, student._id, daysAgo(10));
    const reactAssignment = await Assignment.findOne({
      course: react._id,
      title: /Weekly practical/,
    });
    if (reactAssignment) {
      await ensureSubmission(Submission, {
        assignment: reactAssignment._id,
        student: student._id,
        content:
          'Built a small React list with loading and error states, then called GET /api/courses with the access token.',
        status: 'EVALUATED',
        submittedAt: daysAgo(6),
        marks: 81,
        feedback: 'Solid API integration. Next time show the empty state as well.',
      });
    }
    const lessons = await Lesson.find({ course: react._id }).sort({ order: 1 });
    for (const lesson of lessons.slice(0, 2)) {
      await LessonProgress.findOneAndUpdate(
        { lesson: lesson._id, student: student._id },
        {
          lesson: lesson._id,
          course: react._id,
          student: student._id,
          completed: true,
          completedAt: daysAgo(2),
        },
        { upsert: true }
      );
    }
    await Review.findOneAndUpdate(
      { course: react._id, student: student._id },
      {
        course: react._id,
        student: student._id,
        rating: 5,
        comment: 'Clear path from catalog to assignments. Marks and feedback showed up after evaluation.',
      },
      { upsert: true }
    );
  }

  const nodeCourse = await Course.findOne({ title: 'Node.js API Design' });
  if (nodeCourse) {
    await ensureEnroll(Enrollment, nodeCourse._id, student2._id, daysAgo(7));
    const nodeAssignment = await Assignment.findOne({
      course: nodeCourse._id,
      title: /Weekly practical/,
    });
    if (nodeAssignment) {
      await ensureSubmission(Submission, {
        assignment: nodeAssignment._id,
        student: student2._id,
        content:
          'Meera documented Express middleware order: authenticate, authorize, validate, then the controller.',
        status: 'EVALUATED',
        submittedAt: daysAgo(3),
        marks: 90,
        feedback: 'Exact layering. This is the pattern we want in every route file.',
      });
    }
  }

  await Certificate.findOneAndUpdate(
    { student: student._id, course: walkthrough._id },
    {
      student: student._id,
      course: walkthrough._id,
      studentName: student.name,
      courseTitle: walkthrough.title,
      certificateId: 'WW-FLOW-KIRAN-001',
      issuedAt: daysAgo(1),
    },
    { upsert: true }
  );

  const paidCourses = await Course.find({ price: { $gt: 0 }, isPublished: true }).limit(4);
  for (let i = 0; i < paidCourses.length; i += 1) {
    const course = paidCourses[i];
    const buyer = extras[i] || student;
    const when = daysAgo(i + 1);
    await Payment.create({
      transactionId: `TXN-WALK-${String(i + 1).padStart(3, '0')}`,
      student: buyer._id,
      course: course._id,
      amount: Number(course.price) || 0,
      status: 'SUCCESS',
      paymentMethod: 'DUMMY',
      createdAt: when,
    });
  }

  await Notification.insertMany([
    {
      user: student._id,
      title: 'Assignment evaluated',
      body: 'Authorization practical — 88 / 100. Feedback is on My submissions.',
      type: 'assignment',
      read: false,
    },
    {
      user: student._id,
      title: 'You are enrolled',
      body: 'Wrench Wise — Assignment Walkthrough is in My courses. Open it to submit remaining work.',
      type: 'enrollment',
      read: false,
    },
    {
      user: trainer._id,
      title: 'Submission waiting',
      body: 'Kiran Nair submitted Enrollment rules. Open Review submissions to add marks and feedback.',
      type: 'assignment',
      read: false,
    },
    {
      user: trainer._id,
      title: 'New enrollment',
      body: 'Kiran Nair enrolled in Wrench Wise — Assignment Walkthrough.',
      type: 'enrollment',
      read: true,
    },
    {
      user: admin._id,
      title: 'Course pending review',
      body: 'Full-Stack Capstone is in Approvals. Publish it so students can enroll.',
      type: 'course',
      read: false,
    },
    {
      user: trainer2._id,
      title: 'Own-course reminder',
      body: 'You can grade Node.js API Design only. Other trainers’ courses return 403.',
      type: 'info',
      read: true,
    },
  ]);

  return {
    course: walkthrough.title,
    assignments: 4,
  };
}

module.exports = seedWalkthrough;
