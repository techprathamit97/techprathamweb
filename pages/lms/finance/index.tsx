import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  BadgeCheck,
  BookOpen,
  CreditCard,
  FileText,
  Search,
  Filter,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

interface Payment {
  _id: string;
  invoiceNumber: string;
  studentName: string;
  studentEmail: string;
  courseName: string;
  totalFees: number;
  paidAmount: number;
  dueAmount: number;
  paymentDate: string;
  paymentStatus: string;
  installmentNumber: number;
  verifiedBy?: string;
}

interface Summary {
  totalRevenue: number;
  totalPending: number;
  totalExpected: number;
  pendingCount: number;
  completedCount: number;
  partialCount: number;
  totalPayments: number;
}

interface StudentDue {
  studentId: string;
  studentName: string;
  studentEmail: string;
  totalDue: number;
  pendingPayments: Array<{
    invoiceNumber: string;
    amount: number;
    courseName: string;
  }>;
}

interface BatchRevenue {
  batchId: string;
  totalCollected: number;
  totalExpected: number;
  studentCount: number;
}

const FinanceDashboard = () => {
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [studentDues, setStudentDues] = useState<StudentDue[]>([]);
  const [batchRevenue, setBatchRevenue] = useState<BatchRevenue[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalRevenue: 0,
    totalPending: 0,
    totalExpected: 0,
    pendingCount: 0,
    completedCount: 0,
    partialCount: 0,
    totalPayments: 0
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/payments/dashboard');
      const data = await res.json();

      if (res.ok) {
        setPayments(data.data.recentPayments);
        setStudentDues(data.data.studentDues);
        setBatchRevenue(data.data.batchRevenue);
        setSummary(data.data.summary);
        setMonthlyRevenue(data.data.monthlyRevenue);
      } else {
        toast.error(data.error || 'Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleVerifyPayment = async (paymentId: string, status: string) => {
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          status,
          verifiedBy: 'Accountant'
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Payment verified successfully');
        fetchDashboardData();
        setIsViewDialogOpen(false);
      } else {
        toast.error(data.error || 'Failed to verify payment');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Failed to verify payment');
    }
  };

  const viewPaymentDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsViewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
      case 'pending':
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredPayments = payments.filter(p =>
    p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.courseName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get last 6 months for chart
  const last6Months = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    last6Months.push(date.toISOString().slice(0, 7));
  }

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <LMSLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finance Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage payments, pending dues, and revenue tracking</p>
          </div>
          <Button variant="outline" onClick={fetchDashboardData}>
            Refresh Data
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">₹{summary.totalRevenue.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Pending</p>
                  <p className="text-2xl font-bold text-red-600">₹{summary.totalPending.toLocaleString()}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed Payments</p>
                  <p className="text-2xl font-bold text-green-600">{summary.completedCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Partial/Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{summary.partialCount + summary.pendingCount}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pending">Pending Dues</TabsTrigger>
            <TabsTrigger value="batches">Batch Revenue</TabsTrigger>
            <TabsTrigger value="recent">Recent Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Monthly Revenue Chart */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Monthly Revenue (Last 6 Months)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-end justify-between h-48 gap-4">
                  {last6Months.map(month => {
                    const revenue = monthlyRevenue[month] || 0;
                    const maxRevenue = Math.max(...Object.values(monthlyRevenue), 1);
                    const height = (revenue / maxRevenue) * 150;

                    return (
                      <div key={month} className="flex flex-col items-center flex-1">
                        <div className="w-full flex flex-col items-center">
                          <div
                            className="w-full max-w-16 bg-blue-500 rounded-t transition-all duration-300"
                            style={{ height: `${Math.max(height, 4)}px` }}
                          />
                          <p className="text-sm font-medium mt-2 text-gray-700">₹{(revenue / 1000).toFixed(0)}k</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{formatMonth(month)}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle>Payment Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span>Completed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600">{summary.completedCount}</span>
                        <Badge className="bg-green-100 text-green-700">
                          ₹{payments.filter(p => p.paymentStatus === 'completed').reduce((s, p) => s + p.paidAmount, 0).toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <span>Partial</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-yellow-600">{summary.partialCount}</span>
                        <Badge className="bg-yellow-100 text-yellow-700">
                          ₹{payments.filter(p => p.paymentStatus === 'partial').reduce((s, p) => s + p.paidAmount, 0).toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <span>Pending</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-600">{summary.pendingCount}</span>
                        <Badge className="bg-red-100 text-red-700">
                          ₹{payments.filter(p => p.paymentStatus === 'pending').reduce((s, p) => s + p.dueAmount, 0).toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-200">
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" onClick={() => document.getElementById('search-input')?.focus()}>
                      <Search className="w-4 h-4 mr-2" />
                      Search Payments
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        const pendingTab = document.querySelector('[data-value="pending"]') as HTMLElement | null;
                        pendingTab?.click();
                      }}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      View Pending Dues
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={fetchDashboardData}>
                      <Filter className="w-4 h-4 mr-2" />
                      Refresh Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Students with Pending Dues ({studentDues.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Pending Amount</TableHead>
                      <TableHead>Pending Payments</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentDues.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No pending dues
                        </TableCell>
                      </TableRow>
                    ) : (
                      studentDues.map(student => (
                        <TableRow key={student.studentId}>
                          <TableCell className="font-medium">{student.studentName}</TableCell>
                          <TableCell className="text-gray-600">{student.studentEmail}</TableCell>
                          <TableCell>
                            <span className="font-bold text-red-600">₹{student.totalDue.toLocaleString()}</span>
                          </TableCell>
                          <TableCell>{student.pendingPayments.length} payment(s)</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="batches" className="space-y-4">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Batch-wise Revenue ({batchRevenue.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Total Expected</TableHead>
                      <TableHead>Total Collected</TableHead>
                      <TableHead>Collection %</TableHead>
                      <TableHead>Students</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchRevenue.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No batch data
                        </TableCell>
                      </TableRow>
                    ) : (
                      batchRevenue.map(batch => {
                        const collectionPercent = batch.totalExpected > 0
                          ? Math.round((batch.totalCollected / batch.totalExpected) * 100)
                          : 0;

                        return (
                          <TableRow key={batch.batchId}>
                            <TableCell className="font-medium">{batch.batchId.slice(-6)}</TableCell>
                            <TableCell>₹{batch.totalExpected.toLocaleString()}</TableCell>
                            <TableCell className="text-green-600">₹{batch.totalCollected.toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${collectionPercent >= 80 ? 'bg-green-500' : collectionPercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${collectionPercent}%` }}
                                  />
                                </div>
                                <span className="text-sm">{collectionPercent}%</span>
                              </div>
                            </TableCell>
                            <TableCell>{batch.studentCount}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="space-y-4">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  Recent Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search-input"
                      placeholder="Search by name, invoice, course..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice No.</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          No payments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayments.map(payment => (
                        <TableRow key={payment._id}>
                          <TableCell className="font-medium">{payment.invoiceNumber}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{payment.studentName}</p>
                              <p className="text-sm text-gray-500">{payment.studentEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>{payment.courseName}</TableCell>
                          <TableCell className="text-green-600">₹{payment.paidAmount.toLocaleString()}</TableCell>
                          <TableCell className="text-red-600">₹{payment.dueAmount.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(payment.paymentStatus)}</TableCell>
                          <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => viewPaymentDetails(payment)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {payment.paymentStatus !== 'completed' && !payment.verifiedBy && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleVerifyPayment(payment._id, 'completed')}
                                >
                                  <BadgeCheck className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* View Payment Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Payment Details - {selectedPayment?.invoiceNumber}</DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Student Name</p>
                    <p className="font-medium">{selectedPayment.studentName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedPayment.studentEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Course</p>
                    <p className="font-medium">{selectedPayment.courseName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Installment</p>
                    <p className="font-medium">#{selectedPayment.installmentNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Fees</p>
                    <p className="font-medium">₹{selectedPayment.totalFees.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Paid Amount</p>
                    <p className="font-medium text-green-600">₹{selectedPayment.paidAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Due Amount</p>
                    <p className="font-medium text-red-600">₹{selectedPayment.dueAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    {getStatusBadge(selectedPayment.paymentStatus)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Date</p>
                    <p className="font-medium">{new Date(selectedPayment.paymentDate).toLocaleDateString()}</p>
                  </div>
                  {selectedPayment.verifiedBy && (
                    <div>
                      <p className="text-sm text-gray-500">Verified By</p>
                      <p className="font-medium">{selectedPayment.verifiedBy}</p>
                    </div>
                  )}
                </div>

                {selectedPayment.paymentStatus !== 'completed' && (
                  <Button
                    onClick={() => handleVerifyPayment(selectedPayment._id, 'completed')}
                    className="w-full"
                  >
                    <BadgeCheck className="w-4 h-4 mr-2" />
                    Verify & Mark as Completed
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LMSLayout>
  );
};

export default FinanceDashboard;