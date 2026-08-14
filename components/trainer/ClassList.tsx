import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar } from 'lucide-react';
import ClassCard from './ClassCard';

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

interface ClassListProps {
  classes: ScheduledClass[];
  loading: boolean;
  joiningClass: string | null;
  onJoinClass: (classItem: ScheduledClass) => void;
  batchName: string;
}

const ClassList: React.FC<ClassListProps> = ({
  classes,
  loading,
  joiningClass,
  onJoinClass,
  batchName
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <p className="text-gray-600">Loading classes for {batchName}...</p>
        </CardContent>
      </Card>
    );
  }

  if (classes.length === 0) {
    return (
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Found</h3>
          <p className="text-gray-500 text-center">
            No classes have been scheduled for the batch "{batchName}" yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Classes for {batchName}
        </h3>
        <div className="text-sm text-gray-500">
          {classes.length} class{classes.length !== 1 ? 'es' : ''} scheduled
        </div>
      </div>

      <div className="space-y-4">
        {classes.map((classItem) => (
          <ClassCard
            key={classItem._id}
            classItem={classItem}
            onJoin={onJoinClass}
            isJoining={joiningClass === classItem._id}
          />
        ))}
      </div>
    </div>
  );
};

export default ClassList;