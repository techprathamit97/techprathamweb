import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import LMSSidebar from './LMSSidebar';
import LMSTopBar from './LMSTopBar';
import { isSessionExpired, clearSession, sessionTimeRemainingMs } from '@/utils/session';

interface LMSLayoutProps {
  children: React.ReactNode;
}

const LMSLayout: React.FC<LMSLayoutProps> = ({ children }) => {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // 'checking' → verifying session, 'authorized' → render, 'denied' → redirecting
  const [authState, setAuthState] = useState<'checking' | 'authorized' | 'denied'>('checking');

  // Gate every /lms/* admin page behind an admin session, and enforce the
  // 5-hour session expiry. Without this, typing an /lms URL directly rendered
  // the admin UI to anyone, and sessions never expired.
  useEffect(() => {
    const verify = () => {
      try {
        const adminRaw = localStorage.getItem('admin');
        const sessionRaw = localStorage.getItem('userSession');

        // Expired session → clear everything and bounce to login.
        if (isSessionExpired()) {
          clearSession();
          setAuthState('denied');
          router.replace('/login');
          return;
        }

        let isAdmin = false;
        if (adminRaw) {
          const admin = JSON.parse(adminRaw);
          if (admin && (admin._id || admin.userId)) {
            isAdmin = true;
          }
        }
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
        clearSession();
        setAuthState('denied');
        router.replace('/login');
      }
    };

    verify();

    // Auto-logout the moment the 5-hour window elapses while the tab is open.
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
