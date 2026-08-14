// TEMPORARY read-only diagnostic endpoint for the "Notes (0)" investigation.
// Delete once the notes pipeline is confirmed working.
import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from '@/utils/mongodb';
const TrainerNote = require('@/models/TrainerNote');
const Batch = require('@/models/Batch');
const Student = require('@/models/Student');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // This endpoint returns unfiltered student and note records, so it must never
  // be reachable in a deployed environment.
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    await connectMongo();

    const notes = await TrainerNote.find({}).lean();
    const batches = await Batch.find({}).lean();
    const students = await Student.find({}).select('_id studentId name email').lean();

    return res.status(200).json({
      success: true,
      noteCount: notes.length,
      notes: notes.map((n: any) => ({
        _id: String(n._id),
        title: n.title,
        isPublished: n.isPublished,
        publishedAt: n.publishedAt,
        noteType: n.noteType,
        sectionCount: n.textContent?.length || 0,
        batchIds: (n.batchIds || []).map(String),
        trainerId: String(n.trainerId)
      })),
      batches: batches.map((b: any) => ({
        _id: String(b._id),
        batchName: b.batchName,
        timing: b.timing,
        studentIds: (b.studentIds || []).map(String),
        studentCount: (b.studentIds || []).length
      })),
      students: students.map((s: any) => ({
        _id: String(s._id),
        studentId: s.studentId,
        name: s.name,
        email: s.email
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
