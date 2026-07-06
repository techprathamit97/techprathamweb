import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Course = require('@/models/Course');
const Trainer = require('@/models/Trainer');

// GET - Fetch single course
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id } = await params;

    const course = await Course.findById(id).populate('trainerId');

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error('Failed to fetch course:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    );
  }
}

// PUT - Update course
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id } = await params;
    const data = await req.json();

    // Handle module operations specifically
    if (data.modules) {
      // Reorder modules
      if (data.reorderModules) {
        const course = await Course.findById(id);
        if (!course) {
          return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        course.modules = data.modules;
        await course.save();
        return NextResponse.json(course);
      }

      // Update entire modules array
      const course = await Course.findByIdAndUpdate(
        id,
        { modules: data.modules },
        { new: true, runValidators: true }
      );

      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      return NextResponse.json(course);
    }

    // Handle single module operation
    if (data.moduleOperation) {
      const course = await Course.findById(id);
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      const { operation, moduleIndex, moduleData } = data;

      switch (operation) {
        case 'add':
          course.modules.push(moduleData);
          break;
        case 'update':
          if (moduleIndex !== undefined && course.modules[moduleIndex]) {
            course.modules[moduleIndex] = { ...course.modules[moduleIndex], ...moduleData };
          }
          break;
        case 'delete':
          if (moduleIndex !== undefined) {
            course.modules.splice(moduleIndex, 1);
          }
          break;
        case 'reorder':
          course.modules = data.modules;
          break;
      }

      await course.save();
      return NextResponse.json(course);
    }

    // Handle single topic operation
    if (data.topicOperation) {
      const course = await Course.findById(id);
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      }

      const { operation, moduleIndex, topicIndex, topicData } = data;

      if (!course.modules[moduleIndex]) {
        return NextResponse.json({ error: 'Module not found' }, { status: 404 });
      }

      const module = course.modules[moduleIndex];

      switch (operation) {
        case 'add':
          module.topics.push(topicData);
          break;
        case 'update':
          if (topicIndex !== undefined && module.topics[topicIndex]) {
            module.topics[topicIndex] = { ...module.topics[topicIndex], ...topicData };
          }
          break;
        case 'delete':
          if (topicIndex !== undefined) {
            module.topics.splice(topicIndex, 1);
          }
          break;
        case 'reorder':
          module.topics = data.topics;
          break;
      }

      await course.save();
      return NextResponse.json(course);
    }

    // Regular update
    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );

    if (!updatedCourse) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedCourse);
  } catch (error) {
    console.error('Failed to update course:', error);
    return NextResponse.json(
      { error: 'Failed to update course' },
      { status: 500 }
    );
  }
}

// DELETE - Delete course
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id } = await params;

    const deletedCourse = await Course.findByIdAndDelete(id);

    if (!deletedCourse) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Failed to delete course:', error);
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    );
  }
}
