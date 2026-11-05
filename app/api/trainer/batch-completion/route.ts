import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Batch = require('@/models/Batch');
const Trainer = require('@/models/Trainer');

/**
 * Trainer marks a batch as completed. This does NOT complete the batch on its
 * own — it raises a request that an admin must approve on /lms/batches. The
 * trainer must type "completed" to confirm (sent as `confirmText`).
 */
export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const body = await req.json();
    const { batchId, trainerId, confirmText } = body;

    if (!batchId || !trainerId) {
      return NextResponse.json(
        { error: 'Batch ID and trainer ID are required' },
        { status: 400 }
      );
    }

    // Guard: the confirmation word must be exactly "completed".
    if (String(confirmText || '').trim().toLowerCase() !== 'completed') {
      return NextResponse.json(
        { error: 'Please type "completed" to confirm.' },
        { status: 400 }
      );
    }

    // Resolve the trainer the same way the dashboard API does (accepts Mongo _id,
    // trainerId field, or email) so this works with whatever the client stored.
    let trainer = null;
    if (/^[0-9a-fA-F]{24}$/.test(trainerId)) {
      trainer = await Trainer.findById(trainerId).lean();
    }
    if (!trainer) {
      trainer = await Trainer.findOne({ trainerId }).lean();
    }
    if (!trainer && String(trainerId).includes('@')) {
      trainer = await Trainer.findOne({ email: trainerId }).lean();
    }
    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }

    // Read as a plain object so completionRequest is visible even if the
    // in-memory Batch schema is stale (lean returns the raw stored document).
    const batch = await Batch.findById(batchId).lean();
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // A trainer may only request completion for their own batch.
    if (!batch.trainerId || batch.trainerId.toString() !== trainer._id.toString()) {
      return NextResponse.json(
        { error: 'You are not assigned to this batch.' },
        { status: 403 }
      );
    }

    const currentStatus = batch.completionRequest?.status || 'none';
    if (currentStatus === 'approved') {
      return NextResponse.json(
        { error: 'This batch has already been completed.' },
        { status: 409 }
      );
    }
    if (currentStatus === 'pending') {
      return NextResponse.json({
        success: true,
        alreadyPending: true,
        message: 'Completion is already awaiting admin approval.',
        completionStatus: 'pending'
      });
    }

    // Persist with a direct update using { strict: false }. This guarantees the
    // completionRequest is written even if the Batch model in memory was compiled
    // from an older schema (a common Next.js + Mongoose dev caching issue) that
    // would otherwise strip the field on a document .save().
    await Batch.updateOne(
      { _id: batch._id },
      {
        $set: {
          completionRequest: {
            status: 'pending',
            requestedAt: new Date(),
            requestedBy: trainer._id
          }
        }
      },
      { strict: false }
    );

    return NextResponse.json({
      success: true,
      message: 'Completion request submitted. Awaiting admin approval.',
      completionStatus: 'pending'
    });
  } catch (error: any) {
    console.error('Batch completion request error:', error);
    return NextResponse.json(
      { error: 'Failed to submit completion request', detail: error?.message },
      { status: 500 }
    );
  }
}
