import React from 'react';
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
  Users
} from 'lucide-react';

const StudentSidebar = () => {
  const router = useRouter();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/student/dashboard' },
    { icon: BookOpen, label: 'Enrolled Courses', href: '/student/courses' },
    { icon: Users, label: 'My Batches & Trainers', href: '/student/my-batches' },
    { icon: User, label: 'User Details', href: '/student/profile' },
    { icon: FileText, label: 'Invoices', href: '/student/invoices' },
    { icon: CheckCircle, label: 'Completed', href: '/student/completed' },
    { icon: Award, label: 'Certificates', href: '/student/certificates' },
    { icon: ClipboardList, label: 'Assignments', href: '/student/assignments' },
    { icon: ClipboardList, label: 'Quizzes', href: '/student/quizzes' },
    { icon: Video, label: 'Daily Classes', href: '/student/classes' },
    { icon: VideoIcon, label: 'Class Recordings', href: '/student/recordings' },
    { icon: Bell, label: 'Notifications', href: '/student/notifications' },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem('studentAuth');
    router.push('/student/login');
  };

  return (
    <div className="bg-white border-r border-gray-200 h-full w-64 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Student Portal</h2>
        <p className="text-xs text-gray-500 mt-1">Learning Management System</p>
      </div>

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
