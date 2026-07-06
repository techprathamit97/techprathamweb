import { NextResponse } from "next/server";
import { connectMongo } from "@/utils/mongodb";
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectMongo();

    // Get all collection names
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: 'Database not connected' }, { status: 500 });
    }
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Check specific collections for student-like data
    const results: any = {
      collections: collectionNames,
      data: {}
    };
    
    // Check students collection
    try {
      const Student = require("@/models/Student");
      const students = await Student.find({}).limit(3).lean();
      results.data.students = {
        count: students.length,
        sample: students.map((s: any) => ({
          _id: s._id,
          studentId: s.studentId,
          name: s.name,
          email: s.email,
          hasPassword: !!s.password
        }))
      };
    } catch (e: any) {
      results.data.students = { error: e.message };
    }

    // Check if there's an invoices collection (from previous context)
    if (collectionNames.includes('invoices') && db) {
      try {
        const invoices = await db.collection('invoices').find({}).limit(3).toArray();
        results.data.invoices = {
          count: invoices.length,
          sample: invoices.map((inv: any) => ({
            _id: inv._id,
            customerDetails: inv.customerDetails,
            isManual: inv.isManual
          }))
        };
      } catch (e: any) {
        results.data.invoices = { error: e.message };
      }
    }

    // Check if there's an enrolled collection
    if (collectionNames.includes('enrolled') && db) {
      try {
        const enrolled = await db.collection('enrolled').find({}).limit(3).toArray();
        results.data.enrolled = {
          count: enrolled.length,
          sample: enrolled
        };
      } catch (e: any) {
        results.data.enrolled = { error: e.message };
      }
    }
    
    return NextResponse.json({
      success: true,
      results
    });
  } catch (error: any) {
    console.error('Debug collections error:', error);
    return NextResponse.json(
      { error: 'Failed to debug collections', message: error.message },
      { status: 500 }
    );
  }
}