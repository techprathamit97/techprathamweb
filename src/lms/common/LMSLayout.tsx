import React, { useState } from 'react';
import LMSSidebar from './LMSSidebar';
import LMSTopBar from './LMSTopBar';

interface LMSLayoutProps {
  children: React.ReactNode;
}

const LMSLayout: React.FC<LMSLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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