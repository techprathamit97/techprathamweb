import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Trainer = require('@/models/Trainer');
const bcrypt = require('bcryptjs');

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    
    const { loginId, password } = await req.json();
    
    console.log('=== TRAINER LOGIN DEBUG ===');
    console.log('Login attempt with identifier:', loginId);
    console.log('Password provided:', password ? 'Yes' : 'No');
    
    if (!loginId || !password) {
      console.log('Missing credentials');
      return NextResponse.json(
        { error: 'Email/Login ID and password are required' },
        { status: 400 }
      );
    }
    
    // Find trainer by email OR trainerId (loginId)
    const trainer = await Trainer.findOne({
      $or: [
        { email: loginId.trim() },
        { trainerId: loginId.trim() }
      ]
    });
    
    console.log('Trainer found:', trainer ? 'Yes' : 'No');
    
    if (!trainer) {
      // Let's also check what trainers exist
      const allTrainers = await Trainer.find({}, { trainerId: 1, name: 1, email: 1 }).limit(10);
      console.log('Available trainers:', allTrainers.map((t: any) => ({
        trainerId: t.trainerId,
        name: t.name,
        email: t.email
      })));
      
      return NextResponse.json(
        { error: 'Invalid Email/Login ID or password' },
        { status: 401 }
      );
    }
    
    console.log('Found trainer details:', {
      _id: trainer._id,
      trainerId: trainer.trainerId,
      name: trainer.name,
      email: trainer.email,
      isActive: trainer.isActive,
      hasPassword: !!trainer.password
    });
    
    // Check if trainer is active
    if (!trainer.isActive) {
      console.log('Trainer account is inactive');
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact admin.' },
        { status: 401 }
      );
    }
    
    // Verify password
    console.log('Comparing password...');
    const isPasswordValid = await bcrypt.compare(password, trainer.password);
    console.log('Password comparison result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('Password validation failed');
      return NextResponse.json(
        { error: 'Invalid Email/Login ID or password' },
        { status: 401 }
      );
    }
    
    console.log('Login successful for trainer:', trainer.email);
    
    // Return trainer data (excluding password)
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      trainer: {
        _id: trainer._id,
        trainerId: trainer.trainerId,
        name: trainer.name,
        email: trainer.email,
        phone: trainer.phone,
        experience: trainer.experience,
        expertise: trainer.expertise || [],
        bio: trainer.bio,
        rating: trainer.rating || 0,
        isActive: trainer.isActive,
        joinedAt: trainer.createdAt
      }
    });
    
  } catch (error: any) {
    console.error('Trainer login error:', error);
    return NextResponse.json(
      { error: 'Login failed', message: error.message },
      { status: 500 }
    );
  }
}