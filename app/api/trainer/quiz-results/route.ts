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

    type QuizWithDetails = {
      _id: string | { toString(): string };
      title: string;
      batchId: any;
      totalMarks?: number;
      passingMarks?: number;
      questions?: Array<any>;
      createdAt?: Date;
    };

    type SubmissionWithDetails = {
      _id: string | { toString(): string };
      studentId?: any;
      refId?: any;
      score?: number;
      submittedAt?: Date;
    };

    const normalizedQuizzes: QuizWithDetails[] = (quizzes || []).map((quiz: any) => ({
      _id: quiz?._id,
      title: quiz?.title || 'Untitled Quiz',
      batchId: quiz?.batchId,
      totalMarks: quiz?.totalMarks,
      passingMarks: quiz?.passingMarks,
      questions: quiz?.questions || [],
      createdAt: quiz?.createdAt
    }));

    const normalizedSubmissions: SubmissionWithDetails[] = (submissions || []).map((submission: any) => ({
      _id: submission?._id,
      studentId: submission?.studentId,
      refId: submission?.refId,
      score: submission?.score,
      submittedAt: submission?.submittedAt
    }));

    // Format results
    const results = normalizedQuizzes.map((quiz: QuizWithDetails) => {
      const quizSubmissions = normalizedSubmissions.filter((s: SubmissionWithDetails) =>
        s.refId && s.refId._id && s.refId._id.toString() === (quiz._id as any).toString()
      );

      const students = quizSubmissions.map((sub: SubmissionWithDetails) => {
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