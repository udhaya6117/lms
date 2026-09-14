const Course = require('../models/Course');
const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const notify = require('../utils/notify');

const dummyPay = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.body.courseId);
  if (!course) throw new ApiError(404, 'Course not found');
  if (course.status !== 'PUBLISHED' && !course.isPublished) {
    throw new ApiError(400, 'Course is not available for purchase');
  }
  const succeed = req.body.succeed !== false;
  const payment = await Payment.create({
    transactionId: `TXN${Date.now()}`,
    student: req.user._id,
    course: course._id,
    amount: Number(course.price) || 0,
    status: succeed ? 'SUCCESS' : 'FAILED',
    paymentMethod: 'DUMMY',
  });

  if (succeed) {
    const exists = await Enrollment.findOne({ course: course._id, student: req.user._id });
    if (!exists) {
      await Enrollment.create({ course: course._id, student: req.user._id });
    }
    await notify({
      user: req.user._id,
      title: 'Payment successful',
      body: `You now have access to ${course.title}`,
      type: 'payment',
    });
  }

  res.status(201).json({ success: true, data: payment });
});

const listPayments = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { student: req.user._id };
  const items = await Payment.find(filter).sort({ createdAt: -1 });
  const populated = [];
  for (const p of items) {
    await p.populate('student', 'name email');
    await p.populate('course');
    populated.push(p);
  }
  res.json({ success: true, data: populated });
});

module.exports = { dummyPay, listPayments };
