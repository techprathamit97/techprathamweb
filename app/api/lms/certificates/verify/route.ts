import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
import Certificate from "@/models/Certificate.js";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const verificationCode = searchParams.get('code');
    const certificateId = searchParams.get('id');
    
    if (!verificationCode && !certificateId) {
      return NextResponse.json(
        { error: "Verification code or certificate ID is required" },
        { status: 400 }
      );
    }

    await connectMongo();
    
    let certificate;
    
    if (verificationCode) {
      certificate = await Certificate.findOne({ 
        verificationCode: verificationCode.toUpperCase(),
        status: 'issued'
      });
    } else if (certificateId) {
      certificate = await Certificate.findOne({ 
        certificateId: certificateId.toUpperCase(),
        status: 'issued'
      });
    }
    
    if (!certificate) {
      return NextResponse.json(
        { 
          valid: false, 
          message: "Certificate not found or not issued" 
        },
        { status: 404 }
      );
    }

    // Return public certificate information
    const publicCertificateInfo = {
      valid: true,
      certificateId: certificate.certificateId,
      studentName: certificate.studentName,
      courseName: certificate.courseName,
      courseCategory: certificate.courseCategory,
      completionDate: certificate.completionDate,
      issueDate: certificate.issueDate,
      grade: certificate.grade,
      score: certificate.score,
      verificationCode: certificate.verificationCode,
      template: certificate.template
    };

    return NextResponse.json(publicCertificateInfo);
  } catch (error: any) {
    console.error("Certificate verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify certificate" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { verificationCode, certificateId } = data;
    
    if (!verificationCode && !certificateId) {
      return NextResponse.json(
        { error: "Verification code or certificate ID is required" },
        { status: 400 }
      );
    }

    await connectMongo();
    
    let certificate;
    
    if (verificationCode) {
      certificate = await Certificate.findOne({ 
        verificationCode: verificationCode.toUpperCase(),
        status: 'issued'
      });
    } else if (certificateId) {
      certificate = await Certificate.findOne({ 
        certificateId: certificateId.toUpperCase(),
        status: 'issued'
      });
    }
    
    if (!certificate) {
      return NextResponse.json(
        { 
          valid: false, 
          message: "Certificate not found or not issued" 
        }
      );
    }

    // Return public certificate information
    const publicCertificateInfo = {
      valid: true,
      certificateId: certificate.certificateId,
      studentName: certificate.studentName,
      courseName: certificate.courseName,
      courseCategory: certificate.courseCategory,
      completionDate: certificate.completionDate,
      issueDate: certificate.issueDate,
      grade: certificate.grade,
      score: certificate.score,
      verificationCode: certificate.verificationCode,
      template: certificate.template
    };

    return NextResponse.json(publicCertificateInfo);
  } catch (error: any) {
    console.error("Certificate verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify certificate" },
      { status: 500 }
    );
  }
}