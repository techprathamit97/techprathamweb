import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
const Trainer = require("@/models/Trainer");
const bcrypt = require('bcryptjs');

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
    trainer.experience = data.experience || trainer.experience;
    trainer.expertise = data.expertise || trainer.expertise;
    trainer.bio = data.bio || trainer.bio;
    trainer.isActive = data.isActive !== undefined ? data.isActive : trainer.isActive;

    // If a new password was supplied, re-hash it and keep a plaintext copy
    // so the admin edit dialog can display it later.
    const newPassword = data.loginPassword || data.password;
    if (typeof newPassword === 'string' && newPassword.trim().length > 0) {
      trainer.password = await bcrypt.hash(newPassword, 10);
      trainer.plainPassword = newPassword;
    }

    await trainer.save();

    return NextResponse.json({
      _id: trainer._id,
      trainerId: trainer.trainerId,
      name: trainer.name,
      email: trainer.email,
      phone: trainer.phone,
      experience: trainer.experience,
      expertise: trainer.expertise,
      bio: trainer.bio,
      isActive: trainer.isActive,
      plainPassword: trainer.plainPassword || ''
    });
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
