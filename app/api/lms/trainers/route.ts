import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
const Trainer = require("@/models/Trainer");
const Batch = require("@/models/Batch");
const bcrypt = require('bcryptjs');

export async function GET() {
  try {
    await connectMongo();
    
    const trainers = await Trainer.find({}).sort({ createdAt: -1 }).lean();
    
    // Get batch info for each trainer
    const trainersWithDetails = await Promise.all(
      trainers.map(async (trainer: any) => {
        const batches = await Batch.find({ trainerId: trainer._id }).lean();
        
        return {
          _id: trainer._id,
          trainerId: trainer.trainerId || trainer._id.toString(),
          name: trainer.name,
          email: trainer.email,
          phone: trainer.phone || '',
          expertise: trainer.expertise || [],
          bio: trainer.bio || '',
          qualification: trainer.qualification || '',
          experience: trainer.experience || '',
          dateOfJoining: trainer.dateOfJoining,
          isActive: trainer.isActive !== false,
          batches: batches.length,
          rating: 4.5,
          createdAt: trainer.createdAt
        };
      })
    );
    
    return NextResponse.json(trainersWithDetails);
  } catch (error) {
    console.error('Failed to fetch trainers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trainers' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectMongo();
    
    const data = await req.json();
    
    // Accept either 'password' or 'loginPassword' from frontend
    const password = data.password || data.loginPassword;
    
    if (!data.name || !data.email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existingTrainer = await Trainer.findOne({ email: data.email });
    if (existingTrainer) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate trainerId
    const trainerCount = await Trainer.countDocuments({});
    const trainerId = `TRN${String(trainerCount + 1).padStart(4, '0')}`;
    
    // Create trainer
    const newTrainer = await Trainer.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      phone: data.phone,
      trainerId: trainerId,
      expertise: data.expertise || [],
      bio: data.bio || '',
      qualification: data.qualification || '',
      experience: data.experience || '',
      isActive: true
    });
    
    return NextResponse.json({
      success: true,
      message: 'Trainer created successfully',
      trainer: {
        _id: newTrainer._id,
        trainerId: newTrainer.trainerId,
        name: newTrainer.name,
        email: newTrainer.email,
        phone: newTrainer.phone,
        isActive: newTrainer.isActive
      },
      loginPassword: password // Return the password so admin can share it
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create trainer:', error);
    return NextResponse.json(
      { error: 'Failed to create trainer' },
      { status: 500 }
    );
  }
}
