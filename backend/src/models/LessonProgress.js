const mongoose = require('mongoose');

const lessonProgressSchema = new mongoose.Schema(
  {
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

lessonProgressSchema.index({ lesson: 1, student: 1 }, { unique: true });
lessonProgressSchema.index({ course: 1, student: 1 });

module.exports = mongoose.model('LessonProgress', lessonProgressSchema);
