import React, { useEffect, useState } from 'react';

interface TimeStatusIndicatorProps {
  scheduledTime: string;
  duration: number;
  actualStart?: string;
}

interface TimeStatus {
  status: 'running' | 'overtime' | 'not-started';
  message: string;
  color: string;
}

const TimeStatusIndicator: React.FC<TimeStatusIndicatorProps> = ({ 
  scheduledTime, 
  duration, 
  actualStart 
}) => {
  const [timeStatus, setTimeStatus] = useState<TimeStatus | null>(null);

  useEffect(() => {
    if (!actualStart) {
      setTimeStatus({
        status: 'not-started',
        message: 'Not started',
        color: 'text-gray-400'
      });
      return;
    }

    const updateStatus = () => {
      try {
        const now = new Date();
        const startTime = new Date(actualStart);
        
        // Validate dates
        if (isNaN(startTime.getTime())) {
          setTimeStatus({
            status: 'not-started',
            message: 'Invalid start time',
            color: 'text-gray-400'
          });
          return;
        }

        const scheduledEnd = new Date(startTime.getTime() + (duration || 60) * 60000);
        
        if (now > scheduledEnd) {
          const overtime = Math.floor((now.getTime() - scheduledEnd.getTime()) / 60000);
          setTimeStatus({
            status: 'overtime',
            message: `Time Up (+${overtime}min)`,
            color: 'text-red-600 font-semibold animate-pulse'
          });
        } else {
          const remaining = Math.floor((scheduledEnd.getTime() - now.getTime()) / 60000);
          setTimeStatus({
            status: 'running',
            message: `${remaining}min left`,
            color: 'text-green-600'
          });
        }
      } catch (error) {
        console.error('Error calculating time status:', error);
        setTimeStatus({
          status: 'not-started',
          message: 'Error',
          color: 'text-gray-400'
        });
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [actualStart, duration]);

  if (!timeStatus) {
    return <span className="text-gray-400">Loading...</span>;
  }

  return (
    <span className={timeStatus.color}>
      {timeStatus.message}
    </span>
  );
};

export default TimeStatusIndicator;