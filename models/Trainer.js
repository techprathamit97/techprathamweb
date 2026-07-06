const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema({
  trainerId: { type: String, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  expertise: [String],
  bio: String,
  qualification: String,
  experience: String,
  dateOfJoining: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  profileImage: String
}, { timestamps: true });

module.exports = mongoose.models.Trainer || mongoose.model('Trainer', trainerSchema);
