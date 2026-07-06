import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
import Certificate from "@/models/Certificate.js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    
    const { id } = await params;
    const certificate = await Certificate.findById(id);
    
    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(certificate);
  } catch (error: any) {
    console.error("Certificate fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch certificate" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();
    
    const { id } = await params;
    const data = await req.json();
    
    const certificate = await Certificate.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );
    
    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(certificate);
  } catch (error: any) {
    console.error("Certificate update error:", error);
    return NextResponse.json(
      { error: "Failed to update certificate" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();
    
    const { id } = await params;
    const certificate = await Certificate.findByIdAndDelete(id);
    
    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Certificate deleted successfully" });
  } catch (error: any) {
    console.error("Certificate deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete certificate" },
      { status: 500 }
    );
  }
}