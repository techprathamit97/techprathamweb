import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Student = require('@/models/Student');
const Batch = require('@/models/Batch');
const Course = require('@/models/Course');
const ModuleClass = require('@/models/ModuleClass');

// GET - Fetch student's enrolled courses with progress and scheduled classes
export async function GET(request: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Student ID is required' 
      }, { status: 400 });
    }

    // Find student and their enrolled batches
    const student = await Student.findOne({ studentId }).populate('batches').lean();
    if (!student) {
      return NextResponse.json({ 
        success: false, 
        error: 'Student not found' 
      }, { status: 404 });
    }

    if (!student.batches || student.batches.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          enrolledCourses: [],
          stats: {
            totalCourses: 0,
            completedCourses: 0,
            inProgressCourses: 0,
            avgProgress: 0
          }
        }
      });
    }

    // Get courses for enrolled batches
    const batchIds = student.batches.map((b: any) => b._id);
    const batches = await Batch.find({ _id: { $in: batchIds } }).populate('courseId').lean();

    // Get all module classes for these batches
    const allModuleClasses = await ModuleClass.find({
      batchId: { $in: batchIds }
    }).lean();

    // Get the student ID as string for comparison
    const studentIdStr = student.studentId || student._id?.toString();

    // Group classes by batch and module
    const classMap = new Map();
    allModuleClasses.forEach((cls: any) => {
      const key = `${cls.batchId}_${cls.moduleIndex}`;
      classMap.set(key, {
        ...cls,
        _id: cls._id.toString(),
        scheduledDate: cls.scheduledDate.toISOString(),
        isLive: isClassLive(cls),
        canJoin: canJoinClass(cls),
        isCompleted: cls.status === 'completed' || cls.isCompleted
      });
    });

    // Build enrolled courses data
    const enrolledCourses = [];
    const processedCourses = new Set();

    for (const batch of batches) {
      const courseId = batch.courseId._id.toString();
      
      if (processedCourses.has(courseId)) continue;
      processedCourses.add(courseId);

      const course = batch.courseId;

      // Generate module progress
      const moduleProgress = generateModuleProgress(course, batch, classMap);

      // Calculate overall progress based on manually set progress from ModuleClass records
      // Get all completed classes for this batch and find this student's progress
      const batchCompletedClasses = allModuleClasses.filter(
        (cls: any) => cls.batchId.toString() === batch._id.toString() && cls.status === 'completed'
      );

      let totalProgress = 0;
      let modulesWithProgress = 0;

      batchCompletedClasses.forEach((cls: any) => {
        // Check studentProgress - try both formats
        const studentProgress = cls.studentProgress?.find(
          (sp: any) => {
            const spId = sp.studentId?.toString();
            return spId === studentIdStr || spId === student?._id?.toString();
          }
        );
        if (studentProgress && studentProgress.progress > 0) {
          totalProgress += studentProgress.progress;
          modulesWithProgress++;
        }
      });

      // Get course progress from batch (set by trainer)
      const progressPercentage = batch.courseProgress || 0;

      enrolledCourses.push({
        _id: courseId,
        course_title: course.title,
        course_link: `/courses/${course.slug || courseId}`,
        course_desc: course.description || course.desc || '',
        duration: course.duration || '40 hours',
        level: course.level || 'Intermediate',
        category: course.category || 'Technology',
        studentId: student.studentId,
        progressPercentage,
        courseCompletion: progressPercentage === 100,
        createdAt: student.createdAt || new Date().toISOString(),
        moduleProgress
      });
    }

    // Calculate stats
    const totalCourses = enrolledCourses.length;
    const completedCourses = enrolledCourses.filter((c: any) => c.courseCompletion).length;
    const inProgressCourses = totalCourses - completedCourses;
    const avgProgress = totalCourses > 0 ?
      Math.round(enrolledCourses.reduce((sum: number, c: any) => sum + c.progressPercentage, 0) / totalCourses) : 0;

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
      .map((cls: any) => {
        // Find this student's progress for this class
        const studentProgress = cls.studentProgress?.find(
          (sp: any) => sp.studentId?.toString() === studentIdStr
        );

        return {
          _id: cls._id.toString(),
          moduleTitle: cls.moduleTitle || `Module ${cls.moduleIndex + 1}`,
          moduleDescription: cls.moduleDescription || '',
          moduleIndex: cls.moduleIndex,
          scheduledDate: cls.scheduledDate.toISOString(),
          scheduledTime: cls.scheduledTime,
          progress: studentProgress?.progress || 0,
          progressUpdatedAt: studentProgress?.updatedAt,
          progressUpdatedBy: studentProgress?.updatedBy,
          recordings: cls.recordings.map((rec: any) => ({
            _id: rec._id?.toString() || Date.now().toString(),
            url: rec.url,
            title: rec.title,
            description: rec.description,
            duration: rec.duration,
            uploadedAt: rec.uploadedAt,
            uploadedBy: rec.uploadedBy
          }))
        };
      });

    // Get scheduled classes for this student's batches
    const allScheduledClasses = await ModuleClass.find({
      batchId: { $in: batchIds },
      status: { $in: ['scheduled', 'live'] },
      isCompleted: false
    }).lean();

    // Format scheduled classes for joining
    const scheduledClasses = allScheduledClasses.map((cls: any) => {
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
        scheduledDate: cls.scheduledDate.toISOString(),
        scheduledTime: cls.scheduledTime,
        duration: cls.duration,
        meetingLink: cls.meetingLink,
        roomId: cls.roomId,
        status: cls.status,
        canJoin: canJoinClass(cls),
        isLive: isClassLive(cls),
        // BigBlueButton fields
        bbbMeetingId: cls.bbbMeetingId,
        bbbAttendeePassword: cls.bbbAttendeePassword,
        bbbModeratorPassword: cls.bbbModeratorPassword,
        bbbJoinUrl: bbbJoinUrl,
        bbbModeratorJoinUrl: cls.bbbModeratorJoinUrl
      };
    });

    // Clear moduleProgress - modules will now only show after trainer uploads recording
    enrolledCourses.forEach((course: any) => {
      course.moduleProgress = [];
    });

    return NextResponse.json({
      success: true,
      data: {
        enrolledCourses,
        completedRecordings,
        scheduledClasses,
        stats: {
          totalCourses,
          completedCourses,
          inProgressCourses,
          avgProgress
        }
      }
    });
  } catch (error: any) {
    console.error('Error fetching student courses:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper function to determine if class is currently live
function isClassLive(cls: any): boolean {
  if (cls.status !== 'scheduled' && cls.status !== 'live') return false;
  
  const now = new Date();
  const classDate = new Date(cls.scheduledDate);
  const [hours, minutes] = cls.scheduledTime.split(':');
  classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  const endTime = new Date(classDate.getTime() + cls.duration * 60 * 1000);
  
  return now >= classDate && now <= endTime;
}

// Helper function to determine if class can be joined
function canJoinClass(cls: any): boolean {
  if (cls.status !== 'scheduled' && cls.status !== 'live') return false;

  const now = new Date();
  const classDate = new Date(cls.scheduledDate);
  const [hours, minutes] = cls.scheduledTime.split(':');
  classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

  // Allow joining 15 minutes before class starts + 30 minutes grace period after class ends
  const joinWindow = 15 * 60 * 1000; // 15 minutes before
  const gracePeriod = 30 * 60 * 1000; // 30 minutes grace after class ends
  const endTime = new Date(classDate.getTime() + cls.duration * 60 * 1000);
  const extendedEndTime = new Date(endTime.getTime() + gracePeriod);

  return now >= new Date(classDate.getTime() - joinWindow) && now <= extendedEndTime;
}

// Helper function to generate module progress
function generateModuleProgress(course: any, batch: any, classMap: Map<string, any>) {
  const moduleCount = course.modules?.length || 10;
  const moduleProgress = [];

  for (let i = 0; i < moduleCount; i++) {
    const classKey = `${batch._id}_${i}`;
    const scheduledClass = classMap.get(classKey) || null;

    // Generate sample topics for each module
    const topics = generateTopicsForModule(i, scheduledClass);
    const totalTopics = topics.length;
    const completedTopics = topics.filter((t: any) => t.completed).length;
    const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    moduleProgress.push({
      title: course.modules?.[i]?.title || `Module ${i + 1}`,
      description: course.modules?.[i]?.description || `Module ${i + 1} content`,
      topicsCompleted: completedTopics,
      totalTopics,
      progress,
      completed: progress === 100,
      topics,
      scheduledClass
    });
  }

  return moduleProgress;
}

// Helper function to generate topics for a module
function generateTopicsForModule(moduleIndex: number, scheduledClass: any) {
  const topicCount = 5 + (moduleIndex % 3); // 5-7 topics per module
  const topics = [];

  for (let i = 0; i < topicCount; i++) {
    // Simulate some completed topics
    const completed = Math.random() > 0.6; // 40% completion rate
    const progress = completed ? 100 : Math.floor(Math.random() * 80);

    topics.push({
      title: `Topic ${i + 1}: ${getTopicTitle(moduleIndex, i)}`,
      type: i % 3 === 0 ? 'video' : 'reading',
      duration: i % 3 === 0 ? `${10 + (i * 2)} min` : `${5 + i} min read`,
      completed,
      progress
    });
  }

  return topics;
}

// Helper function to generate topic titles
function getTopicTitle(moduleIndex: number, topicIndex: number): string {
  const titles = [
    'Introduction and Overview',
    'Core Concepts',
    'Practical Examples',
    'Advanced Techniques',
    'Best Practices',
    'Common Pitfalls',
    'Real-world Applications',
    'Summary and Review'
  ];
  
  return titles[topicIndex % titles.length];
}