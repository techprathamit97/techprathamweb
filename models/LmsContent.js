const mongoose = require('mongoose');

const lmsContentSchema = new mongoose.Schema({
  courseId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    default: ''
  },
  sidebar: {
    type: Array,
    default: []
  },
  puckData: {
    type: Object,
    default: {
      root: {},
      content: []
    }
  }
}, {
  timestamps: true
});

// Mark nested arrays as modified when saving
lmsContentSchema.pre('save', function(next) {
  this.markModified('sidebar');
  this.markModified('puckData');
  next();
});

module.exports = mongoose.models.LmsContent || mongoose.model('LmsContent', lmsContentSchema);