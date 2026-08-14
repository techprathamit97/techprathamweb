import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  PlayCircle,
  Video,
  AlertCircle,
  CheckCircle,
  Loader2,
  Users
} from 'lucide-react';

interface ScheduledClass {
  _id: string;
  moduleTitle: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  status: string;
  isLive: boolean;
  canJoin: boolean;
  batchName: string;
  courseTitle: string;
  bbbMeetingId?: string;
  bbbModeratorJoinUrl?: string;
  bbbJoinUrl?: string;
  sessionToken?: string;
}

interface ClassCardProps {
  classItem: ScheduledClass;
  onJoin: (classItem: ScheduledClass) => void;
  isJoining: boolean;
}

const ClassCard: React.FC<ClassCardProps> = ({ classItem, onJoin, isJoining }) => {
  // Function to get class status and determine if trainer can join
  const getClassStatus = (cls: ScheduledClass) => {
    const now = new Date();
    const [hours, minutes] = cls.scheduledTime.split(':');
    const classDate = new Date(cls.scheduledDate);
    classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const joinWindow = 15 * 60 * 1000; // 15 minutes before class
    const classEndTime = new Date(classDate.getTime() + cls.duration * 60 * 1000);
    
    // Check if class is cancelled
    if (cls.status === 'cancelled') {
      return {
        status: 'cancelled',
        canJoin: false,
        label: 'Cancelled',
        color: 'bg-red-600',
        message: 'This class has been cancelled'
      };
    }
    
    // Check if class is completed
    if (cls.status === 'completed') {
      return {
        status: 'completed',
        canJoin: false,
        label: 'Completed',
        color: 'bg-gray-600',
        message: 'Class completed'
      };
    }
    
    // Check if class is currently live
    if (cls.status === 'live' || (now >= classDate && now <= classEndTime)) {
      return {
        status: 'live',
        canJoin: true,
        label: 'Live Now',
        color: 'bg-red-600',
        message: 'Class is live - you can join now'
      };
    }
    
    // Check if in join window (15 minutes before class)
    if (now >= new Date(classDate.getTime() - joinWindow) && now < classDate) {
      return {
        status: 'joinable',
        canJoin: true,
        label: 'Ready to Start',
        color: 'bg-green-600',
        message: 'You can start the class now'
      };
    }
    
    // Class is scheduled but not yet time
    if (now < new Date(classDate.getTime() - joinWindow)) {
      const timeUntilJoin = new Date(classDate.getTime() - joinWindow).getTime() - now.getTime();
      const minutesUntil = Math.ceil(timeUntilJoin / (60 * 1000));
      const hoursUntil = Math.floor(minutesUntil / 60);
      
      let timeText = '';
      if (hoursUntil > 0) {
        timeText = `${hoursUntil}h ${minutesUntil % 60}m`;
      } else {
        timeText = `${minutesUntil}m`;
      }
      
      return {
        status: 'scheduled',
        canJoin: false,
        label: 'Scheduled',
        color: 'bg-blue-600',
        message: `Class starts in ${timeText}`
      };
    }
    
    // Class time has passed
    return {
      status: 'expired',
      canJoin: false,
      label: 'Expired',
      color: 'bg-gray-600',
      message: 'Class time has passed'
    };
  };

  const statusInfo = getClassStatus(classItem);
  const isUrgent = statusInfo.status === 'live' || statusInfo.status === 'joinable';

  return (
    <Card className={`border-gray-200 hover:shadow-md transition-all duration-200 ${
      statusInfo.status === 'live' 
        ? 'bg-red-50 border-l-4 border-red-500' 
        : statusInfo.status === 'joinable'
        ? 'bg-green-50 border-l-4 border-green-500'
        : ''
    }`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Class Title and Status */}
            <div className="flex items-center gap-3 mb-3">
              {/* Priority indicator for live/urgent classes */}
              {isUrgent && (
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  statusInfo.status === 'live' ? 'bg-red-500' : 'bg-green-500'
                }`} />
              )}
              <h3 className="text-xl font-semibold text-gray-900">
                {classItem.moduleTitle}
              </h3>
              <Badge className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
              {classItem.bbbMeetingId && (
                <Badge variant="outline" className="text-xs">
                  Meeting: {classItem.bbbMeetingId}
                </Badge>
              )}
            </div>
            
            {/* Class Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="font-medium">
                  {new Date(classItem.scheduledDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                <span className="font-medium">
                  {classItem.scheduledTime}
                </span>
                <span className="text-gray-500">
                  ({classItem.duration} min)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-sm">
                  {statusInfo.message}
                </span>
              </div>
            </div>

            {/* Batch Info */}
            <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
              <Users className="h-4 w-4 text-purple-500" />
              <span>Batch: <span className="font-medium">{classItem.batchName}</span></span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 ml-6">
            <Button
              onClick={() => statusInfo.canJoin ? onJoin(classItem) : null}
              disabled={isJoining || !statusInfo.canJoin}
              className={`${
                statusInfo.canJoin 
                  ? statusInfo.status === 'live' 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-400 cursor-not-allowed text-white'
              }`}
              title={statusInfo.message}
            >
              {isJoining ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : statusInfo.canJoin ? (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  {statusInfo.status === 'live' ? 'Join Live Class' : 'Start Class'}
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  {statusInfo.status === 'scheduled' ? 'Not Ready' : statusInfo.label}
                </>
              )}
            </Button>

            {/* Additional info for scheduled classes */}
            {statusInfo.status === 'scheduled' && (
              <div className="text-xs text-gray-500 text-center">
                Available 15 min before
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassCard;