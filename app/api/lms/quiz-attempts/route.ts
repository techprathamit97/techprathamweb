import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
import Submission from "@/models/Submission";
import Quiz from "@/models/Quiz";
import Student from "@/models/Student";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    await connectMongo();
    
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const quizId = searchParams.get('quizId');
    
    const filter: any = { type: 'quiz' };
    if (studentId) filter.studentId = studentId;
    if (quizId) filter.refId = quizId;
    
    const attempts = await Submission.find(filter)
      .populate('refId')
      .populate('studentId')
      .sort({ createdAt: -1 })
      .lean();
    
    return NextResponse.json(attempts);
  } catch (error) {
    console.error('Failed to fetch quiz attempts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz attempts' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectMongo();

    const data = await req.json();

    if (!data.studentId || !data.refId) {
      return NextResponse.json(
        { error: 'Student ID and Quiz ID are required' },
        { status: 400 }
      );
    }

    // Find student by studentId string or use directly if it's an ObjectId
    let studentIdObj;
    if (mongoose.Types.ObjectId.isValid(data.studentId)) {
      studentIdObj = new mongoose.Types.ObjectId(data.studentId);
    } else {
      // Try to find student by studentId string
      const student = await Student.findOne({ studentId: data.studentId });
      if (!student) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        );
      }
      studentIdObj = student._id;
    }

    // Find quiz to get total marks and calculate percentage
    const quiz = await Quiz.findById(data.refId);
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }

    const submission = await Submission.create({
      type: 'quiz',
      studentId: studentIdObj,
      refId: data.refId,
      score: data.score || 0,
      status: 'submitted',
      submittedAt: new Date()
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    console.error('Failed to create quiz attempt:', error);
    return NextResponse.json(
      { error: 'Failed to create quiz attempt' },
      { status: 500 }
    );
  }
}
