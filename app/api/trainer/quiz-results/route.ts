import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
import Quiz from "@/models/Quiz";
import Submission from "@/models/Submission";
import Student from "@/models/Student";
import Batch from "@/models/Batch";

export async function GET(req: Request) {
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

    // Find batches assigned to this trainer
    const batches = await Batch.find({ trainerId })
      .populate('courseId')
      .lean();

    const batchIds = batches.map(b => b._id);

    // Fetch quizzes assigned to these batches
    const quizzes = await Quiz.find({ batchId: { $in: batchIds } })
      .populate('batchId')
      .lean();

    const quizIds = quizzes.map(q => q._id);

    // Fetch all submissions for these quizzes
    const submissions = await Submission.find({
      type: 'quiz',
      refId: { $in: quizIds }
    })
      .populate('studentId')
      .populate('refId')
      .lean();

    // Format results
    const results = quizzes.map(quiz => {
      const quizSubmissions = submissions.filter(s =>
        s.refId && s.refId._id && s.refId._id.toString() === quiz._id.toString()
      );

      const students = quizSubmissions.map(sub => {
        const student = sub.studentId as any;
        return {
          _id: sub._id,
          studentId: student?.studentId || 'N/A',
          studentName: student?.name || 'Unknown',
          studentEmail: student?.email || '',
          score: sub.score || 0,
          totalMarks: quiz.totalMarks || quiz.questions?.length || 0,
          percentage: quiz.totalMarks
            ? Math.round(((sub.score || 0) / quiz.totalMarks) * 100)
            : 0,
          passed: (sub.score || 0) >= (quiz.passingMarks || 0),
          submittedAt: sub.submittedAt
        };
      });

      const totalStudents = quizSubmissions.length;
      const passedStudents = students.filter(s => s.passed).length;
      const avgScore = totalStudents > 0
        ? Math.round(students.reduce((sum, s) => sum + s.percentage, 0) / totalStudents)
        : 0;

      return {
        _id: quiz._id,
        title: quiz.title,
        batchId: quiz.batchId,
        batchName: (quiz.batchId as any)?.batchName || (quiz.batchId as any)?._id?.toString() || 'N/A',
        totalMarks: quiz.totalMarks || quiz.questions?.length || 0,
        passingMarks: quiz.passingMarks || 0,
        questionsCount: quiz.questions?.length || 0,
        totalStudents,
        passedStudents,
        failedStudents: totalStudents - passedStudents,
        avgScore,
        students,
        createdAt: quiz.createdAt
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Failed to fetch quiz results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz results' },
      { status: 500 }
    );
  }
}