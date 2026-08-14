import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import ModuleClass from '@/models/ModuleClass';

// Clean up multiple live classes - ensure only ONE live class per batch
export async function POST(request: NextRequest) {
  try {
    await connectMongo();
    
    console.log('🧹 Starting cleanup of multiple live classes per batch...');
    
    // Get all classes that are marked as live
    const allLiveClasses = await ModuleClass.find({
      status: 'live',
      isLive: true
    }).sort({ actualStartTime: -1, updatedAt: -1, createdAt: -1 }); // Most recent first
    
    console.log(`🧹 Found ${allLiveClasses.length} live classes in total`);
    
    // Group by batch ID
    const classesByBatch: { [batchId: string]: any[] } = {};
    
    allLiveClasses.forEach(cls => {
      const batchId = cls.batchId.toString();
      if (!classesByBatch[batchId]) {
        classesByBatch[batchId] = [];
      }
      classesByBatch[batchId].push(cls);
    });
    
    let cleanedUp = 0;
    let batchesProcessed = 0;
    const cleanupDetails: any[] = [];
    
    // Process each batch
    for (const [batchId, classes] of Object.entries(classesByBatch)) {
      batchesProcessed++;
      
      if (classes.length > 1) {
        console.log(`🧹 Batch ${batchId} has ${classes.length} live classes - fixing...`);
        
        // Keep the most recent one (first in sorted array)
        const keepClass = classes[0];
        const removeClasses = classes.slice(1);
        
        console.log(`🧹 Keeping: ${keepClass.moduleTitle} (${keepClass._id})`);
        
        // Mark the others as completed
        for (const oldClass of removeClasses) {
          console.log(`🧹 Completing: ${oldClass.moduleTitle} (${oldClass._id})`);
          
          await ModuleClass.findByIdAndUpdate(oldClass._id, {
            status: 'completed',
            isLive: false,
            actualEndTime: new Date(),
            // Clear session tokens to prevent join issues
            $unset: { 
              joinedSessionTokens: 1,
              studentSessionTokens: 1 
            }
          });
          
          cleanedUp++;
        }
        
        cleanupDetails.push({
          batchId,
          totalLiveClasses: classes.length,
          keptClass: {
            id: keepClass._id,
            title: keepClass.moduleTitle,
            startTime: keepClass.actualStartTime
          },
          completedClasses: removeClasses.map(cls => ({
            id: cls._id,
            title: cls.moduleTitle,
            startTime: cls.actualStartTime
          }))
        });
      } else {
        console.log(`🧹 Batch ${batchId} has 1 live class - OK`);
        
        cleanupDetails.push({
          batchId,
          totalLiveClasses: 1,
          status: 'OK - Single live class'
        });
      }
    }
    
    console.log(`🧹 CLEANUP COMPLETE: Processed ${batchesProcessed} batches, cleaned up ${cleanedUp} duplicate live classes`);
    
    return NextResponse.json({
      success: true,
      message: `Cleanup completed successfully`,
      batchesProcessed,
      duplicateLiveClassesRemoved: cleanedUp,
      details: cleanupDetails,
      summary: {
        totalBatchesChecked: batchesProcessed,
        batchesWithMultipleLive: cleanupDetails.filter(d => d.totalLiveClasses > 1).length,
        totalDuplicatesRemoved: cleanedUp
      }
    });
    
  } catch (error) {
    console.error('🧹 CLEANUP ERROR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup multiple live classes: ' + (error as Error).message
    }, { status: 500 });
  }
}