const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  courseName: { type: String, required: true },
  trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer' },

  // Amount details
  totalFees: { type: Number, required: true },
  paidAmount: { type: Number, required: true },
  dueAmount: { type: Number, default: 0 },
  previousPaidAmount: { type: Number, default: 0 },

  // Payment details
  paymentDate: { type: Date, required: true },
  paymentSource: { type: String, enum: ['cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other'], default: 'bank_transfer' },
  transactionId: { type: String },
  transactionDetails: { type: String },
  paymentScreenshot: { type: String },

  // Status and installment
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'partial'],
    default: 'pending'
  },
  installmentNumber: { type: Number, default: 1 },
  isInstallment: { type: Boolean, default: false },

  // Invoice details
  invoiceDate: { type: Date, default: Date.now },
  invoiceGeneratedBy: { type: String },

  // Additional fields
  remarks: { type: String },
  verifiedBy: { type: String },
  verifiedAt: { type: Date },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// Auto-calculate due amount before saving
paymentSchema.pre('save', function(next) {
  this.dueAmount = this.totalFees - this.paidAmount - this.previousPaidAmount;
  if (this.dueAmount > 0 && this.paidAmount > 0) {
    this.isInstallment = true;
    this.paymentStatus = 'partial';
  } else if (this.dueAmount <= 0) {
    this.paymentStatus = 'completed';
    this.isInstallment = false;
  }
  next();
});

// Generate invoice number
paymentSchema.statics.generateInvoiceNumber = async function() {
  const count = await this.countDocuments() + 1;
  const year = new Date().getFullYear();
  return `INV/${year}/${String(count).padStart(5, '0')}`;
};

module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);