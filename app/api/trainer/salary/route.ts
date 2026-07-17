import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/utils/mongodb';
const Trainer = require('@/models/Trainer');
const Batch = require('@/models/Batch');

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    
    const { searchParams } = new URL(req.url);
    const trainerId = searchParams.get('trainerId');
    
    if (!trainerId) {
      return NextResponse.json(
        { error: 'Trainer ID is required' },
        { status: 400 }
      );
    }
    
    // Find trainer by trainerId
    const trainer = await Trainer.findOne({ trainerId: trainerId }).lean();
    
    if (!trainer) {
      return NextResponse.json(
        { error: 'Trainer not found' },
        { status: 404 }
      );
    }
    
    // Get trainer's batches for performance calculation
    const batches = await Batch.find({ trainerId: trainer._id })
      .populate('courseId')
      .populate('studentIds')
      .lean();
    
    // Calculate performance metrics
    const totalStudents = batches.reduce((sum: number, batch: any) => sum + (batch.studentIds?.length || 0), 0);
    const activeBatches = batches.filter((b: any) => b.status === 'active').length;
    
    // Generate salary history (mock data for demo)
    const currentDate = new Date();
    const salaryHistory = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const baseSalary = trainer.salary || 50000;
      const performanceBonus = Math.floor(Math.random() * 10000);
      const deductions = Math.floor(Math.random() * 2000);
      const netSalary = baseSalary + performanceBonus - deductions;
      
      salaryHistory.push({
        month: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        baseSalary: baseSalary,
        performanceBonus: performanceBonus,
        deductions: deductions,
        netSalary: netSalary,
        status: i === 0 ? 'pending' : 'paid',
        paidDate: i === 0 ? null : new Date(date.getFullYear(), date.getMonth() + 1, 5),
        paymentMethod: trainer.paymentMode || 'Bank Transfer'
      });
    }
    
    const salaryData = {
      trainer: {
        trainerId: trainer.trainerId,
        name: trainer.name,
        email: trainer.email,
        phone: trainer.phone,
        joinedAt: trainer.createdAt,
        experience: trainer.experience,
        rating: trainer.rating || 4.5
      },
      currentSalary: {
        baseSalary: trainer.salary || 50000,
        currency: 'INR',
        paymentMode: trainer.paymentMode || 'Monthly',
        paymentMethod: 'Bank Transfer',
        bankDetails: {
          accountNumber: '****1234',
          ifscCode: 'HDFC0001234',
          bankName: 'HDFC Bank',
          accountHolderName: trainer.name
        }
      },
      performance: {
        totalBatches: batches.length,
        activeBatches: activeBatches,
        totalStudents: totalStudents,
        completionRate: 85,
        studentSatisfaction: trainer.rating || 4.5,
        attendanceRate: 95
      },
      salaryHistory: salaryHistory,
      stats: {
        totalEarnings: salaryHistory.reduce((sum: number, s: any) => sum + s.netSalary, 0),
        averageSalary: salaryHistory.reduce((sum: number, s: any) => sum + s.netSalary, 0) / salaryHistory.length,
        totalBonus: salaryHistory.reduce((sum: number, s: any) => sum + s.performanceBonus, 0),
        totalDeductions: salaryHistory.reduce((sum: number, s: any) => sum + s.deductions, 0),
        pendingAmount: salaryHistory.filter((s: any) => s.status === 'pending').reduce((sum: number, s: any) => sum + s.netSalary, 0),
        paidAmount: salaryHistory.filter((s: any) => s.status === 'paid').reduce((sum: number, s: any) => sum + s.netSalary, 0)
      },
      paymentSchedule: {
        nextPaymentDate: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 5),
        paymentFrequency: 'Monthly',
        paymentDay: 5
      }
    };
    
    return NextResponse.json({
      success: true,
      data: salaryData
    });
    
  } catch (error: any) {
    console.error('Trainer salary API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch salary data', message: error.message },
      { status: 500 }
    );
  }
}