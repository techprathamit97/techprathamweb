import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
const Batch = require("@/models/Batch");
const Course = require("@/models/Course");
const Trainer = require("@/models/Trainer");
const Student = require("@/models/Student");
const ModuleClass = require("@/models/ModuleClass");

// Helper function to create only the next class (progressive scheduling)
async function createNextClassForBatch(batch: any) {
  try {
    // Find the highest moduleIndex in existing classes
    const lastClass = await ModuleClass.findOne({
      batchId: batch._id
    }).sort({ moduleIndex: -1 });
    
    const nextModuleIndex = lastClass ? lastClass.moduleIndex + 1 : 1;
    
    // Don't create more than 50 classes total
    if (nextModuleIndex > 50) {
      console.log(`Batch ${batch.batchName} has reached maximum classes (50)`);
      return null;
    }
    
    // Get the course to determine module details
    const course = await Course.findById(batch.courseId);
    
    // Calculate next class date based on frequency and last class
    let nextClassDate = new Date();
    
    if (lastClass) {
      // Base next class on the last scheduled class
      const lastScheduledDate = new Date(lastClass.scheduledDate);
      
      if (batch.classFrequency === 'daily') {
        // Next weekday
        nextClassDate = new Date(lastScheduledDate);
        nextClassDate.setDate(nextClassDate.getDate() + 1);
        
        // Skip weekends
        while (nextClassDate.getDay() === 0 || nextClassDate.getDay() === 6) {
          nextClassDate.setDate(nextClassDate.getDate() + 1);
        }
      } else if (batch.classFrequency === 'weekly') {
        // Next class based on daysOfWeek
        nextClassDate = new Date(lastScheduledDate);
        nextClassDate.setDate(nextClassDate.getDate() + 7); // Next week
      } else {
        // Default: next day
        nextClassDate = new Date(lastScheduledDate);
        nextClassDate.setDate(nextClassDate.getDate() + 1);
      }
    } else {
      // First class - use batch start date
      nextClassDate = new Date(batch.startDate || new Date());
    }
    
    // Don't create classes beyond end date
    if (batch.endDate && nextClassDate > new Date(batch.endDate)) {
      console.log(`Next class date ${nextClassDate} is beyond batch end date ${batch.endDate}`);
      return null;
    }
    
    // Check if class already exists for this module index
    const existingClass = await ModuleClass.findOne({
      batchId: batch._id,
      moduleIndex: nextModuleIndex
    });
    
    if (existingClass) {
      console.log(`Class ${nextModuleIndex} already exists for batch ${batch.batchName}`);
      return existingClass;
    }
    
    // Create the next class
    const classData = {
      courseId: batch.courseId,
      batchId: batch._id,
      moduleIndex: nextModuleIndex,
      moduleTitle: `Class ${nextModuleIndex} - ${course?.title || 'JAVA'}`,
      moduleDescription: `Class ${nextModuleIndex} for batch ${batch.batchName}`,
      trainerId: batch.trainerId,
      scheduledDate: nextClassDate,
      scheduledTime: batch.startTime || '09:00',
      duration: batch.classDuration || 60,
      roomId: `class-${batch._id}-${nextModuleIndex}`,
      status: 'scheduled',
      isLive: false,
      isCompleted: false,
      canJoin: false,
      platform: 'bbb',
      recordingEnabled: true
    };
    
    const newClass = await ModuleClass.create(classData);
    console.log(`✅ Created next class: ${newClass.moduleTitle} for ${nextClassDate.toDateString()}`);
    return newClass;
  } catch (error) {
    console.error('Error creating next class:', error);
    return null;
  }
}

export async function GET() {
  try {
    await connectMongo();
    
    const batches = await Batch.find({})
      .populate('courseId')
      .populate('trainerId')
      .sort({ createdAt: -1 })
      .lean();
    
    // Get student count for each batch
    const batchesWithDetails = batches.map((batch: any) => ({
      _id: batch._id,
      batchId: batch._id.toString(),
      batchName: batch.batchName,
      batchCode: batch.batchCode,
      courseId: batch.courseId?._id?.toString() || batch.courseId || '',
      course_title: batch.courseId?.title || 'N/A',
      trainerId: batch.trainerId?._id?.toString() || '',
      trainerName: batch.trainerId?.name || 'Not Assigned',
      trainer: batch.trainerId ? {
        name: batch.trainerId.name || 'Not Assigned',
        email: batch.trainerId.email || '',
        profile: batch.trainerId.profile || '',
        experience: batch.trainerId.experience || 'N/A',
        rating: batch.trainerId.rating || 0
      } : {
        name: 'Not Assigned',
        email: '',
        profile: '',
        experience: 'N/A',
        rating: 0
      },
      studentIds: batch.studentIds || [],
      studentCount: (batch.studentIds || []).length,
      startDate: batch.startDate,
      endDate: batch.endDate,
      timing: batch.timing || '',
      capacity: batch.capacity || 30,
      status: batch.status || 'active',
      meetingLink: batch.meetingLink || '',
      description: batch.description || '',
      createdAt: batch.createdAt
    }));
    
    return NextResponse.json(batchesWithDetails);
  } catch (error) {
    console.error('Failed to fetch batches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batches' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectMongo();
    
    const data = await req.json();
    
    if (!data.batchName || !data.courseId) {
      return NextResponse.json(
        { error: 'Batch name and course are required' },
        { status: 400 }
      );
    }
    
    const newBatch = await Batch.create({
      batchName: data.batchName,
      batchCode: data.batchCode || `BATCH-${Date.now()}`,
      courseId: data.courseId,
      trainerId: data.trainerId,
      studentIds: data.studentIds || [],
      startDate: data.startDate,
      endDate: data.endDate,
      timing: data.timing,
      startTime: data.startTime,
      endTime: data.endTime,
      classFrequency: data.classFrequency || 'daily',
      classDuration: data.classDuration || 60,
      daysOfWeek: data.daysOfWeek || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      capacity: data.capacity || 30,
      description: data.description,
      status: 'active'
    });
    
    let generatedClassesCount = 0;
    
    // Create only the first class initially (progressive scheduling)
    if (data.autoGenerateClasses) {
      const firstClass = await createNextClassForBatch(newBatch);
      if (firstClass) {
        generatedClassesCount = 1;
        console.log(`Created first class for batch ${newBatch.batchName}: ${firstClass.moduleTitle}`);
      }
    }
    
    return NextResponse.json({
      ...newBatch.toObject(),
      generatedClassesCount
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create batch:', error);
    return NextResponse.json(
      { error: 'Failed to create batch' },
      { status: 500 }
    );
  }
}