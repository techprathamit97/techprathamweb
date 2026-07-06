// Simple Node.js script to check trainer and batch state
const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/lms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// TrainerAuth schema
const trainerAuthSchema = new mongoose.Schema({
  trainerId: String,
  email: String,
  password: String,
  name: String,
  phone: String,
  isActive: Boolean,
  lastLogin: Date,
}, { timestamps: true });

const TrainerAuth = mongoose.model('TrainerAuth', trainerAuthSchema);

// Batch schema
const batchSchema = new mongoose.Schema({
  batchId: String,
  course_title: String,
  trainerId: String,
  enrolled_students: [String],
  status: String,
}, { timestamps: true });

const Batch = mongoose.model('Batch', batchSchema);

// ManualInvoice schema
const manualInvoiceSchema = new mongoose.Schema({
  customerDetails: {
    studentId: String,
    name: String,
    email: String,
    phone: String,
  },
  courseDetails: {
    title: String,
    category: String,
  },
  totalAmount: Number,
  paidAmount: Number,
  status: String,
}, { timestamps: true });

const ManualInvoice = mongoose.model('ManualInvoice', manualInvoiceSchema);

const checkState = async () => {
  try {
    await connectDB();
    
    console.log('=== CHECKING CURRENT STATE ===');
    
    // Get all trainers
    const trainers = await TrainerAuth.find({});
    console.log('\n--- TRAINERS ---');
    trainers.forEach(trainer => {
      console.log(`ID: ${trainer.trainerId}, Name: ${trainer.name}, Email: ${trainer.email}`);
    });
    
    // Get all batches
    const batches = await Batch.find({});
    console.log('\n--- BATCHES ---');
    batches.forEach(batch => {
      console.log(`Batch: ${batch.batchId}, Course: ${batch.course_title}, TrainerID: ${batch.trainerId}, Students: ${batch.enrolled_students.length}`);
      if (batch.enrolled_students.length > 0) {
        console.log(`  Students: ${batch.enrolled_students.join(', ')}`);
      }
    });
    
    // Check for TR0001 specifically
    console.log('\n--- TR0001 ANALYSIS ---');
    const tr0001Trainer = await TrainerAuth.findOne({ trainerId: 'TR0001' });
    console.log('TR0001 trainer exists:', tr0001Trainer ? 'YES' : 'NO');
    if (tr0001Trainer) {
      console.log(`TR0001 details: ${tr0001Trainer.name} (${tr0001Trainer.email})`);
    }
    
    const tr0001Batches = await Batch.find({ trainerId: 'TR0001' });
    console.log(`Batches for TR0001: ${tr0001Batches.length}`);
    
    if (tr0001Batches.length > 0) {
      console.log('TR0001 batches:');
      for (const batch of tr0001Batches) {
        console.log(`  - ${batch.batchId}: ${batch.course_title} (${batch.enrolled_students.length} students)`);
        
        // Check if we have invoice data for these students
        if (batch.enrolled_students.length > 0) {
          const invoices = await ManualInvoice.find({
            'customerDetails.studentId': { $in: batch.enrolled_students }
          });
          console.log(`    Invoices found for batch students: ${invoices.length}`);
          invoices.forEach(inv => {
            console.log(`      - ${inv.customerDetails.studentId}: ${inv.customerDetails.name} (${inv.courseDetails.title})`);
          });
        }
      }
    }
    
    // Check for tptrainer12
    console.log('\n--- TPTRAINER12 ANALYSIS ---');
    const tptrainer12 = await TrainerAuth.findOne({ trainerId: 'tptrainer12' });
    console.log('tptrainer12 trainer exists:', tptrainer12 ? 'YES' : 'NO');
    if (tptrainer12) {
      console.log(`tptrainer12 details: ${tptrainer12.name} (${tptrainer12.email})`);
    }
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total trainers: ${trainers.length}`);
    console.log(`Total batches: ${batches.length}`);
    console.log(`TR0001 exists: ${tr0001Trainer ? 'YES' : 'NO'}`);
    console.log(`tptrainer12 exists: ${tptrainer12 ? 'YES' : 'NO'}`);
    console.log(`Batches for TR0001: ${tr0001Batches.length}`);
    
    if (!tr0001Trainer && tptrainer12) {
      console.log('\n🔧 RECOMMENDED ACTION: Run fix-trainer-id.js to update tptrainer12 → TR0001');
    } else if (tr0001Trainer) {
      console.log('\n✅ TR0001 trainer exists - login should work');
    }
    
  } catch (error) {
    console.error('Error checking state:', error);
  } finally {
    mongoose.connection.close();
  }
};

checkState();