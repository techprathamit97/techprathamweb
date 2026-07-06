const mongoose = require('mongoose');

const moduleClassSchema = new mongoose.Schema({
  // Course and Batch references
  courseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true 
  },
  batchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Batch', 
    required: true 
  },
  
  // Module information
  moduleIndex: {
    type: Number,
    required: true
  },
  moduleTitle: {
    type: String,
    required: true
  },
  moduleDescription: {
    type: String,
    default: ''
  },
  
  // Trainer information
  trainerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Trainer', 
    required: true 
  },
  
  // Scheduling information
  scheduledDate: { 
    type: Date, 
    required: true 
  },
  scheduledTime: { 
    type: String, 
    required: true 
  }, // Format: "HH:MM"
  duration: { 
    type: Number, 
    default: 60 
  }, // Duration in minutes
  
  // Meeting information
  meetingLink: { 
    type: String, 
    default: '' 
  }, // External meeting link (optional)
  roomId: { 
    type: String, 
    required: true 
  }, // WebRTC room ID for internal live classes
  
  // Class status
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'live', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  
  // Live class flags
  isLive: { 
    type: Boolean, 
    default: false 
  },
  isCompleted: { 
    type: Boolean, 
    default: false 
  },
  canJoin: { 
    type: Boolean, 
    default: false 
  },
  
  // Recording information - support multiple recordings per module
  recordings: [{
    url: { type: String, default: null },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    duration: { type: Number, default: 0 }, // in seconds
    fileSize: { type: Number, default: 0 }, // in bytes
    fileType: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String, default: '' },
    partNumber: { type: Number, default: 0 }, // Part number for multiple recordings (1, 2, 3...)
    // BigBlueButton specific fields
    bbbRecordId: { type: String, default: null }, // BBB recording ID
    bbbMeetingId: { type: String, default: null }, // BBB meeting ID this recording belongs to
    bbbProcessed: { type: Boolean, default: false } // Whether this BBB recording has been processed
  }],
  recordingEnabled: {
    type: Boolean,
    default: true
  },
  
  // Attendance tracking
  attendees: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    joinedAt: Date,
    leftAt: Date,
    duration: Number, // in minutes
    attendanceStatus: {
      type: String,
      enum: ['present', 'absent', 'late', 'left-early'],
      default: 'absent'
    }
  }],

  // Manual student progress tracking (set by trainer)
  studentProgress: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    progress: { type: Number, default: 0 }, // 0, 10, 30, 70, 100
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: String, default: '' } // trainer name
  }],
  
  // Class metrics
  metrics: {
    totalStudents: { type: Number, default: 0 },
    presentStudents: { type: Number, default: 0 },
    attendancePercentage: { type: Number, default: 0 },
    averageDuration: { type: Number, default: 0 },
    chatMessages: { type: Number, default: 0 },
    handRaises: { type: Number, default: 0 }
  },
  
  // Actual timing (when class actually started/ended)
  actualStartTime: Date,
  actualEndTime: Date,
  
  // Notes and feedback
  trainerNotes: String,
  classNotes: String,
  
  // BigBlueButton Integration
  bbbMeetingId: {
    type: String,
    default: null
  },
  bbbAttendeePassword: {
    type: String,
    default: null
  },
  bbbModeratorPassword: {
    type: String,
    default: null
  },
  bbbJoinUrl: {
    type: String,
    default: null
  },
  bbbModeratorJoinUrl: {
    type: String,
    default: null
  },
  bbbRecordingId: {
    type: String,
    default: null
  },
  bbbRecordingProcessed: {
    type: Boolean,
    default: false
  },
  bbbRecordingProcessedAt: {
    type: Date,
    default: null
  },

  // Technical information
  platform: {
    type: String,
    enum: ['webrtc', 'bbb', 'zoom', 'googlemeet', 'teams', 'other'],
    default: 'bbb'
  },
  
  // Notifications
  reminderSent: { 
    type: Boolean, 
    default: false 
  },
  notificationsSent: [{
    type: {
      type: String,
      enum: ['reminder', 'started', 'ended', 'cancelled']
    },
    sentAt: Date,
    recipients: [String] // Array of student IDs or emails
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
moduleClassSchema.index({ courseId: 1, batchId: 1, moduleIndex: 1 }, { unique: true });
moduleClassSchema.index({ trainerId: 1, scheduledDate: 1 });
moduleClassSchema.index({ batchId: 1, status: 1 });
moduleClassSchema.index({ scheduledDate: 1, scheduledTime: 1 });
moduleClassSchema.index({ roomId: 1 });

// Virtual for formatted date
moduleClassSchema.virtual('formattedDate').get(function() {
  return this.scheduledDate.toLocaleDateString();
});

// Virtual for formatted time
moduleClassSchema.virtual('formattedTime').get(function() {
  return this.scheduledTime;
});

// Virtual for class duration in hours
moduleClassSchema.virtual('durationHours').get(function() {
  return this.duration / 60;
});

// Method to check if class can be joined now
moduleClassSchema.methods.canJoinNow = function() {
  if (this.status !== 'scheduled' && this.status !== 'live') return false;
  
  const now = new Date();
  const classDate = new Date(this.scheduledDate);
  const [hours, minutes] = this.scheduledTime.split(':');
  classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  // Allow joining 15 minutes before class starts
  const joinWindow = 15 * 60 * 1000; // 15 minutes
  const endTime = new Date(classDate.getTime() + this.duration * 60 * 1000);
  
  return now >= new Date(classDate.getTime() - joinWindow) && now <= endTime;
};

// Method to check if class is currently live
moduleClassSchema.methods.isCurrentlyLive = function() {
  if (this.status !== 'scheduled' && this.status !== 'live') return false;
  
  const now = new Date();
  const classDate = new Date(this.scheduledDate);
  const [hours, minutes] = this.scheduledTime.split(':');
  classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  const endTime = new Date(classDate.getTime() + this.duration * 60 * 1000);
  
  return now >= classDate && now <= endTime;
};

// Method to calculate attendance
moduleClassSchema.methods.calculateAttendance = function() {
  const totalStudents = this.attendees.length;
  const presentStudents = this.attendees.filter(a => 
    a.attendanceStatus === 'present' || a.attendanceStatus === 'late'
  ).length;
  
  const attendancePercentage = totalStudents > 0 ? 
    Math.round((presentStudents / totalStudents) * 100) : 0;
  
  const averageDuration = totalStudents > 0 ? 
    Math.round(this.attendees.reduce((sum, a) => sum + (a.duration || 0), 0) / totalStudents) : 0;
  
  this.metrics = {
    ...this.metrics,
    totalStudents,
    presentStudents,
    attendancePercentage,
    averageDuration
  };
};

// Pre-save middleware to update flags
moduleClassSchema.pre('save', function(next) {
  // Update canJoin and isLive flags based on current time
  // NOTE: Auto-completion based on time is DISABLED
  // Class stays active until trainer manually marks it as completed via checkbox
  // The canJoin and isLive are calculated for UI display purposes only
  this.canJoin = this.status === 'scheduled' || this.status === 'live';
  this.isLive = this.status === 'live';

  next();
});

// Force delete cached model to ensure fresh schema is used
if (mongoose.models.ModuleClass) {
  delete mongoose.models.ModuleClass;
}

module.exports = mongoose.model('ModuleClass', moduleClassSchema);