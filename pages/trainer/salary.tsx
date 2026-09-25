import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TrainerLayout from '@/src/trainer/common/TrainerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  Award, 
  Users, 
  Target,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface SalaryHistory {
  month: string;
  baseSalary: number;
  performanceBonus: number;
  deductions: number;
  netSalary: number;
  status: string;
  paidDate: string | null;
  paymentMethod: string;
}

interface SalaryData {
  trainer: {
    trainerId: string;
    name: string;
    email: string;
    phone: string;
    joinedAt: string;
    experience: string;
    rating: number;
  };
  currentSalary: {
    baseSalary: number;
    currency: string;
    paymentMode: string;
    paymentMethod: string;
    bankDetails: {
      accountNumber: string;
      ifscCode: string;
      bankName: string;
      accountHolderName: string;
    };
  };
  performance: {
    totalBatches: number;
    activeBatches: number;
    totalStudents: number;
    completionRate: number;
    studentSatisfaction: number;
    attendanceRate: number;
  };
  salaryHistory: SalaryHistory[];
  stats: {
    totalEarnings: number;
    averageSalary: number;
    totalBonus: number;
    totalDeductions: number;
    pendingAmount: number;
    paidAmount: number;
  };
  paymentSchedule: {
    nextPaymentDate: string;
    paymentFrequency: string;
    paymentDay: number;
  };
}

const TrainerSalary = () => {
  const router = useRouter();
  const [trainerData, setTrainerData] = useState<any>(null);
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedData = localStorage.getItem('trainer');
    if (!storedData) {
      router.push('/trainer/login');
      return;
    }

    const trainer = JSON.parse(storedData);
    setTrainerData(trainer);
    fetchSalaryData(trainer.trainerId);
  }, []);

  const fetchSalaryData = async (trainerId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/trainer/salary?trainerId=${trainerId}`);
      const data = await res.json();

      if (res.ok) {
        setSalaryData(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch salary data');
      }
    } catch (error) {
      console.error('Fetch salary error:', error);
      toast.error('Failed to load salary data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !trainerData || !salaryData) {
    return (
      <TrainerLayout>
        <div className="p-6 flex items-center justify-center">
          <div className="text-gray-900">Loading salary details...</div>
        </div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">Salary Details</h1>
          <p className="text-green-100 mt-2">View your salary and payment information</p>
        </div>

      

        {/* Performance Metrics */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{salaryData.performance.totalStudents}</p>
                <p className="text-gray-600 text-sm">Total Students</p>
                <p className="text-blue-600 text-xs mt-1">{salaryData.performance.activeBatches} Active Batches</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{salaryData.performance.completionRate}%</p>
                <p className="text-gray-600 text-sm">Completion Rate</p>
                <p className="text-green-600 text-xs mt-1">Above average</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Award className="h-8 w-8 text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{salaryData.performance.studentSatisfaction}/5</p>
                <p className="text-gray-600 text-sm">Student Rating</p>
                <p className="text-yellow-600 text-xs mt-1">{salaryData.performance.attendanceRate}% Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>

      

       
      </div>
    </TrainerLayout>
  );
};

export default TrainerSalary;
