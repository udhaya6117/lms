const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const Section = require('../models/Section');
const Lesson = require('../models/Lesson');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const notify = require('../utils/notify');

const assertCourseAccess = (course, user, action = 'modify') => {
  const isOwner = course.trainer.toString() === user._id.toString();
  if (user.role === 'admin' || isOwner) return;
  throw new ApiError(403, `You cannot ${action} another trainer's course`);
};

const published = (course) =>
  course.isPublished === true || course.status === 'PUBLISHED';

const createCourse = asyncHandler(async (req, res) => {
  const trainerId = req.user.role === 'admin' && req.body.trainer
    ? req.body.trainer
    : req.user._id;
  const status = req.user.role === 'admin' ? 'PUBLISHED' : 'DRAFT';

  const sectionTitle = String(req.body.sectionTitle || 'Section 1').trim();
  const documentTitle = String(req.body.documentTitle || '').trim();
  const documentContent = String(req.body.documentContent || '').trim();
  if (req.user.role === 'trainer') {
    if (!documentTitle || documentContent.length < 10) {
      throw new ApiError(400, 'Add a Section 1 study document before creating the course');
    }
  }

  const course = await Course.create({
    title: req.body.title,
    description: req.body.description,
    trainer: trainerId,
    category: req.body.category || null,
    level: req.body.level || 'Beginner',
    price: Number(req.body.price) || 0,
    durationHours: Number(req.body.durationHours) || 4,
    status,
    isPublished: status === 'PUBLISHED',
    reviewComment: '',
  });

  if (documentTitle) {
    const section = await Section.create({
      course: course._id,
      title: sectionTitle || 'Section 1',
      order: 1,
    });
    await Lesson.create({
      course: course._id,
      section: section._id,
      title: documentTitle,
      type: 'TEXT',
      content: documentContent,
      order: 1,
    });
  }

  await course.populate('trainer', 'name email role');
  res.status(201).json({ success: true, data: course });
});

const listCourses = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const search = req.query.search?.trim();
  const filter = {};

  if (req.user.role === 'trainer') {
    filter.trainer = req.user._id;
  } else if (req.user.role === 'student') {
    filter.status = 'PUBLISHED';
  }

  if (req.query.category) filter.category = req.query.category;
  if (req.query.level) filter.level = req.query.level;

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Course.find(filter)
      .populate('trainer', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Course.countDocuments(filter),
  ]);

  const enrollments = await Enrollment.find({
    course: { $in: items.map((c) => c._id) },
  });
  const countByCourse = enrollments.reduce((acc, e) => {
    const key = String(e.course);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  let enrolledIds = new Set();
  if (req.user.role === 'student') {
    enrolledIds = new Set(
      enrollments.filter((e) => String(e.student) === String(req.user._id)).map((e) => String(e.course))
    );
  }

  const data = items.map((c) => ({
    ...c.toObject(),
    enrolled: enrolledIds.has(c._id.toString()),
    enrollmentCount: countByCourse[String(c._id)] || 0,
  }));

  res.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
});

const getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id).populate(
    'trainer',
    'name email role'
  );
  if (!course) throw new ApiError(404, 'Course not found');

  if (req.user.role === 'student' && !published(course)) {
    throw new ApiError(404, 'Course not found');
  }
  if (
    req.user.role === 'trainer' &&
    course.trainer._id.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, 'You cannot access another trainer\'s course');
  }

  const enrollmentCount = await Enrollment.countDocuments({ course: course._id });
  const reviews = await Review.find({ course: course._id });
  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length
    : 0;
  let enrolled = false;
  if (req.user.role === 'student') {
    enrolled = Boolean(
      await Enrollment.exists({ course: course._id, student: req.user._id })
    );
  }

  res.json({
    success: true,
    data: {
      ...course.toObject(),
      enrolled,
      enrollmentCount,
      avgRating: Number(avgRating.toFixed(1)),
      reviewCount: reviews.length,
    },
  });
});

const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  assertCourseAccess(course, req.user, 'modify');

  const { title, description, isPublished, category, level, price, durationHours } = req.body;
  if (title) course.title = title;
  if (description) course.description = description;
  if (category !== undefined) course.category = category;
  if (level) course.level = level;
  if (price !== undefined) course.price = Number(price);
  if (durationHours !== undefined) course.durationHours = Number(durationHours);
  if (typeof isPublished === 'boolean' && req.user.role === 'admin') {
    course.isPublished = isPublished;
    course.status = isPublished ? 'PUBLISHED' : 'DRAFT';
  }
  await course.save();
  await course.populate('trainer', 'name email role');
  res.json({ success: true, data: course });
});

const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  assertCourseAccess(course, req.user, 'delete');
  await course.deleteOne();
  const assignments = await Assignment.find({ course: course._id }).select('_id');
  const assignmentIds = assignments.map((a) => a._id);
  await Promise.all([
    Enrollment.deleteMany({ course: course._id }),
    Assignment.deleteMany({ course: course._id }),
    Submission.deleteMany({ assignment: { $in: assignmentIds } }),
  ]);
  res.json({ success: true, data: { id: course._id } });
});

const listEnrollments = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  assertCourseAccess(course, req.user, 'view enrollments for');
  const rows = await Enrollment.find({ course: course._id })
    .populate('student', 'name email')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: rows });
});

const enroll = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) throw new ApiError(404, 'Course not found');
  if (!published(course)) {
    throw new ApiError(400, 'This course is not available for enrollment');
  }

  const existing = await Enrollment.findOne({
    course: course._id,
    student: req.user._id,
  });
  if (existing) {
    throw new ApiError(409, 'You are already enrolled in this course');
  }

  if (Number(course.price) > 0) {
    const paid = await Payment.findOne({
      course: course._id,
      student: req.user._id,
      status: 'SUCCESS',
    });
    if (!paid) {
      throw new ApiError(402, 'This course requires dummy payment before enrollment');
    }
  }

  const enrollment = await Enrollment.create({
    course: course._id,
    student: req.user._id,
  });
  await enrollment.populate('course');
  await notify({
    user: course.trainer,
    title: 'New enrollment',
    body: `${req.user.name} enrolled in ${course.title}`,
    type: 'enrollment',
  });
  res.status(201).json({ success: true, data: enrollment });
});

const submitForReview = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  assertCourseAccess(course, req.user, 'submit');
  const sections = await Section.countDocuments({ course: course._id });
  const lessons = await Lesson.countDocuments({ course: course._id });
  if (!sections || !lessons) {
    throw new ApiError(400, 'Add a Section 1 study document before submitting for approval');
  }
  course.status = 'PENDING_REVIEW';
  course.isPublished = false;
  await course.save();
  res.json({ success: true, data: course });
});

const approveCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  course.status = 'PUBLISHED';
  course.isPublished = true;
  course.reviewComment = '';
  await course.save();
  await notify({
    user: course.trainer,
    title: 'Course approved',
    body: `${course.title} is now published.`,
    type: 'course',
  });
  res.json({ success: true, data: course });
});

const rejectCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  course.status = 'REJECTED';
  course.isPublished = false;
  course.reviewComment = req.body.comment || 'Please revise and resubmit.';
  await course.save();
  await notify({
    user: course.trainer,
    title: 'Course rejected',
    body: course.reviewComment,
    type: 'course',
  });
  res.json({ success: true, data: course });
});

const pendingCourses = asyncHandler(async (req, res) => {
  const items = await Course.find({ status: 'PENDING_REVIEW' })
    .populate('trainer', 'name email role')
    .sort({ updatedAt: -1 });
  res.json({ success: true, data: items });
});

const myCourses = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id })
    .populate({
      path: 'course',
      populate: { path: 'trainer', select: 'name email role' },
    })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: enrollments.filter((e) => e.course).map((e) => e.course),
  });
});

module.exports = {
  createCourse,
  listCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  enroll,
  myCourses,
  listEnrollments,
  submitForReview,
  approveCourse,
  rejectCourse,
  pendingCourses,
};
