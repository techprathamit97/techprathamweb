import React, { useState } from 'react';
import StudentSidebar from './StudentSidebar';
import StudentNavbar from './StudentNavbar';
import StudentFooter from './StudentFooter';

interface StudentLayoutProps {
  children: React.ReactNode;
}

const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
