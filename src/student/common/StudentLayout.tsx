import React from 'react';
import StudentSidebar from './StudentSidebar';
import StudentNavbar from './StudentNavbar';
import StudentFooter from './StudentFooter';

interface StudentLayoutProps {
  children: React.ReactNode;
}

const StudentLayout: React.FC<StudentLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <StudentNavbar />
      <div className="flex flex-1">
        <StudentSidebar />
        <main className="flex-1 bg-gray-50">
          {children}
        </main>
      </div>
      <StudentFooter />
    </div>
  );
};

export default StudentLayout;
