const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true }, // 'student' or 'trainer' or 'admin'
  userId: String,
  phone: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
