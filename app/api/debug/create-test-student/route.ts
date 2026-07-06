import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
const Student = require("@/models/Student");
const Batch = require("@/models/Batch");
const Course = require("@/models/Course");
const Trainer = require("@/models/Trainer");
const bcrypt = require('bcryptjs');

export async function POST() {
  try {
    await connectMongo();
    
    // Check if test student already exists
    let testStudent = await Student.findOne({ studentId: 'STU0001' });
    
    if (!testStudent) {
      // Create test student
      const hashedPassword = await bcrypt.hash('test123', 10);
      
      testStudent = await Student.create({
        studentId: 'STU0001',
        name: 'Test Student',
        email: 'test@student.com',
        password: hashedPassword,
        phone: '+91 9876543210',
        isActive: true,
        batches: []
      });
    }
    
    // Find or create a test batch and enroll the student
    let testBatch = await Batch.findOne({ batchName: 'Test Batch' });
    
    if (!testBatch) {
      // Create a test course first
      let testCourse = await Course.findOne({ title: 'Test Course' });
      
      if (!testCourse) {
        testCourse = await Course.create({
          title: 'Test Course',
          description: 'Test course for live classes',
          duration: '3 months',
          level: 'Beginner',
          category: 'Programming'
        });
      }
      
      // Find or create a test trainer
      let testTrainer = await Trainer.findOne({ trainerId: 'TRN0001' });
      
      if (!testTrainer) {
        const hashedPassword = await bcrypt.hash('trainer123', 10);
        testTrainer = await Trainer.create({
          trainerId: 'TRN0001',
          name: 'Test Trainer',
          email: 'trainer@test.com',
          password: hashedPassword,
          phone: '+91 9876543211',
          isActive: true
        });
      }
      
      // Create test batch
      testBatch = await Batch.create({
        batchName: 'Test Batch',
        batchCode: 'TEST-BATCH-001',
        courseId: testCourse._id,
        trainerId: testTrainer._id,
        studentIds: [testStudent._id],
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        timing: '10:00 AM - 11:00 AM',
        capacity: 30,
        status: 'active',
        meetingLink: 'https://meet.google.com/test',
        description: 'Test batch for live classes'
      });
    } else {
      // Add student to existing batch if not already enrolled
      if (!testBatch.studentIds.includes(testStudent._id)) {
        testBatch.studentIds.push(testStudent._id);
        await testBatch.save();
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test student created and enrolled successfully',
      student: {
        _id: testStudent._id,
        studentId: testStudent.studentId,
        name: testStudent.name,
        email: testStudent.email,
        loginCredentials: {
          studentId: 'STU0001',
          password: 'test123'
        }
      },
      batch: {
        _id: testBatch._id,
        batchName: testBatch.batchName,
        batchCode: testBatch.batchCode
      }
    });
    
  } catch (error: any) {
    console.error('Create test student error:', error);
    return NextResponse.json(
      { error: 'Failed to create test student', message: error.message },
      { status: 500 }
    );
  }
}