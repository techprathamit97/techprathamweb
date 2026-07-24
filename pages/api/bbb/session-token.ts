import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
import ModuleClass from '@/models/ModuleClass';

// POST { classId, studentId, preferredToken? }
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { classId, studentId, preferredToken } = req.body;
    if (!classId || !studentId) {
      return res.status(400).json({ success: false, error: 'Missing classId or studentId' });
    }

    await connectMongo();

    const moduleClass = await ModuleClass.findById(classId);
    if (!moduleClass) return res.status(404).json({ success: false, error: 'Class not found' });

    // Check if student already has a token mapping - ALWAYS return existing if found
    if (moduleClass.studentSessionTokens && moduleClass.studentSessionTokens.length > 0) {
      const mapping = moduleClass.studentSessionTokens.find(m => m.studentId && String(m.studentId) === String(studentId));
      if (mapping && mapping.sessionToken) {
        console.log('Found existing token mapping for student:', studentId, mapping.sessionToken);
        // STRICT: Always return existing token, ignore any preferredToken
        return res.status(200).json({ 
          success: true, 
          sessionToken: mapping.sessionToken, 
          source: 'existing_mapping',
          message: 'Returning existing session token - students must reuse the same token for each class'
        });
      }
    }

    // Only create new token if no existing mapping found
    let tokenToUse: string;
    if (preferredToken && typeof preferredToken === 'string' && preferredToken.trim().length > 0) {
      // Use preferred token only if no existing mapping was found
      tokenToUse = preferredToken.trim();
      console.log('Using client preferredToken for new mapping:', tokenToUse);
    } else {
      // Generate a new token
      tokenToUse = Math.random().toString(36).substring(2, 16); // Longer token for better uniqueness
      console.log('Generated new token:', tokenToUse);
    }

    // Create new mapping for this student
    try {
      await ModuleClass.findByIdAndUpdate(classId, { 
        $push: { 
          studentSessionTokens: { 
            studentId: studentId, 
            sessionToken: tokenToUse 
          } 
        } 
      });
      
      console.log('Created new session token mapping:', { studentId, tokenToUse });
    } catch (err) {
      console.log('Failed to create student token mapping:', err);
      // Still return the token even if we can't persist the mapping
    }

    return res.status(200).json({ 
      success: true, 
      sessionToken: tokenToUse, 
      source: 'created',
      message: 'Created new session token mapping for this student and class'
    });
  } catch (err: any) {
    console.error('Session token endpoint error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
