import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import StudentLayout from '@/src/student/common/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  CheckCircle,
  PlayCircle,
  TrendingUp,
  Calendar,
  Clock,
  Award,
  Bell,
  FileText,
  DollarSign,
  Target,
  User,
  LogOut,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface StudentData {
  _id: string;
  studentId: string;
  name: string;
  email: string;
  phone: string;
  enrollmentDate: string;
  isActive: boolean;
  batches: string[];
}

interface EnrolledCourse {
  _id: string;
  course_title: string;
  course_link: string;
  batchId: string;
  trainerId: string;
  progressPercentage: number;
  courseCompletion: boolean;
  totalAmount: number;
  verifyPayment: boolean;
  createdAt: string;
  category?: string;
  duration?: string;
  level?: string;
  studentId?: string;
  batchInfo?: {
    batchId: string;
    course_title: string;
    trainerId: string;
    schedule: {
      startDate: string;
      endDate: string;
      timing: string;
      days: string[];
    };
    capacity: number;
    enrolled_students: string[];
    status: string;
    meetingLink: string;
    trainer: {
      trainerId: string;
      name: string;
      email: string;
      phone: string;
      profile: string;
      experience: string;
      rating: number;
      bio: string;
      expertise: string[];
      linkedIn: string;
      github: string;
      portfolio: string;
    };
  };
}

interface Batch {
  batchId: string;
  course_title: string;
  trainer: {
    name: string;
    email: string;
  };
  schedule: {
    startDate: string;
    endDate: string;
    timing: string;
    days: string[];
  };
  meetingLink: string;
  status: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: string;
  invoiceDate: string;
  courseDetails: {
    title: string;
  };
}

interface Certificate {
  _id: string;
  certificateId: string;
  courseName: string;
  completionDate: string;
  grade: string;
  score: number;
  status: string;
}

interface QuizAttempt {
  _id: string;
  quizTitle: string;
  quizCategory: string;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  passed: boolean;
  completedAt: string;
}

interface AvailableQuiz {
  _id: string;
  title: string;
  totalMarks: number;
  passingMarks: number;
  dueDate: string;
  questionsCount: number;
  status: string;
  score: number | null;
  attemptedAt: string | null;
}

interface UpcomingClass {
  batchId: string;
  courseTitle: string;
  timing: string;
  days: string[];
  meetingLink: string;
  trainerName: string;
}

// New interfaces for completed recordings and scheduled classes
interface Recording {
  _id: string;
  url: string;
  title: string;
  description: string;
  duration: number;
  uploadedAt: string;
  uploadedBy: string;
}

interface CompletedRecording {
  _id: string;
  moduleTitle: string;
  moduleDescription: string;
  moduleIndex: number;
  scheduledDate: string;
  scheduledTime: string;
  recordings: Recording[];
}

interface ScheduledClass {
  _id: string;
  moduleTitle: string;
  moduleIndex: number;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  meetingLink: string;
  roomId: string;
  status: string;
  canJoin: boolean;
  isLive: boolean;
  // BigBlueButton fields
  bbbMeetingId?: string;
  bbbJoinUrl?: string;
}

interface DashboardData {
  enrolledCourses: EnrolledCourse[];
  batches: Batch[];
  invoices: Invoice[];
  certificates: Certificate[];
  quizAttempts: QuizAttempt[];
  availableQuizzes: AvailableQuiz[];
  upcomingClasses: UpcomingClass[];
  completedRecordings: CompletedRecording[];
  scheduledClasses: ScheduledClass[];
  stats: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    avgProgress: number;
    totalInvoices: number;
    paidInvoices: number;
    pendingInvoices: number;
    totalPaid: number;
    totalPending: number;
    totalCertificates: number;
    issuedCertificates: number;
    pendingCertificates: number;
    totalQuizzes: number;
    passedQuizzes: number;
    avgQuizScore: number;
  };
}

const StudentDashboard = () => {
  const router = useRouter();
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recordingModal, setRecordingModal] = useState<{ open: boolean; url: string; title: string }>({ open: false, url: '', title: '' });

  useEffect(() => {
    // Check if student is logged in
    const storedData = localStorage.getItem('student');
    if (!storedData) {
      router.push('/student/login');
      return;
    }

    try {
      const student = JSON.parse(storedData);
      setStudentData(student);
      fetchDashboardData(student.studentId);
    } catch (error) {
      console.error('Error parsing student data:', error);
      localStorage.removeItem('student');
      router.push('/student/login');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('student');
    toast.success('Logged out successfully');
    router.push('/student/login');
  };

  const fetchDashboardData = async (studentId: string) => {
    setIsLoading(true);
    try {
      console.log('Fetching dashboard data for student:', studentId);
      
      // First, let's check what batches exist and their enrolled students
      const batchesRes = await fetch('/api/lms/batches');
      const batchesData = await batchesRes.json();
      console.log('All batches:', batchesData);
      
      const res = await fetch(`/api/student/dashboard?studentId=${studentId}`);
      const data = await res.json();

      console.log('Dashboard API response:', data);

      if (res.ok) {
        setDashboardData(data.data);
        console.log('Dashboard data set successfully:', data.data);
        console.log('Enrolled courses with batch info:', data.data.enrolledCourses);
        console.log('Batches data:', data.data.batches);
      } else {
        console.error('Dashboard API error:', data);
        toast.error(data.error || 'Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !studentData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading batches...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">
          <p>No dashboard data available</p>
          <button 
            onClick={() => fetchDashboardData(studentData.studentId)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <StudentLayout>
      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">Welcome back, {studentData.name}!</h1>
          <p className="text-blue-100 mt-2">Continue your learning journey</p>
        </div>

        {/* Stats Cards - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Courses</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.totalCourses}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Completed</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.completedCourses}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Certificates</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.issuedCertificates}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Avg Progress</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.avgProgress}%</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards - Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Paid</p>
                  <p className="text-2xl font-bold text-gray-900">₹{dashboardData.stats.totalPaid.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">{dashboardData.stats.paidInvoices} invoices</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Pending Amount</p>
                  <p className="text-2xl font-bold text-gray-900">₹{dashboardData.stats.totalPending.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">{dashboardData.stats.pendingInvoices} pending</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-red-600" />
                </div>
              </div>
              {dashboardData.stats.totalPending > 0 && (
                <Button
                  className="w-full mt-4 bg-red-600 hover:bg-red-700"
                  onClick={() => router.push('/student/invoices')}
                >
                  Pay Due Now
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Quiz Performance</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.avgQuizScore}%</p>
                  <p className="text-xs text-gray-500 mt-1">{dashboardData.stats.passedQuizzes}/{dashboardData.stats.totalQuizzes} passed</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Completed Class Recordings */}
        

        {/* Scheduled Classes */}
       

        {/* My Courses */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              My Courses & Batches
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {dashboardData.enrolledCourses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No courses enrolled yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {dashboardData.enrolledCourses.map((course) => {
                  const batchInfo = course.batchInfo;
                  
                  return (
                    <div 
                      key={course._id} 
                      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      {/* Course Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-gray-900 font-semibold text-xl">{course.course_title}</h3>
                          <p className="text-gray-600 text-sm mt-1">Category: {course.category}</p>
                        </div>
                        <Badge className={course.courseCompletion ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}>
                          {course.courseCompletion ? 'Completed' : 'In Progress'}
                        </Badge>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Course Progress</span>
                          <span className="text-gray-900 font-medium">{course.progressPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-blue-600 h-3 rounded-full transition-all"
                            style={{ width: `${course.progressPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Batch Information */}
                      {batchInfo && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="text-gray-900 font-medium mb-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            Batch Information
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Batch ID</p>
                              <p className="text-gray-900 font-medium">{batchInfo.batchId}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Status</p>
                              <Badge className={
                                batchInfo.status === 'ongoing' ? 'bg-green-100 text-green-700 border-green-200' :
                                batchInfo.status === 'upcoming' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                'bg-gray-100 text-gray-700 border-gray-200'
                              }>
                                {batchInfo.status.toUpperCase()}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-gray-600">Schedule</p>
                              <p className="text-gray-900 font-medium">{batchInfo.schedule.timing}</p>
                              <p className="text-gray-500 text-xs">{batchInfo.schedule.days.join(', ')}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Duration</p>
                              <p className="text-gray-900 font-medium">
                                {new Date(batchInfo.schedule.startDate).toLocaleDateString()} - 
                                {new Date(batchInfo.schedule.endDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Capacity</p>
                              <p className="text-gray-900 font-medium">
                                {batchInfo.enrolled_students.length}/{batchInfo.capacity} students
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Trainer Information */}
                      {batchInfo?.trainer && (
                        <div className="bg-blue-50 rounded-lg p-4 mb-4">
                          <h4 className="text-gray-900 font-medium mb-3 flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-600" />
                            Your Trainer
                          </h4>
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                              {batchInfo.trainer.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600">Name</p>
                                  <p className="text-gray-900 font-medium">{batchInfo.trainer.name}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Trainer ID</p>
                                  <p className="text-gray-900 font-medium">{batchInfo.trainer.trainerId}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Experience</p>
                                  <p className="text-gray-900 font-medium">{batchInfo.trainer.experience}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Rating</p>
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-900 font-medium">{batchInfo.trainer.rating}</span>
                                    <span className="text-yellow-500">★</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-gray-600">Email</p>
                                  <p className="text-gray-900 font-medium">{batchInfo.trainer.email}</p>
                                </div>
                                {batchInfo.trainer.phone && (
                                  <div>
                                    <p className="text-gray-600">Phone</p>
                                    <p className="text-gray-900 font-medium">{batchInfo.trainer.phone}</p>
                                  </div>
                                )}
                              </div>
                              {batchInfo.trainer.bio && (
                                <div className="mt-3">
                                  <p className="text-gray-600 text-sm">About</p>
                                  <p className="text-gray-700 text-sm">{batchInfo.trainer.bio}</p>
                                </div>
                              )}
                              {batchInfo.trainer.expertise && batchInfo.trainer.expertise.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-gray-600 text-sm mb-2">Expertise</p>
                                  <div className="flex flex-wrap gap-2">
                                    {batchInfo.trainer.expertise.map((skill, index) => (
                                      <Badge key={index} className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                                        {skill}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Social Links */}
                              <div className="flex gap-3 mt-3">
                                {batchInfo.trainer.linkedIn && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => window.open(batchInfo.trainer.linkedIn, '_blank')}
                                    className="text-xs"
                                  >
                                    LinkedIn
                                  </Button>
                                )}
                                {batchInfo.trainer.github && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => window.open(batchInfo.trainer.github, '_blank')}
                                    className="text-xs"
                                  >
                                    GitHub
                                  </Button>
                                )}
                                {batchInfo.trainer.portfolio && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => window.open(batchInfo.trainer.portfolio, '_blank')}
                                    className="text-xs"
                                  >
                                    Portfolio
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Course Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-gray-600">Duration</p>
                          <p className="text-gray-900 font-medium">{course.duration}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Level</p>
                          <p className="text-gray-900 font-medium">{course.level}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Student ID</p>
                          <p className="text-gray-900 font-medium">{course.studentId}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        {batchInfo?.meetingLink && batchInfo.status === 'ongoing' && (
                          <Button 
                            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
                            onClick={() => window.open(batchInfo.meetingLink, '_blank')}
                          >
                            <PlayCircle className="h-4 w-4" />
                            Join Class
                          </Button>
                        )}
                        <Button 
                          variant="outline"
                          onClick={() => window.open(course.course_link, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <BookOpen className="h-4 w-4" />
                          View Course
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Classes */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Upcoming Classes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {dashboardData.upcomingClasses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No upcoming classes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.upcomingClasses.map((classItem) => (
                  <div 
                    key={classItem.batchId} 
                    className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <h4 className="text-gray-900 font-medium">{classItem.courseTitle}</h4>
                      <p className="text-gray-600 text-sm mt-1 flex items-center gap-1">
                        <Clock className="inline h-3 w-3" />
                        {classItem.timing} • {classItem.days.join(', ')}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">Trainer: {classItem.trainerName}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                      {classItem.meetingLink && (
                        <Button 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => window.open(classItem.meetingLink, '_blank')}
                        >
                          Join Now
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Two Column Layout for Quizzes and Certificates */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Quizzes to Attempt */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-600" />
                Available Quizzes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {dashboardData.availableQuizzes.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No quizzes assigned yet</p>
                  <p className="text-gray-400 text-xs mt-1">Check back later for new quizzes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.availableQuizzes.slice(0, 5).map((quiz) => (
                    <div
                      key={quiz._id}
                      className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="text-gray-900 font-medium text-sm">{quiz.title}</h4>
                          <p className="text-gray-500 text-xs">{quiz.questionsCount} questions</p>
                        </div>
                        <Badge className={
                          quiz.status === 'completed'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : quiz.dueDate && new Date(quiz.dueDate) < new Date()
                              ? 'bg-red-100 text-red-700 border-red-200'
                              : 'bg-blue-100 text-blue-700 border-blue-200'
                        }>
                          {quiz.status === 'completed' ? 'Completed' : 'Available'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-gray-600">Total Marks: {quiz.totalMarks}</span>
                        <span className="text-gray-600">Passing: {quiz.passingMarks}</span>
                      </div>
                      {quiz.dueDate && (
                        <p className="text-gray-400 text-xs">
                          Due: {new Date(quiz.dueDate).toLocaleDateString()}
                        </p>
                      )}
                      {quiz.status === 'completed' && quiz.score !== null && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-sm font-medium text-green-700">
                            Score: {quiz.score}/{quiz.totalMarks}
                          </p>
                        </div>
                      )}
                      {quiz.status !== 'completed' && (
                        <Button
                          size="sm"
                          className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => router.push(`/student/quiz/${quiz._id}`)}
                        >
                          Start Quiz
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Quiz Attempts */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Quiz Results
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {dashboardData.quizAttempts.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No quiz attempts yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.quizAttempts.slice(0, 5).map((attempt) => (
                    <div
                      key={attempt._id}
                      className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="text-gray-900 font-medium text-sm">{attempt.quizTitle}</h4>
                          <p className="text-gray-500 text-xs">{attempt.quizCategory}</p>
                        </div>
                        <Badge className={attempt.passed ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>
                          {attempt.passed ? 'Passed' : 'Failed'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Score: {attempt.totalMarks}/{attempt.maxMarks}</span>
                        <span className="text-gray-900 font-medium">{attempt.percentage}%</span>
                      </div>
                      <p className="text-gray-400 text-xs mt-1">
                        {new Date(attempt.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Certificates */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-600" />
                My Certificates
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {dashboardData.certificates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No certificates yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.certificates.slice(0, 5).map((cert) => (
                    <div 
                      key={cert._id} 
                      className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="text-gray-900 font-medium text-sm">{cert.courseName}</h4>
                          <p className="text-gray-500 text-xs">ID: {cert.certificateId}</p>
                        </div>
                        <Badge className={cert.status === 'issued' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}>
                          {cert.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Grade: {cert.grade}</span>
                        <span className="text-gray-900 font-medium">Score: {cert.score}%</span>
                      </div>
                      <p className="text-gray-400 text-xs mt-1">
                        Completed: {new Date(cert.completionDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recording Video Modal */}
      {recordingModal.open && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">{recordingModal.title} - Recording</h3>
              <button
                onClick={() => setRecordingModal({ open: false, url: '', title: '' })}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="aspect-video">
              <video
                src={recordingModal.url}
                controls
                className="w-full h-full"
                autoPlay
              >
                Your browser does not support video playback.
              </video>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentDashboard;
