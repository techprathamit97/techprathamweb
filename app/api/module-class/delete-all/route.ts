import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const ModuleClass = require('@/models/ModuleClass');

// GET - Count module classes (for preview) - no auth needed for simplicity
export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const count = await ModuleClass.countDocuments();

    // Also get breakdown
    const byStatus = await ModuleClass.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const withRecordings = await ModuleClass.countDocuments({
      recordings: { $exists: true, $ne: [] }
    });

    return NextResponse.json({
      success: true,
      data: {
        total: count,
        byStatus: byStatus,
        withRecordings: withRecordings
      }
    });
  } catch (error: any) {
    console.error('Error counting module classes:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Delete all module classes - no auth for simplicity
export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    // First, count existing records
    const count = await ModuleClass.countDocuments();

    if (count === 0) {
      return NextResponse.json({
        success: true,
        message: 'No modules to delete'
      });
    }

    // Get breakdown before deletion
    const byStatus = await ModuleClass.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Delete all ModuleClass records
    const result = await ModuleClass.deleteMany({});

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} module classes`,
      deletedCount: result.deletedCount,
      breakdown: byStatus
    });
  } catch (error: any) {
    console.error('Error deleting module classes:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Also support DELETE method
export async function DELETE(req: NextRequest) {
  return POST(req);
}