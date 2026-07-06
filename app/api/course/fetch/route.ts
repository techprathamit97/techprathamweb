import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Course = require('@/models/Course');
const Trainer = require('@/models/Trainer'); // Load Trainer model for populate

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    
    // Fetch all courses - no populate needed for dropdown
    const courses = await Course.find({})
      .sort({ title: 1 })
      .lean();
    
    return NextResponse.json(courses);
  } catch (error: any) {
    console.error('Failed to fetch courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses', message: error.message },
      { status: 500 }
    );
  }
}
