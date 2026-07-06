import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import StudentLayout from '@/src/student/common/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  FileText,
  Download,
  CreditCard,
  Plus,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Payment {
  _id: string;
  invoiceNumber: string;
  courseName: string;
  totalFees: number;
  paidAmount: number;
  dueAmount: number;
  paymentDate: string;
  paymentSource: string;
  paymentStatus: string;
  installmentNumber: number;
  isInstallment: boolean;
}

interface BatchPayment {
  batchId: string;
  courseName: string;
  totalFees: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: string;
  latestInvoice: string;
  installmentCount: number;
  lastPaymentDate: string;
}

interface Summary {
  totalPaid: number;
  totalFees: number;
  totalDue: number;
  paymentCount: number;
}

const StudentInvoices = () => {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [batchPayments, setBatchPayments] = useState<BatchPayment[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalPaid: 0,
    totalFees: 0,
    totalDue: 0,
    paymentCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [studentId, setStudentId] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  useEffect(() => {
    const storedData = localStorage.getItem('student');
    if (!storedData) {
      router.push('/student/login');
      return;
    }

    const student = JSON.parse(storedData);
    setStudentId(student._id || student.studentId);
    fetchPayments(student._id || student.studentId);
  }, []);

  const fetchPayments = async (studentId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/payments/student?studentId=${studentId}`);
      const data = await res.json();

      if (res.ok) {
        setPayments(data.data.payments);
        setBatchPayments(data.data.batchPayments);
        setSummary(data.data.summary);
      } else {
        toast.error(data.error || 'Failed to fetch payments');
      }
    } catch (error) {
      console.error('Payments fetch error:', error);
      toast.error('Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
      case 'pending':
        return <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const viewInvoice = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsViewDialogOpen(true);
  };

  const downloadInvoice = async (payment: Payment) => {
    try {
      const res = await fetch(`/api/payments/invoice/${payment._id}`);
      const data = await res.json();

      if (res.ok) {
        // Open invoice in new window for printing
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

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="p-6 flex items-center justify-center">
          <p className="text-gray-600">Loading invoices...</p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">My Payments</h1>
          <p className="text-blue-100 mt-2">View and manage your payment history and invoices</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">₹{summary.totalPaid.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Fees</p>
                  <p className="text-2xl font-bold text-blue-600">₹{summary.totalFees.toLocaleString()}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Due</p>
                  <p className="text-2xl font-bold text-red-600">₹{summary.totalDue.toLocaleString()}</p>
                </div>
                <Clock className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Installments</p>
                  <p className="text-2xl font-bold text-purple-600">{summary.paymentCount}</p>
                </div>
                <CreditCard className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course-wise Payment Summary */}
        {batchPayments.length > 0 && (
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Course-wise Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {batchPayments.map((batch) => (
                  <div key={batch.batchId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-900">{batch.courseName}</h3>
                      {getStatusBadge(batch.paymentStatus)}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Fees:</span>
                        <span className="font-medium">₹{batch.totalFees.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Paid:</span>
                        <span className="font-medium text-green-600">₹{batch.paidAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Due:</span>
                        <span className="font-medium text-red-600">₹{batch.dueAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Installments:</span>
                        <span className="font-medium">{batch.installmentCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Payment History ({payments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No payments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-gray-600 font-medium p-3">Invoice #</th>
                      <th className="text-left text-gray-600 font-medium p-3">Course</th>
                      <th className="text-left text-gray-600 font-medium p-3">Installment</th>
                      <th className="text-left text-gray-600 font-medium p-3">Amount</th>
                      <th className="text-left text-gray-600 font-medium p-3">Due</th>
                      <th className="text-left text-gray-600 font-medium p-3">Date</th>
                      <th className="text-left text-gray-600 font-medium p-3">Status</th>
                      <th className="text-left text-gray-600 font-medium p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment._id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-3 text-gray-900 font-medium">{payment.invoiceNumber}</td>
                        <td className="p-3 text-gray-900">{payment.courseName}</td>
                        <td className="p-3 text-gray-600">#{payment.installmentNumber}</td>
                        <td className="p-3 text-green-600 font-medium">
                          ₹{payment.paidAmount.toLocaleString()}
                        </td>
                        <td className="p-3 text-red-600 font-medium">
                          ₹{payment.dueAmount.toLocaleString()}
                        </td>
                        <td className="p-3 text-gray-900">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          {getStatusBadge(payment.paymentStatus)}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewInvoice(payment)}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadInvoice(payment)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Invoice Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Invoice - {selectedPayment?.invoiceNumber}</DialogTitle>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                    <p className="text-sm text-gray-500">Amount Paid</p>
                    <p className="font-medium text-green-600">₹{selectedPayment.paidAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Due Amount</p>
                    <p className="font-medium text-red-600">₹{selectedPayment.dueAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Date</p>
                    <p className="font-medium">{new Date(selectedPayment.paymentDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="font-medium capitalize">{selectedPayment.paymentSource}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    {getStatusBadge(selectedPayment.paymentStatus)}
                  </div>
                </div>

                <Button
                  onClick={() => downloadInvoice(selectedPayment)}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Invoice
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </StudentLayout>
  );
};

export default StudentInvoices;