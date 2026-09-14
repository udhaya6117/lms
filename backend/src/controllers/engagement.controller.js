const Course = require('../models/Course');
const Review = require('../models/Review');
const Enrollment = require('../models/Enrollment');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const { allowedContactIds } = require('./message.controller');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const addReview = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) throw new ApiError(404, 'Course not found');
  const enrolled = await Enrollment.exists({ course: course._id, student: req.user._id });
  if (!enrolled) throw new ApiError(403, 'Enroll before reviewing');
  const rating = Number(req.body.rating);
  if (!rating || rating < 1 || rating > 5) throw new ApiError(400, 'Rating must be 1 to 5');
  let review = await Review.findOne({ course: course._id, student: req.user._id });
  if (review) {
    review.rating = rating;
    review.comment = req.body.comment || '';
    await review.save();
  } else {
    review = await Review.create({
      course: course._id,
      student: req.user._id,
      rating,
      comment: req.body.comment || '',
    });
  }
  res.status(201).json({ success: true, data: review });
});

const listReviews = asyncHandler(async (req, res) => {
  const items = await Review.find({ course: req.params.courseId }).sort({ createdAt: -1 });
  for (const item of items) await item.populate('student', 'name email');
  res.json({ success: true, data: items });
});

const notMessageNote = { type: { $ne: 'message' } };

const myNotifications = asyncHandler(async (req, res) => {
  const items = await Notification.find({ user: req.user._id, ...notMessageNote })
    .sort({ createdAt: -1 })
    .limit(40);
  res.json({ success: true, data: items });
});

const readNotification = asyncHandler(async (req, res) => {
  const item = await Notification.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Notification not found');
  if (String(item.user) !== String(req.user._id)) throw new ApiError(403, 'Not allowed');
  item.read = true;
  await item.save();
  res.json({ success: true, data: item });
});

const unreadCounts = asyncHandler(async (req, res) => {
  const allowed = await allowedContactIds(req.user);
  const [messages, notifications] = await Promise.all([
    Message.countDocuments({ to: req.user._id, read: false, from: { $in: allowed } }),
    Notification.countDocuments({ user: req.user._id, read: false, ...notMessageNote }),
  ]);
  res.json({ success: true, data: { messages, notifications } });
});

module.exports = { addReview, listReviews, myNotifications, readNotification, unreadCounts };
