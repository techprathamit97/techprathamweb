import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Trainer = require('@/models/Trainer');
const Batch = require('@/models/Batch');
const Student = require('@/models/Student');

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    
    const { searchParams } = new URL(req.url);
    const trainerId = searchParams.get('trainerId');
    
    if (!trainerId) {
      return NextResponse.json(
        { error: 'Trainer ID is required' },
        { status: 400 }
      );
    }
    
    // Find trainer by trainerId
    const trainer = await Trainer.findOne({ trainerId: trainerId }).lean();
    
    if (!trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }
    
    // Get batches assigned to this trainer
    const batches = await Batch.find({ 
      trainerId: trainer._id 
    })
    .populate('courseId')
    .populate('studentIds')
    .lean();
    
    // Calculate stats
    const totalStudents = batches.reduce((sum, batch) => sum + (batch.studentIds?.length || 0), 0);
    const completedStudents = 0; // You can implement completion logic later
    const totalRevenue = totalStudents * 50000; // Example calculation
    const collectedRevenue = totalRevenue * 0.8; // 80% collected
    
    const profileData = {
      trainer: {
        trainerId: trainer.trainerId,
        name: trainer.name,
        email: trainer.email,
        phone: trainer.phone,
        profile: trainer.profile || '',
        experience: trainer.experience || '',
        expertise: trainer.expertise || [],
        rating: trainer.rating || 4.5,
        bio: trainer.bio || '',
        linkedIn: trainer.linkedIn || '',
        github: trainer.github || '',
        portfolio: trainer.portfolio || '',
        salary: trainer.salary || 50000,
        paymentMode: trainer.paymentMode || 'Monthly',
        isActive: trainer.isActive,
        joinedAt: trainer.createdAt,
        totalStudents: totalStudents
      },
      stats: {
        totalBatches: batches.length,
        activeBatches: batches.filter(b => b.status === 'active').length,
        upcomingBatches: batches.filter(b => b.status === 'upcoming').length,
        completedBatches: batches.filter(b => b.status === 'completed').length,
        totalStudents: totalStudents,
        completedStudents: completedStudents,
        inProgressStudents: totalStudents - completedStudents,
        totalRevenue: totalRevenue,
        collectedRevenue: collectedRevenue,
        pendingRevenue: totalRevenue - collectedRevenue,
        avgProgress: 75,
        completionRate: totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0,
        collectionRate: Math.round((collectedRevenue / totalRevenue) * 100),
        recentEnrollments: 5,
        recentCompletions: 2
      },
      performance: {
        courseCategories: ['Web Development', 'Programming'],
        courseTitles: batches.map(b => b.courseId?.title || 'N/A'),
        batchPerformance: batches.map(batch => ({
          batchId: batch._id.toString(),
          course_title: batch.courseId?.title || 'N/A',
          status: batch.status || 'active',
          totalStudents: batch.capacity || 30,
          enrolledStudents: batch.studentIds?.length || 0,
          completedStudents: 0,
          avgProgress: 75,
          schedule: {
            startDate: batch.startDate,
            endDate: batch.endDate,
            timing: batch.timing
          },
          meetingLink: batch.meetingLink || ''
        }))
      },
      batches: batches
    };
    
    return NextResponse.json({
      success: true,
      data: profileData
    });
    
  } catch (error: any) {
    console.error('Trainer profile API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile data', message: error.message },
      { status: 500 }
    );
  }
}