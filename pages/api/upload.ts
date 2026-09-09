import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const s3Client = new S3Client({
  region: process.env.REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.BUCKET_NAME || '';
const REGION = process.env.REGION || 'us-east-1';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!BUCKET_NAME) {
    console.error('Upload failed: BUCKET_NAME is not configured');
    return res.status(500).json({ error: 'S3 bucket not configured' });
  }

  // Parse the multipart form. Keep the file on a temp path only long enough to
  // read it into a buffer for S3 — the local filesystem is not durable on the
  // deployed server (which is why /uploads/... 404'd).
  const form = formidable({
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    filter: ({ mimetype }) => mimetype === 'application/pdf',
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Upload parse error:', err);
      return res.status(400).json({ error: 'File upload failed' });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    try {
      const originalName = file.originalFilename || 'document.pdf';
      const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `trainer-notes/${Date.now()}-${safeName}`;

      // Read the temp file into memory, then remove it
      const buffer = fs.readFileSync(file.filepath);
      try {
        fs.unlinkSync(file.filepath);
      } catch {
        // temp cleanup is best-effort
      }

      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: file.mimetype || 'application/pdf',
        })
      );

      const fileUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;

      return res.status(200).json({
        success: true,
        file: {
          url: fileUrl,
          fileName: originalName,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (uploadErr: any) {
      console.error('S3 upload error:', uploadErr);
      return res.status(500).json({ error: 'Failed to upload file to storage', message: uploadErr.message });
    }
  });
}
