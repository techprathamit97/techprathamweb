import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
const Trainer = require("@/models/Trainer");

// Update trainer
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id } = await params;
    const data = await req.json();
    
    const trainer = await Trainer.findById(id);
    
    if (!trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }
    
    // Update trainer fields
    trainer.name = data.name || trainer.name;
    trainer.email = data.email || trainer.email;
    trainer.phone = data.phone || trainer.phone;
    trainer.expertise = data.expertise || trainer.expertise;
    trainer.bio = data.bio || trainer.bio;
    trainer.isActive = data.isActive !== undefined ? data.isActive : trainer.isActive;
    
    await trainer.save();
    
    return NextResponse.json(trainer);
  } catch (error) {
    console.error('Failed to update trainer:', error);
    return NextResponse.json(
      { error: 'Failed to update trainer' },
      { status: 500 }
    );
  }
}

// Delete trainer
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id } = await params;
    
    const trainer = await Trainer.findById(id);
    
    if (!trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }
    
    await Trainer.findByIdAndDelete(id);
    
    return NextResponse.json({ message: 'Trainer deleted successfully' });
  } catch (error) {
    console.error('Failed to delete trainer:', error);
    return NextResponse.json(
      { error: 'Failed to delete trainer' },
      { status: 500 }
    );
  }
}
