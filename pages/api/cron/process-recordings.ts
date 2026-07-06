import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests for security
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== CRON: Auto-processing BBB recordings ===');
    
    // Call the auto-process-recordings endpoint
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/auto-process-recordings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    console.log('Auto-processing result:', data);

    if (data.success) {
      console.log(`✅ Cron job completed: ${data.totalRecordingsProcessed} recordings processed`);
      
      return res.status(200).json({
        success: true,
        message: 'Cron job completed successfully',
        recordingsProcessed: data.totalRecordingsProcessed,
        classesChecked: data.classesChecked,
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error(data.error || 'Auto-processing failed');
    }

  } catch (error: any) {
    console.error('❌ Cron job error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}