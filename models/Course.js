const mongoose = require('mongoose');

// Topic Schema - Individual lessons within a module
const topicSchema = new mongoose.Schema({
  topicId: String,
  title: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['video', 'text', 'assignment', 'quiz', 'live'], default: 'video' },
  duration: { type: String, default: '0min' }, // e.g., "10min", "1hr 30min"
  videoUrl: String, // For video topics (recorded classes)
  videoDuration: Number, // Actual video duration in seconds
  content: String, // For text/reading content
  order: { type: Number, default: 0 },
  isPreview: { type: Boolean, default: false }, // Free preview content
  resources: [{
    title: String,
    url: String,
    type: String
  }]
}, { timestamps: true });

// Module Schema - Group of topics within a course
const moduleSchema = new mongoose.Schema({
  moduleId: String,
  title: { type: String, required: true },
  description: String,
  order: { type: Number, default: 0 },
  topics: [topicSchema],
  isPublished: { type: Boolean, default: false }
}, { timestamps: true });

const courseSchema = new mongoose.Schema({
  courseId: String,
  title: { type: String, required: true },
  slug: String,
  category: String,
  description: String,
  thumbnail: String, // Course thumbnail image
  trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer' },
  duration: String,
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'], default: 'Beginner' },
  price: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['Draft', 'Published', 'Archived'], default: 'Draft' },

  // New: Course Structure
  modules: [moduleSchema],

  // Metadata
  totalModules: { type: Number, default: 0 },
  totalTopics: { type: Number, default: 0 },
  totalDuration: { type: String, default: '0min' },

  // Tags for search
  tags: [String]
}, { timestamps: true });

// Calculate totals before saving
courseSchema.pre('save', function(next) {
  if (this.modules && this.modules.length > 0) {
    this.totalModules = this.modules.length;
    let totalTopics = 0;
    let totalSeconds = 0;

    this.modules.forEach(module => {
      if (module.topics) {
        totalTopics += module.topics.length;
        module.topics.forEach(topic => {
          if (topic.videoDuration) {
            totalSeconds += topic.videoDuration;
          }
        });
      }
    });

    this.totalTopics = totalTopics;

    // Convert seconds to human readable format
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) {
      this.totalDuration = `${hours}hr ${minutes}min`;
    } else {
      this.totalDuration = `${minutes}min`;
    }
  }
  next();
});

module.exports = mongoose.models.Course || mongoose.model('Course', courseSchema);
