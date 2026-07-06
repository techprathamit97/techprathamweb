import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// Connect to MongoDB
async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';
    await mongoose.connect(mongoUri);
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG: Module Classes Endpoint ===');
    
    await connectDB();
    console.log('✅ Connected to MongoDB');

    const ModuleClass = (await import('@/models/ModuleClass')).default;
    
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    
    // Count total classes
    const totalCount = await ModuleClass.countDocuments();
    console.log(`Total module classes: ${totalCount}`);
    
    let result: any = {
      success: true,
      totalClasses: totalCount,
      mongoConnection: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      database: mongoose.connection.name || 'Unknown'
    };
    
    if (classId) {
      // Test specific class lookup
      console.log(`Looking for specific class: ${classId}`);
      
      let objectIdStr = classId;
      if (classId.startsWith('mc_')) {
        objectIdStr = classId.replace('mc_', '');
      }
      
      let foundClass = null;
      
      // Try by ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(objectIdStr)) {
        foundClass = await ModuleClass.findById(objectIdStr).lean();
        result.searchByObjectId = foundClass ? 'Found' : 'Not found';
      } else {
        result.searchByObjectId = 'Invalid ObjectId format';
      }
      
      // Try by roomId
      const roomIdToSearch = classId.startsWith('mc_') ? classId : `mc_${objectIdStr}`;
      const foundByRoomId = await ModuleClass.findOne({ roomId: roomIdToSearch }).lean();
      result.searchByRoomId = foundByRoomId ? 'Found' : 'Not found';
      result.roomIdSearched = roomIdToSearch;
      
      result.classId = classId;
      result.extractedObjectId = objectIdStr;
      result.foundClass = foundClass || foundByRoomId;
    }
    
    // Get sample classes
    if (totalCount > 0) {
      const sampleClasses = await ModuleClass.find()
        .limit(5)
        .select('_id moduleTitle roomId status scheduledDate')
        .lean();
      
      result.sampleClasses = sampleClasses.map(mc => ({
        _id: mc._id.toString(),
        moduleTitle: mc.moduleTitle,
        roomId: mc.roomId,
        status: mc.status,
        scheduledDate: mc.scheduledDate
      }));
    }
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      mongoConnection: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    }, { status: 500 });
  }
}