import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Search, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import NotificationBell from '@/components/notifications/NotificationBell';

const TrainerNavbar = () => {
  const [trainerData, setTrainerData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const storedData = localStorage.getItem('trainer');
    if (storedData) {
      setTrainerData(JSON.parse(storedData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('trainer');
    toast.success('Logged out successfully');
    router.push('/trainer/login');
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Search Bar */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search students, batches, assignments..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4 ml-6">
            {/* Notifications */}
            {(trainerData?._id || trainerData?.trainerId) && (
              <NotificationBell
                userId={trainerData._id || trainerData.trainerId}
                userType="trainer"
              />
            )}

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-green-100 text-green-600 font-semibold">
                  {trainerData?.name?.split(' ').map((n: string) => n[0]).join('') || 'T'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">{trainerData?.name || 'Trainer'}</p>
                <p className="text-xs text-gray-500">{trainerData?.trainerId || ''}</p>
              </div>
              
              {/* Logout Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="ml-2 text-gray-600 hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainerNavbar;
