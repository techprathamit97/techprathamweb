import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
const Batch = require("@/models/Batch");
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function PATCH(req: Request, { params }: { params: Promise<{ batchId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();
    
    const { batchId } = await params;
    const data = await req.json();
    
    const batch = await Batch.findByIdAndUpdate(
      batchId,
      data,
      { new: true }
    );

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json(batch);
  } catch (error: any) {
    console.error("Batch update error:", error);
    return NextResponse.json(
      { error: "Failed to update batch" },
      { status: 500 }
    );
  }
}