import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Award,
  Calendar,
  DollarSign,
  Clock,
  Target
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface CourseStats {
  course: string;
  students: number;
}

interface RecentEnrollment {
  name: string;
  course: string;
  status: string;
}

interface TrendData {
  month: string;
  students?: number;
  revenue?: number;
}

interface Analytics {
  overview: {
    totalStudents: number;
    activeStudents: number;
    completedStudents: number;
    totalRevenue: number;
    pendingRevenue: number;
    totalCourses: number;
    activeBatches: number;
    totalTrainers: number;
  };
  trends: {
    enrollmentTrend: TrendData[];
    revenueTrend: TrendData[];
  };
  courseStats: CourseStats[];
  recentEnrollments: RecentEnrollment[];
}

const LMSDashboard = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics>({
    overview: {
      totalStudents: 0,
      activeStudents: 0,
      completedStudents: 0,
      totalRevenue: 0,
      pendingRevenue: 0,
      totalCourses: 0,
      activeBatches: 0,
      totalTrainers: 0
    },
    trends: {
      enrollmentTrend: [],
      revenueTrend: []
    },
    courseStats: [],
    recentEnrollments: []
  });

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/lms/analytics');
      const data = await res.json();
      
      if (res.ok) {
        setAnalytics(data);
      } else {
        throw new Error(data.message || 'Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <LMSLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">LMS Overview</h1>
          <p className="text-gray-400 mt-2">Comprehensive learning management system dashboard</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Total Students</CardTitle>
              <Users className="h-4 w-4 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{analytics.overview.totalStudents}</div>
              <p className="text-xs text-blue-200">
                {analytics.overview.activeStudents} active learners
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Revenue Generated</CardTitle>
              <DollarSign className="h-4 w-4 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">₹{analytics.overview.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-green-200">
                ₹{analytics.overview.pendingRevenue.toLocaleString()} pending
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Completed Students</CardTitle>
              <Award className="h-4 w-4 text-purple-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{analytics.overview.completedStudents}</div>
              <p className="text-xs text-purple-200">Certificates issued</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-100">Active Batches</CardTitle>
              <Calendar className="h-4 w-4 text-orange-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{analytics.overview.activeBatches}</div>
              <p className="text-xs text-orange-200">{analytics.overview.totalCourses} courses offered</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enrollment Trend */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-400" />
                Enrollment Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.trends.enrollmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="students" 
                    stroke="#F97316" 
                    fill="url(#enrollmentGradient)" 
                  />
                  <defs>
                    <linearGradient id="enrollmentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Trend */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.trends.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Students by Course */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-400" />
                Students by Course
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.courseStats.map((course, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                      />
                      <span className="text-gray-300 text-sm">{course.course}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-2 rounded-full bg-gray-700"
                        style={{ width: '60px' }}
                      >
                        <div 
                          className="h-2 rounded-full"
                          style={{ 
                            width: `${Math.min((course.students / Math.max(...analytics.courseStats.map(c => c.students))) * 100, 100)}%`,
                            backgroundColor: `hsl(${index * 60}, 70%, 50%)`
                          }}
                        />
                      </div>
                      <span className="text-white font-medium text-sm">{course.students}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Enrollments */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                Recent Enrollments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.recentEnrollments && analytics.recentEnrollments.length > 0 ? (
                  analytics.recentEnrollments.slice(0, 4).map((enrollment, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                        {enrollment.name ? enrollment.name.split(' ').map(n => n[0]).join('') : 'NA'}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">{enrollment.name || 'Unknown Student'}</p>
                        <p className="text-gray-400 text-xs">{enrollment.course || 'Unknown Course'}</p>
                      </div>
                      <Badge 
                        className={`text-xs ${
                          enrollment.status === 'Completed' ? 'bg-green-600' :
                          enrollment.status === 'In Progress' ? 'bg-blue-600' : 'bg-yellow-600'
                        }`}
                      >
                        {enrollment.status || 'Enrolled'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-sm">No recent enrollments</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-yellow-400" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link href="/lms/students">
                  <button className="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors">
                    Add New Student
                  </button>
                </Link>
                <Link href="/lms/batches">
                  <button className="w-full p-3 bg-green-600 hover:bg-green-700 rounded-lg text-white text-sm font-medium transition-colors">
                    Create New Batch
                  </button>
                </Link>
                <Link href="/lms/trainers">
                  <button className="w-full p-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium transition-colors">
                    Add Trainer
                  </button>
                </Link>
                <Link href="/lms/analytics">
                  <button className="w-full p-3 bg-orange-600 hover:bg-orange-700 rounded-lg text-white text-sm font-medium transition-colors">
                    Generate Reports
                  </button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </LMSLayout>
  );
};

export default LMSDashboard;











