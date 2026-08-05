import { NextApiRequest, NextApiResponse } from 'next';
import { connectMongo } from "@/utils/mongodb";
const TrainerNote = require("@/models/TrainerNote");
const Trainer = require("@/models/Trainer");
const Batch = require("@/models/Batch");
const Course = require("@/models/Course");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectMongo();

    if (req.method === 'GET') {
      // Get trainer's notes
      const { trainerId, batchId } = req.query;

      if (!trainerId) {
        return res.status(400).json({ error: 'Trainer ID is required' });
      }

      console.log('📝 FETCHING TRAINER NOTES:', { trainerId, batchId });

      // Handle trainer ID - might need to find by trainerId field
      let actualTrainerId = trainerId;
      const mongoose = require('mongoose');
      
      if (!mongoose.Types.ObjectId.isValid(trainerId)) {
        const trainer = await Trainer.findOne({ trainerId: trainerId }).lean();
        if (trainer) {
          actualTrainerId = trainer._id;
        } else {
          return res.status(404).json({ error: 'Trainer not found' });
        }
      }

      let query: any = { trainerId: actualTrainerId };
      
      // If specific batch requested, filter by batch
      if (batchId) {
        query.batchIds = batchId;
      }

      const notes = await TrainerNote.find(query)
        .populate('batchIds', 'batchName batchCode')
        .populate('courseIds', 'title')
        .sort({ createdAt: -1 })
        .lean();

      console.log(`✅ Found ${notes.length} notes for trainer`);

      return res.status(200).json({
        success: true,
        notes: notes,
        totalNotes: notes.length
      });

    } else if (req.method === 'POST') {
      // Create new note
      const { trainerId, title, description, noteType, textContent, batchIds, moduleIndex, moduleTitle, tags, pdfFile } = req.body;

      if (!trainerId || !title || !noteType) {
        return res.status(400).json({ error: 'Trainer ID, title, and note type are required' });
      }

      console.log('📝 CREATING NEW TRAINER NOTE:', { trainerId, title, noteType });

      // Handle trainer ID
      let actualTrainerId = trainerId;
      const mongoose = require('mongoose');
      
      if (!mongoose.Types.ObjectId.isValid(trainerId)) {
        const trainer = await Trainer.findOne({ trainerId: trainerId }).lean();
        if (trainer) {
          actualTrainerId = trainer._id;
        } else {
          return res.status(404).json({ error: 'Trainer not found' });
        }
      }

      // Get course IDs from batch IDs
      let courseIds: any[] = [];
      if (batchIds && batchIds.length > 0) {
        const batches = await Batch.find({
          _id: { $in: batchIds }
        }).populate('courseId').lean();
        
        courseIds = [...new Set(batches.map((batch: any) => batch.courseId._id))];
      }

      const noteData: any = {
        trainerId: actualTrainerId,
        title,
        description: description || '',
        noteType,
        batchIds: batchIds || [],
        courseIds,
        moduleIndex: moduleIndex || null,
        moduleTitle: moduleTitle || '',
        tags: tags || [],
        isPublished: false
      };

      if (noteType === 'text' && textContent) {
        noteData.textContent = textContent.map((section: any, index: number) => ({
          title: section.title,
          content: section.content,
          order: index
        }));
      }

      if (noteType === 'pdf' && pdfFile) {
        noteData.pdfFile = pdfFile;
      }

      const newNote = new TrainerNote(noteData);
      await newNote.save();

      console.log('✅ Created note:', newNote._id);

      return res.status(201).json({
        success: true,
        note: newNote,
        message: 'Note created successfully'
      });

    } else if (req.method === 'PUT') {
      // Update existing note
      const { noteId, title, description, textContent, batchIds, moduleIndex, moduleTitle, tags, isPublished, pdfFile } = req.body;

      if (!noteId) {
        return res.status(400).json({ error: 'Note ID is required' });
      }

      console.log('📝 UPDATING TRAINER NOTE:', noteId);

      const updateData: any = {};
      
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (textContent !== undefined) {
        updateData.textContent = textContent.map((section: any, index: number) => ({
          title: section.title,
          content: section.content,
          order: index
        }));
      }
      if (pdfFile !== undefined) {
        updateData.pdfFile = pdfFile;
      }
      if (batchIds !== undefined) {
        updateData.batchIds = batchIds;
        
        // Update course IDs
        if (batchIds.length > 0) {
          const batches = await Batch.find({
            _id: { $in: batchIds }
          }).populate('courseId').lean();
          
          updateData.courseIds = [...new Set(batches.map((batch: any) => batch.courseId._id))];
        } else {
          updateData.courseIds = [];
        }
      }
      if (moduleIndex !== undefined) updateData.moduleIndex = moduleIndex;
      if (moduleTitle !== undefined) updateData.moduleTitle = moduleTitle;
      if (tags !== undefined) updateData.tags = tags;
      if (isPublished !== undefined) {
        updateData.isPublished = isPublished;
        if (isPublished) {
          updateData.publishedAt = new Date();
        }
      }

      const updatedNote = await TrainerNote.findByIdAndUpdate(
        noteId,
        updateData,
        { new: true }
      ).populate('batchIds', 'batchName batchCode')
       .populate('courseIds', 'title');

      if (!updatedNote) {
        return res.status(404).json({ error: 'Note not found' });
      }

      console.log('✅ Updated note:', noteId);

      return res.status(200).json({
        success: true,
        note: updatedNote,
        message: 'Note updated successfully'
      });

    } else if (req.method === 'DELETE') {
      // Delete note
      const { noteId } = req.query;

      if (!noteId) {
        return res.status(400).json({ error: 'Note ID is required' });
      }

      console.log('📝 DELETING TRAINER NOTE:', noteId);

      const deletedNote = await TrainerNote.findByIdAndDelete(noteId);

      if (!deletedNote) {
        return res.status(404).json({ error: 'Note not found' });
      }

      console.log('✅ Deleted note:', noteId);

      return res.status(200).json({
        success: true,
        message: 'Note deleted successfully'
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('❌ Error in trainer notes API:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}