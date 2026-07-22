import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const User = require('@/models/User');
const Student = require('@/models/Student');
const Trainer = require('@/models/Trainer');
const bcrypt = require('bcryptjs');

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    
    const { loginId, password } = await req.json();
    
    console.log('=== UNIFIED LOGIN DEBUG ===');
    console.log('Login attempt with identifier:', loginId);
    console.log('Password provided:', password ? 'Yes' : 'No');
    
    if (!loginId || !password) {
      console.log('Missing credentials');
      return NextResponse.json(
        { error: 'Login ID/Email and password are required' },
        { status: 400 }
      );
    }
    
    // SKIP unified User collection for trainers - go directly to legacy collections
    console.log('Skipping unified User collection, checking legacy collections directly...');
    
    // Check Trainer collection FIRST (prioritize trainer collection)
    const trainer = await Trainer.findOne({
      $or: [
        { email: loginId.trim() },
        { trainerId: loginId.trim() }
      ]
    });
    
    if (trainer) {
      console.log('✅ Found trainer in Trainer collection:', {
        _id: trainer._id,
        trainerId: trainer.trainerId,
        name: trainer.name,
        email: trainer.email
      });
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, trainer.password);
      if (!isPasswordValid) {
        console.log('❌ Password validation failed for trainer');
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }
      
      if (!trainer.isActive) {
        console.log('❌ Trainer account is inactive');
        return NextResponse.json(
          { error: 'Your account has been deactivated. Please contact admin.' },
          { status: 401 }
        );
      }
      
      // Create user data using the TRAINER COLLECTION data ONLY
      const userData = {
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
      };
      
      console.log('✅ Trainer login successful from Trainer collection');
      console.log('📝 Returning user data:', userData);
      
      return NextResponse.json({
        success: true,
        message: 'Login successful (trainer collection)',
        role: 'trainer',
        redirectPath: '/trainer/dashboard',
        user: userData,
        source: 'trainer_collection'
      });
    }
    
    // Check Student collection SECOND  
    const student = await Student.findOne({
      $or: [
        { email: loginId.trim() },
        { studentId: loginId.trim() }
      ]
    });
    
    if (student) {
      console.log('✅ Found student in Student collection:', student.studentId);
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, student.password);
      if (!isPasswordValid) {
        console.log('❌ Password validation failed for student');
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }
      
      if (!student.isActive) {
        console.log('❌ Student account is inactive');
        return NextResponse.json(
          { error: 'Your account has been deactivated. Please contact admin.' },
          { status: 401 }
        );
      }
      
      // Create user data using STUDENT COLLECTION data
      const userData = {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        phone: student.phone,
        enrollmentDate: student.enrollmentDate,
        isActive: student.isActive,
        batches: student.batches || []
      };
      
      console.log('✅ Student login successful from Student collection');
      
      return NextResponse.json({
        success: true,
        message: 'Login successful (student collection)',
        role: 'student',
        redirectPath: '/student/dashboard',
        user: userData,
        source: 'student_collection'
      });
    }
    
    // Only check unified User collection as last resort for admins
    console.log('Checking unified User collection as last resort...');
    
    const user = await User.findOne({
      $or: [
        { email: loginId.trim() },
        { userId: loginId.trim() },
        { studentId: loginId.trim() },
        { trainerId: loginId.trim() }
      ]
    });
    
    if (user) {
      console.log('⚠️ Found user in unified User collection (admin only):', user.userId);
      console.log('User role:', user.role);
      console.log('User active status:', user.isActive);
      console.log('Password provided length:', password.length);
      
      // Only allow admin login from User collection
      if (user.role !== 'admin') {
        console.log('❌ Non-admin found in User collection, rejecting');
        return NextResponse.json(
          { error: 'Please use the correct login for your role' },
          { status: 401 }
        );
      }
      
      // Admin login logic 
      console.log('Attempting password comparison for admin...');
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('Password validation result:', isPasswordValid);
      console.log('Stored password hash length:', user.password?.length);
      
      if (!isPasswordValid) {
        console.log('❌ Password validation failed for admin');
        console.log('Provided password:', password);
        console.log('Stored hash starts with:', user.password?.substring(0, 20));
        
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }
      
      if (!user.isActive) {
        console.log('❌ Admin account is inactive');
        return NextResponse.json(
          { error: 'Your account has been deactivated. Please contact support.' },
          { status: 401 }
        );
      }
      
      // Create admin user data
      const adminData = {
        _id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      };
      
      console.log('✅ Admin login successful from User collection');
      console.log('📝 Returning admin data:', adminData);
      
      return NextResponse.json({
        success: true,
        message: 'Login successful (admin)',
        role: 'admin',
        redirectPath: '/lms',
        user: adminData,
        source: 'user_collection'
      });
    }
      
      // Not found in any collection
      console.log('❌ User not found in any collection');
      
      // Debug: Show what users exist
      const allUsers = await User.find({}, { userId: 1, name: 1, email: 1, role: 1 }).limit(5);
      const allStudents = await Student.find({}, { studentId: 1, name: 1, email: 1 }).limit(5);
      const allTrainers = await Trainer.find({}, { trainerId: 1, name: 1, email: 1 }).limit(5);
      
      console.log('Available users:', allUsers.map((u: any) => ({
        userId: u.userId,
        name: u.name,
        email: u.email,
        role: u.role
      })));
      console.log('Available students:', allStudents.map((s: any) => ({
        studentId: s.studentId,
        name: s.name,
        email: s.email
      })));
      console.log('Available trainers:', allTrainers.map((t: any) => ({
        trainerId: t.trainerId,
        name: t.name,
        email: t.email
      })));
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
   catch (error: any) {
    console.error('Unified login error:', error);
    return NextResponse.json(
      { error: 'Login failed', message: error.message },
      { status: 500 }
    );
  } 
}