import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

const ModuleClass = require('@/models/ModuleClass');

// AWS S3 Client
const s3Client = new S3Client({
  region: process.env.REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.BUCKET_NAME || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { classId } = req.body;

    if (!classId) {
      return res.status(400).json({
        success: false,
        error: 'classId is required'
      });
    }

    console.log('🔍 COMPARING WORKING vs NON-WORKING VIDEOS for class:', classId);

    await connectMongo();

    // Get class details
    const moduleClass = await ModuleClass.findById(classId);
    if (!moduleClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found'
      });
    }

    const recordings = moduleClass.recordings || [];
    console.log(`📹 Found ${recordings.length} recordings in class`);

    if (recordings.length === 0) {
      return res.status(200).json({
        success: false,
        error: 'No recordings found in this class'
      });
    }

    const videoAnalysis: any[] = [];

    for (let i = 0; i < recordings.length; i++) {
      const recording = recordings[i];
      const videoUrl = recording.url;
      
      console.log(`\n🎥 ANALYZING VIDEO ${i + 1}:`, recording.title);
      console.log('URL:', videoUrl);

      const analysis: any = {
        index: i + 1,
        title: recording.title,
        url: videoUrl,
        uploadedAt: recording.uploadedAt,
        uploadedBy: recording.uploadedBy,
        fileSize: recording.fileSize,
        fileType: recording.fileType,
        duration: recording.duration,
        bbbRecordId: recording.bbbRecordId,
        issues: [],
        tests: {}
      };

      // Test 1: URL Format Analysis
      analysis.tests.urlFormat = {
        isHttps: videoUrl.startsWith('https://'),
        isS3: videoUrl.includes('s3.'),
        containsBucket: videoUrl.includes(BUCKET_NAME),
        hasCorrectExtension: videoUrl.includes('.mp4'),
        urlLength: videoUrl.length
      };

      // Extract S3 path differences
      if (videoUrl.includes('s3.amazonaws.com/')) {
        const s3Path = videoUrl.split('.amazonaws.com/')[1];
        analysis.tests.urlFormat.s3Path = s3Path;
        analysis.tests.urlFormat.folder = s3Path.split('/')[0];
        analysis.tests.urlFormat.filename = s3Path.split('/').pop();
      }

      // Test 2: HTTP Accessibility
      try {
        const httpResponse = await fetch(videoUrl, { method: 'HEAD' });
        analysis.tests.httpAccess = {
          status: httpResponse.status,
          accessible: httpResponse.ok,
          contentType: httpResponse.headers.get('content-type'),
          contentLength: httpResponse.headers.get('content-length'),
          lastModified: httpResponse.headers.get('last-modified'),
          acceptRanges: httpResponse.headers.get('accept-ranges'),
          cors: httpResponse.headers.get('access-control-allow-origin'),
        };

        if (!httpResponse.ok) {
          analysis.issues.push(`❌ HTTP ${httpResponse.status}: ${httpResponse.statusText}`);
        }

        if (!analysis.tests.httpAccess.cors) {
          analysis.issues.push('⚠️ Missing CORS headers');
        }

        if (analysis.tests.httpAccess.contentType !== 'video/mp4') {
          analysis.issues.push(`⚠️ Content-Type: ${analysis.tests.httpAccess.contentType} (expected: video/mp4)`);
        }

      } catch (httpError: any) {
        analysis.tests.httpAccess = {
          accessible: false,
          error: httpError.message
        };
        analysis.issues.push('❌ URL not accessible');
      }

      // Test 3: S3 Object Analysis (if S3 URL)
      if (analysis.tests.urlFormat.isS3 && analysis.tests.urlFormat.s3Path) {
        try {
          const headCommand = new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: analysis.tests.urlFormat.s3Path,
          });

          const s3Result = await s3Client.send(headCommand);
          
          analysis.tests.s3Object = {
            exists: true,
            size: s3Result.ContentLength,
            contentType: s3Result.ContentType,
            lastModified: s3Result.LastModified,
            etag: s3Result.ETag,
          };

          // Compare with database info
          if (recording.fileSize && s3Result.ContentLength !== recording.fileSize) {
            analysis.issues.push(`⚠️ Size mismatch: DB=${recording.fileSize}, S3=${s3Result.ContentLength}`);
          }

        } catch (s3Error: any) {
          analysis.tests.s3Object = {
            exists: false,
            error: s3Error.message
          };
          analysis.issues.push('❌ S3 object not found');
        }
      }

      // Test 4: Video Playback Test
      try {
        const playbackResponse = await fetch(videoUrl, { 
          method: 'GET',
          headers: { 'Range': 'bytes=0-1023' } // Get first 1KB
        });

        analysis.tests.videoPlayback = {
          supportsRanges: playbackResponse.status === 206,
          status: playbackResponse.status,
          canStream: playbackResponse.headers.get('accept-ranges') === 'bytes'
        };

        if (!analysis.tests.videoPlayback.supportsRanges) {
          analysis.issues.push('⚠️ Video may not support streaming/seeking');
        }

      } catch (playbackError: any) {
        analysis.tests.videoPlayback = {
          error: playbackError.message
        };
        analysis.issues.push('❌ Video playback test failed');
      }

      videoAnalysis.push(analysis);
    }

    // Compare working vs non-working videos
    const workingVideos = videoAnalysis.filter(v => v.issues.length === 0);
    const brokenVideos = videoAnalysis.filter(v => v.issues.length > 0);

    console.log(`✅ Working videos: ${workingVideos.length}`);
    console.log(`❌ Broken videos: ${brokenVideos.length}`);

    // Identify differences
    const differences: string[] = [];
    
    if (workingVideos.length > 0 && brokenVideos.length > 0) {
      const workingExample = workingVideos[0];
      const brokenExample = brokenVideos[0];

      // Compare folder paths
      if (workingExample.tests.urlFormat.folder !== brokenExample.tests.urlFormat.folder) {
        differences.push(`📁 Different S3 folders: Working="${workingExample.tests.urlFormat.folder}" vs Broken="${brokenExample.tests.urlFormat.folder}"`);
      }

      // Compare upload methods
      if (workingExample.uploadedBy !== brokenExample.uploadedBy) {
        differences.push(`👤 Different upload methods: Working="${workingExample.uploadedBy}" vs Broken="${brokenExample.uploadedBy}"`);
      }

      // Compare content types
      if (workingExample.tests.httpAccess?.contentType !== brokenExample.tests.httpAccess?.contentType) {
        differences.push(`📝 Different Content-Type: Working="${workingExample.tests.httpAccess?.contentType}" vs Broken="${brokenExample.tests.httpAccess?.contentType}"`);
      }

      // Compare upload dates
      const workingDate = new Date(workingExample.uploadedAt).toISOString().split('T')[0];
      const brokenDate = new Date(brokenExample.uploadedAt).toISOString().split('T')[0];
      differences.push(`📅 Upload dates: Working="${workingDate}" vs Broken="${brokenDate}"`);
    }

    return res.status(200).json({
      success: true,
      message: 'Video comparison analysis complete',
      classId: classId,
      className: moduleClass.moduleTitle,
      totalVideos: recordings.length,
      workingVideos: workingVideos.length,
      brokenVideos: brokenVideos.length,
      videoAnalysis: videoAnalysis,
      differences: differences,
      summary: {
        commonIssues: brokenVideos.length > 0 ? 
          brokenVideos.reduce((acc: any, video: any) => {
            video.issues.forEach((issue: string) => {
              acc[issue] = (acc[issue] || 0) + 1;
            });
            return acc;
          }, {}) : {},
        workingPattern: workingVideos.length > 0 ? {
          folder: workingVideos[0].tests.urlFormat.folder,
          uploadMethod: workingVideos[0].uploadedBy,
          contentType: workingVideos[0].tests.httpAccess?.contentType
        } : null
      }
    });

  } catch (error: any) {
    console.error('❌ Video comparison error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}