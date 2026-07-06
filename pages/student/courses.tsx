import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import StudentLayout from '@/src/student/common/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  CheckCircle,
  PlayCircle,
  ChevronDown,
  ChevronRight,
  Video,
  FileQuestion,
  Calendar,
  Clock,
  VideoIcon,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface TopicProgress {
  title: string;
  type: string;
  duration: string;
  completed: boolean;
  progress: number;
}

interface ScheduledClass {
  _id: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  meetingLink: string;
  roomId: string;
  status: string;
  recordingUrl: string;
  isLive: boolean;
  isCompleted: boolean;
  canJoin: boolean;
  // BigBlueButton fields
  bbbMeetingId?: string;
  bbbAttendeePassword?: string;
  bbbModeratorPassword?: string;
  bbbJoinUrl?: string;
  bbbModeratorJoinUrl?: string;
}

interface ModuleProgress {
  title: string;
  description: string;
  topicsCompleted: number;
  totalTopics: number;
  progress: number;
  completed: boolean;
  topics: TopicProgress[];
  scheduledClass: ScheduledClass | null;
}

interface EnrolledCourse {
  _id: string;
  course_title: string;
  course_link: string;
  course_desc: string;
  duration: string;
  level: string;
  category: string;
  studentId: string;
  progressPercentage: number;
  courseCompletion: boolean;
  createdAt: string;
  moduleProgress?: ModuleProgress[];
}

interface CoursesData {
  enrolledCourses: EnrolledCourse[];
  completedRecordings: CompletedRecording[];
  scheduledClasses: ScheduledClass[];
  stats: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    avgProgress: number;
  };
}

interface Recording {
  _id: string;
  url: string;
  title: string;
  description: string;
  duration: number;
  uploadedAt: string;
  uploadedBy: string;
}

interface CompletedRecording {
  _id: string;
  moduleTitle: string;
  moduleDescription: string;
  moduleIndex: number;
  scheduledDate: string;
  scheduledTime: string;
  recordings: Recording[];
  progress: number;
  progressUpdatedAt?: string;
  progressUpdatedBy?: string;
}

// Timer component for countdown
const ClassTimer = ({ scheduledClass }: { scheduledClass: ScheduledClass }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [status, setStatus] = useState<'waiting' | 'ready' | 'live' | 'ended'>('waiting');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const classDate = new Date(scheduledClass.scheduledDate);
      const [hours, minutes] = scheduledClass.scheduledTime.split(':');
      classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const endTime = new Date(classDate.getTime() + scheduledClass.duration * 60 * 1000);
      const joinTime = new Date(classDate.getTime() - 15 * 60 * 1000); // 15 minutes before
      
      if (now < joinTime) {
        // Waiting period - show countdown to join time
        const diff = joinTime.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else if (minutes > 0) {
          setTimeLeft(`${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${seconds}s`);
        }
        setStatus('waiting');
      } else if (now >= joinTime && now < classDate) {
        // Can join but class hasn't started
        const diff = classDate.getTime() - now.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`Starts in ${minutes}m ${seconds}s`);
        setStatus('ready');
      } else if (now >= classDate && now <= endTime) {
        // Class is live
        const diff = endTime.getTime() - now.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`Live - ${minutes}m ${seconds}s left`);
        setStatus('live');
      } else {
        // Class ended
        setTimeLeft('Class ended');
        setStatus('ended');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [scheduledClass]);

  const getStatusColor = () => {
    switch (status) {
      case 'waiting': return 'text-blue-600 bg-blue-50';
      case 'ready': return 'text-green-600 bg-green-50';
      case 'live': return 'text-red-600 bg-red-50 animate-pulse';
      case 'ended': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${getStatusColor()}`}>
      <Clock className="h-3 w-3" />
      {timeLeft}
    </div>
  );
};

const StudentCourses = () => {
  const router = useRouter();
  const [coursesData, setCoursesData] = useState<CoursesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [recordingModal, setRecordingModal] = useState<{ open: boolean; url: string; title: string }>({ open: false, url: '', title: '' });
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);

  // Notification system for upcoming classes
  useEffect(() => {
    if (!coursesData) return;

    const checkUpcomingClasses = () => {
      const now = new Date();
      const reminderTime = 10 * 60 * 1000; // 10 minutes before class

      coursesData.enrolledCourses.forEach(course => {
        course.moduleProgress?.forEach(module => {
          if (module.scheduledClass && module.scheduledClass.status === 'scheduled') {
            const classDate = new Date(module.scheduledClass.scheduledDate);
            const [hours, minutes] = module.scheduledClass.scheduledTime.split(':');
            classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            const timeDiff = classDate.getTime() - now.getTime();
            
            // Show notification 10 minutes before class
            if (timeDiff > 0 && timeDiff <= reminderTime) {
              const notificationKey = `reminder_${module.scheduledClass._id}`;
              
              // Check if we already showed this notification
              if (!localStorage.getItem(notificationKey)) {
                toast.info(`Class "${module.title}" starts in ${Math.ceil(timeDiff / 60000)} minutes!`, {
                  duration: 10000,
                  action: {
                    label: 'Join Now',
                    onClick: () => {
                      const demoUrl = 'https://class.techpratham.org/demo/demo1.jsp';
                      
                      const popup = window.open(
                        demoUrl,
                        'bbb_class',
                        'width=1200,height=800,scrollbars=yes,resizable=yes'
                      );

                      if (popup) {
                        toast.success('Joined class successfully!');
                      } else {
                        window.location.href = demoUrl;
                      }
                    }
                  }
                });
                
                // Mark notification as shown
                localStorage.setItem(notificationKey, 'shown');
              }
            }
          }
        });
      });
    };

    // Check immediately and then every minute
    checkUpcomingClasses();
    const interval = setInterval(checkUpcomingClasses, 60000);
    
    return () => clearInterval(interval);
  }, [coursesData, router]);

  useEffect(() => {
    const storedData = localStorage.getItem('student');
    if (!storedData) {
      router.push('/student/login');
      return;
    }

    const student = JSON.parse(storedData);
    fetchCoursesData(student.studentId);

    // Poll every 30 seconds to update class status
    const interval = setInterval(() => {
      fetchCoursesData(student.studentId);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchCoursesData = async (studentId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/student/courses?studentId=${studentId}`);
      const data = await res.json();

      if (res.ok) {
        setCoursesData(data.data);
        // Auto-select first course if only one
        if (data.data.enrolledCourses.length === 1) {
          setSelectedCourse(data.data.enrolledCourses[0]._id);
        }
      } else {
        toast.error(data.error || 'Failed to fetch courses data');
      }
    } catch (error) {
      console.error('Courses fetch error:', error);
      toast.error('Failed to load courses data');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleModuleExpand = (moduleIndex: number) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleIndex)) {
        newSet.delete(moduleIndex);
      } else {
        newSet.add(moduleIndex);
      }
      return newSet;
    });
  };

  if (isLoading || !coursesData) {
    return (
      <StudentLayout>
        <div className="p-6 flex items-center justify-center">
          <p className="text-gray-600">Loading courses...</p>
        </div>
      </StudentLayout>
    );
  }

  const { enrolledCourses, stats } = coursesData;

  return (
    <StudentLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">My Courses</h1>
          <p className="text-blue-100 mt-2">You have {stats.totalCourses} course{stats.totalCourses !== 1 ? 's' : ''} enrolled</p>
        </div>

        {/* Course List - Only show if more than 1 course */}
        {enrolledCourses.length > 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...enrolledCourses].reverse().map((course) => (
              <Card
                key={course._id}
                className={`cursor-pointer transition-all ${
                  selectedCourse === course._id
                    ? 'border-blue-500 shadow-md ring-2 ring-blue-500'
                    : 'border-gray-200 hover:shadow-md'
                }`}
                onClick={() => setSelectedCourse(course._id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={
                      course.courseCompletion ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }>
                      {course.courseCompletion ? 'Completed' : 'In Progress'}
                    </Badge>
                    <span className="text-sm text-gray-500">{course.progressPercentage}%</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{course.course_title}</h3>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${course.progressPercentage}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Course Details - Full Width */}
        <div>
            {selectedCourse ? (
              (() => {
                const course = enrolledCourses.find(c => c._id === selectedCourse);
                if (!course) return null;

                const courseCompletedRecordings = coursesData?.completedRecordings || [];
                const courseScheduledClasses = coursesData?.scheduledClasses || [];

                return (
                  <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="border-b border-gray-200 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                            {course.course_title}
                          </CardTitle>
                          <p className="text-gray-600 mt-2">{course.course_desc}</p>
                        </div>
                        <Badge className={
                          course.courseCompletion ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }>
                          {course.courseCompletion ? 'Completed' : 'In Progress'}
                        </Badge>
                      </div>
                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-600">Overall Progress</span>
                          <span className={`font-bold text-lg ${
                            course.progressPercentage === 100 ? 'text-green-600' :
                            course.progressPercentage >= 70 ? 'text-blue-600' :
                            course.progressPercentage >= 30 ? 'text-yellow-600' :
                            course.progressPercentage >= 10 ? 'text-orange-600' :
                            'text-gray-600'
                          }`}></span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div
                            className={`h-4 rounded-full transition-all ${
                              course.progressPercentage === 100 ? 'bg-green-600' :
                              course.progressPercentage >= 70 ? 'bg-blue-600' :
                              course.progressPercentage >= 30 ? 'bg-yellow-500' :
                              course.progressPercentage >= 10 ? 'bg-orange-500' :
                              'bg-gray-400'
                            }`}
                            style={{ width: `${course.progressPercentage}%` }}
                          />
                        </div>
                        {course.progressPercentage > 0 && (
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            {course.progressPercentage === 100
                              ? '🎉 Course Completed!'
                              : ` Keep learning!`}
                          </p>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-6 space-y-6">
                      {/* Completed Class Recordings - at top */}
                      {courseCompletedRecordings.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                            <PlayCircle className="h-5 w-5 text-green-600" />
                            Completed Class Recordings
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...courseCompletedRecordings].reverse().map((recording) => (
                              <div
                                key={recording._id}
                                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                              >
                                {/* Video Icon - Click to Play */}
                                <div
                                  className="relative h-40 bg-gray-900 flex items-center justify-center cursor-pointer group"
                                  onClick={() => {
                                    if (recording.recordings.length > 0 && recording.recordings[0].url) {
                                      setPlayingRecordingId(recording._id);
                                      setRecordingModal({
                                        open: true,
                                        url: recording.recordings[0].url,
                                        title: recording.moduleTitle
                                      });
                                    }
                                  }}
                                >
                                  <PlayCircle className="w-16 h-16 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                                    <Badge className="bg-green-100 text-green-700 border-green-200">
                                      Completed
                                    </Badge>
                                    <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
                                      {recording.recordings.length} recording{recording.recordings.length > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                                <div className="p-4">
                                  <h4 className="font-medium text-gray-900">{recording.moduleTitle}</h4>
                                  <p className="text-gray-500 text-sm mt-1">
                                    {new Date(recording.scheduledDate).toLocaleDateString()} • {recording.scheduledTime}
                                  </p>
                                  {(recording.moduleDescription || (recording.recordings.length > 0 && recording.recordings[0].description)) && (
                                    <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                                      {recording.moduleDescription || recording.recordings[0].description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-3">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                      onClick={() => {
                                        if (recording.recordings.length > 0 && recording.recordings[0].url) {
                                          setRecordingModal({
                                            open: true,
                                            url: recording.recordings[0].url,
                                            title: recording.moduleTitle
                                          });
                                        }
                                      }}
                                    >
                                      <PlayCircle className="w-4 h-4 mr-1" />
                                      Play Video
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Scheduled Classes - below recordings */}
                      {courseScheduledClasses.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            Scheduled Classes
                          </h3>
                          <div className="space-y-3">
                            {[...courseScheduledClasses].reverse().map((classItem) => (
                              <div
                                key={classItem._id}
                                className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                              >
                                <div>
                                  <h4 className="text-gray-900 font-medium text-lg">{classItem.moduleTitle}</h4>
                                  <p className="text-gray-600 text-sm mt-1 flex items-center gap-2">
                                    <Calendar className="inline h-3 w-3" />
                                    {new Date(classItem.scheduledDate).toLocaleDateString()} •
                                    <Clock className="inline h-3 w-3" />
                                    {classItem.scheduledTime} •
                                    {classItem.duration} min
                                  </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Badge className={
                                    classItem.isLive ? 'bg-red-100 text-red-700 border-red-200' :
                                    classItem.canJoin ? 'bg-green-100 text-green-700 border-green-200' :
                                    'bg-blue-100 text-blue-700 border-blue-200'
                                  }>
                                    {classItem.isLive ? 'LIVE NOW' : classItem.canJoin ? 'Can Join' : 'Scheduled'}
                                  </Badge>
                                  {/* Always show join button for scheduled classes or if live */}
                                  {(classItem.status === 'scheduled' || classItem.isLive || classItem.canJoin) && (
                                    <Button
                                      size="sm"
                                      className={classItem.isLive ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
                                      onClick={async () => {
                                        try {
                                          const storedData = localStorage.getItem('student');
                                          const student = storedData ? JSON.parse(storedData) : null;
                                          const userName = student?.name || student?.studentName || 'Student';

                                          console.log('Joining via direct BBB API...');
                                          
                                          const response = await fetch('/api/join-class', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                              classId: classItem._id,
                                              userName: userName,
                                              userType: 'student'
                                            })
                                          });

                                          const data = await response.json();
                                          console.log('Join response:', data);

                                          if (data.success && data.joinUrl) {
                                            console.log('Opening direct BBB join URL:', data.joinUrl);
                                            
                                            // Open directly - bypasses Greenlight auth
                                            window.open(data.joinUrl, '_blank', 'width=1200,height=800');
                                            
                                            toast.success(`Joining BigBlueButton: ${data.className}`);
                                          } else {
                                            throw new Error(data.error || 'Failed to generate join URL');
                                          }
                                        } catch (error: any) {
                                          console.error('Join error:', error);
                                          toast.error('Failed to join class: ' + error.message);
                                          
                                          // Show helpful message
                                          toast.info('Please try again or ask your trainer for the meeting link', { duration: 5000 });
                                        }
                                      }}
                                    >
                                      <PlayCircle className="h-4 w-4 mr-1" />
                                      {classItem.isLive ? 'Join Live' : 'Join Class'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No recordings or scheduled classes message */}
                      {courseCompletedRecordings.length === 0 && courseScheduledClasses.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <PlayCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                          <p>No class recordings or scheduled classes yet</p>
                          <p className="text-gray-400 text-sm mt-1">Your trainer will schedule classes and upload recordings soon</p>
                        </div>
                      )}

                      {/* Access Course Button */}
                      <div className="mt-6">
                        <Button
                          onClick={() => router.push(course.course_link)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 py-6 text-lg"
                        >
                          <PlayCircle className="h-5 w-5" />
                          {course.progressPercentage > 0 ? 'Continue Learning' : 'Start Learning'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()
            ) : (
              <Card className="border-gray-200">
                <CardContent className="p-6 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Select a course to view details</p>
                </CardContent>
              </Card>
            )}
          </div>

        {/* Recording Video Modal */}
        {recordingModal.open && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-gray-900">{recordingModal.title} - Recording</h3>
                <button
                  onClick={() => setRecordingModal({ open: false, url: '', title: '' })}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="aspect-video">
                <video
                  src={recordingModal.url}
                  controls
                  className="w-full h-full"
                  autoPlay
                >
                  Your browser does not support video playback.
                </video>
              </div>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentCourses;