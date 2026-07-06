const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  courseName: { type: String, required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  certificateNo: { type: String, required: true, unique: true },
  certificateId: { type: String },
  grade: { type: String, default: 'A' },
  score: { type: Number, default: 100 },
  status: { type: String, default: 'pending' }, // pending, issued, revoked
  completionDate: { type: Date, default: Date.now },
  issueDate: { type: Date },
  startDate: { type: Date },
  endDate: { type: Date },
  certificateUrl: { type: String },
  verificationCode: { type: String },
  templateUrl: String
}, { timestamps: true });

module.exports = mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);
