import { NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import Certificate from '@/models/Certificate.js';

export async function DELETE() {
  try {
    await connectMongo();

    const result = await Certificate.deleteMany({});

    return NextResponse.json({
      message: `Deleted ${result.deletedCount} certificates`,
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    console.error('Delete certificates error:', error);
    return NextResponse.json(
      { error: 'Failed to delete certificates' },
      { status: 500 }
    );
  }
}