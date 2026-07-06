import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TrainerLayout from '@/src/trainer/common/TrainerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Search, 
  Filter, 
  BookOpen, 
  Calendar, 
  Mail, 
  Phone, 
  TrendingUp,
  CheckCircle,
  Clock,
  DollarSign,
  Award,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface Student {
  studentId: string;
  name: string;
  email: string;
  phone: string;
  course_title: string;
  course_desc: string;
  category: string;
  level: string;
  duration: string;
  progressPercentage: number;
  courseCompletion: boolean;
  enrolledDate: string;
  lastAccessedAt: string | null;
  batches: Array<{
    batchId: string;
    course_title: string;
    status: string;
    schedule: any;
    meetingLink: string;
  }>;
  invoices: Array<{
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    status: string;
    invoiceDate: string;
    courseTitle: string;
  }>;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: string;
  quizScores: any[];
  verifyPayment: boolean;
  feeType: string;
}

interface StudentsData {
  trainer: {
    trainerId: string;
    name: string;
    email: string;
    phone: string;
    experience: string;
    rating: number;
  };
  students: Student[];
  batches: any[];
  studentsByBatch: Array<{
    batchId: string;
    course_title: string;
    status: string;
    schedule: any;
    capacity: number;
    students: Student[];
  }>;
  stats: {
    totalStudents: number;
    completedStudents: number;
    inProgressStudents: number;
    totalRevenue: number;
    collectedRevenue: number;
    pendingRevenue: number;
    totalBatches: number;
  };
}

const TrainerStudents = () => {
  const router = useRouter();
  const [trainerData, setTrainerData] = useState<any>(null);
  const [studentsData, setStudentsData] = useState<StudentsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in-progress'>('all');
  const [filterBatch, setFilterBatch] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'all' | 'by-batch'>('all');

  useEffect(() => {
    const storedData = localStorage.getItem('trainer');
    if (!storedData) {
      router.push('/trainer/login');
      return;
    }

    const trainer = JSON.parse(storedData);
    setTrainerData(trainer);
    fetchStudentsData(trainer.trainerId);
  }, []);

  const fetchStudentsData = async (trainerId: string) => {
    setIsLoading(true);
    try {
      console.log('Fetching students for trainer:', trainerId);
      const res = await fetch(`/api/trainer/students?trainerId=${trainerId}`);
      const data = await res.json();

      console.log('Students API response:', data);

      if (res.ok) {
        setStudentsData(data.data);
      } else {
        console.error('Students API error:', data);
        toast.error(data.error || 'Failed to fetch students data');
      }
    } catch (error) {
      console.error('Students fetch error:', error);
      toast.error('Failed to load students data');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = studentsData?.students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'completed' && student.courseCompletion) ||
                         (filterStatus === 'in-progress' && !student.courseCompletion);
    
    const matchesBatch = filterBatch === 'all' || 
                        student.batches.some(batch => batch.batchId === filterBatch);
    
    return matchesSearch && matchesStatus && matchesBatch;
  }) || [];

  if (isLoading || !trainerData || !studentsData) {
    return (
      <TrainerLayout>
        <div className="p-6 flex items-center justify-center">
          <div className="text-gray-900">Loading students...</div>
        </div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">My Students</h1>
          <p className="text-green-100 mt-2">Manage and track your students' progress</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Students</p>
                  <p className="text-3xl font-bold text-gray-900">{studentsData.stats.totalStudents}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Completed</p>
                  <p className="text-3xl font-bold text-gray-900">{studentsData.stats.completedStudents}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">In Progress</p>
                  <p className="text-3xl font-bold text-gray-900">{studentsData.stats.inProgressStudents}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{studentsData.stats.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="in-progress">In Progress</option>
                </select>

                <select
                  value={filterBatch}
                  onChange={(e) => setFilterBatch(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Batches</option>
                  {studentsData.batches.map(batch => (
                    <option key={batch.batchId} value={batch.batchId}>
                      {batch.batchId} - {batch.course_title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'all' ? 'default' : 'outline'}
                  onClick={() => setViewMode('all')}
                  size="sm"
                >
                  All Students
                </Button>
                <Button
                  variant={viewMode === 'by-batch' ? 'default' : 'outline'}
                  onClick={() => setViewMode('by-batch')}
                  size="sm"
                >
                  By Batch
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Display */}
        {viewMode === 'all' ? (
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                All Students ({filteredStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No students found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredStudents.map((student) => (
                    <div key={student.studentId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        {/* Student Info */}
                        <div className="space-y-2">
                          <h3 className="font-semibold text-gray-900">{student.name}</h3>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {student.studentId}
                            </p>
                            <p className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {student.email}
                            </p>
                            <p className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {student.phone}
                            </p>
                          </div>
                        </div>

                        {/* Course Info */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900">Course Details</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><span className="font-medium">Course:</span> {student.course_title}</p>
                            <p><span className="font-medium">Category:</span> {student.category}</p>
                            <p><span className="font-medium">Level:</span> {student.level}</p>
                            <p><span className="font-medium">Duration:</span> {student.duration}</p>
                          </div>
                        </div>

                        {/* Progress & Status */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900">Progress</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Completion</span>
                              <span className="font-medium">{student.progressPercentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full transition-all"
                                style={{ width: `${student.progressPercentage}%` }}
                              />
                            </div>
                            <Badge className={student.courseCompletion ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}>
                              {student.courseCompletion ? 'Completed' : 'In Progress'}
                            </Badge>
                          </div>
                        </div>

                        {/* Payment Info */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900">Payment</h4>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">Total:</span> ₹{student.totalAmount.toLocaleString()}</p>
                            <p><span className="font-medium">Paid:</span> ₹{student.paidAmount.toLocaleString()}</p>
                            {student.pendingAmount > 0 && (
                              <p><span className="font-medium">Pending:</span> ₹{student.pendingAmount.toLocaleString()}</p>
                            )}
                            <Badge className={
                              student.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 border-green-200' :
                              student.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                              'bg-red-100 text-red-700 border-red-200'
                            }>
                              {student.paymentStatus.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Batches */}
                      {student.batches.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="font-medium text-gray-900 mb-2">Enrolled Batches</h4>
                          <div className="flex flex-wrap gap-2">
                            {student.batches.map((batch, index) => (
                              <div key={index} className="bg-gray-100 rounded-lg p-2 text-sm">
                                <p className="font-medium">{batch.batchId}</p>
                                <p className="text-gray-600">{batch.status}</p>
                                {batch.meetingLink && batch.status === 'ongoing' && (
                                  <Button
                                    size="sm"
                                    className="mt-1 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => window.open(batch.meetingLink, '_blank')}
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Join Class
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          // By Batch View
          <div className="space-y-6">
            {studentsData.studentsByBatch.map((batchGroup) => (
              <Card key={batchGroup.batchId} className="border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-gray-900 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        {batchGroup.course_title}
                      </CardTitle>
                      <p className="text-gray-600 text-sm mt-1">Batch: {batchGroup.batchId}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={
                        batchGroup.status === 'ongoing' ? 'bg-green-100 text-green-700 border-green-200' :
                        batchGroup.status === 'upcoming' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }>
                        {batchGroup.status}
                      </Badge>
                      <Badge variant="outline">
                        {batchGroup.students.length}/{batchGroup.capacity} Students
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {batchGroup.students.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No students in this batch</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left text-gray-600 font-medium p-3">Student</th>
                            <th className="text-left text-gray-600 font-medium p-3">Contact</th>
                            <th className="text-left text-gray-600 font-medium p-3">Progress</th>
                            <th className="text-left text-gray-600 font-medium p-3">Payment</th>
                            <th className="text-left text-gray-600 font-medium p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchGroup.students.map((student) => (
                            <tr key={student.studentId} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-3">
                                <div>
                                  <p className="text-gray-900 font-medium">{student.name}</p>
                                  <p className="text-gray-600 text-xs">{student.studentId}</p>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="text-xs">
                                  <p>{student.email}</p>
                                  <p>{student.phone}</p>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-green-600 h-2 rounded-full"
                                      style={{ width: `${student.progressPercentage}%` }}
                                    />
                                  </div>
                                  <span className="text-xs">{student.progressPercentage}%</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="text-xs">
                                  <p>₹{student.paidAmount.toLocaleString()}/₹{student.totalAmount.toLocaleString()}</p>
                                  <Badge className={
                                    student.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 border-green-200' :
                                    'bg-red-100 text-red-700 border-red-200'
                                  }>
                                    {student.paymentStatus}
                                  </Badge>
                                </div>
                              </td>
                              <td className="p-3">
                                <Badge className={student.courseCompletion ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}>
                                  {student.courseCompletion ? 'Completed' : 'In Progress'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TrainerLayout>
  );
};

export default TrainerStudents;
