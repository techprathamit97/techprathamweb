import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import StudentLayout from '@/src/student/common/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Phone, 
  BookOpen, 
  Calendar, 
  GraduationCap,
  Users,
  DollarSign,
  Star,
  Clock,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface StudentInfo {
  studentId: string;
  name: string;
  email: string;
  phone: string;
  joinedDate: string;
}

interface Course {
  title: string;
  category: string;
  level: string;
  duration: string;
  progress: number;
  completed: boolean;
  batchId: string;
  trainer: string;
  trainerEmail: string;
  trainerPhone: string;
  trainerExperience: string;
  trainerRating: number;
  enrolledDate: string;
  hasTrainer: boolean;
  schedule: {
    timing: string;
    days: string[];
    startDate: string;
    endDate: string;
  } | null;
  meetingLink: string | null;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: string;
}

interface Trainer {
  name: string;
  email: string;
  phone: string;
  profile: string;
  experience: string;
  rating: number;
  course: string;
  batchId: string;
  courseCategory: string;
  courseLevel: string;
  courseDuration: string;
}

interface Batch {
  batchId: string;
  courseTitle: string;
  status: string;
  schedule: {
    timing: string;
    days: string[];
    startDate: string;
    endDate: string;
  };
  capacity: number;
  enrolledStudents: number;
  meetingLink: string;
}

interface ProfileData {
  studentInfo: StudentInfo;
  stats: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    avgProgress: number;
    totalPaid: number;
    totalAmount: number;
    pendingAmount: number;
  };
  courses: Course[];
  trainers: Trainer[];
  batches: Batch[];
}

const StudentProfile = () => {
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedData = localStorage.getItem('student');
    if (!storedData) {
      router.push('/student/login');
      return;
    }

    const student = JSON.parse(storedData);
    fetchProfile(student.studentId);
  }, []);

  const fetchProfile = async (studentId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/student/profile?studentId=${studentId}`);
      const data = await res.json();

      if (res.ok) {
        console.log('Profile data received:', data.data);
        console.log('Courses:', data.data.courses);
        console.log('Trainers:', data.data.trainers);
        console.log('Batches:', data.data.batches);
        console.log('Debug info:', data.data.debug);
        setProfileData(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !profileData) {
    return (
      <StudentLayout>
        <div className="p-6 flex items-center justify-center">
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="p-6 space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-blue-100 mt-2">Complete overview of your learning journey</p>
        </div>

        {/* Personal Information and Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info Card */}
          <Card className="border-gray-200 shadow-sm lg:col-span-2">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700">Student ID</Label>
                  <Input value={profileData.studentInfo.studentId} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label className="text-gray-700">Full Name</Label>
                  <Input value={profileData.studentInfo.name} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label className="text-gray-700">Email Address</Label>
                  <Input value={profileData.studentInfo.email} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label className="text-gray-700">Phone Number</Label>
                  <Input value={profileData.studentInfo.phone} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label className="text-gray-700">Member Since</Label>
                  <Input 
                    value={new Date(profileData.studentInfo.joinedDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} 
                    disabled 
                    className="bg-gray-50" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                Learning Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{profileData.stats.totalCourses}</p>
                  <p className="text-gray-600 text-xs">Enrolled Courses</p>
                </div>
                
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <GraduationCap className="h-6 w-6 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{profileData.stats.completedCourses}</p>
                  <p className="text-gray-600 text-xs">Completed</p>
                </div>

                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{profileData.stats.inProgressCourses}</p>
                  <p className="text-gray-600 text-xs">In Progress</p>
                </div>

                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <Star className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-900">{profileData.stats.avgProgress}%</p>
                  <p className="text-gray-600 text-xs">Avg Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Summary */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">₹{profileData.stats.totalPaid.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-blue-600">₹{profileData.stats.totalAmount.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-2xl font-bold text-red-600">₹{profileData.stats.pendingAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Courses and Trainers Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Courses */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                My Courses ({profileData.courses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {profileData.courses.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No courses enrolled</p>
              ) : (
                <div className="space-y-4">
                  {profileData.courses.map((course, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">{course.title}</h3>
                        <div className="flex gap-2">
                          <Badge className={course.completed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                            {course.completed ? 'Completed' : 'In Progress'}
                          </Badge>
                          <Badge className={
                            course.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                            course.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }>
                            {course.paymentStatus.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><span className="font-medium">Category:</span> {course.category}</p>
                        <p><span className="font-medium">Level:</span> {course.level}</p>
                        <p><span className="font-medium">Duration:</span> {course.duration}</p>
                        <p><span className="font-medium">Batch:</span> {course.batchId}</p>
                        <p><span className="font-medium">Invoice:</span> {course.invoiceNumber}</p>
                        
                        {/* Payment Information */}
                        <div className="bg-gray-50 p-2 rounded mt-2">
                          <p className="font-medium text-gray-800 text-xs mb-1">Payment Details:</p>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="font-medium">Total:</span> ₹{course.totalAmount.toLocaleString()}
                            </div>
                            <div>
                              <span className="font-medium">Paid:</span> ₹{course.paidAmount.toLocaleString()}
                            </div>
                            <div>
                              <span className="font-medium">Pending:</span> ₹{course.pendingAmount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        {/* Trainer Information from Batch */}
                        {course.hasTrainer ? (
                          <div className="bg-blue-50 p-2 rounded mt-2">
                            <p className="font-medium text-blue-800 text-xs mb-1">Trainer Details:</p>
                            <p><span className="font-medium">Name:</span> {course.trainer}</p>
                            <p><span className="font-medium">Email:</span> {course.trainerEmail}</p>
                            <p><span className="font-medium">Phone:</span> {course.trainerPhone}</p>
                            <p><span className="font-medium">Experience:</span> {course.trainerExperience}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              <span className="text-xs font-medium">{course.trainerRating}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-red-600"><span className="font-medium">Trainer:</span> Not Assigned</p>
                        )}

                        {/* Schedule Information */}
                        {course.schedule && (
                          <div className="bg-green-50 p-2 rounded mt-2">
                            <p className="font-medium text-green-800 text-xs mb-1">Class Schedule:</p>
                            <p><span className="font-medium">Timing:</span> {course.schedule.timing}</p>
                            <p><span className="font-medium">Days:</span> {course.schedule.days.join(', ')}</p>
                            <p><span className="font-medium">Duration:</span> {new Date(course.schedule.startDate).toLocaleDateString()} - {new Date(course.schedule.endDate).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">{course.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Join Class Button */}
                      {course.meetingLink && course.hasTrainer && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => window.open(course.meetingLink!, '_blank')}
                          >
                            Join Class
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Trainers */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                My Trainers ({profileData.trainers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {profileData.trainers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No trainers assigned</p>
              ) : (
                <div className="space-y-4">
                  {profileData.trainers.map((trainer, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">{trainer.name}</h3>
                          <p className="text-sm text-gray-600">{trainer.email}</p>
                          <p className="text-sm text-gray-600">{trainer.phone}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium">{trainer.rating}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><span className="font-medium">Course:</span> {trainer.course}</p>
                        <p><span className="font-medium">Category:</span> {trainer.courseCategory}</p>
                        <p><span className="font-medium">Level:</span> {trainer.courseLevel}</p>
                        <p><span className="font-medium">Duration:</span> {trainer.courseDuration}</p>
                        <p><span className="font-medium">Experience:</span> {trainer.experience}</p>
                        <p><span className="font-medium">Batch:</span> {trainer.batchId}</p>
                        {trainer.profile && (
                          <p><span className="font-medium">Profile:</span> {trainer.profile}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Batch Information */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Batch Information ({profileData.batches.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {profileData.batches.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No batch information available</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profileData.batches.map((batch, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{batch.courseTitle}</h3>
                        <p className="text-sm text-gray-600">Batch: {batch.batchId}</p>
                      </div>
                      <Badge className={
                        batch.status === 'ongoing' ? 'bg-green-100 text-green-700' :
                        batch.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {batch.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><span className="font-medium">Schedule:</span> {batch.schedule.timing}</p>
                      <p><span className="font-medium">Days:</span> {batch.schedule.days.join(', ')}</p>
                      <p><span className="font-medium">Students:</span> {batch.enrolledStudents}/{batch.capacity}</p>
                      <p><span className="font-medium">Start Date:</span> {new Date(batch.schedule.startDate).toLocaleDateString()}</p>
                      <p><span className="font-medium">End Date:</span> {new Date(batch.schedule.endDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default StudentProfile;