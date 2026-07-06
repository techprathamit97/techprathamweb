import React from 'react';
import LMSSidebar from './LMSSidebar';
import LMSTopBar from './LMSTopBar';

interface LMSLayoutProps {
  children: React.ReactNode;
}

const LMSLayout: React.FC<LMSLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-black text-white flex">
      <LMSSidebar />
      <div className="flex-1 flex flex-col">
        <LMSTopBar />
        <main className="flex-1 bg-black">
          {children}
        </main>
      </div>
    </div>
  );
};

export default LMSLayout;