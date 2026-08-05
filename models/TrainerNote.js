const mongoose = require('mongoose');

const noteContentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    default: 0
  }
}, { _id: false });

const trainerNoteSchema = new mongoose.Schema({
  // Basic note information
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  
  // Note type
  noteType: {
    type: String,
    enum: ['text', 'pdf'],
    default: 'text'
  },
  
  // For text notes - support multiple sections
  textContent: [noteContentSchema],
  
  // For PDF notes
  pdfFile: {
    url: { type: String },
    fileName: { type: String },
    fileSize: { type: Number },
    uploadedAt: { type: Date, default: Date.now }
  },
  
  // Trainer and batch associations
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trainer',
    required: true
  },
  
  // Multiple batches can access this note
  batchIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch'
  }],
  
  // Course association (derived from batches)
  courseIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  
  // Visibility and access
  isPublished: {
    type: Boolean,
    default: false
  },
  
  publishedAt: {
    type: Date,
    default: null
  },
  
  // Module association (optional)
  moduleIndex: {
    type: Number,
    default: null
  },
  
  moduleTitle: {
    type: String,
    default: ''
  },
  
  // Tags for organization
  tags: [{
    type: String
  }],
  
  // Analytics
  viewCount: {
    type: Number,
    default: 0
  },
  
  lastViewedAt: {
    type: Date,
    default: null
  },
  
  // Student access tracking
  studentViews: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    },
    viewCount: {
      type: Number,
      default: 1
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
trainerNoteSchema.index({ trainerId: 1, createdAt: -1 });
trainerNoteSchema.index({ batchIds: 1, isPublished: 1 });
trainerNoteSchema.index({ courseIds: 1, isPublished: 1 });
trainerNoteSchema.index({ trainerId: 1, batchIds: 1 });

// Virtual for batch count
trainerNoteSchema.virtual('batchCount').get(function() {
  return this.batchIds ? this.batchIds.length : 0;
});

// Virtual for student count (calculated)
trainerNoteSchema.virtual('studentCount').get(function() {
  return this.studentViews ? this.studentViews.length : 0;
});

// Method to add student view
trainerNoteSchema.methods.addStudentView = function(studentId) {
  const existingView = this.studentViews.find(view => 
    view.studentId.toString() === studentId.toString()
  );
  
  if (existingView) {
    existingView.viewCount += 1;
    existingView.viewedAt = new Date();
  } else {
    this.studentViews.push({
      studentId: studentId,
      viewedAt: new Date(),
      viewCount: 1
    });
  }
  
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  
  return this.save();
};

// Method to check if student can access this note
trainerNoteSchema.methods.canStudentAccess = function(studentBatchIds) {
  if (!this.isPublished) return false;
  
  // Check if student is in any of the batches this note is assigned to
  return this.batchIds.some(notesBatchId => 
    studentBatchIds.some(studentBatchId => 
      notesBatchId.toString() === studentBatchId.toString()
    )
  );
};

module.exports = mongoose.models.TrainerNote || mongoose.model('TrainerNote', trainerNoteSchema);