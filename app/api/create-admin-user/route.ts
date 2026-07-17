import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const User = require('@/models/User');
const bcrypt = require('bcryptjs');

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    
    console.log('=== CREATING ADMIN USER ===');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      $or: [
        { userId: 'ADMIN001' },
        { email: 'admin@techpratham.com' },
        { role: 'admin' }
      ]
    });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.userId, existingAdmin.email);
      return NextResponse.json({
        success: true,
        message: 'Admin user already exists',
        admin: {
          userId: existingAdmin.userId,
          email: existingAdmin.email,
          name: existingAdmin.name,
          role: existingAdmin.role,
          isActive: existingAdmin.isActive
        },
        note: 'You can login with existing credentials'
      });
    }
    
    // Create hashed password
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('Password hashed successfully');
    
    // Create admin user
    const adminUser = new User({
      userId: 'ADMIN001',
      name: 'System Administrator',
      email: 'admin@techpratham.com',
      password: hashedPassword,
      phone: '+91-9999999999',
      role: 'admin',
      isActive: true,
      adminData: {
        permissions: [
          'manage_students',
          'manage_trainers', 
          'manage_courses',
          'manage_batches',
          'manage_payments',
          'manage_certificates',
          'view_analytics',
          'system_settings',
          'user_management',
          'backup_restore'
        ],
        department: 'IT Administration',
        accessLevel: 'super_admin'
      }
    });
    
    await adminUser.save();
    console.log('Admin user created successfully');
    
    // Also create a backup admin
    const backupAdmin = new User({
      userId: 'ADMIN002',
      name: 'Backup Administrator',
      email: 'backup@techpratham.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      adminData: {
        permissions: [
          'manage_students',
          'manage_trainers',
          'manage_courses',
          'view_analytics'
        ],
        department: 'Administration',
        accessLevel: 'admin'
      }
    });
    
    await backupAdmin.save();
    console.log('Backup admin user created successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Admin users created successfully!',
      admins: [
        {
          userId: 'ADMIN001',
          email: 'admin@techpratham.com',
          password: 'admin123',
          name: 'System Administrator',
          accessLevel: 'super_admin',
          note: 'Primary admin with full permissions'
        },
        {
          userId: 'ADMIN002', 
          email: 'backup@techpratham.com',
          password: 'admin123',
          name: 'Backup Administrator',
          accessLevel: 'admin',
          note: 'Backup admin with limited permissions'
        }
      ],
      loginInstructions: {
        url: '/login',
        credentials: 'Use either userId or email with password: admin123',
        redirectsTo: '/lms (LMS Dashboard)'
      }
    });
    
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create admin user', 
        message: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    
    // Check current admin users
    const adminUsers = await User.find({ role: 'admin' }, { password: 0 });
    
    return NextResponse.json({
      success: true,
      message: `Found ${adminUsers.length} admin user(s)`,
      admins: adminUsers.map((admin: any) => ({
        _id: admin._id,
        userId: admin.userId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        accessLevel: admin.adminData?.accessLevel,
        permissions: admin.adminData?.permissions,
        createdAt: admin.createdAt
      }))
    });
    
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin users', message: error.message },
      { status: 500 }
    );
  }
}