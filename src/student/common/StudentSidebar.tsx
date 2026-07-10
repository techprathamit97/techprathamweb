import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  BookOpen,
  User,
  FileText,
  CheckCircle,
  Award,
  ClipboardList,
  Video,
  VideoIcon,
  Bell,
  LogOut,
  Users,
  TrendingUp
} from 'lucide-react';

// Circular Progress Component
const CircularProgress = ({ percentage, size = 80, strokeWidth = 8 }: { percentage: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 100) return '#22c55e'; // green
    if (percentage >= 70) return '#3b82f6'; // blue
    if (percentage >= 30) return '#eab308'; // yellow
    return '#6b7280'; // gray
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color: getColor() }}>
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
};

const StudentSidebar = () => {
  const router = useRouter();
  const [courseStats, setCourseStats] = useState<{
    totalCourses: number;
    completedCourses: number;
    avgProgress: number;
  } | null>(null);

  useEffect(() => {
    const fetchCourseStats = async () => {
      const studentData = localStorage.getItem('student');
      if (!studentData) return;

      try {
        const student = JSON.parse(studentData);
        const res = await fetch(`/api/student/courses?studentId=${student.studentId}`);
        const data = await res.json();

        if (res.ok && data.data?.stats) {
          setCourseStats(data.data.stats);
        }
      } catch (error) {
        console.error('Error fetching course stats:', error);
      }
    };

    fetchCourseStats();
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/student/dashboard' },
    { icon: BookOpen, label: 'Enrolled Courses', href: '/student/courses' },

    { icon: Users, label: 'My Batches & Trainers', href: '/student/my-batches' },
    { icon: Video, label: 'Join Class', href: '/student/classes' },
    { icon: VideoIcon, label: 'Class Recordings', href: '/student/recordings' },
    { icon: User, label: 'User Details', href: '/student/profile' },
    { icon: FileText, label: 'Invoices', href: '/student/invoices' },
    { icon: CheckCircle, label: 'Completed', href: '/student/completed' },
    { icon: Award, label: 'Certificates', href: '/student/certificates' },
    { icon: ClipboardList, label: 'Assignments', href: '/student/assignments' },
    { icon: ClipboardList, label: 'Quizzes', href: '/student/quizzes' },
    { icon: Bell, label: 'Notifications', href: '/student/notifications' },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('studentAuth');
    router.push('/student/login');
  };

  return (
    <div className="bg-white border-r border-gray-200 h-full w-64 flex flex-col shadow-sm">

      {/* Course Progress Circle */}
      {courseStats && (
        <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-medium text-gray-600">Course Progress</p>
              <div className="flex items-center gap-3 mt-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  <span className="font-bold text-green-600">{courseStats.completedCourses}</span>
                  <span className="text-gray-500">/{courseStats.totalCourses}</span>
                  <span className="text-gray-500 text-xs ml-1">completed</span>
                </span>
              </div>
            </div>
            <CircularProgress percentage={courseStats.avgProgress} size={70} strokeWidth={6} />
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = router.pathname === item.href;
            
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default StudentSidebar;
