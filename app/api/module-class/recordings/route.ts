import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand, PutBucketCorsCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import mongoose from 'mongoose';

const s3Client = new S3Client({
  region: process.env.REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.BUCKET_NAME || '';

// Connect to MongoDB
async function connectDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/techpratham');
  }
}

// Multipart upload threshold: 5MB
const MULTIPART_THRESHOLD = 5 * 1024 * 1024;
const CHUNK_SIZE = 5 * 1024 * 1024;

// Helper function to perform multipart upload
async function uploadMultipart(buffer: Buffer, key: string, contentType: string): Promise<string> {
  const uploadId = await s3Client.send(
    new CreateMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    })
  );

  const uploadIdStr = uploadId.UploadId;
  if (!uploadIdStr) {
    throw new Error('Failed to create multipart upload');
  }

  const totalParts = Math.ceil(buffer.length / CHUNK_SIZE);
  const parts = [];

  console.log(`Starting multipart upload: ${totalParts} parts`);

  const uploadPromises = [];
  for (let i = 0; i < totalParts; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, buffer.length);
    const partBuffer = buffer.slice(start, end);
    const partNumber = i + 1;

    uploadPromises.push(
      s3Client.send(
        new UploadPartCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          UploadId: uploadIdStr,
          PartNumber: partNumber,
          Body: partBuffer,
        })
      ).then((result) => ({
        PartNumber: partNumber,
        ETag: result.ETag,
      }))
    );

    if (uploadPromises.length >= 5 || i === totalParts - 1) {
      const results = await Promise.all(uploadPromises);
      parts.push(...results);
      console.log(`Uploaded ${parts.length}/${totalParts} parts`);
      uploadPromises.length = 0;
    }
  }

  await s3Client.send(
    new CompleteMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadIdStr,
      MultipartUpload: {
        Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
      },
    })
  );

  console.log('Multipart upload completed');
  return `https://${BUCKET_NAME}.s3.${process.env.REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

// GET - Get recordings for a module class OR generate presigned URL for playback
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const recordingUrl = searchParams.get('url');

    // If recordingUrl is provided, generate presigned URL for playback
    if (recordingUrl) {
      // Configure CORS if needed
      const configureCors = searchParams.get('configureCors');
      if (configureCors === 'true') {
        const corsConfig = {
          CORSRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'HEAD'],
              AllowedOrigins: ['*'],
              MaxAgeSeconds: 3600,
            },
          ],
        };

        const corsCommand = new PutBucketCorsCommand({
          Bucket: BUCKET_NAME,
          CORSConfiguration: corsConfig,
        });

        await s3Client.send(corsCommand);

        return NextResponse.json({
          success: true,
          message: 'CORS configured successfully'
        });
      }

      // Extract the S3 key from the URL
      const urlObj = new URL(recordingUrl);
      const key = urlObj.pathname.substring(1);

      console.log('Generating presigned URL for key:', key);

      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

      return NextResponse.json({
        success: true,
        url: signedUrl
      });
    }

    // Otherwise, return recordings list for a module class
    if (!classId) {
      return NextResponse.json(
        { error: 'classId is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const ModuleClass = (await import('@/models/ModuleClass')).default;
    const moduleClass = await ModuleClass.findById(classId).lean();

    if (!moduleClass) {
      return NextResponse.json(
        { error: 'Module class not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: moduleClass.recordings || []
    });
  } catch (error: any) {
    console.error('Error fetching recordings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recordings', message: error.message },
      { status: 500 }
    );
  }
}

// PUT - Generate presigned URL for direct upload to S3
export async function PUT(req: NextRequest) {
  try {
    if (!BUCKET_NAME) {
      return NextResponse.json(
        { error: 'S3 bucket not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('fileName');
    const fileType = searchParams.get('fileType');

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'fileName and fileType are required' },
        { status: 400 }
      );
    }

    // Configure CORS for direct browser uploads
    try {
      const corsConfig = {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['PUT', 'POST', 'GET'],
            AllowedOrigins: ['*'],
            MaxAgeSeconds: 3600,
          },
        ],
      };

      await s3Client.send(new PutBucketCorsCommand({
        Bucket: BUCKET_NAME,
        CORSConfiguration: corsConfig,
      }));
      console.log('S3 CORS configured for direct upload');
    } catch (corsError: any) {
      console.log('CORS config note:', corsError.message);
    }

    const timestamp = Date.now();
    const key = `module_recordings/${fileName}_${timestamp}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    console.log('Generated upload presigned URL for:', key);

    return NextResponse.json({
      success: true,
      uploadUrl: signedUrl,
      key: key,
      s3Url: `https://${BUCKET_NAME}.s3.${process.env.REGION || 'us-east-1'}.amazonaws.com/${key}`
    });
  } catch (error: any) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL', message: error.message },
      { status: 500 }
    );
  }
}

// POST - Upload a recording and save to module class
export async function POST(req: NextRequest) {
  try {
    if (!BUCKET_NAME) {
      return NextResponse.json(
        { error: 'S3 bucket not configured' },
        { status: 500 }
      );
    }

    const contentType = req.headers.get('content-type') || '';
    let s3Url = '';
    let fileName = '';
    let fileType = '';
    let fileSize = 0;
    let classId = '';
    let videoTitle = '';
    let videoDescription = '';
    let uploadedBy = '';
    let duration = 0;
    let partNumber = 0;
    const timestamp = Date.now();

    if (contentType.includes('application/json')) {
      // Direct S3 upload case - just update database
      const body = await req.json();
      s3Url = body.url;
      fileName = body.fileName;
      fileType = body.fileType;
      fileSize = body.fileSize;
      classId = body.classId;
      videoTitle = body.title || '';
      videoDescription = body.description || '';
      uploadedBy = body.uploadedBy || '';
      duration = body.duration || 0;
      partNumber = body.partNumber || 0;
    } else {
      // FormData upload case - upload file to S3
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      classId = formData.get('classId') as string || '';
      videoTitle = formData.get('title') as string || '';
      videoDescription = formData.get('description') as string || '';
      uploadedBy = formData.get('uploadedBy') as string || '';
      duration = parseInt(formData.get('duration') as string || '0');
      partNumber = parseInt(formData.get('partNumber') as string || '0');

      console.log('=== RECORDING UPLOAD DEBUG ===');
      console.log('Received classId:', classId);
      console.log('videoTitle:', videoTitle);
      console.log('uploadedBy:', uploadedBy);

      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      fileType = file.type || '';
      const extension = fileType.includes('webm') ? 'webm' : 'mp4';
      fileName = `module_${classId || 'unknown'}_${timestamp}.${extension}`;
      const key = `module_recordings/${fileName}`;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fileSize = buffer.length;

      console.log('Uploading file:', fileName);
      console.log('File size:', buffer.length);

      if (buffer.length > MULTIPART_THRESHOLD) {
        console.log('Using multipart upload for large file');
        s3Url = await uploadMultipart(buffer, key, file.type || 'video/mp4');
      } else {
        console.log('Using simple upload');
        const command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: file.type || 'video/mp4',
        });
        await s3Client.send(command);
        s3Url = `https://${BUCKET_NAME}.s3.${process.env.REGION || 'us-east-1'}.amazonaws.com/${key}`;
      }

      console.log('Recording uploaded to S3:', s3Url);
    }

    // Save recording to module class
    let recordingSaved = false;
    let recordingId = null;
    let objectIdStr = null;
    let findError = null;
    let moduleClass = null;

    if (classId) {
      try {
        await connectDB();

        // Clear model cache and force fresh import
        if (mongoose.models.ModuleClass) {
          delete mongoose.models.ModuleClass;
        }
        
        const ModuleClass = (await import('@/models/ModuleClass')).default;
        console.log('ModuleClass imported successfully');

        // Extract the ID - handle both "mc_xxx" and plain "xxx" formats
        objectIdStr = classId;
        if (classId.startsWith('mc_')) {
          objectIdStr = classId.replace('mc_', '');
        }

        console.log('=== DEBUG: Looking for module class ===');
        console.log('Original classId:', classId);
        console.log('Extracted objectIdStr:', objectIdStr);
        console.log('Is valid ObjectId:', /^[0-9a-fA-F]{24}$/.test(objectIdStr));

        // Check if it's a valid MongoDB ObjectId format
        if (/^[0-9a-fA-F]{24}$/.test(objectIdStr)) {
          try {
            console.log('Attempting findById with:', objectIdStr);
            moduleClass = await ModuleClass.findById(objectIdStr);
            console.log('findById result:', moduleClass ? `Found: ${moduleClass._id}` : 'Not found');
            
            if (moduleClass) {
              console.log('Module class details:', {
                _id: moduleClass._id,
                moduleTitle: moduleClass.moduleTitle,
                roomId: moduleClass.roomId,
                status: moduleClass.status,
                recordingsCount: moduleClass.recordings ? moduleClass.recordings.length : 0
              });
            }
          } catch (err: any) {
            findError = err.message;
            console.error('findById error:', err);
          }
        } else {
          console.log('Invalid ObjectId format, skipping findById');
        }

        // If not found by ObjectId, try to find by roomId
        if (!moduleClass) {
          console.log('Module class not found by ObjectId, trying roomId lookup...');
          // Try to find by roomId - use objectIdStr which has the mc_ prefix removed,
          // OR try with full classId if it has mc_ prefix
          const roomIdToSearch = classId.startsWith('mc_') ? classId : `mc_${objectIdStr}`;
          console.log('Searching by roomId:', roomIdToSearch);
          
          try {
            const moduleClassByRoomId = await ModuleClass.findOne({ roomId: roomIdToSearch });
            if (moduleClassByRoomId) {
              console.log('Found module class by roomId:', moduleClassByRoomId._id);
              moduleClass = moduleClassByRoomId;
            } else {
              console.log('No module class found with roomId:', roomIdToSearch);
              
              // Last try: search for any module class with roomId containing the ID
              console.log('Trying partial roomId match...');
              const moduleClassByRoomIdPartial = await ModuleClass.findOne({
                roomId: { $regex: objectIdStr }
              });
              if (moduleClassByRoomIdPartial) {
                console.log('Found module class by roomId partial match:', moduleClassByRoomIdPartial._id);
                moduleClass = moduleClassByRoomIdPartial;
              } else {
                console.log('No module class found with partial roomId match');
              }
            }
          } catch (roomIdError: any) {
            console.error('Error searching by roomId:', roomIdError);
            findError = roomIdError.message;
          }
        }

        if (moduleClass) {
          console.log('=== SAVING RECORDING TO MODULE CLASS ===');
          console.log('Found module class:', moduleClass._id, moduleClass.moduleTitle);

          // Add new recording to the recordings array
          const newRecording = {
            url: s3Url,
            title: videoTitle || `Part ${(moduleClass.recordings?.length || 0) + 1}`,
            description: videoDescription,
            duration: duration,
            fileSize: fileSize,
            fileType: fileType,
            uploadedAt: new Date(),
            uploadedBy: uploadedBy,
            partNumber: partNumber || (moduleClass.recordings?.length || 0) + 1
          };

          console.log('New recording object:', newRecording);

          if (!moduleClass.recordings) {
            moduleClass.recordings = [] as any;
          }
          (moduleClass.recordings as any).push(newRecording);
          recordingId = moduleClass.recordings[moduleClass.recordings.length - 1]._id;

          console.log('Total recordings after adding:', moduleClass.recordings.length);

          // NOTE: Class completion is now handled manually by the trainer
          // Do NOT auto-complete the class when recording is uploaded
          // This allows multiple parts to be uploaded for a single class session

          try {
            const savedModule = await moduleClass.save();
            recordingSaved = true;
            console.log('Recording saved successfully to module class. Document ID:', savedModule._id);
            console.log('Recording ID:', recordingId);
          } catch (saveError: any) {
            console.error('Error saving module class:', saveError);
            findError = `Save error: ${saveError.message}`;
          }
        } else {
          console.log('=== MODULE CLASS NOT FOUND ===');
          console.log('Module class not found with any method');
          console.log('This indicates the scheduled class may have been deleted or database issues');
          console.log('Searched for:');
          console.log('- ObjectId:', objectIdStr);
          console.log('- RoomId variations:', [
            classId.startsWith('mc_') ? classId : `mc_${objectIdStr}`,
            `Partial match: ${objectIdStr}`
          ]);
          
          // Let's do a broader search to see what module classes exist
          try {
            const totalCount = await ModuleClass.countDocuments();
            console.log(`Total module classes in database: ${totalCount}`);
            
            if (totalCount > 0) {
              const sampleClasses = await ModuleClass.find().limit(3).select('_id moduleTitle roomId status').lean();
              console.log('Sample of existing module classes:', sampleClasses.map(mc => ({
                _id: mc._id.toString(),
                title: mc.moduleTitle,
                roomId: mc.roomId,
                status: mc.status
              })));
              
              // Also check for any classes with similar roomId
              const similarRoomIds = await ModuleClass.find({
                roomId: { $regex: objectIdStr.substring(0, 8), $options: 'i' }
              }).select('_id moduleTitle roomId').lean();
              
              if (similarRoomIds.length > 0) {
                console.log('Found classes with similar roomIds:', similarRoomIds.map(mc => ({
                  _id: mc._id.toString(),
                  roomId: mc.roomId
                })));
              }
            } else {
              console.log('⚠️  No module classes found in database - database may be empty');
            }
          } catch (listError: any) {
            console.error('Error listing module classes:', listError);
          }
          
          findError = `Module class not found. Searched ObjectId: ${objectIdStr}, RoomId: ${classId}`;
        }
      } catch (dbError: any) {
        console.error('Database connection or operation error:', dbError);
        findError = `DB Error: ${dbError.message}`;
      }
    } else {
      console.log('No classId provided in the request');
      findError = 'No classId provided';
    }

    // Return detailed response for debugging
    return NextResponse.json({
      success: true,
      url: s3Url,
      fileName: fileName,
      fileType: fileType,
      fileSize: fileSize,
      recordingSaved,
      recordingId,
      debug: {
        classIdProvided: !!classId,
        classIdValue: classId || null,
        s3UploadSuccessful: !!s3Url,
        objectIdStr: objectIdStr || null,
        isValidObjectId: objectIdStr ? /^[0-9a-fA-F]{24}$/.test(objectIdStr) : false,
        findError: findError || null
      }
    });
  } catch (error: any) {
    console.error('Recording upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload recording', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a recording from a module class
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const recordingIndex = searchParams.get('index');

    if (!classId || recordingIndex === undefined) {
      return NextResponse.json(
        { error: 'classId and index are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const ModuleClass = (await import('@/models/ModuleClass')).default;

    // Extract the ID
    let objectIdStr = classId;
    if (classId.startsWith('mc_')) {
      objectIdStr = classId.replace('mc_', '');
    }

    const moduleClass = await ModuleClass.findById(objectIdStr);

    if (!moduleClass) {
      return NextResponse.json(
        { error: 'Module class not found' },
        { status: 404 }
      );
    }

    const index = parseInt(recordingIndex || '0');
    if (isNaN(index) || index < 0 || index >= (moduleClass.recordings?.length || 0)) {
      return NextResponse.json(
        { error: 'Invalid recording index' },
        { status: 400 }
      );
    }

    // Remove recording from array
    moduleClass.recordings.splice(index, 1);
    await moduleClass.save();

    return NextResponse.json({
      success: true,
      message: 'Recording deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting recording:', error);
    return NextResponse.json(
      { error: 'Failed to delete recording', message: error.message },
      { status: 500 }
    );
  }
}