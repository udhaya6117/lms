const Course = require('../models/Course');
const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const QuizAttempt = require('../models/QuizAttempt');
const Enrollment = require('../models/Enrollment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const notify = require('../utils/notify');

const owned = async (courseId, user) => {
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'Course not found');
  if (user.role !== 'admin' && String(course.trainer) !== String(user._id)) {
    throw new ApiError(403, "You cannot manage another trainer's quiz");
  }
  return course;
};

const createQuiz = asyncHandler(async (req, res) => {
  await owned(req.params.courseId, req.user);
  const quiz = await Quiz.create({
    course: req.params.courseId,
    title: req.body.title,
    passingScore: Number(req.body.passingScore) || 70,
    timeLimitMin: Number(req.body.timeLimitMin) || 15,
    maxAttempts: Number(req.body.maxAttempts) || 3,
  });
  const questions = req.body.questions || [];
  for (const q of questions) {
    await Question.create({
      quiz: quiz._id,
      text: q.text,
      type: q.type || 'MCQ',
      options: q.options || ['True', 'False'],
      correctIndex: Number(q.correctIndex) || 0,
      marks: Number(q.marks) || 10,
    });
  }
  res.status(201).json({ success: true, data: quiz });
});

const listQuizzes = asyncHandler(async (req, res) => {
  const quizzes = await Quiz.find({ course: req.params.courseId });
  const withQuestions = [];
  for (const quiz of quizzes) {
    const questions = await Question.find({ quiz: quiz._id });
    withQuestions.push({
      ...quiz.toObject(),
      questions: questions.map((q) => ({
        ...q.toObject(),
        correctIndex: req.user.role === 'student' ? undefined : q.correctIndex,
      })),
    });
  }
  res.json({ success: true, data: withQuestions });
});

const attemptQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) throw new ApiError(404, 'Quiz not found');
  const enrolled = await Enrollment.exists({ course: quiz.course, student: req.user._id });
  if (!enrolled) throw new ApiError(403, 'Enroll before attempting the quiz');

  const prior = await QuizAttempt.countDocuments({ quiz: quiz._id, student: req.user._id });
  if (prior >= quiz.maxAttempts) {
    throw new ApiError(400, 'No attempts remaining');
  }

  const questions = await Question.find({ quiz: quiz._id });
  const answers = req.body.answers || [];
  let score = 0;
  let max = 0;
  const report = questions.map((q) => {
    max += q.marks;
    const given = answers.find((a) => String(a.questionId) === String(q._id));
    const selected = given ? Number(given.selectedIndex) : -1;
    const correct = selected === Number(q.correctIndex);
    if (correct) score += q.marks;
    return {
      questionId: q._id,
      text: q.text,
      selectedIndex: selected,
      correctIndex: q.correctIndex,
      correct,
    };
  });
  const percent = max ? Math.round((score / max) * 100) : 0;
  const passed = percent >= quiz.passingScore;
  const attempt = await QuizAttempt.create({
    quiz: quiz._id,
    course: quiz.course,
    student: req.user._id,
    score: percent,
    passed,
    answers: report,
  });
  await notify({
    user: req.user._id,
    title: passed ? 'Quiz passed' : 'Quiz submitted',
    body: `${quiz.title}: ${percent}%`,
    type: 'quiz',
  });
  const courseDoc = await Course.findById(quiz.course);
  const { issueIfEligible } = require('./progress.controller');
  const certificate = await issueIfEligible(courseDoc, req.user);
  res.status(201).json({ success: true, data: { ...attempt.toObject(), max, certificate } });
});

module.exports = { createQuiz, listQuizzes, attemptQuiz };
