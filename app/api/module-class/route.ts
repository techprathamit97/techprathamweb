import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import { getJoinUrl, createMeeting, isMeetingRunning } from '@/lib/bigbluebutton';
const ModuleClass = require('@/models/ModuleClass');

// GET - Fetch single module class by ID
export async function GET(request: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const trainerId = searchParams.get('trainerId');
    const batchId = searchParams.get('batchId');
    const status = searchParams.get('status');

    // If classId is provided, return single class
    if (classId) {
      const moduleClass = await ModuleClass.findById(classId)
        .populate('batchId', 'batchName')
        .populate('courseId', 'title')
        .populate('trainerId', 'name')
        .lean();

      if (!moduleClass) {
        return NextResponse.json({ 
          success: false, 
          error: 'Class not found' 
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: moduleClass
      });
    }

    // Otherwise return list of classes
    let query: any = {};
    
    if (trainerId) query.trainerId = trainerId;
    if (batchId) query.batchId = batchId;
    if (status) query.status = status;

    const classes = await ModuleClass.find(query)
      .populate('batchId', 'batchName')
      .populate('courseId', 'title')
      .populate('trainerId', 'name')
      .sort({ scheduledDate: 1, scheduledTime: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: classes
    });
  } catch (error: any) {
    console.error('Error fetching module classes:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Schedule a new module class
export async function POST(request: NextRequest) {
  try {
    await connectMongo();

    const body = await request.json();
    const {
      courseId,
      batchId,
      moduleIndex,
      moduleTitle,
      trainerId,
      scheduledDate,
      scheduledTime,
      duration,
      meetingLink
    } = body;

    // Validate required fields
    if (!courseId || !batchId || moduleIndex === undefined || !trainerId || !scheduledDate || !scheduledTime) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Find the latest INCOMPLETE class for this module (to transfer recordings)
    const incompleteClass = await ModuleClass.findOne({
      courseId,
      batchId,
      moduleIndex,
      isCompleted: false,
      status: { $ne: 'cancelled' }
    }).sort({ createdAt: -1 });

    // Transfer recordings from incomplete class to new class
    let previousRecordings: any[] = [];
    if (incompleteClass && incompleteClass.recordings && incompleteClass.recordings.length > 0) {
      previousRecordings = [...incompleteClass.recordings];
      console.log('Transferring recordings from incomplete class:', previousRecordings.length);
    }

    // Generate simple room identifier
    const tempRoomId = `class-${Date.now()}`;
    
    const serverUrl = 'https://class.techpratham.org';

    // Instead of creating BBB meeting via API (which has checksum issues),
    // we'll store class info and let users create rooms manually in Greenlight
    let bbbJoinUrl = `${serverUrl}/rooms`;
    let bbbModeratorJoinUrl = `${serverUrl}/rooms`;

    // Create new module class
    const moduleClass = new ModuleClass({
      courseId,
      batchId,
      moduleIndex,
      moduleTitle,
      trainerId,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      duration: duration || 60,
      meetingLink: meetingLink || '',
      roomId: tempRoomId,
      status: 'scheduled',
      isLive: false,
      isCompleted: false,
      canJoin: false,
      recordingUrl: null,
      recordings: previousRecordings, // Transfer recordings from previous incomplete class

      // Simple BBB Integration (Manual Room Creation)
      platform: 'bbb',
      bbbJoinUrl: bbbJoinUrl,
      bbbModeratorJoinUrl: bbbModeratorJoinUrl,
    });

    try {
      await moduleClass.save();
    } catch (error: any) {
      // Handle duplicate key error (E11000)
      if (error.code === 11000 && error.keyPattern && 
          error.keyPattern.courseId && error.keyPattern.batchId && error.keyPattern.moduleIndex) {
        
        console.log('Duplicate class detected, updating existing class instead');
        
        // Find and update the existing class
        const existingClass = await ModuleClass.findOne({
          courseId,
          batchId,
          moduleIndex
        });

        if (existingClass) {
          // Update the existing class with new scheduling details
          existingClass.moduleTitle = moduleTitle || existingClass.moduleTitle;
          existingClass.trainerId = trainerId;
          existingClass.scheduledDate = new Date(scheduledDate);
          existingClass.scheduledTime = scheduledTime;
          existingClass.duration = duration || existingClass.duration;
          existingClass.meetingLink = meetingLink || existingClass.meetingLink;
          existingClass.status = 'scheduled';
          existingClass.isLive = false;
          existingClass.isCompleted = false;
          existingClass.canJoin = false;
          existingClass.updatedAt = new Date();

          // Keep existing recordings if any, otherwise use transferred recordings
          if (!existingClass.recordings || existingClass.recordings.length === 0) {
            existingClass.recordings = previousRecordings;
          }

          await existingClass.save();

          console.log('=== CLASS UPDATE SUCCESS ===');
          console.log('Updated existing class:', existingClass._id);

          return NextResponse.json({
            success: true,
            data: existingClass,
            message: 'Updated existing class with new schedule details'
          });
        }
      }
      
      // Re-throw the error if it's not a duplicate key error we can handle
      throw error;
    }

    // Update the roomId to use the actual MongoDB _id for uniqueness
    moduleClass.roomId = `class-${moduleClass._id}`;
    await moduleClass.save();

    console.log('=== CLASS CREATION SUCCESS ===');
    console.log('Room ID:', moduleClass.roomId);
    console.log('Join URL:', bbbJoinUrl);
    console.log('Moderator URL:', bbbModeratorJoinUrl);

    return NextResponse.json({
      success: true,
      data: moduleClass,
      message: previousRecordings.length > 0 ? `${previousRecordings.length} recordings transferred from previous class` : undefined
    });
  } catch (error: any) {
    console.error('Error scheduling module class:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update module class (reschedule, add recording, mark completed)
export async function PUT(request: NextRequest) {
  try {
    await connectMongo();

    const body = await request.json();
    const { classId, notifyStudents, ...updates } = body;

    if (!classId) {
      return NextResponse.json({
        success: false,
        error: 'Class ID is required'
      }, { status: 400 });
    }

    // Get original class for comparison
    const originalClass = await ModuleClass.findById(classId);

    // Handle class completion - expire meeting and set completion flags
    if (updates.status === 'completed') {
      updates.isCompleted = true;
      updates.actualEndTime = new Date();
      updates.canJoin = false;
      updates.isLive = false;
      // Clear meeting link to expire the meeting
      updates.meetingLink = '';
    }

    const moduleClass = await ModuleClass.findByIdAndUpdate(
      classId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );

    if (!moduleClass) {
      return NextResponse.json({
        success: false,
        error: 'Class not found'
      }, { status: 404 });
    }

    // Send notifications if class was rescheduled
    if (notifyStudents !== false && originalClass) {
      const isRescheduled =
        (updates.scheduledDate && new Date(updates.scheduledDate).toDateString() !== new Date(originalClass.scheduledDate).toDateString()) ||
        (updates.scheduledTime && updates.scheduledTime !== originalClass.scheduledTime);

      if (isRescheduled) {
        // Get students from batch
        const Batch = require('@/models/Batch');
        const batch = await Batch.findById(moduleClass.batchId).lean();

        if (batch && batch.students) {
          const notifications = batch.students.map((student: any) => ({
            studentId: student.studentId,
            title: `Class Rescheduled: ${moduleClass.moduleTitle}`,
            message: `Your class "${moduleClass.moduleTitle}" has been rescheduled. New date: ${new Date(updates.scheduledDate || moduleClass.scheduledDate).toLocaleDateString()} at ${updates.scheduledTime || moduleClass.scheduledTime}.`,
            type: 'class_rescheduled',
            priority: 'high',
            relatedId: moduleClass._id,
            relatedType: 'LiveClass',
            batchId: moduleClass.batchId,
            actionUrl: '/student/courses'
          }));

          const Notification = require('@/models/Notification');
          await Notification.insertMany(notifications);
          console.log(`Sent reschedule notifications to ${notifications.length} students`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: moduleClass
    });
  } catch (error: any) {
    console.error('Error updating module class:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Cancel module class
export async function DELETE(request: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const notifyStudents = searchParams.get('notifyStudents') !== 'false';

    if (!classId) {
      return NextResponse.json({
        success: false,
        error: 'Class ID is required'
      }, { status: 400 });
    }

    // Get original class before updating
    const originalClass = await ModuleClass.findById(classId).populate('batchId');

    const moduleClass = await ModuleClass.findByIdAndUpdate(
      classId,
      { status: 'cancelled', updatedAt: new Date() },
      { new: true }
    );

    if (!moduleClass) {
      return NextResponse.json({
        success: false,
        error: 'Class not found'
      }, { status: 404 });
    }

    // Send cancellation notifications to students
    if (notifyStudents && originalClass?.batchId) {
      const batch = originalClass.batchId;
      if (batch.students && Array.isArray(batch.students)) {
        const notifications = batch.students.map((student: any) => ({
          studentId: student.studentId,
          title: `Class Cancelled: ${moduleClass.moduleTitle}`,
          message: `Your class "${moduleClass.moduleTitle}" scheduled for ${new Date(moduleClass.scheduledDate).toLocaleDateString()} at ${moduleClass.scheduledTime} has been cancelled.`,
          type: 'class_cancelled',
          priority: 'high',
          relatedId: moduleClass._id,
          relatedType: 'LiveClass',
          batchId: moduleClass.batchId,
          actionUrl: '/student/courses'
        }));

        const Notification = require('@/models/Notification');
        await Notification.insertMany(notifications);
        console.log(`Sent cancellation notifications to ${notifications.length} students`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Class cancelled successfully'
    });
  } catch (error: any) {
    console.error('Error cancelling module class:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}