const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchName: { type: String, required: true },
  batchCode: String,
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer' },
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  startDate: Date,
  endDate: Date,
  timing: String, // Display format like "9:00 AM to 5:00 PM"
  // New timing fields for automatic class generation
  startTime: { type: String, default: '09:00' }, // 24-hour format
  endTime: { type: String, default: '17:00' }, // 24-hour format
  classFrequency: { 
    type: String, 
    enum: ['daily', 'weekly', 'custom'], 
    default: 'daily' 
  },
  classDuration: { type: Number, default: 60 }, // Duration in minutes
  daysOfWeek: [{ 
    type: String, 
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }],
  capacity: { type: Number, default: 30 },
  description: String,
  status: String,
  // Course progress - set by trainer for all students at once
  courseProgress: { type: Number, default: 0 } // 0, 10, 30, 70, 100
}, { timestamps: true });

module.exports = mongoose.models.Batch || mongoose.model('Batch', batchSchema);
