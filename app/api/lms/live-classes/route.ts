import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// MongoDB connection helper
async function getDb() {
  const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!MONGODB_URI) {
    throw new Error('MongoDB URI not configured');
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
  }
  return mongoose.connection.db;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'scheduled';
    const limit = parseInt(searchParams.get('limit') || '100');
    const batchId = searchParams.get('batchId');

    const db = await getDb();
    if (!db) throw new Error('Database connection failed');

    // Query DailyClass for scheduled classes
    const query: any = {};

    if (status === 'scheduled') {
      query.classDate = { $gte: new Date() };
    }

    if (batchId) {
      query.batchId = new mongoose.Types.ObjectId(batchId);
    }

    const classes = await db.collection('dailyclasses')
      .find(query)
      .sort({ classDate: 1 })
      .limit(limit)
      .toArray();

    // Get batch names
    const batchIds = [...new Set(classes.map(c => c.batchId?.toString()).filter(Boolean))];
    const batches = await db.collection('batches')
      .find({ _id: { $in: batchIds.map(id => new mongoose.Types.ObjectId(id)) } })
      .toArray();

    const batchMap = new Map(batches.map(b => [b._id.toString(), b.name]));

    // Get trainer names
    const trainerIds = [...new Set(classes.map(c => c.trainerId?.toString()).filter(Boolean))];
    const trainers = await db.collection('trainers')
      .find({ _id: { $in: trainerIds.map(id => new mongoose.Types.ObjectId(id)) } })
      .toArray();

    const trainerMap = new Map(trainers.map(t => [t._id.toString(), t.name]));

    // Transform to match LiveClass interface
    const liveClasses = classes.map(cls => ({
      _id: cls._id,
      title: cls.topic || 'Live Class',
      description: cls.topic || '',
      batchName: batchMap.get(cls.batchId?.toString()) || 'Unknown Batch',
      trainerName: trainerMap.get(cls.trainerId?.toString()) || 'Unknown Trainer',
      scheduledDate: cls.classDate,
      scheduledTime: cls.classDate ? new Date(cls.classDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
      duration: 60, // Default duration
      status: new Date(cls.classDate) > new Date() ? 'scheduled' : 'completed',
      roomConfig: {
        meetingLink: cls.meetLink || '',
        platform: cls.meetLink?.includes('bbb') || cls.meetLink?.includes('bigbluebutton') ? 'bbb' : 'meet'
      },
      recording: {
        enabled: !!cls.recordingUrl,
        recordingUrl: cls.recordingUrl || ''
      }
    }));

    return NextResponse.json({
      success: true,
      data: liveClasses,
      total: liveClasses.length
    });

  } catch (error: any) {
    console.error('Error fetching live classes:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch classes'
    }, { status: 500 });
  }
}