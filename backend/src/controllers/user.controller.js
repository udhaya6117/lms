const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const listUsers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 15;
  const search = req.query.search?.trim();
  const role = req.query.role;
  const filter = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total, trainers, students, admins] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
    User.countDocuments({ role: 'trainer' }),
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'admin' }),
  ]);

  res.json({
    success: true,
    data: items.map((u) => u.toSafeJSON()),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    counts: { trainers, students, admins, total: trainers + students + admins },
  });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, data: user.toSafeJSON() });
});

const createUser = asyncHandler(async (req, res) => {
  const exists = await User.findOne({ email: req.body.email });
  if (exists) {
    throw new ApiError(409, 'An account with this email already exists');
  }
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
  });
  res.status(201).json({ success: true, data: user.toSafeJSON() });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw new ApiError(404, 'User not found');

  const { name, email, role, isActive, password } = req.body;
  if (email && email !== user.email) {
    const taken = await User.findOne({ email });
    if (taken) throw new ApiError(409, 'Email already in use');
    user.email = email;
  }
  if (name) user.name = name;
  if (role) user.role = role;
  if (typeof isActive === 'boolean') user.isActive = isActive;
  if (password) user.password = password;
  await user.save();
  res.json({ success: true, data: user.toSafeJSON() });
});

const deleteUser = asyncHandler(async (req, res) => {
  if (req.user._id.toString() === req.params.id) {
    throw new ApiError(400, 'You cannot delete your own account');
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, data: { id: user._id } });
});

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
