import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
import { getRequestAdmin } from '@/lib/adminApiAuth';
const User = require('@/models/User');
const bcrypt = require('bcryptjs');

const ADMIN_ID_PATTERN = /^ADMIN(\d+)$/;

/** Next sequential admin userId (ADMIN0001, ADMIN0002, ...), from the highest existing one. */
function nextAdminId(existingIds: unknown[]): string {
  let highest = 0;
  for (const id of existingIds || []) {
    if (typeof id !== 'string') continue;
    const match = id.match(ADMIN_ID_PATTERN);
    if (!match) continue;
    const value = parseInt(match[1], 10);
    if (!Number.isNaN(value) && value > highest) highest = value;
  }
  return `ADMIN${String(highest + 1).padStart(4, '0')}`;
}

// GET - list all admins (logged-in admins only)
export async function GET(req: NextRequest) {
  try {
    const requester = await getRequestAdmin(req);
    if (!requester) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in as an admin.' },
        { status: 401 }
      );
    }

    await connectMongo();

    const admins = await User.find({ role: 'admin' }, { password: 0, resetToken: 0, resetTokenExpiry: 0 })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      admins: admins.map((a: any) => ({
        _id: a._id,
        userId: a.userId,
        name: a.name,
        email: a.email,
        phone: a.phone || '',
        isActive: a.isActive !== false,
        accessLevel: a.adminData?.accessLevel || 'admin',
        createdAt: a.createdAt,
        // Flag the requester's own row so the UI can prevent self-deactivation, etc.
        isSelf: a._id.toString() === requester._id,
      })),
    });
  } catch (error: any) {
    console.error('Failed to list admins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admins', detail: error?.message },
      { status: 500 }
    );
  }
}

// POST - create a new admin (logged-in admins only)
export async function POST(req: NextRequest) {
  try {
    const requester = await getRequestAdmin(req);
    if (!requester) {
      return NextResponse.json(
        { error: 'Authentication required. Only a logged-in admin can create admins.' },
        { status: 401 }
      );
    }

    await connectMongo();

    const data = await req.json();
    const name = (data.name || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    const phone = (data.phone || '').trim();
    const password = data.password;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Email must be unique across the unified User collection.
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Allocate the next admin userId from the highest existing one, retrying on
    // a unique-index clash in case of a concurrent create.
    const existingAdmins = await User.find({}).select('userId').lean();
    const startingId = nextAdminId(existingAdmins.map((a: any) => a.userId));
    const startNumber = parseInt(startingId.replace('ADMIN', ''), 10) || 1;

    let newAdmin: any = null;
    let lastError: any = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const userId = `ADMIN${String(startNumber + attempt).padStart(4, '0')}`;
      try {
        newAdmin = await User.create({
          userId,
          name,
          email,
          password: hashedPassword,
          phone,
          role: 'admin',
          isActive: true,
          adminData: {
            permissions: data.permissions || [],
            department: data.department || '',
            accessLevel: data.accessLevel || 'admin',
          },
        });
        break;
      } catch (createError: any) {
        lastError = createError;
        const isUserIdClash =
          createError?.code === 11000 &&
          Object.keys(createError?.keyPattern || createError?.keyValue || {}).includes('userId');
        if (!isUserIdClash) throw createError;
        console.warn(`admin userId ${userId} already taken, retrying`);
      }
    }

    if (!newAdmin) throw lastError || new Error('Could not allocate an admin userId');

    return NextResponse.json(
      {
        success: true,
        message: 'Admin account created successfully',
        admin: {
          _id: newAdmin._id,
          userId: newAdmin.userId,
          name: newAdmin.name,
          email: newAdmin.email,
          phone: newAdmin.phone,
          isActive: newAdmin.isActive,
          accessLevel: newAdmin.adminData?.accessLevel || 'admin',
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create admin:', {
      name: error?.name,
      code: error?.code,
      message: error?.message,
      keyValue: error?.keyValue,
    });

    if (error?.code === 11000) {
      const field = Object.keys(error?.keyPattern || error?.keyValue || {})[0] || 'field';
      return NextResponse.json(
        { error: `An admin with this ${field} already exists`, field },
        { status: 409 }
      );
    }

    if (error?.name === 'ValidationError') {
      const fields = Object.keys(error.errors || {});
      return NextResponse.json(
        { error: `Validation failed for: ${fields.join(', ')}`, fields },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create admin', detail: error?.message },
      { status: 500 }
    );
  }
}
