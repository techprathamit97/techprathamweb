import React from 'react';
import { Menu, Bell, Search, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import NotificationBell from '@/components/notifications/NotificationBell';

const LMSTopBar = () => {
  // Admin ID for notifications - using a fixed ID for LMS admin
  const adminId = 'lms-admin';

  return (
    <div className="bg-[#0F1419] border-b border-gray-800 px-6 py-4 flex items-center justify-between w-full">
      {/* Left Side - Search Bar */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search students, courses, batches..."
            className="pl-10 w-80 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500"
          />
        </div>
      </div>

      {/* Right Side - Notifications & Profile */}
      <div className="flex items-center gap-4">
        {/* Quick Stats */}
        <div className="hidden lg:flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-gray-400">Active Students</p>
            <p className="text-white font-semibold">156</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400">Running Batches</p>
            <p className="text-white font-semibold">8</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400">This Month Revenue</p>
            <p className="text-green-400 font-semibold">₹2.4L</p>
          </div>
        </div>

        {/* Notifications for Admin */}
        <NotificationBell
          userId={adminId}
          userType="admin"
        />

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={''} />
            <AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
              A
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-white">
              Admin
            </p>
            <p className="text-xs text-gray-400">
              LMS Administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LMSTopBar;