import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
const Student = require("@/models/Student");
const Trainer = require("@/models/Trainer");
import { connectMongo } from '@/utils/mongodb';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            id: "credentials",
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
                userType: { label: "User Type", type: "text" }, // 'student' or 'trainer'
            },
            async authorize(credentials: any) {
                await connectMongo();
                try {
                    let user = null;
                    
                    // Check if it's a student or trainer
                    if (credentials.userType === 'student') {
                        user = await Student.findOne({ email: credentials.email });
                    } else if (credentials.userType === 'trainer') {
                        user = await Trainer.findOne({ email: credentials.email });
                    } else {
                        // Try both if userType not specified
                        user = await Student.findOne({ email: credentials.email });
                        if (!user) {
                            user = await Trainer.findOne({ email: credentials.email });
                        }
                    }
                    
                    if (!user) {
                        throw new Error("Email Not Found");
                    }

                    const isPasswordCorrect = await bcrypt.compare(
                        credentials.password,
                        user.password
                    );

                    if (!isPasswordCorrect) {
                        throw new Error("Invalid Password");
                    }

                    return user;
                } catch (err: any) {
                    throw new Error(err);
                }
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
        }),
    ],
    pages: {
        signIn: '/auth/login',
    },
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === "credentials") return true;
            if (account?.provider === "google") {
                await connectMongo();
                try {
                    // Check if user exists as student or trainer
                    const existingStudent = await Student.findOne({ email: user.email });
                    const existingTrainer = await Trainer.findOne({ email: user.email });
                    
                    if (!existingStudent && !existingTrainer) {
                        // Create new student with Google account
                        const studentCount = await Student.countDocuments({});
                        const studentId = `STU${String(studentCount + 1).padStart(4, '0')}`;
                        
                        const newStudent = await Student.create({
                            name: user.name,
                            email: user.email,
                            phone: '',
                            password: '', // No password for OAuth users
                            studentId: studentId,
                            profileImage: user.image || "",
                            isActive: true
                        });
                    }
                    return true;
                } catch (error) {
                    console.error('Error creating Google user:', error);
                    return false;
                }
            }
            return false;
        },
        async redirect({ url, baseUrl }) {
            // Handle redirect after successful login
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            else if (new URL(url).origin === baseUrl) return url;
            return baseUrl;
        },
    },
};
