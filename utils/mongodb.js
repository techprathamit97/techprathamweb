import mongoose from "mongoose";

let isConnected = false;

export async function connectMongo() {
  if (isConnected) {
    return;
  }

  if (!process.env.MONGODB_URL) {
    throw new Error("Please add your MONGODB_URL to environment variables");
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URL, {
      dbName: "lms",
    });
    isConnected = true;
    console.log(`✅ MongoDB connected to ${db.connection.host} - Database: lms`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw new Error("Error connecting to MongoDB");
  }
}