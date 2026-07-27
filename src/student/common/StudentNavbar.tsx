import React, { useEffect, useState } from 'react';
import { Search, Menu } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import NotificationBell from '@/components/ui/notification-bell';
import Image from 'next/image';
import { useRouter } from 'next/router';

interface StudentNavbarProps {
  onMenuClick?: () => void;
}

const StudentNavbar: React.FC<StudentNavbarProps> = ({ onMenuClick }) => {
  const [studentData, setStudentData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const storedData = localStorage.getItem('student');
    if (storedData) {
      setStudentData(JSON.parse(storedData));
    }
  }, []);

  const handleNotificationClick = (notification: any) => {
    // Handle notification click - navigate to appropriate page
    if (notification.actionUrl) {
      if (notification.actionUrl.startsWith('/')) {
        window.location.href = notification.actionUrl;
      } else {
        window.open(notification.actionUrl, '_blank');
      }
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 py-4 lg:px-6">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div
            className="flex-shrink-0 cursor-pointer"
            onClick={() => router.push('/student/dashboard')}
          >
            <Image
              src="/navbar/lmslogo.png"
              alt="TechPratham Logo"
              width={140}
              height={40}
              className="h-16 w-auto"
              priority
            />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden flex-shrink-0 p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Search Bar */}
          <div className="flex-1 min-w-0 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Notifications */}
            <NotificationBell
              studentId={studentData?.studentId || studentData?._id}
              onNotificationClick={handleNotificationClick}
            />

            {/* User Profile */}
            <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-gray-200">
              <Avatar className="w-8 h-8 sm:w-9 sm:h-9">
                <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold text-xs sm:text-sm">
                  {studentData?.name?.split(' ').map((n: string) => n[0]).join('') || 'S'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{studentData?.name || 'Student'}</p>
                <p className="text-xs text-gray-500 truncate max-w-[120px]">{studentData?.studentId || ''}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentNavbar;
