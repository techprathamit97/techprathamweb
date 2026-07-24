import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
import Certificate from '@/models/Certificate';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectMongo();

    const { certificateId, action } = req.body;

    if (!certificateId) {
      return res.status(400).json({ error: 'Certificate ID is required' });
    }

    const certificate = await Certificate.findById(certificateId);

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    if (action === 'approve') {
      certificate.status = 'issued';
      certificate.issueDate = new Date();
      await certificate.save();

      return res.status(200).json({
        success: true,
        message: 'Certificate approved successfully',
        certificate
      });
    } else if (action === 'revoke') {
      certificate.status = 'revoked';
      await certificate.save();

      return res.status(200).json({
        success: true,
        message: 'Certificate revoked successfully',
        certificate
      });
    } else {
      return res.status(400).json({ error: 'Invalid action. Use "approve" or "revoke"' });
    }

  } catch (error: any) {
    console.error('Approve certificate error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process certificate' });
  }
}
