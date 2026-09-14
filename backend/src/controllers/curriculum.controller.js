const Course = require('../models/Course');
const Section = require('../models/Section');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');
const LessonProgress = require('../models/LessonProgress');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const owned = async (courseId, user) => {
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'Course not found');
  const isOwner = String(course.trainer) === String(user._id);
  if (user.role !== 'admin' && !isOwner) {
    throw new ApiError(403, "You cannot manage another trainer's course");
  }
  return course;
};

const enrolledOrOwner = async (courseId, user) => {
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'Course not found');
  if (user.role === 'admin') return course;
  if (String(course.trainer) === String(user._id)) return course;
  const ok = await Enrollment.exists({ course: courseId, student: user._id });
  if (!ok) throw new ApiError(403, 'Enroll in this course to view the learning path');
  return course;
};

const getCurriculum = asyncHandler(async (req, res) => {
  await enrolledOrOwner(req.params.courseId, req.user);
  const sections = await Section.find({ course: req.params.courseId }).sort({ order: 1 });
  const lessons = await Lesson.find({ course: req.params.courseId }).sort({ order: 1 });
  const progress = await LessonProgress.find({
    course: req.params.courseId,
    student: req.user._id,
  });
  const done = new Set(progress.filter((p) => p.completed).map((p) => String(p.lesson)));
  const data = sections.map((section) => ({
    ...section.toObject(),
    lessons: lessons
      .filter((l) => String(l.section) === String(section._id))
      .map((l) => ({ ...l.toObject(), completed: done.has(String(l._id)) })),
  }));
  const total = lessons.length;
  const completed = lessons.filter((l) => done.has(String(l._id))).length;
  res.json({
    success: true,
    data,
    progress: {
      total,
      completed,
      percent: total ? Math.round((completed / total) * 100) : 0,
    },
  });
});

const addSection = asyncHandler(async (req, res) => {
  const course = await owned(req.params.courseId, req.user);
  const count = await Section.countDocuments({ course: req.params.courseId });
  if (course.status !== 'PUBLISHED' && count >= 1 && req.user.role !== 'admin') {
    throw new ApiError(400, 'Section 2 and later can be added after the course is approved. Extra sections do not need another review.');
  }
  const section = await Section.create({
    course: req.params.courseId,
    title: req.body.title,
    order: Number(req.body.order) || count + 1,
  });
  res.status(201).json({ success: true, data: section });
});

const addLesson = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.sectionId);
  if (!section) throw new ApiError(404, 'Section not found');
  const course = await owned(section.course, req.user);
  if (course.status !== 'PUBLISHED' && req.user.role !== 'admin') {
    const first = await Section.findOne({ course: course._id }).sort({ order: 1, createdAt: 1 });
    if (first && String(section._id) !== String(first._id)) {
      throw new ApiError(400, 'Before approval you can only add study documents to Section 1');
    }
  }
  const count = await Lesson.countDocuments({ section: section._id });
  const lesson = await Lesson.create({
    course: section.course,
    section: section._id,
    title: req.body.title,
    type: req.body.type || 'TEXT',
    content: req.body.content || '',
    videoUrl: req.body.videoUrl || '',
    durationMin: Number(req.body.durationMin) || 8,
    order: Number(req.body.order) || count + 1,
  });
  res.status(201).json({ success: true, data: lesson });
});

const completeLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.id);
  if (!lesson) throw new ApiError(404, 'Lesson not found');
  const enrolled = await Enrollment.exists({ course: lesson.course, student: req.user._id });
  if (!enrolled) throw new ApiError(403, 'Enroll before tracking progress');
  let row = await LessonProgress.findOne({ lesson: lesson._id, student: req.user._id });
  if (!row) {
    row = await LessonProgress.create({
      lesson: lesson._id,
      course: lesson.course,
      student: req.user._id,
      completed: true,
      completedAt: new Date().toISOString(),
    });
  } else {
    row.completed = true;
    row.completedAt = new Date().toISOString();
    await row.save();
  }
  res.json({ success: true, data: row });
});

module.exports = { getCurriculum, addSection, addLesson, completeLesson };
