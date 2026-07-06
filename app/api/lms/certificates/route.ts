import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
import Certificate from "@/models/Certificate.js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  try {
    await connectMongo();
    
    const certificates = await Certificate.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(certificates);
  } catch (error: any) {
    console.error("Certificates fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch certificates" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();

    // Delete all certificates
    const result = await Certificate.deleteMany({});

    return NextResponse.json({
      message: `Deleted ${result.deletedCount} certificates successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error: any) {
    console.error("Certificates delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete certificates" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();
    
    const data = await req.json();
    
    // Validate required fields
    if (!data.studentName || !data.studentEmail || !data.courseName || !data.grade || data.score === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if certificate already exists for this student and course
    const existingCertificate = await Certificate.findOne({
      studentEmail: data.studentEmail,
      courseName: data.courseName
    });

    if (existingCertificate) {
      return NextResponse.json(
        { error: "Certificate already exists for this student and course" },
        { status: 400 }
      );
    }
    
    const certificate = new Certificate({
      ...data,
      status: 'issued' // Auto-issue the certificate
    });
    
    await certificate.save();

    return NextResponse.json(certificate, { status: 201 });
  } catch (error: any) {
    console.error("Certificate creation error:", error);
    
    // Return more specific error messages
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return NextResponse.json(
        { error: `${field} already exists` },
        { status: 400 }
      );
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: `Validation error: ${validationErrors.join(', ')}` },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to create certificate" },
      { status: 500 }
    );
  }
}