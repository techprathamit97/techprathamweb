import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  User,
  Users,
  ClipboardList,
  FileQuestion,
  Video,
  Mail,
  Link as LinkIcon,
  Clock,
  VideoIcon,
  DollarSign,
  LogOut,
  BookOpen,
  X,
  FolderOpen,
  Settings
} from 'lucide-react';

interface TrainerSidebarProps {
  onClose?: () => void;
}

const TrainerSidebar: React.FC<TrainerSidebarProps> = ({ onClose }) => {
  const router = useRouter();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/trainer/dashboard' },
    { icon: User, label: 'Profile', href: '/trainer/profile' },
    { icon: Settings, label: 'Batch Management', href: '/trainer/batch-management' },
    // { icon: VideoIcon, label: 'Join Classes (Legacy)', href: '/trainer/join-class' },
    { icon: Video, label: 'Class Recording', href: '/trainer/recordings' },
    { icon: BookOpen, label: 'Course Modules', href: '/trainer/course-modules' },
    { icon: Users, label: 'Student Details', href: '/trainer/students' },
    { icon: ClipboardList, label: 'Assignments', href: '/trainer/assignments' },
    { icon: FileQuestion, label: 'Quiz Assign', href: '/trainer/quiz-assign' },
    { icon: Mail, label: 'Send Email', href: '/trainer/send-email' },
    { icon: Clock, label: 'Change Class Timing', href: '/trainer/class-timing' },
    { icon: DollarSign, label: 'Salary Details', href: '/trainer/salary' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('trainer');
    router.push('/trainer/login');
  };

  return (
    <div className="bg-white border-r border-gray-200 h-full w-64 flex flex-col shadow-sm">
      {/* Mobile Close Button */}
      <div className="lg:hidden w-full flex justify-end p-2">
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Logo */}
      <div className="p-6 pt-0 lg:pt-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Trainer Portal</h2>
       
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
                    ? 'bg-green-50 text-green-600' 
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

export default TrainerSidebar;
