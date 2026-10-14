import React, { useEffect, useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import NotificationBell from '@/components/notifications/NotificationBell';

interface LMSTopBarProps {
  onMenuClick?: () => void;
}

interface QuickStats {
  activeStudents: number;
  runningBatches: number;
  thisMonthRevenue: number;
}

// Every /lms page mounts its own layout, so cache the stats briefly at module
// level to avoid refetching on each navigation.
const STATS_TTL_MS = 60 * 1000;
let statsCache: { at: number; data: QuickStats } | null = null;

// ₹2,40,000 -> ₹2.4L, ₹45,500 -> ₹45.5K
const formatINRShort = (amount: number) => {
  if (amount >= 1e7) return `₹${+(amount / 1e7).toFixed(2)}Cr`;
  if (amount >= 1e5) return `₹${+(amount / 1e5).toFixed(2)}L`;
  if (amount >= 1e3) return `₹${+(amount / 1e3).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
};

const LMSTopBar: React.FC<LMSTopBarProps> = ({ onMenuClick }) => {
  // Admin ID for notifications - using a fixed ID for LMS admin
  const adminId = 'lms-admin';

  const [stats, setStats] = useState<QuickStats | null>(statsCache?.data ?? null);
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    try {
      const admin = JSON.parse(localStorage.getItem('admin') || 'null');
      const name = admin?.name || admin?.fullName || admin?.username;
      if (name) setAdminName(String(name));
    } catch {
      // keep default
    }

    if (statsCache && Date.now() - statsCache.at < STATS_TTL_MS) return;

    let cancelled = false;
    fetch('/api/lms/analytics')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data?.overview) return;
        const next: QuickStats = {
          activeStudents: data.overview.activeStudents || 0,
          runningBatches: data.overview.activeBatches || 0,
          thisMonthRevenue: data.overview.thisMonthRevenue || 0
        };
        statsCache = { at: Date.now(), data: next };
        setStats(next);
      })
      .catch(() => {
        // leave placeholders
      });
    return () => { cancelled = true; };
  }, []);

  const show = (value: string | number | undefined) => (stats ? value : '—');

  return (
    <div className="bg-[#0F1419] border-b border-gray-800 px-4 lg:px-6 py-3 flex items-center justify-between gap-3 w-full">
      {/* Left Side - Menu Button & Search */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Search Bar - Hidden on small screens */}
        <div className="hidden md:block relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search students, courses, batches..."
            className="pl-10 w-56 xl:w-80 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-orange-500"
          />
        </div>
      </div>

      {/* Right Side - Notifications & Profile */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {/* Quick Stats */}
        <div className="hidden xl:flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-gray-400">Active Students</p>
            <p className="text-white font-semibold">{show(stats?.activeStudents)}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400">Running Batches</p>
            <p className="text-white font-semibold">{show(stats?.runningBatches)}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400">This Month Revenue</p>
            <p className="text-green-400 font-semibold">{show(stats ? formatINRShort(stats.thisMonthRevenue) : undefined)}</p>
          </div>
        </div>

        {/* Notifications for Admin */}
        <NotificationBell
          userId={adminId}
          userType="admin"
        />

        {/* User Profile */}
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={''} />
            <AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
              {adminName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block min-w-0">
            <p className="text-sm font-medium text-white truncate max-w-[10rem]">
              {adminName}
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
