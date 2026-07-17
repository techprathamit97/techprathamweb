import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DollarSign,
  Search,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  CreditCard,
  FileText,
  Users,
  TrendingUp,
  User,
  GraduationCap,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';

// Dynamic import for InvoiceTemplate to avoid SSR issues
const InvoiceTemplate = dynamic(() => import('@/components/invoice/InvoiceTemplate'), { ssr: false });

interface Payment {
  _id: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  batchId: string;
  courseName: string;
  totalFees: number;
  paidAmount: number;
  dueAmount: number;
  paymentDate: string;
  paymentSource: string;
  paymentStatus: string;
  installmentNumber: number;
  isInstallment: boolean;
  verifiedBy?: string;
  paymentForType?: 'student' | 'trainer';
  trainerId?: string;
  transactionId?: string;
}

interface Summary {
  totalRevenue: number;
  totalPending: number;
  totalPayments: number;
  completedCount: number;
  partialCount: number;
  pendingCount: number;
}

const PaymentManagement = () => {
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [summary, setSummary] = useState<Summary>({
    totalRevenue: 0,
    totalPending: 0,
    totalPayments: 0,
    completedCount: 0,
    partialCount: 0,
    pendingCount: 0
  });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<'courseName' | 'studentName' | 'paidAmount' | 'dueAmount' | 'paymentDate'>('paymentDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pay Due Dialog
  const [isPayDueDialogOpen, setIsPayDueDialogOpen] = useState(false);
  const [payDueForm, setPayDueForm] = useState({
    paidAmount: 0,
    paymentSource: 'bank_transfer',
    transactionId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  // Data for forms
  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);

  // Form type selection
  const [paymentType, setPaymentType] = useState<'student' | 'trainer'>('student');

  // Student payment form
  const [studentForm, setStudentForm] = useState({
    studentId: '',
    batchId: '',
    totalFees: 0,
    paidAmount: 0,
    paymentSource: 'bank_transfer',
    transactionId: '',
    transactionDetails: '',
    paymentDate: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  // Trainer payment form
  const [trainerForm, setTrainerForm] = useState({
    trainerId: '',
    amount: 0,
    paymentSource: 'bank_transfer',
    transactionId: '',
    transactionDetails: '',
    paymentDate: new Date().toISOString().split('T')[0],
    remarks: '',
    description: ''
  });

  // Filtered batches for selected student
  const [studentBatches, setStudentBatches] = useState<any[]>([]);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/payments/list?limit=100');
      const data = await res.json();

      if (res.ok) {
        setPayments(data.data.payments);
        setFilteredPayments(data.data.payments);
        setSummary(data.data.summary);
      } else {
        toast.error(data.error || 'Failed to fetch payments');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/lms/students');
      const data = await res.json();
      console.log('Students API response:', data);
      if (res.ok) {
        // API returns array directly, not wrapped in data.data
        setStudents(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/lms/batches');
      const data = await res.json();
      if (res.ok) {
        // API returns array directly
        setBatches(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const fetchTrainers = async () => {
    try {
      const res = await fetch('/api/lms/trainers');
      const data = await res.json();
      if (res.ok) {
        // API returns array directly
        setTrainers(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (error) {
      console.error('Error fetching trainers:', error);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchStudents();
    fetchBatches();
    fetchTrainers();
  }, []);

  useEffect(() => {
    let filtered = payments;

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.courseName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.paymentStatus === statusFilter);
    }

    // Sort by selected field
    filtered = [...filtered].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredPayments(filtered);
  }, [searchTerm, statusFilter, payments, sortField, sortDirection]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Handle student selection - show only batches the student is enrolled in
  const handleStudentSelect = (studentId: string) => {
    setStudentForm(prev => ({ ...prev, studentId, batchId: '', totalFees: 0, paidAmount: 0 }));
    setStudentBatches([]);

    const student = students.find(s => s._id === studentId);
    if (student && student.batches && student.batches.length > 0) {
      // Use the batches directly from student data (includes batchId, courseName, coursePrice)
      const enrolledBatches = student.batches.map((b: any) => ({
        _id: b.batchId,
        batchName: b.batchName,
        courseId: {
          title: b.courseName,
          price: b.coursePrice || 0
        }
      }));

      setStudentBatches(enrolledBatches);

      // If only one batch, auto-select it
      if (enrolledBatches.length === 1) {
        const batch = enrolledBatches[0];
        setStudentForm(prev => ({
          ...prev,
          batchId: batch._id,
          totalFees: batch.courseId?.price || 0
        }));
      }
    }
  };

  // Handle batch selection (when multiple batches)
  const handleBatchSelect = (batchId: string) => {
    setStudentForm(prev => ({ ...prev, batchId }));

    const batch = studentBatches.find((b: any) => b._id === batchId);
    if (batch) {
      setStudentForm(prev => ({
        ...prev,
        batchId,
        totalFees: batch.courseId?.price || 0
      }));
    }
  };

  const handleCreateStudentPayment = async () => {
    if (!studentForm.studentId || !studentForm.batchId || !studentForm.paidAmount) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...studentForm,
          paymentForType: 'student',
          generatedBy: 'Admin'
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Payment created successfully');
        setIsCreateDialogOpen(false);
        resetForms();
        fetchPayments();
      } else {
        toast.error(data.error || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Failed to create payment');
    }
  };

  const handleCreateTrainerPayment = async () => {
    if (!trainerForm.trainerId || !trainerForm.amount) {
      toast.error('Please fill all required fields');
      return;
    }

    // For trainer payments, we would typically create a different record
    // For now, let's create a payment record with trainer info
    try {
      const trainer = trainers.find(t => t._id === trainerForm.trainerId);

      // Create a payment record for trainer salary/commission
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: trainerForm.trainerId, // Using trainerId as studentId for now
          batchId: 'trainer-payment',
          totalFees: trainerForm.amount,
          paidAmount: trainerForm.amount,
          paymentSource: trainerForm.paymentSource,
          transactionId: trainerForm.transactionId,
          transactionDetails: trainerForm.transactionDetails,
          paymentDate: trainerForm.paymentDate,
          remarks: `Trainer Payment: ${trainerForm.description}`,
          paymentForType: 'trainer',
          generatedBy: 'Admin'
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Trainer payment created successfully');
        setIsCreateDialogOpen(false);
        resetForms();
        fetchPayments();
      } else {
        toast.error(data.error || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Error creating trainer payment:', error);
      toast.error('Failed to create payment');
    }
  };

  const resetForms = () => {
    setStudentForm({
      studentId: '',
      batchId: '',
      totalFees: 0,
      paidAmount: 0,
      paymentSource: 'bank_transfer',
      transactionId: '',
      transactionDetails: '',
      paymentDate: new Date().toISOString().split('T')[0],
      remarks: ''
    });
    setTrainerForm({
      trainerId: '',
      amount: 0,
      paymentSource: 'bank_transfer',
      transactionId: '',
      transactionDetails: '',
      paymentDate: new Date().toISOString().split('T')[0],
      remarks: '',
      description: ''
    });
    setStudentBatches([]);
    setPaymentType('student');
  };

  const handleVerifyPayment = async (paymentId: string, status: string) => {
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          status,
          verifiedBy: 'Admin'
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Payment verified successfully');
        fetchPayments();
      } else {
        toast.error(data.error || 'Failed to verify payment');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Failed to verify payment');
    }
  };

  const openPayDueDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setPayDueForm({
      paidAmount: payment.dueAmount,
      paymentSource: 'bank_transfer',
      transactionId: '',
      paymentDate: new Date().toISOString().split('T')[0],
      remarks: ''
    });
    setIsPayDueDialogOpen(true);
  };

  const handlePayDue = async () => {
    if (!selectedPayment || !payDueForm.paidAmount) {
      toast.error('Please enter payment amount');
      return;
    }

    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedPayment.studentId,
          batchId: selectedPayment.batchId,
          totalFees: selectedPayment.totalFees,
          paidAmount: payDueForm.paidAmount,
          paymentSource: payDueForm.paymentSource,
          transactionId: payDueForm.transactionId,
          paymentDate: payDueForm.paymentDate,
          remarks: `Pay Due: ${payDueForm.remarks}`,
          paymentForType: selectedPayment.paymentForType || 'student',
          generatedBy: 'Admin',
          isInstallment: true,
          installmentNumber: selectedPayment.installmentNumber + 1
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Due payment created successfully');
        setIsPayDueDialogOpen(false);
        fetchPayments();
      } else {
        toast.error(data.error || 'Failed to create due payment');
      }
    } catch (error) {
      console.error('Error creating due payment:', error);
      toast.error('Failed to create due payment');
    }
  };

  const downloadInvoice = async (payment: Payment) => {
    try {
      const res = await fetch(`/api/payments/invoice/${payment._id}`);
      const data = await res.json();

      if (res.ok) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(data.data.invoiceHtml);
          printWindow.document.close();
          printWindow.print();
        }
      } else {
        toast.error('Failed to load invoice');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
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

  const viewPaymentDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsViewDialogOpen(true);
  };

  return (
    <LMSLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
            <p className="text-gray-600 mt-1">Manage student and trainer payments</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Payment
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
                <Clock className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
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
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, invoice, course..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              All Payments ({filteredPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>
                    <button className="flex items-center hover:text-gray-900" onClick={() => handleSort('studentName')}>
                      Name {getSortIcon('studentName')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center hover:text-gray-900" onClick={() => handleSort('courseName')}>
                      Course {getSortIcon('courseName')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center hover:text-gray-900" onClick={() => handleSort('paidAmount')}>
                      Amount {getSortIcon('paidAmount')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center hover:text-gray-900" onClick={() => handleSort('dueAmount')}>
                      Due {getSortIcon('dueAmount')}
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <button className="flex items-center hover:text-gray-900" onClick={() => handleSort('paymentDate')}>
                      Date {getSortIcon('paymentDate')}
                    </button>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map(payment => (
                    <TableRow key={payment._id}>
                      <TableCell className="font-medium">{payment.invoiceNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={payment.paymentForType === 'trainer' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}>
                          {payment.paymentForType === 'trainer' ? 'Trainer' : 'Student'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.studentName}</p>
                          <p className="text-sm text-gray-500">{payment.studentEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>{payment.courseName}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">₹{payment.paidAmount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">of ₹{payment.totalFees.toLocaleString()}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.dueAmount > 0 ? (
                          <span className="text-red-600 font-medium">₹{payment.dueAmount.toLocaleString()}</span>
                        ) : (
                          <span className="text-green-600">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.paymentStatus)}</TableCell>
                      <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => viewPaymentDetails(payment)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => downloadInvoice(payment)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          {payment.paymentStatus !== 'completed' && payment.dueAmount > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-orange-600 border-orange-300 hover:bg-orange-50"
                              onClick={() => openPayDueDialog(payment)}
                            >
                              <Wallet className="h-4 w-4" />
                            </Button>
                          )}
                          {payment.paymentStatus !== 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerifyPayment(payment._id, 'completed')}
                            >
                              <CheckCircle className="h-4 w-4" />
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

        {/* Create Payment Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) resetForms();
        }}>
          <DialogContent className="max-w-lg bg-white">
            <DialogHeader>
              <DialogTitle>Create Payment</DialogTitle>
              <DialogDescription>Select payment type and fill the details</DialogDescription>
            </DialogHeader>

            {/* Payment Type Selection */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Button
                variant={paymentType === 'student' ? 'default' : 'outline'}
                onClick={() => setPaymentType('student')}
                className="h-20 flex flex-col gap-2"
              >
                <User className="h-6 w-6" />
                <span>Student Payment</span>
              </Button>
              <Button
                variant={paymentType === 'trainer' ? 'default' : 'outline'}
                onClick={() => setPaymentType('trainer')}
                className="h-20 flex flex-col gap-2"
              >
                <GraduationCap className="h-6 w-6" />
                <span>Trainer Payment</span>
              </Button>
            </div>

            {/* Student Payment Form */}
            {paymentType === 'student' && (
              <div className="space-y-4">
                <div>
                  <Label>Select Student *</Label>
                  <Select value={studentForm.studentId} onValueChange={handleStudentSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(student => (
                        <SelectItem key={student._id} value={student._id}>
                          {student.name} ({student.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Select Batch/Course *</Label>
                  {studentBatches.length === 1 ? (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="font-medium">{studentBatches[0].batchName}</p>
                      <p className="text-sm text-gray-600">{studentBatches[0].courseId?.title}</p>
                      <p className="text-sm text-blue-600">₹{studentBatches[0].courseId?.price?.toLocaleString() || 0}</p>
                    </div>
                  ) : (
                    <Select
                      value={studentForm.batchId}
                      onValueChange={handleBatchSelect}
                      disabled={studentBatches.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={studentBatches.length === 0 ? "Select student first" : "Select batch"} />
                      </SelectTrigger>
                      <SelectContent>
                        {studentBatches.map((batch: any) => (
                          <SelectItem key={String(batch._id)} value={String(batch._id)}>
                            {batch.batchName} - {batch.courseId?.title || 'Unknown Course'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Total Fees (₹) *</Label>
                    <Input
                      type="number"
                      value={studentForm.totalFees}
                      onChange={e => setStudentForm(prev => ({ ...prev, totalFees: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Paid Amount (₹) *</Label>
                    <Input
                      type="number"
                      value={studentForm.paidAmount}
                      onChange={e => setStudentForm(prev => ({ ...prev, paidAmount: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Payment Source</Label>
                    <Select
                      value={studentForm.paymentSource}
                      onValueChange={value => setStudentForm(prev => ({ ...prev, paymentSource: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Payment Date</Label>
                    <Input
                      type="date"
                      value={studentForm.paymentDate}
                      onChange={e => setStudentForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Transaction ID</Label>
                  <Input
                    value={studentForm.transactionId}
                    onChange={e => setStudentForm(prev => ({ ...prev, transactionId: e.target.value }))}
                    placeholder="Enter transaction ID"
                  />
                </div>

                <div>
                  <Label>Remarks</Label>
                  <Input
                    value={studentForm.remarks}
                    onChange={e => setStudentForm(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Any remarks"
                  />
                </div>

                <Button onClick={handleCreateStudentPayment} className="w-full">
                  Create Student Payment
                </Button>
              </div>
            )}

            {/* Trainer Payment Form */}
            {paymentType === 'trainer' && (
              <div className="space-y-4">
                <div>
                  <Label>Select Trainer *</Label>
                  <Select value={trainerForm.trainerId} onValueChange={value => setTrainerForm(prev => ({ ...prev, trainerId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a trainer" />
                    </SelectTrigger>
                    <SelectContent>
                      {trainers.map(trainer => (
                        <SelectItem key={trainer._id} value={trainer._id}>
                          {trainer.name} ({trainer.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Amount (₹) *</Label>
                  <Input
                    type="number"
                    value={trainerForm.amount}
                    onChange={e => setTrainerForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    placeholder="Enter payment amount"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Input
                    value={trainerForm.description}
                    onChange={e => setTrainerForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., Monthly salary, Bonus, etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Payment Source</Label>
                    <Select
                      value={trainerForm.paymentSource}
                      onValueChange={value => setTrainerForm(prev => ({ ...prev, paymentSource: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Payment Date</Label>
                    <Input
                      type="date"
                      value={trainerForm.paymentDate}
                      onChange={e => setTrainerForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Transaction ID</Label>
                  <Input
                    value={trainerForm.transactionId}
                    onChange={e => setTrainerForm(prev => ({ ...prev, transactionId: e.target.value }))}
                    placeholder="Enter transaction ID"
                  />
                </div>

                <div>
                  <Label>Remarks</Label>
                  <Input
                    value={trainerForm.remarks}
                    onChange={e => setTrainerForm(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Any remarks"
                  />
                </div>

                <Button onClick={handleCreateTrainerPayment} className="w-full">
                  Create Trainer Payment
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

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
                    <p className="text-sm text-gray-500">Type</p>
                    <Badge variant="outline">
                      {selectedPayment.paymentForType === 'trainer' ? 'Trainer' : 'Student'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
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
                  {selectedPayment.transactionId && (
                    <div>
                      <p className="text-sm text-gray-500">Transaction ID</p>
                      <p className="font-medium">{selectedPayment.transactionId}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => selectedPayment && downloadInvoice(selectedPayment)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Invoice
                  </Button>
                  {selectedPayment.paymentStatus !== 'completed' && (
                    <Button
                      onClick={() => {
                        handleVerifyPayment(selectedPayment._id, 'completed');
                        setIsViewDialogOpen(false);
                      }}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Verify Payment
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Pay Due Dialog */}
        <Dialog open={isPayDueDialogOpen} onOpenChange={setIsPayDueDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Pay Due Amount</DialogTitle>
              <DialogDescription>
                Record payment for remaining due amount. Total Due: ₹{selectedPayment?.dueAmount?.toLocaleString() || 0}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Amount to Pay (₹) *</Label>
                <Input
                  type="number"
                  value={payDueForm.paidAmount}
                  onChange={e => setPayDueForm(prev => ({ ...prev, paidAmount: Number(e.target.value) }))}
                  placeholder="Enter amount"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payment Source</Label>
                  <Select
                    value={payDueForm.paymentSource}
                    onValueChange={value => setPayDueForm(prev => ({ ...prev, paymentSource: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment Date</Label>
                  <Input
                    type="date"
                    value={payDueForm.paymentDate}
                    onChange={e => setPayDueForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Transaction ID</Label>
                <Input
                  value={payDueForm.transactionId}
                  onChange={e => setPayDueForm(prev => ({ ...prev, transactionId: e.target.value }))}
                  placeholder="Enter transaction ID"
                />
              </div>

              <div>
                <Label>Remarks</Label>
                <Input
                  value={payDueForm.remarks}
                  onChange={e => setPayDueForm(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Any remarks"
                />
              </div>

              <Button onClick={handlePayDue} className="w-full">
                <Wallet className="w-4 h-4 mr-2" />
                Pay Due Amount
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </LMSLayout>
  );
};

export default PaymentManagement;