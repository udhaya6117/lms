const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], required: true },
    paymentMethod: { type: String, default: 'DUMMY' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
