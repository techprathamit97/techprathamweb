import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
const Student = require('@/models/Student');
const Batch = require('@/models/Batch');
const Trainer = require('@/models/Trainer');
const Course = require('@/models/Course');
const Certificate = require('@/models/Certificate');

export async function GET() {
  try {
    await connectMongo();
    
    // Get basic counts
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ isActive: true });
    const completedStudents = await Certificate.countDocuments();
    const totalTrainers = await Trainer.countDocuments();
    const activeBatches = await Batch.countDocuments({ status: 'active' });
    const totalCourses = await Course.countDocuments();
    
    // Get course stats
    const courseStats = await Batch.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'courseId',
          foreignField: '_id',
          as: 'course'
        }
      },
      { $unwind: '$course' },
      {
        $group: {
          _id: '$course.title',
          students: { $sum: { $size: { $ifNull: ['$studentIds', []] } } }
        }
      },
      { $sort: { students: -1 } },
      { $limit: 5 }
    ]);
    
    // Get recent enrollments
    const recentBatches = await Batch.find({})
      .populate({ path: 'courseId', strictPopulate: false })
      .populate({ path: 'studentIds', strictPopulate: false })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    
    const recentEnrollments = recentBatches.flatMap((batch: any) =>
      (batch.studentIds || []).slice(0, 3).map((student: any) => ({
        name: student?.name || 'Unknown',
        course: batch.courseId?.title || 'Unknown Course',
        status: 'Enrolled'
      }))
    ).slice(0, 10);
    
    // Generate trend data (mock for now)
    const enrollmentTrend = [
      { month: 'Jan', students: 45 },
      { month: 'Feb', students: 52 },
      { month: 'Mar', students: 61 },
      { month: 'Apr', students: 58 },
      { month: 'May', students: 70 },
      { month: 'Jun', students: 75 }
    ];
    
    const revenueTrend = [
      { month: 'Jan', revenue: 45000 },
      { month: 'Feb', revenue: 52000 },
      { month: 'Mar', revenue: 61000 },
      { month: 'Apr', revenue: 58000 },
      { month: 'May', revenue: 70000 },
      { month: 'Jun', revenue: 75000 }
    ];
    
    return NextResponse.json({
      overview: {
        totalStudents,
        activeStudents,
        completedStudents,
        totalRevenue: 0,
        pendingRevenue: 0,
        totalCourses,
        activeBatches,
        totalTrainers
      },
      trends: {
        enrollmentTrend,
        revenueTrend
      },
      courseStats: courseStats.map((stat: any) => ({
        course: stat._id,
        students: stat.students
      })),
      recentEnrollments
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
