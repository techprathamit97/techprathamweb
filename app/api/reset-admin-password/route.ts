import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import { getRequestAdmin, anyAdminExists } from '@/lib/adminApiAuth';
const User = require('@/models/User');
const bcrypt = require('bcryptjs');

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    // This endpoint resets an admin to a known default password, so it must be
    // protected. Allow it only during first-time bootstrap (no admin exists), or
    // for an already logged-in admin.
    if (await anyAdminExists()) {
      const requester = await getRequestAdmin(req);
      if (!requester) {
        return NextResponse.json(
          { error: 'Authentication required. Only a logged-in admin can reset the admin password.' },
          { status: 401 }
        );
      }
    }

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

export async function GET() {
  // Resetting a password is a state-changing, sensitive action and must not be
  // triggerable by a simple GET (link prefetch, crawler, etc.). Use POST.
  return NextResponse.json(
    { error: 'Method not allowed. Use POST (authenticated as an admin) to reset the admin password.' },
    { status: 405 }
  );
}