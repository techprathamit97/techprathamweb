import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Course = require('@/models/Course');
const Trainer = require('@/models/Trainer'); // Load Trainer model for populate

// GET - Fetch all courses
export async function GET() {
  try {
    await connectMongo();
    
    const courses = await Course.find({})
      .populate('trainerId')
      .sort({ createdAt: -1 });
    
    return NextResponse.json(courses);
  } catch (error) {
    console.error('Failed to fetch courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

// POST - Create new course
export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    
    const data = await req.json();
    
    if (!data.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    const newCourse = await Course.create(data);
    
    return NextResponse.json(newCourse, { status: 201 });
  } catch (error) {
    console.error('Failed to create course:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
}
