import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
const Trainer = require("@/models/Trainer");
const bcrypt = require('bcryptjs');

export async function POST() {
  try {
    await connectMongo();
    
    // Check if test trainer already exists
    const existingTrainer = await Trainer.findOne({ trainerId: 'TRN0001' });
    if (existingTrainer) {
      return NextResponse.json({
        success: true,
        message: 'Test trainer already exists',
        trainer: {
          trainerId: 'TRN0001',
          password: 'test123'
        }
      });
    }
    
    // Create test trainer
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const testTrainer = await Trainer.create({
      trainerId: 'TRN0001',
      name: 'Test Trainer',
      email: 'test@trainer.com',
      password: hashedPassword,
      phone: '+91 9876543210',
      experience: '5+ years',
      expertise: ['JavaScript', 'React', 'Node.js'],
      bio: 'Test trainer for development',
      isActive: true,
      rating: 4.5
    });
    
    return NextResponse.json({
      success: true,
      message: 'Test trainer created successfully',
      trainer: {
        _id: testTrainer._id,
        trainerId: testTrainer.trainerId,
        name: testTrainer.name,
        email: testTrainer.email,
        loginCredentials: {
          loginId: 'TRN0001',
          password: 'test123'
        }
      }
    });
    
  } catch (error: any) {
    console.error('Create test trainer error:', error);
    return NextResponse.json(
      { error: 'Failed to create test trainer', message: error.message },
      { status: 500 }
    );
  }
}