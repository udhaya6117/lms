const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    type: { type: String, enum: ['TEXT', 'VIDEO'], default: 'TEXT' },
    content: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    durationMin: { type: Number, default: 8, min: 0 },
    order: { type: Number, default: 1 },
  },
  { timestamps: true }
);

lessonSchema.index({ course: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
