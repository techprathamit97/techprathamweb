import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
import { nextTrainerId, parseTrainerIdNumber, formatTrainerId } from "@/utils/nextTrainerId";
const Trainer = require("@/models/Trainer");
const Batch = require("@/models/Batch");
const bcrypt = require('bcryptjs');

export async function GET() {
  try {
    await connectMongo();
    
    const trainers = await Trainer.find({}).sort({ createdAt: -1 }).lean();
    
    // Get batch info for each trainer
    const trainersWithDetails = await Promise.all(
      trainers.map(async (trainer: any) => {
        const batches = await Batch.find({ trainerId: trainer._id }).lean();
        
        return {
          _id: trainer._id,
          trainerId: trainer.trainerId || trainer._id.toString(),
          name: trainer.name,
          email: trainer.email,
          phone: trainer.phone || '',
          expertise: trainer.expertise || [],
          bio: trainer.bio || '',
          qualification: trainer.qualification || '',
          experience: trainer.experience || '',
          dateOfJoining: trainer.dateOfJoining,
          isActive: trainer.isActive !== false,
          batches: batches.length,
          rating: 4.5,
          plainPassword: trainer.plainPassword || '',
          createdAt: trainer.createdAt
        };
      })
    );
    
    return NextResponse.json(trainersWithDetails);
  } catch (error) {
    console.error('Failed to fetch trainers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trainers' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectMongo();
    
    const data = await req.json();
    
    // Accept either 'password' or 'loginPassword' from frontend
    const password = data.password || data.loginPassword;
    
    if (!data.name || !data.email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existingTrainer = await Trainer.findOne({ email: data.email });
    if (existingTrainer) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Derive trainerId from the highest existing ID, not from a document count.
    // A count collides with an existing ID as soon as any trainer has been
    // deleted (e.g. TRN0001-TRN0005 with TRN0003 removed gives count 4, which
    // regenerates the already-taken TRN0005). trainerId is a unique index, so
    // that collision surfaced as a 500 on servers with real data while a clean
    // local database never hit it.
    const existing = await Trainer.find({}).select('trainerId').lean();
    const startingId = nextTrainerId(existing.map((t: any) => t.trainerId));
    const nextNumber = parseTrainerIdNumber(startingId) ?? 1;

    // Concurrent creates can still race for the same ID, so retry on duplicate key.
    let newTrainer: any = null;
    let lastError: any = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const trainerId = formatTrainerId(nextNumber + attempt);

      try {
        newTrainer = await Trainer.create({
          name: data.name,
          email: data.email,
          password: hashedPassword,
          plainPassword: password,
          phone: data.phone,
          trainerId: trainerId,
          expertise: data.expertise || [],
          bio: data.bio || '',
          qualification: data.qualification || '',
          experience: data.experience || '',
          isActive: true
        });
        break;
      } catch (createError: any) {
        lastError = createError;

        // Only a trainerId clash is worth retrying with a new ID.
        const isTrainerIdClash =
          createError?.code === 11000 &&
          Object.keys(createError?.keyPattern || createError?.keyValue || {}).includes('trainerId');

        if (!isTrainerIdClash) throw createError;

        console.warn(`trainerId ${trainerId} already taken, retrying`);
      }
    }

    if (!newTrainer) throw lastError || new Error('Could not allocate a trainerId');

    return NextResponse.json({
      success: true,
      message: 'Trainer created successfully',
      trainer: {
        _id: newTrainer._id,
        trainerId: newTrainer.trainerId,
        name: newTrainer.name,
        email: newTrainer.email,
        phone: newTrainer.phone,
        isActive: newTrainer.isActive
      },
      loginPassword: password // Return the password so admin can share it
    }, { status: 201 });
  } catch (error: any) {
    // Log the full error server-side, and return enough detail that a failure in
    // a deployed environment is diagnosable instead of an opaque 500.
    console.error('Failed to create trainer:', {
      name: error?.name,
      code: error?.code,
      message: error?.message,
      keyValue: error?.keyValue,
      errors: error?.errors ? Object.keys(error.errors) : undefined
    });

    // Duplicate key - report which field actually clashed
    if (error?.code === 11000) {
      const field = Object.keys(error?.keyPattern || error?.keyValue || {})[0] || 'field';
      return NextResponse.json(
        { error: `A trainer with this ${field} already exists`, field, code: 'DUPLICATE_KEY' },
        { status: 409 }
      );
    }

    // Schema validation failure
    if (error?.name === 'ValidationError') {
      const fields = Object.keys(error.errors || {});
      return NextResponse.json(
        {
          error: `Validation failed for: ${fields.join(', ')}`,
          fields,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create trainer',
        detail: error?.message || 'Unknown error',
        code: error?.name || 'UNKNOWN'
      },
      { status: 500 }
    );
  }
}
