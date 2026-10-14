import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
const Student = require('@/models/Student');
const Batch = require('@/models/Batch');
const Trainer = require('@/models/Trainer');
const Course = require('@/models/Course');
const Certificate = require('@/models/Certificate');
const Payment = require('@/models/Payment');

const TZ = 'Asia/Kolkata';
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Last 6 calendar months in IST, oldest first, as { key: 'YYYY-MM', month: 'Oct' }
function lastSixMonths() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' })
    .formatToParts(new Date());
  let year = parseInt(parts.find(p => p.type === 'year')!.value);
  let month = parseInt(parts.find(p => p.type === 'month')!.value); // 1-12
  const out: { key: string; month: string }[] = [];
  for (let i = 0; i < 6; i++) {
    out.unshift({ key: `${year}-${String(month).padStart(2, '0')}`, month: MONTH_LABELS[month - 1] });
    month -= 1;
    if (month === 0) { month = 12; year -= 1; }
  }
  return out;
}

export async function GET() {
  try {
    await connectMongo();

    const now = new Date();
    const months = lastSixMonths();
    const currentMonthKey = months[months.length - 1].key;
    // Start of the oldest month in IST
    const trendStart = new Date(`${months[0].key}-01T00:00:00+05:30`);

    // Get basic counts
    const [
      totalStudents,
      activeStudents,
      completedStudents,
      totalTrainers,
      activeBatches,
      upcomingBatches,
      totalBatches,
      totalCourses
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ isActive: true }),
      Certificate.countDocuments(),
      Trainer.countDocuments(),
      // Running batches are date-based (same rule as the Batches page):
      // started and not yet ended. The stored `status` field is not reliable.
      Batch.countDocuments({ startDate: { $lte: now }, endDate: { $gte: now } }),
      Batch.countDocuments({ startDate: { $gt: now } }),
      Batch.countDocuments(),
      Course.countDocuments()
    ]);

    // Revenue - same formulas as /api/payments/dashboard (Finance page)
    const [revenueTotals] = await Payment.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ['$paidAmount', 0] } },
          pendingRevenue: {
            $sum: { $cond: [{ $ne: ['$paymentStatus', 'completed'] }, { $ifNull: ['$dueAmount', 0] }, 0] }
          }
        }
      }
    ]);

    const monthlyRevenueRows = await Payment.aggregate([
      { $match: { isDeleted: false, paymentDate: { $gte: trendStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$paymentDate', timezone: TZ } },
          revenue: { $sum: { $ifNull: ['$paidAmount', 0] } }
        }
      }
    ]);
    const revenueByMonth = new Map<string, number>(monthlyRevenueRows.map((r: any) => [r._id, r.revenue]));

    const monthlyEnrollmentRows = await Student.aggregate([
      {
        $project: {
          joined: { $ifNull: ['$enrollmentDate', '$createdAt'] }
        }
      },
      { $match: { joined: { $gte: trendStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$joined', timezone: TZ } },
          students: { $sum: 1 }
        }
      }
    ]);
    const enrollmentsByMonth = new Map<string, number>(monthlyEnrollmentRows.map((r: any) => [r._id, r.students]));
    
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
    
    // Recent enrollments: newest students (same records as the Students page),
    // with the course of the batch they are in.
    const recentStudents = await Student.find({})
      .select('name enrollmentDate createdAt')
      .sort({ enrollmentDate: -1, createdAt: -1 })
      .limit(10)
      .lean();

    const recentStudentBatches = await Batch.find({ studentIds: { $in: recentStudents.map((s: any) => s._id) } })
      .select('studentIds courseId batchName')
      .populate({ path: 'courseId', select: 'title', strictPopulate: false })
      .lean();

    const recentEnrollments = recentStudents.map((student: any) => {
      const batch: any = recentStudentBatches.find((b: any) =>
        (b.studentIds || []).some((id: any) => String(id) === String(student._id))
      );
      return {
        name: student.name || 'Unknown',
        course: batch?.courseId?.title || batch?.batchName || 'Not assigned to a batch',
        status: batch ? 'Enrolled' : 'No Batch'
      };
    });
    
    // Real trends for the last 6 months (IST)
    const enrollmentTrend = months.map(m => ({ month: m.month, students: enrollmentsByMonth.get(m.key) || 0 }));
    const revenueTrend = months.map(m => ({ month: m.month, revenue: revenueByMonth.get(m.key) || 0 }));

    return NextResponse.json({
      overview: {
        totalStudents,
        activeStudents,
        completedStudents,
        totalRevenue: revenueTotals?.totalRevenue || 0,
        pendingRevenue: revenueTotals?.pendingRevenue || 0,
        thisMonthRevenue: revenueByMonth.get(currentMonthKey) || 0,
        totalCourses,
        activeBatches,
        upcomingBatches,
        totalBatches,
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
