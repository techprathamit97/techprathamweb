import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TrainerLayout from '@/src/trainer/common/TrainerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Users,
  Search,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Eye,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface StudentPaymentStatus {
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseName: string;
  totalFees: number;
  totalPaid: number;
  dueAmount: number;
  paymentStatus: string;
  lastPaymentDate: string | null;
}

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
}

const TrainerPaymentStatus = () => {
  const router = useRouter();

  const [studentStatus, setStudentStatus] = useState<StudentPaymentStatus[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trainerId, setTrainerId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentPaymentStatus | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  useEffect(() => {
    const storedData = localStorage.getItem('trainer');
    if (!storedData) {
      router.push('/trainer/login');
      return;
    }

    const trainer = JSON.parse(storedData);
    setTrainerId(trainer._id || trainer.trainerId);
    fetchPaymentData(trainer._id || trainer.trainerId);
  }, []);

  const fetchPaymentData = async (trainerId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/payments/trainer?trainerId=${trainerId}`);
      const data = await res.json();

      if (res.ok) {
        setStudentStatus(data.data.studentStatus);
        setPayments(data.data.payments);
      } else {
        toast.error(data.error || 'Failed to fetch payment data');
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'pending':
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
    }
  };

  const viewStudentDetails = (student: StudentPaymentStatus) => {
    setSelectedStudent(student);
    setIsViewDialogOpen(true);
  };

  const filteredStudents = studentStatus.filter(s =>
    s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.courseName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paidCount = studentStatus.filter(s => s.paymentStatus === 'completed').length;
  const pendingCount = studentStatus.filter(s => s.paymentStatus === 'pending').length;
  const partialCount = studentStatus.filter(s => s.paymentStatus !== 'completed' && s.paymentStatus !== 'pending').length;

  if (isLoading) {
    return (
      <TrainerLayout>
        <div className="p-6 flex items-center justify-center">
          <p className="text-gray-600">Loading payment data...</p>
        </div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">Student Payment Status</h1>
          <p className="text-blue-100 mt-2">View payment status of your enrolled students</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-blue-600">{studentStatus.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Fully Paid</p>
                  <p className="text-2xl font-bold text-green-600">{paidCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Partial Payment</p>
                  <p className="text-2xl font-bold text-yellow-600">{partialCount}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Payment</p>
                  <p className="text-2xl font-bold text-red-600">{pendingCount}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, course..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Status Table */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Student Payment Overview ({filteredStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Total Fees</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map(student => (
                    <TableRow key={student.studentId}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{student.studentName}</p>
                          <p className="text-sm text-gray-500">{student.studentEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>{student.courseName}</TableCell>
                      <TableCell className="font-medium">₹{student.totalFees.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600">₹{student.totalPaid.toLocaleString()}</TableCell>
                      <TableCell className={student.dueAmount > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                        {student.dueAmount > 0 ? `₹${student.dueAmount.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(student.paymentStatus)}</TableCell>
                      <TableCell>
                        {student.lastPaymentDate
                          ? new Date(student.lastPaymentDate).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => viewStudentDetails(student)}>
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

        {/* View Student Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Payment Details - {selectedStudent?.studentName}</DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedStudent.studentEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Course</p>
                    <p className="font-medium">{selectedStudent.courseName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Fees</p>
                    <p className="font-medium">₹{selectedStudent.totalFees.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount Paid</p>
                    <p className="font-medium text-green-600">₹{selectedStudent.totalPaid.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Due Amount</p>
                    <p className="font-medium text-red-600">₹{selectedStudent.dueAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Status</p>
                    {getStatusBadge(selectedStudent.paymentStatus)}
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Note</p>
                    <p className="text-sm text-gray-600">
                      Contact the administration for payment-related queries.
                      Do not share payment details with students.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TrainerLayout>
  );
};

export default TrainerPaymentStatus;