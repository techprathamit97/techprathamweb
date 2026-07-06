const mongoose = require('mongoose');

const dailyClassSchema = new mongoose.Schema({
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer' },
  classDate: Date,
  topic: String,
  meetLink: String,
  recordingUrl: String,
  attendance: [mongoose.Schema.Types.Mixed]
}, { timestamps: true });

module.exports = mongoose.models.DailyClass || mongoose.model('DailyClass', dailyClassSchema);
