const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    passingScore: { type: Number, default: 70, min: 0, max: 100 },
    timeLimitMin: { type: Number, default: 15, min: 1 },
    maxAttempts: { type: Number, default: 3, min: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Quiz', quizSchema);
