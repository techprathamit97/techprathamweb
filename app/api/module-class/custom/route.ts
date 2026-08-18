import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const ModuleClass = require('@/models/ModuleClass');
const Batch = require('@/models/Batch');

/**
 * Creates an ad-hoc ("custom") class that the trainer can start immediately,
 * outside the batch's normal timetable.
 *
 * The row is created as 'scheduled' at the current time. It becomes live for
 * students the moment the trainer joins it, because /api/join-class creates the
 * BBB meeting and flips the status, and /api/batch-live-status then reports it.
 * That keeps the single-live-class-per-batch rule intact.
 */
export async function POST(request: NextRequest) {
  try {
    await connectMongo();

    const body = await request.json();
    const { batchId, trainerId, title, duration } = body;

    if (!batchId || !trainerId) {
      return NextResponse.json(
        { success: false, error: 'batchId and trainerId are required' },
        { status: 400 }
      );
    }

    const batch = await Batch.findById(batchId).lean();
    if (!batch) {
      return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
    }

    // Enforce one live class per batch: retire anything already live so students
    // are never shown two joinable classes at once.
    const previouslyLive = await ModuleClass.find({
      batchId,
      status: 'live',
      isLive: true
    });

    for (const old of previouslyLive) {
      console.log(`🔄 Retiring previous live class: ${old.moduleTitle}`);
      await ModuleClass.findByIdAndUpdate(old._id, {
        status: 'completed',
        isLive: false,
        actualEndTime: new Date(),
        $unset: { joinedSessionTokens: 1, studentSessionTokens: 1 }
      });
    }

    // moduleIndex is part of a unique compound index, so derive it from the
    // current maximum rather than a count (counts collide after deletions).
    const lastClass = await ModuleClass.findOne({ batchId })
      .sort({ moduleIndex: -1 })
      .select('moduleIndex')
      .lean();

    const nextIndex = (lastClass?.moduleIndex || 0) + 1;

    const now = new Date();
    const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const scheduledTime =
      `${istNow.getHours().toString().padStart(2, '0')}:` +
      `${istNow.getMinutes().toString().padStart(2, '0')}`;

    const batchDisplayName = batch.batchName || 'Class';
    const moduleTitle =
      (typeof title === 'string' && title.trim().length > 0)
        ? title.trim()
        : `${batchDisplayName} - Custom Class ${nextIndex}`;

    const newClass = new ModuleClass({
      courseId: batch.courseId || batchId,
      batchId,
      trainerId,
      moduleIndex: nextIndex,
      moduleTitle,
      moduleDescription: 'Ad-hoc class started by the trainer',
      scheduledDate: now,
      scheduledTime,
      duration: typeof duration === 'number' && duration > 0 ? duration : 60,
      roomId: `custom-${batchId}-${now.getTime()}`,
      status: 'scheduled',
      isLive: false,
      canJoin: true,
      platform: 'bbb',
      recordingEnabled: true
    });

    await newClass.save();

    console.log(`✅ Created custom class "${moduleTitle}" (index ${nextIndex})`);

    return NextResponse.json(
      {
        success: true,
        retiredLiveClasses: previouslyLive.length,
        data: {
          _id: String(newClass._id),
          moduleTitle: newClass.moduleTitle,
          scheduledDate: newClass.scheduledDate,
          scheduledTime: newClass.scheduledTime,
          duration: newClass.duration,
          moduleIndex: newClass.moduleIndex
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ custom class creation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
