import React, { useState } from 'react';
import TrainerSidebar from './TrainerSidebar';
import TrainerNavbar from './TrainerNavbar';
import TrainerFooter from './TrainerFooter';

interface TrainerLayoutProps {
  children: React.ReactNode;
}

const TrainerLayout: React.FC<TrainerLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <TrainerNavbar onMenuClick={() => setSidebarOpen(true)} />
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
          <TrainerSidebar onClose={() => setSidebarOpen(false)} />
        </div>

        <main className="flex-1 bg-gray-50 min-w-0">
          {children}
        </main>
      </div>
      <TrainerFooter />
    </div>
  );
};

export default TrainerLayout;
