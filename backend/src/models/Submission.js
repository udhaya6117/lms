const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, minlength: 10, maxlength: 8000 },
    submittedAt: { type: Date, default: Date.now },
    marks: { type: Number, default: null, min: 0 },
    feedback: { type: String, default: '', maxlength: 2000 },
    status: {
      type: String,
      enum: ['SUBMITTED', 'EVALUATED'],
      default: 'SUBMITTED',
    },
  },
  { timestamps: true }
);

submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });
submissionSchema.index({ student: 1, submittedAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);
