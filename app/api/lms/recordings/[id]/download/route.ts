import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { connectMongo } from '@/utils/mongodb';

/**
 * Generates a short-lived presigned S3 URL for a BBB recording and redirects
 * the browser to it, so the video is downloaded directly from S3 rather than
 * streamed through the LMS server.
 *
 * Flow:
 *   Browser
 *      ↓
 *   LMS /api/lms/recordings/<id>/download
 *      ↓ 307 redirect
 *   Presigned S3 URL
 *      ↓
 *   Private S3 (recording.mp4)
 *
 * S3 object layout (written by the BBB worker after converting video-0.m4v):
 *   bbb-recordings/<recordId>/recording.mp4
 */

const S3_BUCKET = process.env.LMS_VIDEO_S3_BUCKET || '';
const S3_REGION = process.env.LMS_VIDEO_S3_REGION || 'ap-south-1';

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.LMS_VIDEO_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.LMS_VIDEO_S3_SECRET_ACCESS_KEY || '',
  },
});

// Helper function to sanitize filename for download
const sanitizeFilename = (name: string): string => {
  return name
    .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid filename characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
};

// Helper function to get recording details for proper filename
const getRecordingFilename = async (recordId: string): Promise<string> => {
  try {
    await connectMongo();
    const ModuleClass = require('@/models/ModuleClass');
    const Batch = require('@/models/Batch');
    const Course = require('@/models/Course');
    
    console.log(`🔍 Looking up filename for recordId: ${recordId}`);
    
    // Try multiple approaches to find the class
    let moduleClass = null;
    
    // 1. Try exact meetingId match
    moduleClass = await ModuleClass.findOne({ meetingId: recordId })
      .populate('batchId')
      .populate('courseId')
      .lean();
    
    if (moduleClass) {
      console.log(`✅ Found class by meetingId: ${moduleClass.moduleTitle}`);
    } else {
      // 2. Try roomId match
      moduleClass = await ModuleClass.findOne({ roomId: recordId })
        .populate('batchId')
        .populate('courseId')
        .lean();
      
      if (moduleClass) {
        console.log(`✅ Found class by roomId: ${moduleClass.moduleTitle}`);
      } else {
        // 3. Try BBB meeting nested field
        moduleClass = await ModuleClass.findOne({ 'bbbMeeting.meetingId': recordId })
          .populate('batchId')
          .populate('courseId')
          .lean();
        
        if (moduleClass) {
          console.log(`✅ Found class by bbbMeeting.meetingId: ${moduleClass.moduleTitle}`);
        } else {
          // 4. Try partial match in case the recordId is contained within another field
          moduleClass = await ModuleClass.findOne({
            $or: [
              { meetingId: { $regex: recordId, $options: 'i' } },
              { roomId: { $regex: recordId, $options: 'i' } },
              { 'bbbMeeting.meetingId': { $regex: recordId, $options: 'i' } }
            ]
          })
          .populate('batchId')
          .populate('courseId')
          .lean();
          
          if (moduleClass) {
            console.log(`✅ Found class by partial match: ${moduleClass.moduleTitle}`);
          }
        }
      }
    }
    
    if (moduleClass && moduleClass.batchId) {
      console.log(`📋 Class details:`, {
        moduleTitle: moduleClass.moduleTitle,
        batchName: moduleClass.batchId.batchName,
        courseTitle: moduleClass.courseId?.title
      });
      
      // Get batch info
      const batch = moduleClass.batchId;
      
      // Construct filename parts
      const parts = [];
      
      // Add course name if available
      if (moduleClass.courseId?.title) {
        parts.push(sanitizeFilename(moduleClass.courseId.title));
      }
      
      // Add batch name if different from course
      if (batch.batchName && batch.batchName !== moduleClass.courseId?.title) {
        parts.push(sanitizeFilename(batch.batchName));
      }
      
      // Add module title
      if (moduleClass.moduleTitle) {
        parts.push(sanitizeFilename(moduleClass.moduleTitle));
      } else {
        parts.push(`Class-${moduleClass.moduleIndex || '1'}`);
      }
      
      const filename = parts.join('-') + '.mp4';
      console.log(`📁 Generated filename: ${filename}`);
      return filename;
    }
    
    // If no class found, try to use the recording name from the UI
    // The recordId might correspond to a recording name that we can get from the request
    console.log(`⚠️ No ModuleClass found for recordId: ${recordId}`);
    
    // Try to get a more meaningful name by looking for any recording with this ID
    // and using its display name if available
    try {
      // Check if we can find any batch recordings that contain this recordId
      const batches = await Batch.find({}).lean();
      
      for (const batch of batches) {
        // This is a simplified approach - in a real scenario, you'd call the BBB API
        // or check a recordings collection if you have one
        console.log(`🔍 Checking batch: ${batch.batchName}`);
      }
    } catch (err) {
      console.log('Could not lookup batch recordings');
    }
    
    const fallbackFilename = `recording-${recordId}.mp4`;
    console.log(`📁 Using fallback filename: ${fallbackFilename}`);
    return fallbackFilename;
    
  } catch (error) {
    console.error('❌ Error getting recording filename:', error);
    const errorFilename = `recording-${recordId}.mp4`;
    console.log(`📁 Using error fallback filename: ${errorFilename}`);
    return errorFilename;
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Recording ID is required' },
        { status: 400 }
      );
    }

    if (
      !S3_BUCKET ||
      !process.env.LMS_VIDEO_S3_ACCESS_KEY_ID ||
      !process.env.LMS_VIDEO_S3_SECRET_ACCESS_KEY
    ) {
      console.error('LMS video S3 configuration is missing');
      return NextResponse.json(
        { success: false, error: 'Recording storage is not configured' },
        { status: 500 }
      );
    }

    const key = `bbb-recordings/${id}/recording.mp4`;
    
    // Check if a filename was provided in query params
    const url = new URL(request.url);
    const providedFilename = url.searchParams.get('filename');
    
    let filename: string;
    if (providedFilename) {
      // Use provided filename from frontend
      console.log(`📁 Using provided filename: ${providedFilename}`);
      filename = decodeURIComponent(providedFilename);
      // Ensure it has .mp4 extension
      if (!filename.endsWith('.mp4')) {
        filename += '.mp4';
      }
    } else {
      // Get the proper filename based on class details (fallback)
      filename = await getRecordingFilename(id);
    }

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      // Preserve the browser download behavior from the old endpoint.
      ResponseContentType: 'video/mp4',
      ResponseContentDisposition: `attachment; filename="${filename}"`,
      ResponseCacheControl: 'private, no-store',
    });

    // Presigned URL valid for 10 minutes.
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });

    // Browser follows this redirect and downloads directly from S3.
    return NextResponse.redirect(signedUrl, 307);
  } catch (error: any) {
    console.error('Recording S3 download error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate recording download URL',
        message: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
