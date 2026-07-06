const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  type: { type: String, required: true }, // 'quiz' or 'assignment'
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  refId: { type: mongoose.Schema.Types.ObjectId, required: true }, // quizId or assignmentId
  fileUrl: String,
  fileName: String,
  score: Number,
  maxMarks: Number,
  status: { type: String, default: 'pending' }, // 'pending', 'submitted', 'graded'
  feedback: String,
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);
