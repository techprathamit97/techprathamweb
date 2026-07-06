import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const StudentProgress = require('@/models/StudentProgress');
const Course = require('@/models/Course');

// GET - Fetch student progress for a course
export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const courseId = searchParams.get('courseId');
    const batchId = searchParams.get('batchId');

    if (!studentId || !courseId) {
      return NextResponse.json(
        { error: 'studentId and courseId are required' },
        { status: 400 }
      );
    }

    const progress = await StudentProgress.findOne({ studentId, courseId })
      .populate('courseId', 'title thumbnail modules')
      .populate('batchId', 'batchName');

    if (!progress) {
      // Return empty progress structure
      const course = await Course.findById(courseId);
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      // Create initial progress structure based on course modules
      const initialProgress = {
        studentId,
        courseId,
        batchId,
        totalModules: course.modules?.length || 0,
        totalTopics: course.modules?.reduce((sum: number, m: any) => sum + (m.topics?.length || 0), 0) || 0,
        overallProgress: 0,
        status: 'Not Started',
        moduleProgress: course.modules?.map((module: any) => ({
          moduleId: module._id?.toString() || module.moduleId,
          title: module.title,
          completed: false,
          topicsCompleted: 0,
          totalTopics: module.topics?.length || 0,
          progress: 0,
          topicProgress: module.topics?.map((topic: any) => ({
            topicId: topic._id?.toString() || topic.topicId,
            title: topic.title,
            completed: false,
            progress: 0
          })) || []
        })) || []
      };

      return NextResponse.json(initialProgress);
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Failed to fetch progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

// POST - Create or update progress
export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const data = await req.json();

    const { studentId, courseId, batchId } = data;

    if (!studentId || !courseId) {
      return NextResponse.json(
        { error: 'studentId and courseId are required' },
        { status: 400 }
      );
    }

    // Get course to initialize progress structure
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Check if progress already exists
    let progress = await StudentProgress.findOne({ studentId, courseId });

    if (progress) {
      // Update existing progress
      if (data.topicProgress) {
        // Update specific topic progress
        const { moduleIndex, topicIndex, watchTime, videoDuration, completed } = data;

        if (moduleIndex !== undefined && topicIndex !== undefined) {
          const moduleProgress = progress.moduleProgress[moduleIndex];
          if (moduleProgress) {
            const topicProgress = moduleProgress.topicProgress[topicIndex];
            if (topicProgress) {
              topicProgress.watchTime = watchTime || topicProgress.watchTime;
              if (videoDuration) {
                topicProgress.videoDuration = videoDuration;
                topicProgress.progress = Math.round((watchTime / videoDuration) * 100);
              }
              if (completed !== undefined) {
                topicProgress.completed = completed;
                if (completed) {
                  topicProgress.completedAt = new Date();
                }
              }
            }

            // Recalculate module progress
            const total = moduleProgress.topicProgress.length;
            const completedCount = moduleProgress.topicProgress.filter((t: any) => t.completed).length;
            moduleProgress.topicsCompleted = completedCount;
            moduleProgress.progress = Math.round((completedCount / total) * 100);
            moduleProgress.completed = completedCount === total;
            if (moduleProgress.completed) {
              moduleProgress.completedAt = new Date();
            }
          }
        }
      }

      // Update current position
      if (data.currentModuleIndex !== undefined) {
        progress.currentModuleIndex = data.currentModuleIndex;
      }
      if (data.currentTopicIndex !== undefined) {
        progress.currentTopicIndex = data.currentTopicIndex;
      }

      // Recalculate overall progress
      progress.calculateProgress();
      await progress.save();

      return NextResponse.json(progress);
    }

    // Create new progress entry
    const newProgress = new StudentProgress({
      studentId,
      courseId,
      batchId,
      totalModules: course.modules?.length || 0,
      totalTopics: course.modules?.reduce((sum: number, m: any) => sum + (m.topics?.length || 0), 0) || 0,
      moduleProgress: course.modules?.map((module: any, moduleIdx: number) => ({
        moduleId: module._id?.toString() || `module-${moduleIdx}`,
        title: module.title,
        completed: false,
        topicsCompleted: 0,
        totalTopics: module.topics?.length || 0,
        progress: 0,
        topicProgress: module.topics?.map((topic: any, topicIdx: number) => ({
          topicId: topic._id?.toString() || `topic-${topicIdx}`,
          title: topic.title,
          completed: false,
          progress: 0,
          videoDuration: topic.videoDuration || 0
        })) || []
      })) || []
    });

    await newProgress.save();
    return NextResponse.json(newProgress, { status: 201 });
  } catch (error) {
    console.error('Failed to update progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}

// PUT - Mark topic as complete
export async function PUT(req: NextRequest) {
  try {
    await connectMongo();
    const data = await req.json();

    const { studentId, courseId, moduleIndex, topicIndex, watchTime, videoDuration, completed } = data;

    if (!studentId || !courseId || moduleIndex === undefined || topicIndex === undefined) {
      return NextResponse.json(
        { error: 'studentId, courseId, moduleIndex, and topicIndex are required' },
        { status: 400 }
      );
    }

    let progress = await StudentProgress.findOne({ studentId, courseId });

    if (!progress) {
      return NextResponse.json(
        { error: 'Progress not found. Create progress first.' },
        { status: 404 }
      );
    }

    // Update topic progress
    const moduleProgress = progress.moduleProgress[moduleIndex];
    if (!moduleProgress) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    const topicProgress = moduleProgress.topicProgress[topicIndex];
    if (!topicProgress) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    // Update values
    if (watchTime !== undefined) topicProgress.watchTime = watchTime;
    if (videoDuration !== undefined) {
      topicProgress.videoDuration = videoDuration;
      topicProgress.progress = videoDuration > 0 ? Math.round((watchTime / videoDuration) * 100) : 0;
    }
    if (completed !== undefined) {
      topicProgress.completed = completed;
      if (completed) {
        topicProgress.completedAt = new Date();
      }
    }

    // Recalculate module progress
    const total = moduleProgress.topicProgress.length;
    const completedCount = moduleProgress.topicProgress.filter((t: any) => t.completed).length;
    moduleProgress.topicsCompleted = completedCount;
    moduleProgress.progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    moduleProgress.completed = completedCount === total;
    if (moduleProgress.completed) {
      moduleProgress.completedAt = new Date();
    }

    // Recalculate overall progress
    progress.calculateProgress();
    await progress.save();

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Failed to update progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}