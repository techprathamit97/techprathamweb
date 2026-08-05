import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'trainer-notes');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir: uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      filter: ({ mimetype }) => mimetype === 'application/pdf',
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({ error: 'File upload failed' });
      }

      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const originalName = file.originalFilename || 'document.pdf';
      const extension = path.extname(originalName);
      const baseName = path.basename(originalName, extension);
      const newFileName = `${timestamp}-${baseName}${extension}`;
      const newFilePath = path.join(uploadDir, newFileName);

      // Rename file to unique name
      fs.renameSync(file.filepath, newFilePath);

      // Return file information
      const fileUrl = `/uploads/trainer-notes/${newFileName}`;
      
      return res.status(200).json({
        success: true,
        file: {
          url: fileUrl,
          fileName: originalName,
          fileSize: file.size,
          uploadedAt: new Date().toISOString()
        }
      });
    });

  } catch (error: any) {
    console.error('Upload API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}