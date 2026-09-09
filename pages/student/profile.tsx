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
  MapPin,
  Lock,
  KeyRound
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

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

  const sendPasswordResetEmail = async () => {
    const userEmail = profileData?.studentInfo?.email;
    if (!userEmail) {
      toast.error('Unable to get your email address');
      return;
    }

    setIsSendingReset(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, type: 'student' })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Password reset link sent to your email!');
        setIsChangePasswordOpen(false);
      } else {
        toast.error(data.error || 'Failed to send reset email');
      }
    } catch (error: any) {
      console.error('Send reset email error:', error);
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsSendingReset(false);
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
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">My Profile</h1>
              <p className="text-blue-100 mt-2">Complete overview of your learning journey</p>
            </div>
            {/* Change Password Button */}
            <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-white text-blue-600 hover:bg-blue-50 border-0">
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-gray-200 max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-gray-900 flex items-center gap-2">
                    <KeyRound className="h-5 w-5" />
                    Change Password
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    We'll send a password reset link to your registered email address.
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Send to:</p>
                    <p className="font-medium text-gray-900">{profileData?.studentInfo?.email}</p>
                  </div>
                  <Button
                    onClick={sendPasswordResetEmail}
                    disabled={isSendingReset}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isSendingReset ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
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



      

        
      </div>
    </StudentLayout>
  );
};

export default StudentProfile;