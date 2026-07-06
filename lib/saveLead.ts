// import { connectMongo } from "@/utils/mongodb";
// import { Lead } from "@/models/Lead";

// export async function saveLead(data: any) {
//   await connectMongo();

//   return Lead.create({
//     fullName: data.fullName,
//     email: data.email,
//     phone: data.phone,
//     course: data.course,
//     message: data.message,

//     formType: data.formType,
//     ipAddress: data.ipAddress,

//     metadata: data.metadata || {},
//   });
// }

import { connectMongo } from "@/utils/mongodb";
import { Lead } from "@/models/Lead";

// Save a single lead to the database
export async function saveLead(data: any) {
  await connectMongo();

  return Lead.create({
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    course: data.course,
    message: data.message,

    formType: data.formType,
    status: data.status || 'unreached',
    ipAddress: data.ipAddress,

    metadata: {
      ...data.metadata,
      country: data.country, // Store country in metadata
    },
  });
}

// Get all leads from the database
export async function getAllLeads() {
  await connectMongo();

  return Lead.find().sort({ createdAt: -1 }).lean();
}
