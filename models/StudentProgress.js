const mongoose = require('mongoose');

// Track progress for each topic
const topicProgressSchema = new mongoose.Schema({
  topicId: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: Date,
  watchTime: { type: Number, default: 0 }, // For videos - seconds watched
  videoDuration: { type: Number, default: 0 }, // Total video duration
  progress: { type: Number, default: 0 } // Percentage completed (0-100)
});

// Track progress for each module
const moduleProgressSchema = new mongoose.Schema({
  moduleId: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: Date,
  topicsCompleted: { type: Number, default: 0 },
  totalTopics: { type: Number, default: 0 },
  progress: { type: Number, default: 0 }, // Percentage
  topicProgress: [topicProgressSchema]
});

const studentProgressSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },

  // Overall progress
  enrolledAt: { type: Date, default: Date.now },
  lastAccessedAt: { type: Date, default: Date.now },
  completedAt: Date,

  // Progress data
  modulesCompleted: { type: Number, default: 0 },
  totalModules: { type: Number, default: 0 },
  topicsCompleted: { type: Number, default: 0 },
  totalTopics: { type: Number, default: 0 },
  overallProgress: { type: Number, default: 0 }, // 0-100 percentage

  // Current position (where student left off)
  currentModuleIndex: { type: Number, default: 0 },
  currentTopicIndex: { type: Number, default: 0 },

  // Module-wise progress
  moduleProgress: [moduleProgressSchema],

  // Status
  status: { type: String, enum: ['Not Started', 'In Progress', 'Completed'], default: 'Not Started' },

  // Notes from student
  notes: String
}, { timestamps: true });

// Index for faster queries
studentProgressSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
studentProgressSchema.index({ studentId: 1, batchId: 1 });

// Calculate and update progress
studentProgressSchema.methods.calculateProgress = function() {
  if (!this.moduleProgress || this.moduleProgress.length === 0) {
    this.overallProgress = 0;
    this.status = 'Not Started';
    return;
  }

  let totalTopics = 0;
  let completedTopics = 0;
  let completedModules = 0;

  this.moduleProgress.forEach(module => {
    totalTopics += module.totalTopics;
    completedTopics += module.topicsCompleted;

    if (module.completed) {
      completedModules++;
    }
  });

  this.topicsCompleted = completedTopics;
  this.totalTopics = totalTopics;
  this.modulesCompleted = completedModules;
  this.totalModules = this.moduleProgress.length;

  if (totalTopics > 0) {
    this.overallProgress = Math.round((completedTopics / totalTopics) * 100);
  }

  if (this.overallProgress === 100) {
    this.status = 'Completed';
    this.completedAt = new Date();
  } else if (this.overallProgress > 0) {
    this.status = 'In Progress';
  }

  this.lastAccessedAt = new Date();
};

module.exports = mongoose.models.StudentProgress || mongoose.model('StudentProgress', studentProgressSchema);