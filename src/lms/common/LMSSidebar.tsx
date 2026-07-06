import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  ClipboardList,
  Award,
  BarChart3,
  Settings,
  GraduationCap,
  UserCheck,
  FileText,
  MessageSquare,
  LogOut,
  Key,
  Video,
  DollarSign,
  CreditCard
} from 'lucide-react';

const LMSSidebar = () => {
  const router = useRouter();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Overview', href: '/lms' },
    { icon: Users, label: 'Students', href: '/lms/students' },
    { icon: BookOpen, label: 'Courses', href: '/lms/courses' },
    { icon: Calendar, label: 'Batches', href: '/lms/batches' },
    { icon: GraduationCap, label: 'Trainers', href: '/lms/trainers' },
    { icon: Key, label: 'Accounts', href: '/lms/accounts' },
    { icon: CreditCard, label: 'Payments', href: '/lms/payments' },
    { icon: DollarSign, label: 'Finance', href: '/lms/finance' },
    { icon: Video, label: 'Live Classes', href: '/lms/live-classes' },
    { icon: ClipboardList, label: 'Quizzes', href: '/lms/quizzes' },
    { icon: Award, label: 'Certificates', href: '/lms/certificates' },
    { icon: BarChart3, label: 'Analytics', href: '/lms/analytics' },
    { icon: FileText, label: 'Reports', href: '/lms/reports' },
    { icon: MessageSquare, label: 'Communications', href: '/lms/communications' },
    { icon: Settings, label: 'Settings', href: '/lms/settings' },
  ];

  const handleSignOut = () => {
    router.push('/');
  };

  return (
    <div className="bg-[#0F1419] h-screen w-72 flex flex-col items-center justify-start py-4 px-6 border-r border-gray-800 flex-shrink-0">
      
      {/* Logo */}
      <div className='w-auto flex flex-row gap-4 items-center justify-start mb-8'>
        <Link href={'/'} aria-label='Techpratham LMS'>
          <div className="relative w-36">
            <Image
              src={'/navbar/logotechnolyfirst2.svg'}
              alt='Techpratham Logo'
              width={80}
              height={30}
              className='w-full h-auto'
            />
            <span className="absolute bottom-2 pl-1 left-1/2 -translate-x-1/2 text-[7px] text-white">
              Learning Management System
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Menu */}
      <div className='flex overflow-y-scroll flex-col w-full h-full items-start justify-between'>
        <div className='w-full h-full flex-1 flex flex-col gap-1'>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = router.pathname === item.href || 
                           (item.href !== '/lms' && router.pathname.startsWith(item.href));
            
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={`text-gray-400 hover:text-white hover:bg-gray-800 flex flex-row gap-3 items-center rounded-lg justify-start text-sm py-3 px-4 cursor-pointer transition-all duration-200 ${
                  isActive && 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                }`}
              >
                <Icon className='w-5 h-5' />
                <div className="font-medium">{item.label}</div>
              </Link>
            );
          })}
        </div>

        {/* Back to Admin & Sign Out */}
        <div className='w-full border-t border-gray-800 pt-4 space-y-2'>
          <Link 
            href='/admin/dashboard'
            className='text-gray-400 hover:text-white hover:bg-gray-800 flex flex-row gap-3 items-center rounded-lg justify-start text-sm py-3 px-4 cursor-pointer transition-all duration-200 w-full'
          >
            <UserCheck className='w-5 h-5' />
            <div className="font-medium">Back to Admin</div>
          </Link>
          
          <button 
            onClick={handleSignOut}
            className='text-gray-400 hover:text-red-400 hover:bg-gray-800 flex flex-row gap-3 items-center rounded-lg justify-start text-sm py-3 px-4 cursor-pointer transition-all duration-200 w-full'
          >
            <LogOut className='w-5 h-5' />
            <div className="font-medium">Sign Out</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LMSSidebar;