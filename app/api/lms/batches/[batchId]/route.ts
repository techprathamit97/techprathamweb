import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
const Batch = require("@/models/Batch");
const ModuleClass = require("@/models/ModuleClass");

export async function PUT(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    await connectMongo();
    
    const { batchId } = await params;
    const data = await req.json();
    
    // Handle status-only updates (don't require full validation)
    if (data.statusOnly) {
      const updatedBatch = await Batch.findByIdAndUpdate(
        batchId,
        { status: data.status, updatedAt: new Date() },
        { new: true }
      );
      
      if (!updatedBatch) {
        return NextResponse.json(
          { error: 'Batch not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(updatedBatch);
    }
    
    // Full update validation
    if (!data.batchName || !data.courseId) {
      return NextResponse.json(
        { error: 'Batch name and course are required' },
        { status: 400 }
      );
    }
    
    // Get the current batch to check if timing changed
    const currentBatch = await Batch.findById(batchId);
    if (!currentBatch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }
    
    const updatedBatch = await Batch.findByIdAndUpdate(
      batchId,
      {
        batchName: data.batchName,
        courseId: data.courseId,
        trainerId: data.trainerId,
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
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!updatedBatch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }
    
    // Check if batch timing has changed - if yes, update all related classes
    const oldTiming = currentBatch.timing;
    const newTiming = data.timing;
    const oldStartTime = currentBatch.startTime;
    const newStartTime = data.startTime;
    
    if (oldTiming !== newTiming || oldStartTime !== newStartTime) {
      console.log('🕒 BATCH TIMING CHANGED - UPDATING ALL RELATED CLASSES');
      console.log(`Old timing: ${oldTiming} (${oldStartTime}) → New timing: ${newTiming} (${newStartTime})`);
      
      // Extract new class time from the timing string or startTime
      let newClassTime = newStartTime;
      
      // If startTime is not provided, try to extract from timing string
      if (!newClassTime && newTiming) {
        // Handle formats like "5:18 PM to 6:18 PM" or "12:57 PM to 1:57 PM"
        const timingMatch = newTiming.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timingMatch) {
          let hours = parseInt(timingMatch[1]);
          const minutes = timingMatch[2];
          const period = timingMatch[3].toUpperCase();
          
          // Convert to 24-hour format
          if (period === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }
          
          newClassTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
        }
      }
      
      if (newClassTime) {
        // Update all future/scheduled ModuleClass records for this batch
        const updateResult = await ModuleClass.updateMany(
          { 
            batchId: batchId,
            status: { $in: ['scheduled', 'live', 'joinable'] } // Only update non-completed classes
          },
          { 
            scheduledTime: newClassTime,
            updatedAt: new Date()
          }
        );
        
        console.log(`✅ Updated ${updateResult.modifiedCount} class times to ${newClassTime}`);
        
        // Also update the batch timing display for consistency
        updatedBatch.timing = newTiming;
      } else {
        console.warn('⚠️ Could not extract new class time from timing update');
      }
    }
    
    return NextResponse.json(updatedBatch);
  } catch (error) {
    console.error('Failed to update batch:', error);
    return NextResponse.json(
      { error: 'Failed to update batch' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    await connectMongo();
    
    const { batchId } = await params;
    
    // Check if batch exists
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }
    
    // Delete the batch
    await Batch.findByIdAndDelete(batchId);
    
    // Also delete related module classes for this batch
    await ModuleClass.deleteMany({ batchId: batchId });
    
    return NextResponse.json(
      { message: 'Batch and related classes deleted successfully' }
    );
  } catch (error) {
    console.error('Failed to delete batch:', error);
    return NextResponse.json(
      { error: 'Failed to delete batch' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    await connectMongo();
    
    const { batchId } = await params;
    
    const batch = await Batch.findById(batchId)
      .populate('courseId')
      .populate('trainerId')
      .lean();
    
    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(batch);
  } catch (error) {
    console.error('Failed to fetch batch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch' },
      { status: 500 }
    );
  }
}

// Add PATCH method as an alias to PUT for compatibility
export async function PATCH(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  return PUT(req, { params });
}