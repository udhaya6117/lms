const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Message = require('../models/Message');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const toContact = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const idsOf = (rows, field = '_id') => [...new Set(rows.map((row) => String(row[field] || row)).filter(Boolean))];

const myStudentIds = async (trainerId) => {
  const courses = await Course.find({ trainer: trainerId }).select('_id');
  if (!courses.length) return [];
  const enrolls = await Enrollment.find({ course: { $in: courses.map((c) => c._id) } }).select('student');
  return idsOf(enrolls, 'student');
};

const myTrainerIds = async (studentId) => {
  const enrolls = await Enrollment.find({ student: studentId }).select('course');
  if (!enrolls.length) return [];
  const courses = await Course.find({ _id: { $in: enrolls.map((e) => e.course) } }).select('trainer');
  return idsOf(courses, 'trainer');
};

const allowedContactIds = async (me) => {
  if (me.role === 'admin') {
    const users = await User.find({ _id: { $ne: me._id }, isActive: { $ne: false } }).select('_id');
    return idsOf(users);
  }

  if (me.role === 'trainer') {
    const studentIds = await myStudentIds(me._id);
    const users = await User.find({
      _id: { $ne: me._id },
      isActive: { $ne: false },
      $or: [{ role: { $in: ['admin', 'trainer'] } }, { _id: { $in: studentIds }, role: 'student' }],
    }).select('_id');
    return idsOf(users);
  }

  const trainerIds = await myTrainerIds(me._id);
  const users = await User.find({
    _id: { $ne: me._id },
    isActive: { $ne: false },
    $or: [{ role: 'admin' }, { _id: { $in: trainerIds }, role: 'trainer' }],
  }).select('_id');
  return idsOf(users);
};

const listContacts = asyncHandler(async (req, res) => {
  const ids = await allowedContactIds(req.user);
  const users = await User.find({ _id: { $in: ids } }).sort({ role: 1, name: 1 }).select('name email role');
  res.json({ success: true, data: users.map(toContact) });
});

const inbox = asyncHandler(async (req, res) => {
  const me = req.user._id;
  const items = await Message.find({ $or: [{ from: me }, { to: me }] })
    .sort({ createdAt: -1 })
    .limit(300)
    .populate('from', 'name email role')
    .populate('to', 'name email role');

  const threads = new Map();
  items.forEach((msg) => {
    const other = String(msg.from._id) === String(me) ? msg.to : msg.from;
    const key = String(other._id);
    if (!threads.has(key)) {
      threads.set(key, {
        user: toContact(other),
        lastMessage: msg.body,
        lastAt: msg.createdAt,
        unread: 0,
      });
    }
    if (String(msg.to._id) === String(me) && !msg.read) {
      threads.get(key).unread += 1;
    }
  });

  const allowed = new Set(await allowedContactIds(req.user));
  res.json({
    success: true,
    data: [...threads.values()].filter((row) => allowed.has(String(row.user.id))),
  });
});

const thread = asyncHandler(async (req, res) => {
  const me = req.user._id;
  const otherId = req.params.userId;
  const allowed = await allowedContactIds(req.user);
  if (!allowed.includes(String(otherId))) {
    throw new ApiError(403, 'You cannot message this person');
  }

  const items = await Message.find({
    $or: [
      { from: me, to: otherId },
      { from: otherId, to: me },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(200)
    .populate('from', 'name email role')
    .populate('to', 'name email role');

  await Message.updateMany({ from: otherId, to: me, read: false }, { $set: { read: true } });

  res.json({
    success: true,
    data: items.map((m) => ({
      id: m._id,
      body: m.body,
      at: m.createdAt,
      mine: String(m.from._id) === String(me),
      from: toContact(m.from),
    })),
  });
});

const send = asyncHandler(async (req, res) => {
  const to = req.body.to;
  const body = String(req.body.body || '').trim();
  if (!to) throw new ApiError(400, 'Choose someone to message');
  if (body.length < 1) throw new ApiError(400, 'Message cannot be empty');
  if (String(to) === String(req.user._id)) throw new ApiError(400, 'You cannot message yourself');

  const allowed = await allowedContactIds(req.user);
  if (!allowed.includes(String(to))) {
    throw new ApiError(403, 'You cannot message this person');
  }

  const target = await User.findById(to);
  if (!target || target.isActive === false) throw new ApiError(404, 'User not found');

  const message = await Message.create({
    from: req.user._id,
    to,
    body,
  });

  res.status(201).json({
    success: true,
    data: {
      id: message._id,
      body: message.body,
      at: message.createdAt,
      mine: true,
      from: toContact(req.user),
    },
  });
});

module.exports = { listContacts, inbox, thread, send, allowedContactIds };
