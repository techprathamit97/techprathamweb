import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import { getRequestAdmin } from '@/lib/adminApiAuth';
const User = require('@/models/User');

// DELETE - remove an admin account (logged-in admins only; cannot delete self)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const requester = await getRequestAdmin(req);
    if (!requester) {
      return NextResponse.json(
        { error: 'Authentication required. Only a logged-in admin can delete admins.' },
        { status: 401 }
      );
    }

    await connectMongo();

    const { id } = await params;

    // An admin can never delete their own account.
    if (id === requester._id) {
      return NextResponse.json(
        { error: 'You cannot delete your own admin account.' },
        { status: 400 }
      );
    }

    const target = await User.findOne({ _id: id, role: 'admin' });
    if (!target) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 });
    }

    // Never allow removing the last remaining admin.
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last remaining admin account.' },
        { status: 400 }
      );
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: `Admin ${target.name} has been deleted.`,
    });
  } catch (error: any) {
    console.error('Delete admin error:', error);
    return NextResponse.json(
      { error: 'Failed to delete admin', detail: error?.message },
      { status: 500 }
    );
  }
}
