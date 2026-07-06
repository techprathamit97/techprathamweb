// Script to delete all ModuleClass records
// Run with: node scripts/delete-all-modules.js

const mongoose = require('mongoose');

// Use the Atlas connection string from .env.local
const MONGODB_URI = 'mongodb+srv://thebippu:1h713z8oSUhDVACK@techpratham.gfahaev.mongodb.net/lms?retryWrites=true&w=majority&appName=techpratham';

async function deleteAllModules() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    const ModuleClass = require('../models/ModuleClass');

    // First, count existing records
    const count = await ModuleClass.countDocuments();
    console.log(`\nTotal ModuleClass records found: ${count}`);

    if (count === 0) {
      console.log('No records to delete.');
      await mongoose.disconnect();
      return;
    }

    // Show breakdown by status
    const byStatus = await ModuleClass.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('\nBreakdown by status:');
    byStatus.forEach(s => {
      console.log(`  ${s._id}: ${s.count}`);
    });

    // Show count with recordings
    const withRecordings = await ModuleClass.countDocuments({
      recordings: { $exists: true, $ne: [] }
    });
    console.log(`\nModules with recordings: ${withRecordings}`);

    // Delete all
    console.log('\nDeleting all ModuleClass records...');
    const result = await ModuleClass.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} records`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteAllModules();