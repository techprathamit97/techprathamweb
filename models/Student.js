const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: { type: String, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // Plaintext copy of the password so admins can view/edit it in the LMS.
  // Deliberate tradeoff: anyone with DB access can read it. Only used for
  // admin-managed accounts, never exposed to students/trainers.
  plainPassword: { type: String },
  phone: String,
  dateOfBirth: Date,
  address: String,
  enrollmentDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }, // For login access
  isRestricted: { type: Boolean, default: false }, // For dashboard access
  restrictReason: { type: String, default: '' }, // Reason for restriction
  restrictedAt: { type: Date, default: null }, // When student was restricted
  profileImage: String,
  batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  
  // Firebase Cloud Messaging tokens for push notifications
  fcmTokens: [{
    token: { type: String },
    deviceInfo: { type: String },
    lastUsed: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
  }],
  
  // Notification preferences
  notificationPreferences: {
    classReminders: { type: Boolean, default: true },
    classStarted: { type: Boolean, default: true },
    classRescheduled: { type: Boolean, default: true },
    assignments: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true }
  },

  // Password reset tokens
  resetToken: String,
  resetTokenExpiry: Date
}, { timestamps: true });

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);
