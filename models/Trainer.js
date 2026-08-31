const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema({
  trainerId: { type: String, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // Plaintext copy of the password so admins can view it in the edit dialog.
  // NOTE: This is a deliberate security tradeoff — anyone with DB access can
  // read trainer passwords. Do NOT enable this pattern for end-user accounts.
  plainPassword: { type: String },
  phone: String,
  expertise: [String],
  bio: String,
  qualification: String,
  experience: String,
  dateOfJoining: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  profileImage: String,

  // Password reset tokens
  resetToken: String,
  resetTokenExpiry: Date
}, { timestamps: true });

module.exports = mongoose.models.Trainer || mongoose.model('Trainer', trainerSchema);
