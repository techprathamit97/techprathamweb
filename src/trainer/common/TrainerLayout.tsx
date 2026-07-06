import React from 'react';
import TrainerSidebar from './TrainerSidebar';
import TrainerNavbar from './TrainerNavbar';
import TrainerFooter from './TrainerFooter';

interface TrainerLayoutProps {
  children: React.ReactNode;
}

const TrainerLayout: React.FC<TrainerLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <TrainerNavbar />
      <div className="flex flex-1">
        <TrainerSidebar />
        <main className="flex-1 bg-gray-50">
          {children}
        </main>
      </div>
      <TrainerFooter />
    </div>
  );
};

export default TrainerLayout;
