import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const ModuleClass = require('@/models/ModuleClass');
const Batch = require('@/models/Batch');
const Notification = require('@/models/Notification');

// API endpoint to manually create next classes for a specific batch
export async function POST(req: NextRequest) {
  try {
    const { batchId, force } = await req.json();

    if (!batchId) {
      return NextResponse.json({ 
        success: false, 
        error: 'batchId is required' 
      }, { status: 400 });
    }

    await connectMongo();
    const now = new Date();
    // Use IST timezone for consistency
    const istNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));

    console.log(`🔄 Creating next class for batch: ${batchId} (IST: ${istNow.toLocaleString("en-IN", {timeZone: "Asia/Kolkata"})})`);

    // Get the batch information
    const batch = await Batch.findById(batchId).populate('courseId').lean();
    if (!batch) {
      return NextResponse.json({ 
        success: false, 
        error: 'Batch not found' 
      }, { status: 404 });
    }

    // Get the latest class for this batch
    const latestClass = await ModuleClass.findOne({
      batchId: batchId
    })
    .sort({ moduleIndex: -1, createdAt: -1 })
    .lean();

    if (!latestClass) {
      return NextResponse.json({ 
        success: false, 
        error: 'No existing classes found for this batch' 
      }, { status: 404 });
    }

    // Parse the batch timing
    if (!batch.timing) {
      return NextResponse.json({ 
        success: false, 
        error: 'Batch timing not configured' 
      }, { status: 400 });
    }

    const timingMatch = batch.timing.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!timingMatch) {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot parse batch timing: ${batch.timing}` 
      }, { status: 400 });
    }

    const [, hours, minutes, ampm] = timingMatch;
    let classHour = parseInt(hours);
    const classMinute = parseInt(minutes);
    
    // Convert to 24-hour format
    if (ampm.toUpperCase() === 'PM' && classHour !== 12) {
      classHour += 12;
    } else if (ampm.toUpperCase() === 'AM' && classHour === 12) {
      classHour = 0;
    }

    // Calculate next class date (tomorrow at same time) using IST
    const nextClassDate = new Date(istNow);
    nextClassDate.setDate(nextClassDate.getDate() + 1); // Tomorrow
    nextClassDate.setHours(classHour, classMinute, 0, 0);

    // Skip weekends
    while (nextClassDate.getDay() === 0 || nextClassDate.getDay() === 6) {
      nextClassDate.setDate(nextClassDate.getDate() + 1);
    }

    const scheduledDate = nextClassDate.toISOString().split('T')[0];
    const scheduledTime = `${classHour.toString().padStart(2, '0')}:${classMinute.toString().padStart(2, '0')}`;

    console.log(`Next class planned for: ${nextClassDate.toLocaleString("en-IN", {timeZone: "Asia/Kolkata"})} (${scheduledDate} ${scheduledTime})`);
    // Check if class already exists (unless force is true)
    if (!force) {
      const existingClass = await ModuleClass.findOne({
        batchId: batchId,
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime
      });

      if (existingClass) {
        return NextResponse.json({ 
          success: false, 
          error: `Class already exists for ${scheduledDate} at ${scheduledTime}`,
          existingClass: {
            _id: existingClass._id,
            moduleTitle: existingClass.moduleTitle,
            scheduledDate: existingClass.scheduledDate,
            scheduledTime: existingClass.scheduledTime
          }
        }, { status: 409 });
      }
    }

    // Generate next module info
    const nextModuleIndex = (latestClass.moduleIndex || 0) + 1;
    const courseTitle = batch.courseId?.title || latestClass.courseTitle || batch.batchName;
    const nextModuleTitle = `Class ${nextModuleIndex} - ${courseTitle}`;

    // Create the next class
    const nextClass = new ModuleClass({
      courseId: latestClass.courseId || batch.courseId,
      batchId: batchId,
      trainerId: latestClass.trainerId,
      moduleTitle: nextModuleTitle,
      moduleIndex: nextModuleIndex,
      scheduledDate: scheduledDate,
      scheduledTime: scheduledTime,
      duration: latestClass.duration || 60,
      status: 'scheduled',
      createdAt: istNow,
      updatedAt: istNow,
      autoCreated: true,
      manuallyTriggered: true
    });

    await nextClass.save();

    console.log(`✅ Created next class: ${nextModuleTitle} on ${scheduledDate} at ${scheduledTime}`);

    // Create notifications for students
    const studentIds = batch.studentIds?.map((id: any) => id.toString()) || [];
    const notifications = [];

    for (const studentId of studentIds) {
      notifications.push({
        studentId,
        batchId: batchId,
        title: 'New Class Scheduled',
        message: `${nextModuleTitle} has been scheduled for ${nextClassDate.toLocaleDateString('en-IN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })} at ${hours}:${minutes} ${ampm}`,
        type: 'class_scheduled',
        priority: 'normal',
        relatedId: nextClass._id,
        relatedType: 'ModuleClass',
        actionUrl: '/student/batch-management'
      });
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`📢 Sent ${notifications.length} notifications about new class`);
    }

    return NextResponse.json({
      success: true,
      message: 'Next class created successfully',
      nextClass: {
        _id: nextClass._id,
        moduleTitle: nextClass.moduleTitle,
        moduleIndex: nextClass.moduleIndex,
        scheduledDate: nextClass.scheduledDate,
        scheduledTime: nextClass.scheduledTime,
        duration: nextClass.duration,
        status: nextClass.status
      },
      notificationsSent: notifications.length
    });

  } catch (error: any) {
    console.error('Error creating next class:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// GET endpoint to check what the next class would be
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ 
        success: false, 
        error: 'batchId is required' 
      }, { status: 400 });
    }

    await connectMongo();

    // Get batch info
    const batch = await Batch.findById(batchId).populate('courseId').lean();
    if (!batch) {
      return NextResponse.json({ 
        success: false, 
        error: 'Batch not found' 
      }, { status: 404 });
    }

    // Get latest class
    const latestClass = await ModuleClass.findOne({
      batchId: batchId
    })
    .sort({ moduleIndex: -1, createdAt: -1 })
    .lean();

    if (!latestClass) {
      return NextResponse.json({ 
        success: false, 
        error: 'No classes found for this batch' 
      }, { status: 404 });
    }

    // Check if there's already a future class
    const now = new Date();
    const futureClass = await ModuleClass.findOne({
      batchId: batchId,
      $or: [
        { status: 'scheduled' },
        { 
          scheduledDate: { $gte: now.toISOString().split('T')[0] }
        }
      ]
    })
    .sort({ scheduledDate: 1, scheduledTime: 1 })
    .lean();

    return NextResponse.json({
      success: true,
      batch: {
        _id: batch._id,
        batchName: batch.batchName,
        timing: batch.timing
      },
      latestClass: {
        _id: latestClass._id,
        moduleTitle: latestClass.moduleTitle,
        moduleIndex: latestClass.moduleIndex,
        status: latestClass.status
      },
      futureClass: futureClass ? {
        _id: futureClass._id,
        moduleTitle: futureClass.moduleTitle,
        scheduledDate: futureClass.scheduledDate,
        scheduledTime: futureClass.scheduledTime,
        status: futureClass.status
      } : null,
      canCreateNext: !futureClass
    });

  } catch (error: any) {
    console.error('Error checking next class:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}