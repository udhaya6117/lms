const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const Enrollment = require('../models/Enrollment');
const Submission = require('../models/Submission');
const Section = require('../models/Section');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const getOwnedCourse = async (courseId, user) => {
  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, 'Course not found');
  const isOwner = course.trainer.toString() === user._id.toString();
  if (user.role !== 'admin' && !isOwner) {
    throw new ApiError(403, "You cannot manage another trainer's course");
  }
  return course;
};

const createAssignment = asyncHandler(async (req, res) => {
  const course = await getOwnedCourse(req.params.courseId, req.user);
  if (req.user.role === 'trainer' && course.status !== 'PUBLISHED') {
    throw new ApiError(400, 'Create assignments after the course is approved');
  }
  const dueDate = new Date(req.body.dueDate);
  if (Number.isNaN(dueDate.getTime())) {
    throw new ApiError(400, 'Invalid due date');
  }
  let sectionId = null;
  if (req.body.section) {
    const section = await Section.findOne({ _id: req.body.section, course: course._id });
    if (!section) throw new ApiError(400, 'Choose a study section from this course');
    sectionId = section._id;
  }
  const assignment = await Assignment.create({
    course: req.params.courseId,
    section: sectionId,
    title: req.body.title,
    description: req.body.description,
    dueDate,
    maxMarks: req.body.maxMarks,
  });
  await assignment.populate('section', 'title order');
  res.status(201).json({ success: true, data: assignment });
});

const listAssignments = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) throw new ApiError(404, 'Course not found');

  if (req.user.role === 'student') {
    const enrolled = await Enrollment.exists({
      course: course._id,
      student: req.user._id,
    });
    if (!enrolled) {
      throw new ApiError(403, 'Enroll in this course to view assignments');
    }
  } else if (req.user.role === 'trainer') {
    if (course.trainer.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "You cannot view another trainer's assignments");
    }
  }

  const assignments = await Assignment.find({ course: course._id })
    .populate('section', 'title order')
    .sort({ dueDate: 1 });

  if (req.user.role === 'student') {
    const subs = await Submission.find({
      assignment: { $in: assignments.map((a) => a._id) },
      student: req.user._id,
    });
    const byAssignment = new Map(subs.map((s) => [s.assignment.toString(), s]));
    return res.json({
      success: true,
      data: assignments.map((a) => ({
        ...a.toObject(),
        mySubmission: byAssignment.get(a._id.toString()) || null,
      })),
    });
  }

  res.json({ success: true, data: assignments });
});

const myAssignments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id });
  const courseIds = enrollments.map((row) => row.course);
  const assignments = await Assignment.find({ course: { $in: courseIds } })
    .populate('course', 'title')
    .populate('section', 'title order')
    .sort({ dueDate: 1 });
  const submissions = await Submission.find({
    assignment: { $in: assignments.map((item) => item._id) },
    student: req.user._id,
  });
  const byAssignment = new Map(submissions.map((row) => [row.assignment.toString(), row]));

  res.json({
    success: true,
    data: assignments.map((item) => ({
      ...item.toObject(),
      mySubmission: byAssignment.get(item._id.toString()) || null,
    })),
  });
});

const getAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findById(req.params.id)
    .populate('course', 'title trainer')
    .populate('section', 'title order');
  if (!assignment) throw new ApiError(404, 'Assignment not found');
  res.json({ success: true, data: assignment });
});

module.exports = { createAssignment, listAssignments, myAssignments, getAssignment };
