const Assignment = require('../models/Assignment');
const Enrollment = require('../models/Enrollment');
const Submission = require('../models/Submission');
const Course = require('../models/Course');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const loadAssignmentContext = async (assignmentId) => {
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new ApiError(404, 'Assignment not found');
  const course = await Course.findById(assignment.course);
  if (!course) throw new ApiError(404, 'Course not found');
  return { assignment, course };
};

const submit = asyncHandler(async (req, res) => {
  const { assignment, course } = await loadAssignmentContext(req.params.assignmentId);

  const enrolled = await Enrollment.exists({
    course: course._id,
    student: req.user._id,
  });
  if (!enrolled) {
    throw new ApiError(403, 'You must be enrolled in the course to submit this assignment');
  }

  if (new Date() > new Date(assignment.dueDate)) {
    throw new ApiError(400, 'Assignment due date has passed. Late submissions are not accepted');
  }

  const existing = await Submission.findOne({
    assignment: assignment._id,
    student: req.user._id,
  });
  if (existing) {
    throw new ApiError(409, 'You have already submitted this assignment');
  }

  const submission = await Submission.create({
    assignment: assignment._id,
    student: req.user._id,
    content: req.body.content,
    status: 'SUBMITTED',
  });
  res.status(201).json({ success: true, data: submission });
});

const listForAssignment = asyncHandler(async (req, res) => {
  const { assignment, course } = await loadAssignmentContext(req.params.assignmentId);
  const isOwner = course.trainer.toString() === req.user._id.toString();
  if (req.user.role !== 'admin' && !isOwner) {
    throw new ApiError(403, 'You cannot view submissions for this assignment');
  }
  const submissions = await Submission.find({ assignment: assignment._id })
    .populate('student', 'name email')
    .sort({ submittedAt: -1 });
  res.json({ success: true, data: submissions });
});

const mySubmissions = asyncHandler(async (req, res) => {
  const submissions = await Submission.find({ student: req.user._id })
    .populate({
      path: 'assignment',
      populate: { path: 'course', select: 'title trainer' },
    })
    .sort({ submittedAt: -1 });
  res.json({ success: true, data: submissions });
});

const getSubmission = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id)
    .populate('student', 'name email')
    .populate({
      path: 'assignment',
      populate: { path: 'course', select: 'title trainer' },
    });
  if (!submission) throw new ApiError(404, 'Submission not found');

  const isOwner = submission.student._id.toString() === req.user._id.toString();
  const trainerId = submission.assignment.course.trainer.toString();
  const isTrainer = trainerId === req.user._id.toString();

  if (req.user.role === 'student' && !isOwner) {
    throw new ApiError(403, "You cannot access another student's submission");
  }
  if (req.user.role === 'trainer' && !isTrainer) {
    throw new ApiError(403, 'You cannot access submissions for another trainer\'s course');
  }

  res.json({ success: true, data: submission });
});

const evaluate = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id).populate({
    path: 'assignment',
    populate: { path: 'course' },
  });
  if (!submission) throw new ApiError(404, 'Submission not found');

  const trainerId = submission.assignment.course.trainer.toString();
  const isTrainer = trainerId === req.user._id.toString();
  if (req.user.role !== 'admin' && !isTrainer) {
    throw new ApiError(403, 'You cannot evaluate submissions for another trainer\'s course');
  }

  const marks = Number(req.body.marks);
  const max = submission.assignment.maxMarks;
  if (Number.isNaN(marks) || marks < 0 || marks > max) {
    throw new ApiError(400, `Marks must be between 0 and ${max}`);
  }

  submission.marks = marks;
  submission.feedback = req.body.feedback || '';
  submission.status = 'EVALUATED';
  await submission.save();
  await submission.populate('student', 'name email');
  res.json({ success: true, data: submission });
});

module.exports = {
  submit,
  listForAssignment,
  mySubmissions,
  getSubmission,
  evaluate,
};
