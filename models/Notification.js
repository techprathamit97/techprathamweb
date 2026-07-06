const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  studentId: { type: String, index: true },
  trainerId: { type: String, index: true },
  adminId: { type: String, index: true },

  // Notification content
  title: { type: String, required: true },
  message: { type: String, required: true },

  // Notification type
  type: {
    type: String,
    enum: [
      'class',
      'quiz',
      'assignment',
      'deadline',
      'announcement',
      'schedule_change',
      'daily_reminder',
      'upcoming_class',
      'class_cancelled',
      'class_rescheduled',
      'trainer_leave',
      'certificate_pending',    // Certificate assigned by trainer, pending admin approval
      'certificate_approved',   // Certificate approved by admin
      'certificate_rejected',   // Certificate rejected by admin
      'certificate_updated'     // Certificate details updated
    ],
    required: true
  },

  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Read status
  read: {
    type: Boolean,
    default: false
  },

  // Related entity IDs
  relatedId: { type: mongoose.Schema.Types.ObjectId, refPath: 'relatedType' },
  relatedType: { type: String, enum: ['LiveClass', 'LiveClassSession', 'Quiz', 'Assignment', 'Batch', 'Certificate'] },

  // For batching notifications
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },

  // Scheduled notification
  scheduledFor: { type: Date },

  // Action link
  actionUrl: String,

  // Expires at (for auto-cleanup)
  expiresAt: { type: Date }
}, { timestamps: true });

// Index for efficient queries
notificationSchema.index({ studentId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ trainerId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ scheduledFor: 1, expiresAt: 1 });

// TTL index to auto-delete expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Force delete cached model to ensure fresh schema is used
if (mongoose.models.Notification) {
  delete mongoose.models.Notification;
}

module.exports = mongoose.model('Notification', notificationSchema);