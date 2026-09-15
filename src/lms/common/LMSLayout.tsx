import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LMSSidebar from './LMSSidebar';
import LMSTopBar from './LMSTopBar';

interface LMSLayoutProps {
  children: React.ReactNode;
}

const LMSLayout: React.FC<LMSLayoutProps> = ({ children }) => {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // 'checking' → verifying session, 'authorized' → render, 'denied' → redirecting
  const [authState, setAuthState] = useState<'checking' | 'authorized' | 'denied'>('checking');

  // Gate every /lms/* admin page behind an admin session. Without this, typing
  // an /lms URL directly rendered the admin UI to anyone.
  useEffect(() => {
    try {
      const adminRaw = localStorage.getItem('admin');
      const sessionRaw = localStorage.getItem('userSession');

      let isAdmin = false;
      if (adminRaw) {
        const admin = JSON.parse(adminRaw);
        // Accept if the stored admin object looks valid...
        if (admin && (admin._id || admin.userId)) {
          isAdmin = true;
        }
      }
      // ...and confirm the session role is admin when a session exists.
      if (isAdmin && sessionRaw) {
        const session = JSON.parse(sessionRaw);
        if (session?.role && session.role !== 'admin') {
          isAdmin = false;
        }
      }

      if (isAdmin) {
        setAuthState('authorized');
      } else {
        setAuthState('denied');
        router.replace('/login');
      }
    } catch {
      setAuthState('denied');
      router.replace('/login');
    }
  }, [router]);

  // While checking or redirecting, don't render the admin UI at all.
  if (authState !== 'authorized') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">
          {authState === 'checking' ? 'Verifying access…' : 'Redirecting to login…'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile by default */}
      <div className={`
        fixed lg:relative z-50 h-screen transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <LMSSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <LMSTopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 bg-black overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default LMSLayout;
