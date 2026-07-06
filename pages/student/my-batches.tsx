import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import StudentLayout from '@/src/student/common/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Calendar, 
  Clock, 
  Star, 
  Mail, 
  Phone, 
  BookOpen,
  GraduationCap,
  DollarSign,
  ExternalLink,
  User,
  Award,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface BatchData {
  batchId: string;
  courseTitle: string;
  courseLink: string;
  status: string;
  capacity: number;
  enrolledStudentsCount: number;
  meetingLink: string;
  description: string;
  schedule: {
    startDate: string;
    endDate: string;
    timing: string;
    days: string[];
    duration: string;
  };
  trainer: {
    name: string;
    email: string;
    phone: string;
    profile: string;
    experience: string;
    rating: number;
    courseExpertise: string;
    batchesHandled: number;
    totalStudentsHandled: number;
    coursesHandled: string[];
  };
  courseDetails: {
    category: string;
    level: string;
    duration: string;
    link: string;
  };
  studentProgress: {
    progressPercentage: number;
    courseCompletion: boolean;
    lastAccessedAt: string | null;
    quizScores: any[];
  };
  paymentInfo: {
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    paymentStatus: string;
    invoiceDate: string;
  } | null;
  enrollmentStatus: {
    isDirectlyEnrolled: boolean;
    hasInvoice: boolean;
    hasEnrolledRecord: boolean;
    enrollmentMethod: string;
  };
}

interface TrainerSummary {
  name: string;
  email: string;
  phone: string;
  totalBatches: number;
  totalStudents: number;
  courses: string[];
  avgRating: number;
}

interface BatchesData {
  studentInfo: {
    studentId: string;
    name: string;
    email: string;
    phone: string;
  };
  summary: {
    totalBatches: number;
    totalTrainers: number;
    totalCourses: number;
  };
  batches: BatchData[];
  trainers: TrainerSummary[];
  courseNames: string[];
}

const MyBatches = () => {
  const router = useRouter();
  const [batchesData, setBatchesData] = useState<BatchesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'batches' | 'trainers'>('batches');

  useEffect(() => {
    const storedData = localStorage.getItem('student');
    if (!storedData) {
      router.push('/student/login');
      return;
    }

    const student = JSON.parse(storedData);
    fetchBatchesData(student.studentId);
  }, []);

  const fetchBatchesData = async (studentId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/student/batches-with-trainers?studentId=${studentId}`);
      const data = await res.json();

      if (res.ok) {
        console.log('Batches data received:', data.data);
        setBatchesData(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch batches data');
      }
    } catch (error) {
      console.error('Batches fetch error:', error);
      toast.error('Failed to load batches data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !batchesData) {
    return (
      <StudentLayout>
        <div className="p-6 flex items-center justify-center">
          <p className="text-gray-600">Loading batches...</p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="p-6 space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">My Batches & Trainers</h1>
          <p className="text-blue-100 mt-2">Complete overview of your enrolled batches and trainer details</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{batchesData.summary.totalBatches}</p>
              <p className="text-gray-600 text-sm">Total Batches</p>
            </CardContent>
          </Card>
          
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-6 text-center">
              <GraduationCap className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{batchesData.summary.totalTrainers}</p>
              <p className="text-gray-600 text-sm">Total Trainers</p>
            </CardContent>
          </Card>
          
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-6 text-center">
              <BookOpen className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{batchesData.summary.totalCourses}</p>
              <p className="text-gray-600 text-sm">Total Courses</p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('batches')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'batches'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Batches ({batchesData.batches.length})
          </button>
          <button
            onClick={() => setActiveTab('trainers')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'trainers'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Trainers ({batchesData.trainers.length})
          </button>
        </div>

        {/* Batches Tab */}
        {activeTab === 'batches' && (
          <div className="space-y-6">
            {batchesData.batches.length === 0 ? (
              <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500">No batches found</p>
                </CardContent>
              </Card>
            ) : (
              batchesData.batches.map((batch, index) => (
                <Card key={index} className="border-gray-200 shadow-sm">
                  <CardHeader className="border-b border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-gray-900 flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-blue-600" />
                          {batch.courseTitle}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">Batch ID: {batch.batchId}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={
                          batch.status === 'ongoing' ? 'bg-green-100 text-green-700' :
                          batch.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {batch.status}
                        </Badge>
                        {batch.paymentInfo && (
                          <Badge className={
                            batch.paymentInfo.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                            batch.paymentInfo.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }>
                            {batch.paymentInfo.paymentStatus.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Course & Schedule Info */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          Course & Schedule
                        </h3>
                        <div className="space-y-2 text-sm">
                          <p><span className="font-medium">Category:</span> {batch.courseDetails.category}</p>
                          <p><span className="font-medium">Level:</span> {batch.courseDetails.level}</p>
                          <p><span className="font-medium">Duration:</span> {batch.courseDetails.duration}</p>
                          <p><span className="font-medium">Timing:</span> {batch.schedule.timing}</p>
                          <p><span className="font-medium">Days:</span> {batch.schedule.days.join(', ')}</p>
                          <p><span className="font-medium">Start Date:</span> {new Date(batch.schedule.startDate).toLocaleDateString()}</p>
                          <p><span className="font-medium">End Date:</span> {new Date(batch.schedule.endDate).toLocaleDateString()}</p>
                          <p><span className="font-medium">Capacity:</span> {batch.enrolledStudentsCount}/{batch.capacity}</p>
                        </div>
                      </div>

                      {/* Trainer Info */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <User className="h-4 w-4 text-green-600" />
                          Trainer Details
                        </h3>
                        <div className="space-y-2 text-sm">
                          <p><span className="font-medium">Name:</span> {batch.trainer.name}</p>
                          <p className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {batch.trainer.email}
                          </p>
                          <p className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {batch.trainer.phone}
                          </p>
                          <p><span className="font-medium">Experience:</span> {batch.trainer.experience}</p>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            <span className="font-medium">{batch.trainer.rating}</span>
                          </div>
                          <p><span className="font-medium">Batches Handled:</span> {batch.trainer.batchesHandled}</p>
                          <p><span className="font-medium">Students Handled:</span> {batch.trainer.totalStudentsHandled}</p>
                        </div>
                      </div>

                      {/* Progress & Payment */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-purple-600" />
                          Progress & Payment
                        </h3>
                        <div className="space-y-3">
                          {/* Progress */}
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Progress</span>
                              <span className="font-medium">{batch.studentProgress.progressPercentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${batch.studentProgress.progressPercentage}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Status: {batch.studentProgress.courseCompletion ? 'Completed' : 'In Progress'}
                            </p>
                          </div>

                          {/* Payment Info */}
                          {batch.paymentInfo && (
                            <div className="bg-gray-50 p-3 rounded">
                              <p className="text-xs font-medium text-gray-800 mb-1">Payment Details:</p>
                              <div className="space-y-1 text-xs">
                                <p><span className="font-medium">Invoice:</span> {batch.paymentInfo.invoiceNumber}</p>
                                <p><span className="font-medium">Total:</span> ₹{batch.paymentInfo.totalAmount.toLocaleString()}</p>
                                <p><span className="font-medium">Paid:</span> ₹{batch.paymentInfo.paidAmount.toLocaleString()}</p>
                                {batch.paymentInfo.pendingAmount > 0 && (
                                  <p><span className="font-medium">Pending:</span> ₹{batch.paymentInfo.pendingAmount.toLocaleString()}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Quiz Scores */}
                          {batch.studentProgress.quizScores.length > 0 && (
                            <div className="bg-blue-50 p-3 rounded">
                              <p className="text-xs font-medium text-blue-800 mb-1">Quiz Scores:</p>
                              <div className="space-y-1">
                                {batch.studentProgress.quizScores.map((quiz, qIndex) => (
                                  <div key={qIndex} className="flex justify-between text-xs">
                                    <span>Quiz {qIndex + 1}</span>
                                    <span className={quiz.passed ? 'text-green-600' : 'text-red-600'}>
                                      {quiz.score}% {quiz.passed ? '✓' : '✗'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex gap-3">
                      {batch.meetingLink && (
                        <Button
                          onClick={() => window.open(batch.meetingLink, '_blank')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Join Class
                        </Button>
                      )}
                      {batch.courseLink && (
                        <Button
                          variant="outline"
                          onClick={() => window.open(batch.courseLink, '_blank')}
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          Course Material
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Trainers Tab */}
        {activeTab === 'trainers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {batchesData.trainers.length === 0 ? (
              <Card className="border-gray-200 shadow-sm md:col-span-2">
                <CardContent className="p-6 text-center">
                  <p className="text-gray-500">No trainers found</p>
                </CardContent>
              </Card>
            ) : (
              batchesData.trainers.map((trainer, index) => (
                <Card key={index} className="border-gray-200 shadow-sm">
                  <CardHeader className="border-b border-gray-200">
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-green-600" />
                      {trainer.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Contact Info */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                        <div className="space-y-1 text-sm">
                          <p className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            {trainer.email}
                          </p>
                          <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            {trainer.phone}
                          </p>
                        </div>
                      </div>

                      {/* Statistics */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Statistics</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="text-center p-3 bg-blue-50 rounded">
                            <p className="text-xl font-bold text-blue-600">{trainer.totalBatches}</p>
                            <p className="text-gray-600">Batches</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded">
                            <p className="text-xl font-bold text-green-600">{trainer.totalStudents}</p>
                            <p className="text-gray-600">Students</p>
                          </div>
                        </div>
                        <div className="mt-2 text-center p-3 bg-yellow-50 rounded">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="text-lg font-bold text-yellow-600">{trainer.avgRating}</span>
                          </div>
                          <p className="text-gray-600 text-sm">Rating</p>
                        </div>
                      </div>

                      {/* Courses */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Courses Handled</h4>
                        <div className="space-y-1">
                          {trainer.courses.map((course, courseIndex) => (
                            <Badge key={courseIndex} variant="outline" className="mr-1 mb-1">
                              {course}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default MyBatches;