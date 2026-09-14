const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const LessonProgress = require('../models/LessonProgress');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Certificate = require('../models/Certificate');
const Enrollment = require('../models/Enrollment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const notify = require('../utils/notify');

const issueIfEligible = async (course, student) => {
  const lessons = await Lesson.find({ course: course._id });
  const done = await LessonProgress.find({ course: course._id, student: student._id, completed: true });
  const quizzes = await Quiz.find({ course: course._id });
  const attempts = await QuizAttempt.find({ course: course._id, student: student._id });
  const lessonOk = lessons.length > 0 && done.length >= lessons.length;
  const quizOk =
    quizzes.length === 0 ||
    quizzes.every((q) => attempts.some((a) => String(a.quiz) === String(q._id) && a.passed));
  if (!lessonOk || !quizOk) return null;
  let cert = await Certificate.findOne({ course: course._id, student: student._id });
  if (!cert) {
    cert = await Certificate.create({
      student: student._id,
      course: course._id,
      studentName: student.name,
      courseTitle: course.title,
      certificateId: `LMS-${String(course._id).slice(-6)}-${String(student._id).slice(-6)}`.toUpperCase(),
      issuedAt: new Date().toISOString(),
    });
    await notify({
      user: student._id,
      title: 'Certificate issued',
      body: `You completed ${course.title}`,
      type: 'certificate',
    });
  }
  return cert;
};

const getProgress = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) throw new ApiError(404, 'Course not found');
  const enrolled = await Enrollment.exists({ course: course._id, student: req.user._id });
  if (!enrolled && req.user.role === 'student') throw new ApiError(403, 'Not enrolled');
  const lessons = await Lesson.find({ course: course._id });
  const done = await LessonProgress.find({ course: course._id, student: req.user._id, completed: true });
  const quizzes = await Quiz.find({ course: course._id });
  const attempts = await QuizAttempt.find({ course: course._id, student: req.user._id });
  const cert = await issueIfEligible(course, req.user);
  res.json({
    success: true,
    data: {
      lessons: lessons.length,
      completedLessons: done.length,
      percent: lessons.length ? Math.round((done.length / lessons.length) * 100) : 0,
      quizzes: quizzes.length,
      passedQuizzes: quizzes.filter((q) =>
        attempts.some((a) => String(a.quiz) === String(q._id) && a.passed)
      ).length,
      certificate: cert,
    },
  });
});

const myCertificates = asyncHandler(async (req, res) => {
  const items = await Certificate.find({ student: req.user._id }).sort({ issuedAt: -1 });
  res.json({ success: true, data: items });
});

module.exports = { getProgress, myCertificates, issueIfEligible };
