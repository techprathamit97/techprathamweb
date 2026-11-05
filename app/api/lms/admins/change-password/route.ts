import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import { getRequestAdmin } from '@/lib/adminApiAuth';
const User = require('@/models/User');
const bcrypt = require('bcryptjs');

/**
 * Change an admin password. Fully protected: only a logged-in admin may call it.
 *
 * - Changing your OWN password requires the correct `currentPassword`.
 * - An admin may reset ANOTHER admin's password (admin privilege) without the
 *   current password.
 */
export async function POST(req: NextRequest) {
  try {
    const requester = await getRequestAdmin(req);
    if (!requester) {
      return NextResponse.json(
        { error: 'Authentication required. Only a logged-in admin can change passwords.' },
        { status: 401 }
      );
    }

    await connectMongo();

    const body = await req.json();
    const { currentPassword, newPassword } = body;
    const targetAdminId = body.targetAdminId || requester._id;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const target = await User.findOne({ _id: targetAdminId, role: 'admin' });
    if (!target) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 });
    }

    const isSelf = target._id.toString() === requester._id;

    // Changing your own password requires proving you know the current one.
    if (isSelf) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Your current password is required to change your own password' },
          { status: 400 }
        );
      }
      const valid = await bcrypt.compare(currentPassword, target.password);
      if (!valid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(target._id, {
      password: hashedPassword,
      // Invalidate any outstanding email reset token once the password changes.
      resetToken: null,
      resetTokenExpiry: null,
    });

    return NextResponse.json({
      success: true,
      message: isSelf
        ? 'Your password has been changed successfully.'
        : `Password for ${target.email} has been reset successfully.`,
    });
  } catch (error: any) {
    console.error('Admin change-password error:', error);
    return NextResponse.json(
      { error: 'Failed to change password', detail: error?.message },
      { status: 500 }
    );
  }
}
