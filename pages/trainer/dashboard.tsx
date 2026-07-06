import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TrainerLayout from '@/src/trainer/common/TrainerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Calendar, 
  Award, 
  BookOpen,
  Clock,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface TrainerData {
  trainerId: string;
  name: string;
  email: string;
  phone: string;
}

interface Batch {
  _id: string;
  batchId: string;
  course_title: string;
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
}

interface Student {
  studentId: string;
  name: string;
  email: string;
  phone: string;
  course_title: string;
  batchId: string;
  progressPercentage: number;
  courseCompletion: boolean;
}

interface DashboardData {
  trainer: any;
  batches: Batch[];
  students: Student[];
  stats: {
    totalBatches: number;
    activeBatches: number;
    totalStudents: number;
    completedStudents: number;
  };
}

const TrainerDashboard = () => {
  const router = useRouter();
  const [trainerData, setTrainerData] = useState<TrainerData | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if trainer is logged in
    const storedData = localStorage.getItem('trainer');
    if (!storedData) {
      router.push('/trainer/login');
      return;
    }

    const trainer = JSON.parse(storedData);
    setTrainerData(trainer);
    fetchDashboardData(trainer.trainerId);
  }, []);

  const fetchDashboardData = async (trainerId: string) => {
    setIsLoading(true);
    try {
      console.log('Fetching dashboard for trainer:', trainerId);
      const res = await fetch(`/api/trainer/dashboard?trainerId=${trainerId}`);
      const data = await res.json();

      console.log('Dashboard API response:', data);

      if (res.ok) {
        setDashboardData(data.data);
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

  const handleLogout = () => {
    localStorage.removeItem('trainer');
    toast.success('Logged out successfully');
    router.push('/trainer/login');
  };

  if (isLoading || !trainerData || !dashboardData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-900">Loading...</div>
      </div>
    );
  }

  return (
    <TrainerLayout>
      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">Welcome back, {trainerData.name}!</h1>
          <p className="text-green-100 mt-2">Manage your classes and students</p>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Batches</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.totalBatches}</p>
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
                  <p className="text-gray-600 text-sm">Active Batches</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.activeBatches}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Students</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.totalStudents}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Completed</p>
                  <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.completedStudents}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Batches */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              My Batches
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {dashboardData.batches.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No batches assigned yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardData.batches.map((batch) => (
                  <div 
                    key={batch._id} 
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-gray-900 font-semibold text-lg">{batch.course_title}</h3>
                        <p className="text-gray-600 text-sm mt-1">Batch ID: {batch.batchId}</p>
                      </div>
                      <Badge 
                        className={
                          batch.status === 'ongoing' ? 'bg-green-100 text-green-700 border-green-200' :
                          batch.status === 'upcoming' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }
                      >
                        {batch.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-600">Schedule</p>
                        <p className="text-gray-900 font-medium">{batch.schedule.timing}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Days</p>
                        <p className="text-gray-900 font-medium">{batch.schedule.days.join(', ')}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Students</p>
                        <p className="text-gray-900 font-medium">
                          {batch.enrolled_students.length} / {batch.capacity}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Start Date</p>
                        <p className="text-gray-900 font-medium">
                          {new Date(batch.schedule.startDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {batch.meetingLink && (
                      <Button 
                        size="sm" 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => window.open(batch.meetingLink, '_blank')}
                      >
                        Start Class
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Students */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              My Students
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {dashboardData.students.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No students enrolled yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-gray-600 font-medium p-3">Student ID</th>
                      <th className="text-left text-gray-600 font-medium p-3">Name</th>
                      <th className="text-left text-gray-600 font-medium p-3">Course</th>
                      <th className="text-left text-gray-600 font-medium p-3">Batch</th>
                      <th className="text-left text-gray-600 font-medium p-3">Progress</th>
                      <th className="text-left text-gray-600 font-medium p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.students.map((student) => (
                      <tr key={student.studentId} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-3 text-gray-900">{student.studentId}</td>
                        <td className="p-3">
                          <div>
                            <p className="text-gray-900 font-medium">{student.name}</p>
                            <p className="text-gray-600 text-xs">{student.email}</p>
                          </div>
                        </td>
                        <td className="p-3 text-gray-900">{student.course_title}</td>
                        <td className="p-3 text-gray-900">{student.batchId}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${student.progressPercentage}%` }}
                              />
                            </div>
                            <span className="text-gray-900 text-sm">{student.progressPercentage}%</span>
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
      </div>
    </TrainerLayout>
  );
};

export default TrainerDashboard;
