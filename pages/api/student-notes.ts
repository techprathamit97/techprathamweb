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

    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    console.log('📚 FETCHING STUDENT NOTES:', studentId);

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

    // Get batches where this student is enrolled
    const studentBatches = await Batch.find({
      studentIds: actualStudentId
    }).lean();

    const batchIds = studentBatches.map((batch: any) => batch._id);

    console.log(`Student enrolled in ${batchIds.length} batches`);

    if (batchIds.length === 0) {
      return res.status(200).json({
        success: true,
        notes: [],
        totalNotes: 0,
        message: 'Student not enrolled in any batches'
      });
    }

    // Find published notes that are assigned to student's batches
    const studentNotes = await TrainerNote.find({
      isPublished: true,
      batchIds: { $in: batchIds }
    })
      .populate('trainerId', 'name email')
      .populate('batchIds', 'batchName batchCode')
      .populate('courseIds', 'title')
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();

    console.log(`Found ${studentNotes.length} published notes for student`);

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
      enrolledBatches: batchIds.length
    });

  } catch (error: any) {
    console.error('❌ Error in student notes API:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}