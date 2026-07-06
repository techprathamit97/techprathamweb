const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer' },
  dueDate: Date,
  maxMarks: { type: Number, default: 100 },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number
  }]
}, { timestamps: true });

module.exports = mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema);
