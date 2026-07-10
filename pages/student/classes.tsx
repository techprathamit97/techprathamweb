import React, { useState, useEffect, useCallback, useRef } from 'react';
import StudentLayout from '@/src/student/common/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Calendar, Clock, Users, Play, Circle, Clock3, FileVideo, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LiveClass {
  _id: string;
  title: string;
  description: string;
  batchName: string;
  trainerName: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  status: string;
  roomConfig: {
    meetingLink?: string;
    platform?: string;
  };
  recording?: {
    enabled: boolean;
    recordingUrl?: string;
  };
}

interface SessionRecording {
  _id: string;
  title: string;
  description: string;
  batchName: string;
  hostName: string;
  actualEnd: string;
  duration: number;
  recording: {
    recordingUrl: string;
  };
}

const StudentClasses = () => {
  const [scheduledClasses, setScheduledClasses] = useState<LiveClass[]>([]);
  const [recordings, setRecordings] = useState<SessionRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [studentBatches, setStudentBatches] = useState<string[]>([]);
  const [playingRecording, setPlayingRecording] = useState<SessionRecording | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoLoading, setVideoLoading] = useState(false);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get all live classes
      const params = new URLSearchParams();
      params.set('status', 'scheduled');
      params.set('limit', '100');

      const response = await fetch(`/api/lms/live-classes?${params}`);
      const data = await response.json();

      if (data.success) {
        // Filter classes by student's batches
        const filteredClasses = data.data?.filter((cls: any) => 
          studentBatches.length === 0 || studentBatches.includes(cls.batchId?.toString() || cls.batchId)
        ) || [];
        setScheduledClasses(filteredClasses);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  }, [studentBatches]);

  const fetchRecordings = useCallback(async () => {
    try {
      const studentData = localStorage.getItem('student');
      if (!studentData) return;

      const parsed = JSON.parse(studentData);
      const response = await fetch(`/api/student/recordings?studentId=${parsed.studentId}`);
      const data = await response.json();

      if (data.success) {
        // Transform to match SessionRecording interface
        const transformedRecordings = (data.recordings || []).map((rec: any) => ({
          _id: rec._id,
          title: rec.topic,
          description: '', // Student API doesn't return description, but we can add it
          batchName: rec.batchName,
          hostName: rec.trainerName,
          actualEnd: rec.classDate,
          duration: 0, // Not provided in student API
          recording: {
            recordingUrl: rec.recordingUrl
          }
        }));
        setRecordings(transformedRecordings);
      }
    } catch (error) {
      console.error('Error fetching recordings:', error);
    }
  }, []);

  useEffect(() => {
    // Get student's batches from localStorage
    const studentData = localStorage.getItem('student');
    if (studentData) {
      try {
        const parsed = JSON.parse(studentData);
        // Fetch student's enrolled batches from API
        const fetchStudentBatches = async () => {
          try {
            const response = await fetch(`/api/student/dashboard?studentId=${parsed.studentId}`);
            const data = await response.json();
            if (data.success && data.data.batches) {
              setStudentBatches(data.data.batches.map((b: any) => b._id || b.batchId));
            }
          } catch (error) {
            console.error('Error fetching student batches:', error);
          }
        };
        fetchStudentBatches();
      } catch (error) {
        console.error('Error parsing student data:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'upcoming' || activeTab === 'today') {
      fetchClasses();
    } else if (activeTab === 'recordings') {
      fetchRecordings();
    }
  }, [activeTab, fetchClasses, fetchRecordings]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-red-500"><Circle className="w-3 h-3 mr-1 animate-pulse" /> Live</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-500">Scheduled</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (dateString: string) => {
    const today = new Date();
    const classDate = new Date(dateString);
    return today.toDateString() === classDate.toDateString();
  };

  const isTomorrow = (dateString: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const classDate = new Date(dateString);
    return tomorrow.toDateString() === classDate.toDateString();
  };

  const getClassDateLabel = (dateString: string) => {
    if (isToday(dateString)) return 'Today';
    if (isTomorrow(dateString)) return 'Tomorrow';
    return formatDate(dateString);
  };

  const canJoinClass = (cls: LiveClass) => {
    if (cls.status !== 'scheduled') return false;

    const now = new Date();
    const [hours, minutes] = cls.scheduledTime.split(':');
    const classStart = new Date(cls.scheduledDate);
    classStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const joinWindow = 15 * 60 * 1000; // 15 minutes
    const endTime = new Date(classStart.getTime() + cls.duration * 60 * 1000);

    return now >= new Date(classStart.getTime() - joinWindow) && now <= endTime;
  };

  const handleJoinClass = async (cls: LiveClass) => {
    try {
      console.log('=== STUDENT JOINING CLASS ===');
      console.log('Class:', cls);
      
      // Get student info
      const studentData = localStorage.getItem('student');
      if (!studentData) {
        alert('Please log in first');
        return;
      }
      
      const student = JSON.parse(studentData);
      const studentName = student.name || student.studentName || 'Student';
      
      console.log('Student name:', studentName);
      
      const response = await fetch('/api/join-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: cls._id,
          userName: studentName,
          userType: 'student'
        })
      });

      const data = await response.json();
      console.log('Join response:', data);

      if (data.success && data.joinUrl) {
        console.log('Opening BBB join URL:', data.joinUrl);
        
        // Open BigBlueButton in new window
        window.open(data.joinUrl, '_blank', 'width=1200,height=800');
        
        // Show success message
        alert(`Joining ${data.className}\n\nThe BigBlueButton window should open automatically. If it doesn't, please enable pop-ups and try again.`);
      } else {
        throw new Error(data.error || 'Failed to join class');
      }
    } catch (error: any) {
      console.error('Join error:', error);
      alert(`Failed to join class: ${error.message}\n\nPlease try again or contact your instructor.`);
    }
  };

  const handleWatchRecording = async (recording: SessionRecording) => {
    if (recording.recording?.recordingUrl) {
      setPlayingRecording(recording);
      setVideoLoading(true);

      try {
        // Get recordings from BBB
        const response = await fetch(`/api/bbb/meetings?action=recordings&meetingId=${recording._id}`);
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
          // Use the playback URL from BBB recordings
          const bbbRecording = data.data[0];
          setVideoUrl(bbbRecording.playback?.url || recording.recording.recordingUrl);
        } else {
          // Fallback to direct URL
          setVideoUrl(recording.recording.recordingUrl);
        }
      } catch (error) {
        console.error('Error getting playback URL:', error);
        // Fallback to direct URL
        setVideoUrl(recording.recording.recordingUrl);
      } finally {
        setVideoLoading(false);
      }
    }
  };

  const closeVideoPlayer = () => {
    setPlayingRecording(null);
    setVideoUrl('');
  };

  const todayClasses = scheduledClasses.filter(cls => isToday(cls.scheduledDate));
  const upcomingClasses = scheduledClasses.filter(cls => !isToday(cls.scheduledDate));

  return (
    <StudentLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Video className="h-8 w-8" />
            Live Classes
          </h1>
          <p className="text-red-100 mt-2">Join live sessions and access recordings</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">
              <Clock3 className="w-4 h-4 mr-2" />
              Today
              {todayClasses.length > 0 && (
                <Badge variant="secondary" className="ml-2">{todayClasses.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              <Calendar className="w-4 h-4 mr-2" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="recordings">
              <FileVideo className="w-4 h-4 mr-2" />
              Recordings
            </TabsTrigger>
          </TabsList>

          {/* Today's Classes */}
          <TabsContent value="today" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ) : todayClasses.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No classes today</h3>
                  <p className="text-gray-500 mt-2">Check the upcoming schedule for classes</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {todayClasses.map(cls => (
                  <Card key={cls._id} className={cls.status === 'live' ? 'border-red-500 border-2 shadow-lg' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{cls.title}</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">{cls.batchName}</p>
                        </div>
                        {getStatusBadge(cls.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {formatTime(cls.scheduledTime)} - {formatTime(cls.scheduledTime)} ({cls.duration} min)
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {cls.trainerName}
                        </div>
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          {cls.roomConfig?.platform || 'Zoom'}
                        </div>
                      </div>

                      {cls.description && (
                        <p className="text-gray-600 text-sm mb-4">{cls.description}</p>
                      )}

                      <div className="flex gap-3">
                        {cls.status === 'live' ? (
                          <Button className="bg-red-500 hover:bg-red-600" onClick={() => handleJoinClass(cls)}>
                            <Play className="w-4 h-4 mr-2" />
                            Join Now
                          </Button>
                        ) : canJoinClass(cls) ? (
                          <Button className="bg-green-500 hover:bg-green-600" onClick={() => handleJoinClass(cls)}>
                            <Video className="w-4 h-4 mr-2" />
                            Join Class
                          </Button>
                        ) : (
                          <Button disabled variant="outline">
                            <Clock className="w-4 h-4 mr-2" />
                            Join available at {formatTime(cls.scheduledTime)}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Upcoming Classes */}
          <TabsContent value="upcoming" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-20 bg-gray-200 rounded"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ) : upcomingClasses.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No upcoming classes</h3>
                  <p className="text-gray-500 mt-2">Check back later for new scheduled classes</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {upcomingClasses.map(cls => (
                  <Card key={cls._id}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{cls.title}</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">{cls.batchName}</p>
                        </div>
                        {getStatusBadge(cls.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {getClassDateLabel(cls.scheduledDate)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {formatTime(cls.scheduledTime)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {cls.trainerName}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">{cls.duration} minutes</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Recordings */}
          <TabsContent value="recordings" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-24 bg-gray-200 rounded"></div>
                    <div className="h-24 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ) : recordings.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileVideo className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No recordings available</h3>
                  <p className="text-gray-500 mt-2">Completed class recordings will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recordings.map(recording => (
                  <Card key={recording._id} className="overflow-hidden">
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      <Play className="h-12 w-12 text-gray-400" />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-gray-900 line-clamp-2">{recording.title}</h3>
                      {recording.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{recording.description}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">{recording.batchName}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{recording.duration > 0 ? `${recording.duration} min` : 'N/A'}</span>
                        <span>{recording.hostName}</span>
                        <span>{recording.actualEnd ? new Date(recording.actualEnd).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <Button
                        className="w-full mt-3"
                        variant="outline"
                        onClick={() => handleWatchRecording(recording)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Watch Recording
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Video Player Modal */}
      {playingRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative w-full max-w-4xl mx-4">
            <button
              onClick={closeVideoPlayer}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
            >
              <X className="w-8 h-8" />
            </button>

            <div className="bg-black rounded-lg overflow-hidden">
              {videoLoading ? (
                <div className="aspect-video flex items-center justify-center">
                  <div className="text-white">Loading video...</div>
                </div>
              ) : (
                <video
                  controls
                  autoPlay
                  className="w-full aspect-video"
                  src={videoUrl}
                >
                  Your browser does not support video playback.
                </video>
              )}
            </div>

            <div className="mt-4 text-white">
              <h3 className="text-lg font-semibold">{playingRecording.title}</h3>
              <p className="text-sm text-gray-300">
                {playingRecording.batchName} • {playingRecording.duration} min • {playingRecording.hostName}
              </p>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentClasses;