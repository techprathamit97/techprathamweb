const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchName: { type: String, required: true },
  batchCode: String,
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer' },
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  startDate: Date,
  endDate: Date,
  timing: String,
  capacity: { type: Number, default: 30 },
  meetingLink: String,
  description: String,
  status: String,
  // Course progress - set by trainer for all students at once
  courseProgress: { type: Number, default: 0 } // 0, 10, 30, 70, 100
}, { timestamps: true });

module.exports = mongoose.models.Batch || mongoose.model('Batch', batchSchema);
