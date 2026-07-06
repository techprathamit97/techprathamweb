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

        {/* Current Salary Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Base Salary</p>
                  <p className="text-2xl font-bold text-gray-900">₹{salaryData.currentSalary.baseSalary.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">{salaryData.currentSalary.paymentMode}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">₹{salaryData.stats.totalEarnings.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">Last 6 months</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Bonus</p>
                  <p className="text-2xl font-bold text-gray-900">₹{salaryData.stats.totalBonus.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">Performance based</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Pending Amount</p>
                  <p className="text-2xl font-bold text-gray-900">₹{salaryData.stats.pendingAmount.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">Current month</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
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

        {/* Payment Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 text-sm">Payment Method</p>
                  <p className="text-gray-900 font-medium">{salaryData.currentSalary.paymentMethod}</p>
                </div>
                
                <div>
                  <p className="text-gray-600 text-sm">Bank Details</p>
                  <div className="bg-gray-50 p-3 rounded-md space-y-1">
                    <p className="text-gray-900 text-sm">
                      <span className="font-medium">Bank:</span> {salaryData.currentSalary.bankDetails.bankName}
                    </p>
                    <p className="text-gray-900 text-sm">
                      <span className="font-medium">Account:</span> {salaryData.currentSalary.bankDetails.accountNumber}
                    </p>
                    <p className="text-gray-900 text-sm">
                      <span className="font-medium">IFSC:</span> {salaryData.currentSalary.bankDetails.ifscCode}
                    </p>
                    <p className="text-gray-900 text-sm">
                      <span className="font-medium">Name:</span> {salaryData.currentSalary.bankDetails.accountHolderName}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className="text-gray-600 text-sm">Next Payment</p>
                  <p className="text-gray-900 font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(salaryData.paymentSchedule.nextPaymentDate).toLocaleDateString()}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {salaryData.paymentSchedule.paymentFrequency} on {salaryData.paymentSchedule.paymentDay}th
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Salary Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Average Salary</span>
                  <span className="text-gray-900 font-medium">₹{salaryData.stats.averageSalary.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Paid</span>
                  <span className="text-green-600 font-medium">₹{salaryData.stats.paidAmount.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Deductions</span>
                  <span className="text-red-600 font-medium">₹{salaryData.stats.totalDeductions.toLocaleString()}</span>
                </div>
                
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-900 font-medium">Net Earnings</span>
                    <span className="text-gray-900 font-bold text-lg">
                      ₹{(salaryData.stats.totalEarnings - salaryData.stats.totalDeductions).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Salary History */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Salary History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-gray-600 font-medium p-3">Month</th>
                    <th className="text-left text-gray-600 font-medium p-3">Base Salary</th>
                    <th className="text-left text-gray-600 font-medium p-3">Bonus</th>
                    <th className="text-left text-gray-600 font-medium p-3">Deductions</th>
                    <th className="text-left text-gray-600 font-medium p-3">Net Salary</th>
                    <th className="text-left text-gray-600 font-medium p-3">Status</th>
                    <th className="text-left text-gray-600 font-medium p-3">Paid Date</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryData.salaryHistory.map((salary, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-3 text-gray-900 font-medium">{salary.month}</td>
                      <td className="p-3 text-gray-900">₹{salary.baseSalary.toLocaleString()}</td>
                      <td className="p-3 text-green-600">+₹{salary.performanceBonus.toLocaleString()}</td>
                      <td className="p-3 text-red-600">-₹{salary.deductions.toLocaleString()}</td>
                      <td className="p-3 text-gray-900 font-medium">₹{salary.netSalary.toLocaleString()}</td>
                      <td className="p-3">
                        <Badge className={
                          salary.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' :
                          'bg-orange-100 text-orange-700 border-orange-200'
                        }>
                          {salary.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-600">
                        {salary.paidDate ? new Date(salary.paidDate).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </TrainerLayout>
  );
};

export default TrainerSalary;
