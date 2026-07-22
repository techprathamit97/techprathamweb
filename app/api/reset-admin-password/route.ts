import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const User = require('@/models/User');
const bcrypt = require('bcryptjs');

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    
    console.log('=== RESETTING ADMIN PASSWORD ===');
    
    // Find the admin user
    const admin = await User.findOne({ 
      $or: [
        { userId: 'ADMIN001' },
        { email: 'admin@techpratham.com' },
        { role: 'admin' }
      ]
    });
    
    if (!admin) {
      return NextResponse.json({
        success: false,
        error: 'No admin user found'
      }, { status: 404 });
    }
    
    console.log('Found admin user:', admin.userId, admin.email);
    
    // Reset password to 'admin123'
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update the admin user
    await User.findByIdAndUpdate(admin._id, {
      password: hashedPassword,
      updatedAt: new Date()
    });
    
    console.log('Admin password reset successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Admin password reset successfully!',
      admin: {
        userId: admin.userId,
        email: admin.email,
        name: admin.name
      },
      credentials: {
        email: 'admin@techpratham.com',
        password: 'admin123'
      },
      instructions: [
        '1. Go to: http://localhost:3000/login',
        '2. Select "LMS Admin"',
        '3. Enter email: admin@techpratham.com', 
        '4. Enter password: admin123'
      ]
    });
    
  } catch (error: any) {
    console.error('Error resetting admin password:', error);
    return NextResponse.json(
      { error: 'Failed to reset admin password', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Allow GET requests to reset password for convenience
  return POST(req);
}