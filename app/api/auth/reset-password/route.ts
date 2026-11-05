import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');
const Trainer = require('@/models/Trainer');
const User = require('@/models/User');
const bcrypt = require('bcryptjs');

// PUT - Reset password with token
export async function PUT(req: NextRequest) {
  try {
    await connectMongo();

    const body = await req.json();
    const { token, newPassword, type } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Determine which collection to search based on type
    let userType: 'student' | 'trainer' | 'admin' = 'student';
    if (type === 'trainer') userType = 'trainer';
    else if (type === 'admin') userType = 'admin';

    let user;
    let userModel;

    if (userType === 'student') {
      userModel = Student;
    } else if (userType === 'trainer') {
      userModel = Trainer;
    } else {
      userModel = User;
    }

    user = await userModel.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });

    // Admin reset tokens must belong to an account with the admin role
    if (user && userType === 'admin' && user.role !== 'admin') {
      user = null;
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new password reset.' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await userModel.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    });

    console.log('Password reset successful for:', user.email);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });

  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password', message: error.message },
      { status: 500 }
    );
  }
}
