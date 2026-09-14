const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    text: { type: String, required: true, trim: true },
    type: { type: String, enum: ['MCQ', 'TF'], default: 'MCQ' },
    options: { type: [String], default: ['True', 'False'] },
    correctIndex: { type: Number, required: true, min: 0 },
    marks: { type: Number, default: 10, min: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Question', questionSchema);
