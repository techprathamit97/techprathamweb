import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
const Trainer = require("@/models/Trainer");

export async function GET() {
  try {
    await connectMongo();
    
    const trainers = await Trainer.find({}).limit(5).lean();
    
    return NextResponse.json({
      success: true,
      count: trainers.length,
      trainers: trainers.map((trainer: any) => ({
        _id: trainer._id,
        trainerId: trainer.trainerId,
        name: trainer.name,
        email: trainer.email,
        hasPassword: !!trainer.password,
        passwordLength: trainer.password ? trainer.password.length : 0,
        isActive: trainer.isActive,
        createdAt: trainer.createdAt
      }))
    });
  } catch (error: any) {
    console.error('Debug trainers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trainers', message: error.message },
      { status: 500 }
    );
  }
}