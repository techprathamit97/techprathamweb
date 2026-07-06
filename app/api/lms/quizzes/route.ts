import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
import Quiz from "@/models/Quiz";
import { notifyBatchStudents, NotificationTemplates } from '@/lib/notificationService';

export async function GET(req: Request) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const courseLink = searchParams.get("courseLink");
    const batchId = searchParams.get("batchId");
    const quizId = searchParams.get("id");

    // If quizId is provided, fetch single quiz
    if (quizId) {
      const quiz = await Quiz.findById(quizId).lean();
      if (!quiz) {
        return NextResponse.json(
          { error: "Quiz not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(quiz);
    }

    const filter: any = {};
    if (courseLink) filter.course_link = courseLink;
    if (batchId) filter.batchId = batchId;

    const quizzes = await Quiz.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(quizzes);
  } catch (error: any) {
    console.error("Quizzes fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectMongo();

    const data = await req.json();

    const quiz = new Quiz(data);
    await quiz.save();

    // Send notification to students in the batch
    if (data.batchId) {
      const template = NotificationTemplates.quizUploaded(quiz.title);
      try {
        await notifyBatchStudents(
          data.batchId,
          template.title,
          template.message,
          template.type,
          {
            relatedId: quiz._id,
            relatedType: 'Quiz',
            actionUrl: '/student/quizzes',
            priority: template.priority
          }
        );
      } catch (notifError) {
        console.error('Error sending quiz notification:', notifError);
      }
    }

    return NextResponse.json(quiz, { status: 201 });
  } catch (error: any) {
    console.error("Quiz creation error:", error);
    return NextResponse.json(
      { error: "Failed to create quiz" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get("id");

    if (!quizId) {
      return NextResponse.json(
        { error: "Quiz ID is required" },
        { status: 400 }
      );
    }

    const quiz = await Quiz.findByIdAndDelete(quizId);

    if (!quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Quiz deleted successfully" });
  } catch (error: any) {
    console.error("Quiz deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete quiz" },
      { status: 500 }
    );
  }
}