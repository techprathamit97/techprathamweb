const mongoose = require('mongoose');

// Model for the existing bbbLearningDashboardExports collection
// This is a READ-ONLY model for the existing collector data
const BBBMeetingAttendanceExportSchema = new mongoose.Schema({
  // Archive metadata (created by existing collector)
  sourceKey: String,
  sourceRelativePath: String,
  sha256: String,
  byteLength: Number,
  rawJson: String, // Raw JSON from BBB Learning Dashboard
  
  // Parsed BBB data (structured by collector)
  data: mongoose.Schema.Types.Mixed,
  
  // Meeting identifiers
  meetingIntId: String, // Internal BBB meeting session ID (primary identifier)
  meetingExtId: String, // External meeting ID (can be reused)
  meetingName: String,  // Meeting display name
  
  // Meeting timing
  createdOn: mongoose.Schema.Types.Mixed, // Meeting created timestamp
  endedOn: mongoose.Schema.Types.Mixed,   // Meeting ended timestamp
  
  // Archive metadata
  sourceMtimeMs: Number, // Source file modification time
  archivedAt: Date,      // When this was archived by collector
}, {
  collection: "bbbLearningDashboardExports", // Use existing collection name exactly
  strict: false,   // Allow additional fields from collector
  versionKey: false, // No __v field
  timestamps: false  // Don't add createdAt/updatedAt (use archivedAt instead)
});

// Index on meetingIntId for efficient lookups (should already exist)
// Don't create new indexes without verification
BBBMeetingAttendanceExportSchema.index({ meetingIntId: 1 }, { background: true });
BBBMeetingAttendanceExportSchema.index({ meetingExtId: 1 }, { background: true });
BBBMeetingAttendanceExportSchema.index({ archivedAt: -1 }, { background: true });

// Virtual to check if meeting is completed
BBBMeetingAttendanceExportSchema.virtual('isCompleted').get(function() {
  return Boolean(this.endedOn);
});

// Virtual to get status
BBBMeetingAttendanceExportSchema.virtual('status').get(function() {
  return this.endedOn ? 'COMPLETED' : 'IN_PROGRESS';
});

// Static method to find meetings by status
BBBMeetingAttendanceExportSchema.statics.findByStatus = function(status) {
  const filter = status === 'COMPLETED' 
    ? { endedOn: { $exists: true, $ne: null } }
    : { $or: [{ endedOn: { $exists: false } }, { endedOn: null }] };
  
  return this.find(filter);
};

// Static method to find meetings by date range
BBBMeetingAttendanceExportSchema.statics.findByDateRange = function(from, to) {
  const filter = {};
  
  if (from || to) {
    filter.archivedAt = {};
    if (from) filter.archivedAt.$gte = new Date(from);
    if (to) filter.archivedAt.$lte = new Date(to);
  }
  
  return this.find(filter);
};

// Instance method to get participant count from data
BBBMeetingAttendanceExportSchema.methods.getParticipantCount = function() {
  const users = this.data && (this.data.users || this.data.users_data);
  if (!users) {
    return null;
  }

  return Object.keys(users).length;
};

// Instance method to safely get meeting start/end times
BBBMeetingAttendanceExportSchema.methods.getTimestamps = function() {
  return {
    startedAt: this.createdOn ? new Date(this.createdOn) : null,
    endedAt: this.endedOn ? new Date(this.endedOn) : null
  };
};

// Force delete cached model to ensure fresh schema
if (mongoose.models.BBBMeetingAttendanceExport) {
  delete mongoose.models.BBBMeetingAttendanceExport;
}

module.exports = mongoose.model('BBBMeetingAttendanceExport', BBBMeetingAttendanceExportSchema);