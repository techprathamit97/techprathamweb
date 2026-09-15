import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import StudentSidebar from './StudentSidebar';
import StudentNavbar from './StudentNavbar';
import StudentFooter from './StudentFooter';
import { isSessionExpired, clearSession, sessionTimeRemainingMs } from '@/utils/session';

interface StudentLayoutProps {
  children: React.ReactNode;
}

const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Enforce the 5-hour session expiry. If the session is past its window,
  // clear it and send the user back to login.
  useEffect(() => {
    if (isSessionExpired()) {
      clearSession();
      router.replace('/login');
      return;
    }
    const remaining = sessionTimeRemainingMs();
    const timer =
      remaining > 0
        ? setTimeout(() => {
            clearSession();
            router.replace('/login');
          }, remaining)
        : undefined;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <StudentNavbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 relative">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - hidden on mobile by default */}
        <div className={`
          fixed lg:relative z-50 h-full transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <StudentSidebar onClose={() => setSidebarOpen(false)} />
        </div>

        <main className="flex-1 bg-gray-50 min-w-0">
          {children}
        </main>
      </div>
      <StudentFooter />
    </div>
  );
};

export default StudentLayout;
