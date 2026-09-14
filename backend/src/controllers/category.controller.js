const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const items = await Category.find().sort({ name: 1 });
  res.json({ success: true, data: items });
});

const create = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (name.length < 2) throw new ApiError(400, 'Category name is required');
  const exists = await Category.findOne({ name });
  if (exists) throw new ApiError(409, 'Category already exists');
  const item = await Category.create({
    name,
    description: req.body.description || '',
  });
  res.status(201).json({ success: true, data: item });
});

const update = asyncHandler(async (req, res) => {
  const item = await Category.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Category not found');
  if (req.body.name) item.name = req.body.name.trim();
  if (req.body.description !== undefined) item.description = req.body.description;
  await item.save();
  res.json({ success: true, data: item });
});

const remove = asyncHandler(async (req, res) => {
  const item = await Category.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Category not found');
  await item.deleteOne();
  res.json({ success: true, data: { id: item._id } });
});

module.exports = { list, create, update, remove };
