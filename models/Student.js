const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: { type: String, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  dateOfBirth: Date,
  address: String,
  enrollmentDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }, // For login access
  isRestricted: { type: Boolean, default: false }, // For dashboard access
  profileImage: String,
  batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }]
}, { timestamps: true });

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);
