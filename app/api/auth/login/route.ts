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
    
    // First, try to find user in the unified User collection
    let user = await User.findOne({
      $or: [
        { email: loginId.trim() },
        { userId: loginId.trim() },
        { studentId: loginId.trim() },
        { trainerId: loginId.trim() }
      ]
    });
    
    console.log('User found in unified collection:', user ? 'Yes' : 'No');
    
    // If not found in unified collection, check legacy collections
    if (!user) {
      console.log('Checking legacy collections...');
      
      // Check Student collection
      const student = await Student.findOne({
        $or: [
          { email: loginId.trim() },
          { studentId: loginId.trim() }
        ]
      });
      
      if (student) {
        console.log('Found in legacy Student collection:', student.studentId);
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, student.password);
        if (!isPasswordValid) {
          console.log('Password validation failed for student');
          return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
          );
        }
        
        if (!student.isActive) {
          console.log('Student account is inactive');
          return NextResponse.json(
            { error: 'Your account has been deactivated. Please contact admin.' },
            { status: 401 }
          );
        }
        
        // Create user data in legacy format for compatibility
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
        
        console.log('Legacy student login successful:', student.email);
        
        return NextResponse.json({
          success: true,
          message: 'Login successful (legacy)',
          role: 'student',
          redirectPath: '/student/dashboard',
          user: userData,
          isLegacy: true
        });
      }
      
      // Check Trainer collection
      const trainer = await Trainer.findOne({
        $or: [
          { email: loginId.trim() },
          { trainerId: loginId.trim() }
        ]
      });
      
      if (trainer) {
        console.log('Found in legacy Trainer collection:', trainer.trainerId);
        
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, trainer.password);
        if (!isPasswordValid) {
          console.log('Password validation failed for trainer');
          return NextResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
          );
        }
        
        if (!trainer.isActive) {
          console.log('Trainer account is inactive');
          return NextResponse.json(
            { error: 'Your account has been deactivated. Please contact admin.' },
            { status: 401 }
          );
        }
        
        // Create user data in legacy format for compatibility
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
        
        console.log('Legacy trainer login successful:', trainer.email);
        
        return NextResponse.json({
          success: true,
          message: 'Login successful (legacy)',
          role: 'trainer',
          redirectPath: '/trainer/dashboard',
          user: userData,
          isLegacy: true
        });
      }
      
      // Not found in any collection
      console.log('User not found in any collection');
      
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
    
    // Found user in unified collection - proceed with unified auth
    console.log('Found user details:', {
      _id: user._id,
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      hasPassword: !!user.password
    });
    
    // Check if user is active
    if (!user.isActive) {
      console.log('User account is inactive');
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact admin.' },
        { status: 401 }
      );
    }
    
    // Verify password
    console.log('Comparing password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password comparison result:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('Password validation failed');
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    console.log('Login successful for user:', user.email, 'Role:', user.role);
    
    // Prepare response based on role
    let userData;
    let redirectPath;
    
    switch (user.role) {
      case 'student':
        userData = user.getStudentData();
        redirectPath = '/student/dashboard';
        break;
      case 'trainer':
        userData = user.getTrainerData();
        redirectPath = '/trainer/dashboard';
        break;
      case 'admin':
        userData = user.getAdminData();
        redirectPath = '/lms';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid user role' },
          { status: 400 }
        );
    }
    
    // Return user data (excluding password)
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      role: user.role,
      redirectPath: redirectPath,
      user: userData,
      isLegacy: false
    });
    
  } catch (error: any) {
    console.error('Unified login error:', error);
    return NextResponse.json(
      { error: 'Login failed', message: error.message },
      { status: 500 }
    );
  }
}