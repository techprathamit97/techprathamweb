import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');
const Trainer = require('@/models/Trainer');
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
    const userType = type === 'trainer' ? 'trainer' : 'student';

    let user;
    let userModel;

    if (userType === 'student') {
      user = await Student.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: new Date() }
      });
      userModel = Student;
    } else {
      user = await Trainer.findOne({
        resetToken: token,
        resetTokenExpiry: { $gt: new Date() }
      });
      userModel = Trainer;
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
