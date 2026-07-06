const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  questions: [mongoose.Schema.Types.Mixed],
  totalMarks: Number,
  passingMarks: Number,
  dueDate: Date
}, { timestamps: true });

module.exports = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
