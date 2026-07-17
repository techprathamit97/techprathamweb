const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Universal fields
  userId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  role: { 
    type: String, 
    enum: ['student', 'trainer', 'admin'], 
    required: true 
  },
  isActive: { type: Boolean, default: true },
  profileImage: String,
  
  // Student-specific fields (only populated if role = 'student')
  studentData: {
    dateOfBirth: Date,
    address: String,
    enrollmentDate: { type: Date, default: Date.now },
    isRestricted: { type: Boolean, default: false },
    batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }]
  },
  
  // Trainer-specific fields (only populated if role = 'trainer')
  trainerData: {
    expertise: [String],
    bio: String,
    qualification: String,
    experience: String,
    dateOfJoining: { type: Date, default: Date.now },
    rating: { type: Number, default: 0 }
  },
  
  // Admin-specific fields (only populated if role = 'admin')
  adminData: {
    permissions: [String], // Array of permissions like 'manage_students', 'manage_trainers', etc.
    department: String,
    accessLevel: { type: String, enum: ['super_admin', 'admin', 'moderator'], default: 'admin' }
  },
  
  // Legacy field mappings for backward compatibility
  studentId: String, // For existing student records
  trainerId: String, // For existing trainer records
  
}, { timestamps: true });

// Index for efficient queries
userSchema.index({ userId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ studentId: 1 });
userSchema.index({ trainerId: 1 });

// Pre-save middleware to set legacy IDs based on role
userSchema.pre('save', function(next) {
  if (this.isNew) {
    if (this.role === 'student' && !this.studentId) {
      this.studentId = this.userId;
    } else if (this.role === 'trainer' && !this.trainerId) {
      this.trainerId = this.userId;
    }
  }
  next();
});

// Virtual fields for backward compatibility
userSchema.virtual('student').get(function() {
  if (this.role !== 'student') return null;
  return {
    _id: this._id,
    studentId: this.studentId || this.userId,
    name: this.name,
    email: this.email,
    phone: this.phone,
    dateOfBirth: this.studentData?.dateOfBirth,
    address: this.studentData?.address,
    enrollmentDate: this.studentData?.enrollmentDate || this.createdAt,
    isActive: this.isActive,
    isRestricted: this.studentData?.isRestricted || false,
    profileImage: this.profileImage,
    batches: this.studentData?.batches || []
  };
});

userSchema.virtual('trainer').get(function() {
  if (this.role !== 'trainer') return null;
  return {
    _id: this._id,
    trainerId: this.trainerId || this.userId,
    name: this.name,
    email: this.email,
    phone: this.phone,
    expertise: this.trainerData?.expertise || [],
    bio: this.trainerData?.bio,
    qualification: this.trainerData?.qualification,
    experience: this.trainerData?.experience,
    dateOfJoining: this.trainerData?.dateOfJoining || this.createdAt,
    rating: this.trainerData?.rating || 0,
    isActive: this.isActive,
    profileImage: this.profileImage
  };
});

// Methods for role-based data access
userSchema.methods.getStudentData = function() {
  return this.student;
};

userSchema.methods.getTrainerData = function() {
  return this.trainer;
};

userSchema.methods.getAdminData = function() {
  if (this.role !== 'admin') return null;
  return {
    _id: this._id,
    userId: this.userId,
    name: this.name,
    email: this.email,
    phone: this.phone,
    permissions: this.adminData?.permissions || [],
    department: this.adminData?.department,
    accessLevel: this.adminData?.accessLevel || 'admin',
    isActive: this.isActive,
    profileImage: this.profileImage
  };
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);