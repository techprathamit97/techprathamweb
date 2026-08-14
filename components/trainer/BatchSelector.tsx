import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  BookOpen,
  Calendar,
  Clock,
  PlayCircle,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

interface Batch {
  _id: string;
  batchId: string;
  batchName: string;
  courseTitle: string;
  studentCount: number;
  totalClasses: number;
  upcomingClasses: number;
  liveClasses: number;
}

interface BatchSelectorProps {
  batches: Batch[];
  onBatchSelect: (batch: Batch) => void;
}

const BatchSelector: React.FC<BatchSelectorProps> = ({ batches, onBatchSelect }) => {
  if (batches.length === 0) {
    return (
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Batches Found</h3>
          <p className="text-gray-500 text-center">
            You haven't been assigned to any batches yet. Contact your administrator to get batch assignments.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Select a Batch</h2>
        <div className="text-sm text-gray-500">
          {batches.length} batch{batches.length !== 1 ? 'es' : ''} available
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.map((batch) => (
          <BatchCard 
            key={batch._id} 
            batch={batch} 
            onSelect={() => onBatchSelect(batch)}
          />
        ))}
      </div>
    </div>
  );
};

interface BatchCardProps {
  batch: Batch;
  onSelect: () => void;
}

const BatchCard: React.FC<BatchCardProps> = ({ batch, onSelect }) => {
  const hasLiveClasses = batch.liveClasses > 0;
  const hasUpcomingClasses = batch.upcomingClasses > 0;
  
  return (
    <Card className={`border-gray-200 hover:shadow-lg transition-all duration-200 cursor-pointer group ${
      hasLiveClasses ? 'ring-2 ring-red-200 bg-red-50' : 
      hasUpcomingClasses ? 'hover:ring-2 hover:ring-blue-200' : ''
    }`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {batch.batchName}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{batch.courseTitle}</p>
            </div>
            {hasLiveClasses && (
              <Badge className="bg-red-600 animate-pulse">
                <PlayCircle className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-gray-600">
                <span className="font-medium text-gray-900">{batch.studentCount}</span> students
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" />
              <span className="text-gray-600">
                <span className="font-medium text-gray-900">{batch.totalClasses}</span> classes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-gray-600">
                <span className="font-medium text-gray-900">{batch.upcomingClasses}</span> upcoming
              </span>
            </div>
            {hasLiveClasses && (
              <div className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-red-500" />
                <span className="text-gray-600">
                  <span className="font-medium text-red-600">{batch.liveClasses}</span> live now
                </span>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {hasLiveClasses && (
            <div className="flex items-center gap-2 p-2 bg-red-100 rounded-md">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700 font-medium">
                {batch.liveClasses} class{batch.liveClasses !== 1 ? 'es' : ''} live now!
              </span>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={onSelect}
            className={`w-full group-hover:bg-blue-600 group-hover:text-white transition-colors ${
              hasLiveClasses 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-blue-600 hover:text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              {hasLiveClasses ? 'Join Live Classes' : 'Manage Classes'}
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchSelector;