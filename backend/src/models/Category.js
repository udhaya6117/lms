const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 80 },
    description: { type: String, default: '', maxlength: 400 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
