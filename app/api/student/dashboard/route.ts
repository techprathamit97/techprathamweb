import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');
const Batch = require('@/models/Batch');
const Quiz = require('@/models/Quiz');
const Submission = require('@/models/Submission');
const ModuleClass = require('@/models/ModuleClass');
const Certificate = require('@/models/Certificate');

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    
    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }
    
    // Find student by studentId
    const student = await Student.findOne({ studentId: studentId })
      .populate('batches')
      .lean();
    
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }
    
    // Get batches where this student is enrolled
    const batches = await Batch.find({ 
      studentIds: student._id 
    })
    .populate('courseId')
    .populate('trainerId')
    .lean();
    
    // Format batch data for dashboard
    const formattedBatches = batches.map((batch: any) => ({
      _id: batch._id,
      batchId: batch._id.toString(),
      course_title: batch.courseId?.title || 'N/A',
      batchName: batch.batchName,
      startDate: batch.startDate,
      endDate: batch.endDate,
      timing: batch.timing,
      capacity: batch.capacity || 30,
      enrolled_students: batch.studentIds || [],
      status: batch.status || 'active',
      meetingLink: batch.meetingLink || '',
      trainer: batch.trainerId ? {
        trainerId: batch.trainerId.trainerId || '',
        name: batch.trainerId.name || 'Not Assigned',
        email: batch.trainerId.email || '',
        phone: batch.trainerId.phone || '',
        profile: batch.trainerId.profile || '',
        experience: batch.trainerId.experience || '',
        rating: batch.trainerId.rating || 0,
        bio: batch.trainerId.bio || '',
        expertise: batch.trainerId.expertise || [],
        linkedIn: batch.trainerId.linkedIn || '',
        github: batch.trainerId.github || '',
        portfolio: batch.trainerId.portfolio || ''
      } : {
        trainerId: '',
        name: 'Not Assigned',
        email: '',
        phone: '',
        profile: '',
        experience: '',
        rating: 0,
        bio: '',
        expertise: [],
        linkedIn: '',
        github: '',
        portfolio: ''
      }
    }));

    // Get batch IDs for quiz filtering
    const batchIds = formattedBatches.map((b: any) => b._id);

    // Fetch quizzes assigned to student's batches
    const quizzes = await Quiz.find({
      batchId: { $in: batchIds }
    }).lean();

    // Fetch student's quiz attempts
    const submissions = await Submission.find({
      studentId: student._id,
      type: 'quiz'
    }).lean();

    // Get the refIds of already attempted quizzes
    const attemptedQuizIds = submissions.map((s: any) => s.refId.toString());

    // Format available quizzes (filter out already attempted ones for simplicity)
    const availableQuizzes = quizzes.map((quiz: any) => {
      const submission = submissions.find((s: any) => s.refId.toString() === quiz._id.toString());
      return {
        _id: quiz._id,
        title: quiz.title,
        totalMarks: quiz.totalMarks || 0,
        passingMarks: quiz.passingMarks || 0,
        dueDate: quiz.dueDate,
        questionsCount: quiz.questions?.length || 0,
        status: submission ? (submission.status || 'completed') : 'available',
        score: submission?.score || null,
        attemptedAt: submission?.submittedAt || null
      };
    });

    // Format quiz attempts for display
    const formattedQuizAttempts = submissions.map((sub: any) => {
      const quiz = quizzes.find((q: any) => q._id.toString() === sub.refId.toString());
      const maxMarks = quiz?.totalMarks || quiz?.questions?.length || 0;
      const score = sub.score || 0;
      const percentage = maxMarks > 0 ? Math.round((score / maxMarks) * 100) : 0;
      const passingMarks = quiz?.passingMarks || Math.ceil(maxMarks * 0.5);

      return {
        _id: sub._id,
        quizTitle: quiz?.title || 'Unknown Quiz',
        quizCategory: 'Course Quiz',
        totalMarks: score,
        maxMarks: maxMarks,
        percentage: percentage,
        passed: score >= passingMarks,
        completedAt: sub.submittedAt?.toISOString() || new Date().toISOString(),
        timeSpent: 0
      };
    });

    // Get completed classes with recordings for this student's batches
    // Sort by moduleIndex descending to get the latest completed class first
    const completedClassesWithRecordings = await ModuleClass.find({
      batchId: { $in: batchIds },
      status: 'completed',
      isCompleted: true
    })
    .sort({ moduleIndex: -1 })
    .lean();

    // Format completed classes with recordings - show ALL completed classes with recordings
    const completedRecordings = completedClassesWithRecordings
      .filter((cls: any) => cls.recordings && cls.recordings.length > 0)
      // Remove the slice - show all recordings, not just the latest one
      .map((cls: any) => ({
        _id: cls._id.toString(),
        moduleTitle: cls.moduleTitle || `Module ${cls.moduleIndex + 1}`,
        moduleDescription: cls.moduleDescription || '',
        moduleIndex: cls.moduleIndex,
        scheduledDate: cls.scheduledDate,
        scheduledTime: cls.scheduledTime,
        recordings: cls.recordings.map((rec: any) => ({
          _id: rec._id?.toString() || Date.now().toString(),
          url: rec.url,
          title: rec.title,
          description: rec.description,
          duration: rec.duration,
          uploadedAt: rec.uploadedAt,
          uploadedBy: rec.uploadedBy
        }))
      }));

    // Get scheduled classes for this student's batches
    const scheduledClasses = await ModuleClass.find({
      batchId: { $in: batchIds },
      status: { $in: ['scheduled', 'live'] },
      isCompleted: false
    }).lean();

    // Format scheduled classes for joining
    const formattedScheduledClasses = scheduledClasses.map((cls: any) => {
      // Check if can join (within 15 min window BEFORE class + 30 min grace period AFTER class ends)
      const now = new Date();
      const classDate = new Date(cls.scheduledDate);
      const [hours, minutes] = cls.scheduledTime.split(':');
      classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      const joinWindow = 15 * 60 * 1000; // 15 min before class
      const gracePeriod = 30 * 60 * 1000; // 30 min grace period after class ends
      const endTime = new Date(classDate.getTime() + cls.duration * 60 * 1000);
      const extendedEndTime = new Date(endTime.getTime() + gracePeriod);
      const canJoin = now >= new Date(classDate.getTime() - joinWindow) && now <= extendedEndTime;

      // Determine if class is live (within class duration, not extended)
      const isLive = cls.status === 'live' || (now >= classDate && now <= endTime);

      // Generate student join URL for BigBlueButton
      let bbbJoinUrl = null;
      if (cls.bbbMeetingId && cls.bbbAttendeePassword) {
        const serverUrl = process.env.BIGBLUEBUTTON_SERVER_URL;
        bbbJoinUrl = `${serverUrl}/bigbluebutton/api/join?meetingID=${cls.bbbMeetingId}&password=${cls.bbbAttendeePassword}`;
      }

      return {
        _id: cls._id.toString(),
        moduleTitle: cls.moduleTitle || `Module ${cls.moduleIndex + 1}`,
        moduleIndex: cls.moduleIndex,
        scheduledDate: cls.scheduledDate,
        scheduledTime: cls.scheduledTime,
        duration: cls.duration,
        meetingLink: cls.meetingLink,
        roomId: cls.roomId,
        status: cls.status,
        canJoin: canJoin,
        isLive: isLive,
        // BigBlueButton fields
        bbbMeetingId: cls.bbbMeetingId,
        bbbJoinUrl: bbbJoinUrl
      };
    });
    
    // Get certificates for this student
    const certificates = await Certificate.find({
      studentId: student._id,
      status: 'issued'
    }).sort({ createdAt: -1 }).lean();

    // Format certificates for display
    const formattedCertificates = certificates.map((cert: any) => ({
      _id: cert._id,
      certificateId: cert.certificateId || cert.certificateNo,
      courseName: cert.courseName,
      courseCategory: 'Programming',
      completionDate: cert.completionDate,
      issueDate: cert.issueDate,
      grade: cert.grade || 'A',
      score: cert.score || 100,
      status: cert.status,
      certificateUrl: `/api/lms/certificates/${cert._id}/download`,
      verificationCode: cert.verificationCode
    }));

    // Create enrolled courses data (for compatibility with existing dashboard)
    const enrolledCourses = formattedBatches.map((batch: any) => ({
      _id: batch._id,
      course_title: batch.course_title,
      course_link: batch.course_title.toLowerCase().replace(/\s+/g, '-'),
      batchId: batch.batchId,
      trainerId: batch.trainer.trainerId,
      progressPercentage: 0, // You can implement progress tracking later
      courseCompletion: false,
      totalAmount: 0, // You can get this from invoice/payment data
      verifyPayment: true,
      createdAt: batch.startDate || new Date().toISOString(),
      category: 'Programming', // Default category
      duration: '3 months', // Default duration
      level: 'Intermediate', // Default level
      studentId: student.studentId,
      batchInfo: {
        batchId: batch.batchId,
        course_title: batch.course_title,
        trainerId: batch.trainer.trainerId,
        schedule: {
          startDate: batch.startDate,
          endDate: batch.endDate,
          timing: batch.timing,
          days: ['Monday', 'Wednesday', 'Friday'] // Default days
        },
        capacity: batch.capacity,
        enrolled_students: batch.enrolled_students,
        status: batch.status,
        meetingLink: batch.meetingLink,
        trainer: batch.trainer
      }
    }));
    
    // Calculate quiz stats
    const totalQuizzes = quizzes.length;
    const passedQuizzes = formattedQuizAttempts.filter((a: any) => a.passed).length;
    const avgQuizScore = formattedQuizAttempts.length > 0
      ? Math.round(formattedQuizAttempts.reduce((sum: number, a: any) => sum + a.percentage, 0) / formattedQuizAttempts.length)
      : 0;

    const dashboardData = {
      student: {
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        phone: student.phone,
        enrollmentDate: student.enrollmentDate,
        isActive: student.isActive
      },
      enrolledCourses: enrolledCourses,
      batches: formattedBatches,
      upcomingClasses: formattedBatches
        .filter((batch: any) => batch.status === 'active' || batch.status === 'upcoming')
        .map((batch: any) => ({
          batchId: batch.batchId,
          courseTitle: batch.course_title, // Changed from course_title
          batchName: batch.batchName,
          timing: batch.timing || 'TBD',
          days: ['Monday', 'Wednesday', 'Friday'], // Default days array
          date: batch.startDate || new Date().toISOString(),
          trainerName: batch.trainer.name, // Changed from trainer
          meetingLink: batch.meetingLink,
          status: batch.status
        })),
      // New: Completed class recordings
      completedRecordings: completedRecordings,
      // New: Scheduled classes for joining
      scheduledClasses: formattedScheduledClasses,
      quizAttempts: formattedQuizAttempts,
      availableQuizzes: availableQuizzes,
      certificates: formattedCertificates,
      stats: {
        totalCourses: enrolledCourses.length,
        completedCourses: enrolledCourses.filter((c: any) => c.courseCompletion).length,
        activeBatches: formattedBatches.filter((b: any) => b.status === 'active').length,
        upcomingBatches: formattedBatches.filter((b: any) => b.status === 'upcoming').length,
        issuedCertificates: formattedCertificates.length, // Actual certificates issued to student
        avgProgress: enrolledCourses.length > 0 ?
          Math.round(enrolledCourses.reduce((sum: number, c: any) => sum + c.progressPercentage, 0) / enrolledCourses.length) : 0,
        totalPaid: 0, // Default to 0, can be updated with actual payment data
        paidInvoices: 0, // Default to 0
        totalPending: 0, // Default to 0
        pendingInvoices: 0, // Default to 0
        avgQuizScore: avgQuizScore,
        passedQuizzes: passedQuizzes,
        totalQuizzes: totalQuizzes
      }
    };
    
    return NextResponse.json({
      success: true,
      data: dashboardData
    });
    
  } catch (error: any) {
    console.error('Student dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', message: error.message },
      { status: 500 }
    );
  }
}