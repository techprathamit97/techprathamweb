import React, { useEffect, useState } from 'react';

import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign,
  Download,
  Calendar,
  Target,
  Award
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

const LMSAnalytics = () => {
  
  const [analytics, setAnalytics] = useState({
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
  const [isLoading, setIsLoading] = useState(false);

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

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

  const performanceData = [
    { name: 'Completion Rate', value: 85, color: '#10B981' },
    { name: 'Attendance Rate', value: 92, color: '#3B82F6' },
    { name: 'Satisfaction Rate', value: 88, color: '#F59E0B' },
    { name: 'Retention Rate', value: 78, color: '#8B5CF6' }
  ];

  useEffect(() => {
    fetchAnalytics();
    }, []);

  return (
    <LMSLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics & Reports</h1>
            <p className="text-gray-400 mt-2">Comprehensive insights into your LMS performance</p>
          </div>
          
          <Button variant="manual" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Students</p>
                  <p className="text-3xl font-bold text-white">{analytics.overview.totalStudents}</p>
                  <p className="text-blue-200 text-xs mt-1">+12% from last month</p>
                </div>
                <Users className="h-10 w-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Revenue</p>
                  <p className="text-3xl font-bold text-white">₹{analytics.overview.totalRevenue.toLocaleString()}</p>
                  <p className="text-green-200 text-xs mt-1">+8% from last month</p>
                </div>
                <DollarSign className="h-10 w-10 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Completion Rate</p>
                  <p className="text-3xl font-bold text-white">85%</p>
                  <p className="text-purple-200 text-xs mt-1">+3% from last month</p>
                </div>
                <Award className="h-10 w-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Active Batches</p>
                  <p className="text-3xl font-bold text-white">{analytics.overview.activeBatches}</p>
                  <p className="text-orange-200 text-xs mt-1">2 starting this week</p>
                </div>
                <Calendar className="h-10 w-10 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enrollment Trend */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-400" />
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
                    stroke="#3B82F6" 
                    fill="url(#enrollmentGradient)" 
                  />
                  <defs>
                    <linearGradient id="enrollmentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
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

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Course Distribution */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-400" />
                Students by Course
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.courseStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="course" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }} 
                  />
                  <Bar dataKey="students" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-yellow-400" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceData.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">{metric.name}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-gray-700 rounded-full">
                        <div 
                          className="h-2 rounded-full"
                          style={{ 
                            width: `${metric.value}%`,
                            backgroundColor: metric.color
                          }}
                        />
                      </div>
                      <span className="text-white font-medium text-sm w-8">{metric.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Top Performing Course</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-400">Full Stack Development</p>
                <p className="text-gray-400 mt-2">92% completion rate</p>
                <p className="text-gray-400">156 students enrolled</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Best Trainer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">Rajesh Kumar</p>
                <p className="text-gray-400 mt-2">4.8/5 rating</p>
                <p className="text-gray-400">3 active batches</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">₹2,45,000</p>
                <p className="text-gray-400 mt-2">Revenue generated</p>
                <p className="text-gray-400">67 new enrollments</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </LMSLayout>
  );
};

export default LMSAnalytics;












