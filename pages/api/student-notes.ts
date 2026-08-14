import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from "@/utils/mongodb";
const TrainerNote = require("@/models/TrainerNote");
const Student = require("@/models/Student");
const Batch = require("@/models/Batch");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectMongo();

    const { studentId, batchId } = req.query;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    console.log('📚 FETCHING STUDENT NOTES:', studentId, 'for batch:', batchId);

    // Handle student ID - might need to find by studentId field
    let actualStudentId = studentId;
    const mongoose = require('mongoose');
    
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      const student = await Student.findOne({ studentId: studentId }).lean();
      if (student) {
        actualStudentId = student._id;
      } else {
        return res.status(404).json({ error: 'Student not found' });
      }
    }

    // Find student and their batches
    const student = await Student.findById(actualStudentId).lean();
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Resolve which batches to pull notes for.
    // Enrollment is treated as a soft signal: if the batch exists we still scope
    // notes to it, because a missing studentIds entry used to produce a silent
    // "0 notes" that was indistinguishable from "trainer added nothing".
    let targetBatchIds: any[] = [];
    let enrollmentMatched = true;

    if (batchId) {
      const specificBatch = await Batch.findById(batchId).lean();

      if (!specificBatch) {
        return res.status(404).json({ success: false, error: 'Batch not found' });
      }

      enrollmentMatched = (specificBatch.studentIds || []).some(
        (id: any) => String(id) === String(actualStudentId)
      );

      if (!enrollmentMatched) {
        console.warn(
          `⚠️ Student ${actualStudentId} is not in batch ${batchId}.studentIds - ` +
          `serving batch notes anyway and flagging enrollment`
        );
      }

      targetBatchIds = [specificBatch._id];
    } else {
      const studentBatches = await Batch.find({
        studentIds: actualStudentId
      }).lean();

      targetBatchIds = studentBatches.map((batch: any) => batch._id);
    }

    console.log(`Searching notes for ${targetBatchIds.length} batch(es)`);

    if (targetBatchIds.length === 0) {
      return res.status(200).json({
        success: true,
        notes: [],
        totalNotes: 0,
        message: 'Student not enrolled in any batches',
        diagnostics: {
          enrollmentMatched: false,
          notesForBatch: 0,
          publishedNotes: 0,
          draftNotes: 0
        }
      });
    }

    // Count everything assigned to these batches regardless of publish state, so
    // the UI can distinguish "nothing created" from "created but still a draft".
    const allBatchNotes = await TrainerNote.find({
      batchIds: { $in: targetBatchIds }
    }).select('_id isPublished title').lean();

    const draftCount = allBatchNotes.filter((n: any) => !n.isPublished).length;
    const publishedCount = allBatchNotes.length - draftCount;

    console.log(
      `📊 Notes for batch scope: ${allBatchNotes.length} total, ` +
      `${publishedCount} published, ${draftCount} draft`
    );

    // Find published notes that are assigned to target batch(es)
    const studentNotes = await TrainerNote.find({
      isPublished: true,
      batchIds: { $in: targetBatchIds }
    })
      .populate('trainerId', 'name email')
      .populate('batchIds', 'batchName batchCode')
      .populate('courseIds', 'title')
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();

    console.log(`Found ${studentNotes.length} published notes for student${batchId ? ' in batch ' + batchId : ''}`);

    // Track student view for each note (if not already viewed)
    for (const note of studentNotes) {
      const existingView = note.studentViews?.find((view: any) => 
        view.studentId.toString() === actualStudentId.toString()
      );

      if (!existingView) {
        // Add student view tracking
        await TrainerNote.findByIdAndUpdate(note._id, {
          $push: {
            studentViews: {
              studentId: actualStudentId,
              viewedAt: new Date(),
              viewCount: 1
            }
          },
          $inc: { viewCount: 1 },
          $set: { lastViewedAt: new Date() }
        });
      }
    }

    // Format notes for student view
    const formattedNotes = studentNotes.map((note: any) => ({
      _id: note._id,
      title: note.title,
      description: note.description,
      noteType: note.noteType,
      textContent: note.textContent,
      pdfFile: note.pdfFile,
      moduleIndex: note.moduleIndex,
      moduleTitle: note.moduleTitle,
      publishedAt: note.publishedAt,
      viewCount: note.viewCount,
      trainer: {
        name: note.trainerId?.name || 'Unknown',
        email: note.trainerId?.email || ''
      },
      batches: note.batchIds?.map((batch: any) => ({
        _id: batch._id,
        batchName: batch.batchName,
        batchCode: batch.batchCode
      })) || [],
      courses: note.courseIds?.map((course: any) => ({
        _id: course._id,
        title: course.title
      })) || [],
      tags: note.tags || []
    }));

    return res.status(200).json({
      success: true,
      notes: formattedNotes,
      totalNotes: formattedNotes.length,
      student: {
        _id: student._id,
        studentId: student.studentId || student._id,
        name: student.name,
        email: student.email
      },
      enrolledBatches: targetBatchIds.length,
      batchSpecific: !!batchId,
      // Explains an empty list instead of leaving the UI guessing
      diagnostics: {
        enrollmentMatched,
        notesForBatch: allBatchNotes.length,
        publishedNotes: publishedCount,
        draftNotes: draftCount
      }
    });

  } catch (error: any) {
    console.error('❌ Error in student notes API:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}