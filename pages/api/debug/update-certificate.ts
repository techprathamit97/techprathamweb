import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
import Certificate from '@/models/Certificate';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectMongo();

    const { certificateId, studentName, startDate, endDate } = req.body;

    if (!certificateId) {
      return res.status(400).json({ error: 'Certificate ID is required' });
    }

    const certificate = await Certificate.findById(certificateId);

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    // Update fields if provided
    if (studentName !== undefined) {
      certificate.studentName = studentName;
    }
    if (startDate !== undefined) {
      certificate.startDate = startDate ? new Date(startDate) : null;
    }
    if (endDate !== undefined) {
      certificate.endDate = endDate ? new Date(endDate) : null;
    }

    await certificate.save();

    return res.status(200).json({
      success: true,
      message: 'Certificate updated successfully',
      certificate: {
        _id: certificate._id,
        studentName: certificate.studentName,
        startDate: certificate.startDate,
        endDate: certificate.endDate,
        courseName: certificate.courseName,
        status: certificate.status
      }
    });

  } catch (error: any) {
    console.error('Update certificate error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update certificate' });
  }
}
