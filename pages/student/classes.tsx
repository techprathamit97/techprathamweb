import React, { useState, useEffect, useCallback } from 'react';
import StudentLayout from '@/src/student/common/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Calendar, Clock, Users, Play, Circle, Clock3, FileVideo, X } from 'lucide-react';
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
  const [playingRecording, setPlayingRecording] = useState<SessionRecording | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [joiningClass, setJoiningClass] = useState<string | null>(null); // Track which class is being joined

  // Track which classes the student has joined in current session - persist to localStorage
  const [joinedClasses, setJoinedClasses] = useState<Set<string>>(new Set());

  // Load joined classes from localStorage on mount
  useEffect(() => {
    const storedJoined = localStorage.getItem('studentJoinedClasses');
    if (storedJoined) {
      try {
        const joined = JSON.parse(storedJoined);
        setJoinedClasses(new Set(joined));
        console.log('Restored joined classes:', joined);
      } catch (e) {
        console.error('Error parsing joined classes:', e);
      }
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('Fetching classes using student dashboard API...');
      
      // Get student ID
      const studentData = localStorage.getItem('student');
      if (!studentData) {
        console.error('No student data found');
        setScheduledClasses([]);
        return;
      }
      
      const student = JSON.parse(studentData);
      const studentId = student.studentId || student._id;
      
      console.log('Fetching dashboard data for student:', studentId);
      
      // Use the same API as dashboard to get scheduled classes
      const response = await fetch(`/api/student/dashboard?studentId=${studentId}`);
      const data = await response.json();

      console.log('Student dashboard API response:', data);

      if (data.success && data.data && data.data.scheduledClasses) {
        const classes = data.data.scheduledClasses;
        console.log(`Found ${classes.length} scheduled classes`);
        
        // Transform to match LiveClass interface
        const transformedClasses = classes.map((cls: any) => ({
          _id: cls._id,
          title: cls.moduleTitle,
          description: cls.moduleTitle || '',
          batchName: 'Student Batch', // We can get this from batch data later
          trainerName: 'Trainer', // We can get this from batch data later
          scheduledDate: cls.scheduledDate,
          scheduledTime: cls.scheduledTime,
          duration: cls.duration,
          status: cls.status,
          roomConfig: {
            meetingLink: cls.bbbJoinUrl || cls.meetingLink || '',
            platform: 'bbb'
          },
          recording: {
            enabled: false,
            recordingUrl: ''
          },
          // Include original fields for join functionality
          canJoin: cls.canJoin,
          isLive: cls.isLive,
          bbbMeetingId: cls.bbbMeetingId,
          bbbJoinUrl: cls.bbbJoinUrl
        }));
        
        console.log('Transformed classes:', transformedClasses);
        setScheduledClasses(transformedClasses);
      } else {
        console.error('No scheduled classes found in API response');
        setScheduledClasses([]);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setScheduledClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
    // Fetch classes immediately when component mounts
    console.log('Component mounted, fetching classes...');
  }, []);

  useEffect(() => {
    console.log('Active tab changed to:', activeTab);
    
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

  const handleJoinClass = async (cls: LiveClass, isRejoining: boolean = false) => {
    // Prevent multiple join attempts for the same class
    if (joiningClass === cls._id) {
      console.log('Already joining this class, preventing duplicate');
      return;
    }

    // Prevent rapid clicking - check localStorage timestamp
    const lastJoinAttempt = localStorage.getItem(`joinAttempt_${cls._id}`);
    if (lastJoinAttempt && !isRejoining) {
      const timeSinceLastAttempt = Date.now() - parseInt(lastJoinAttempt);
      if (timeSinceLastAttempt < 5000) { // 5 seconds cooldown
        console.log('Too soon to join again, please wait...');
        alert('Please wait a few seconds before joining again.');
        return;
      }
    }

    // Set join attempt timestamp
    localStorage.setItem(`joinAttempt_${cls._id}`, Date.now().toString());

    // Check if a canonical token exists on server for this student/class before creating one
    // For rejoin, always use the existing token from localStorage
    let sessionToken = localStorage.getItem(`bbbSessionToken_${cls._id}`) || '';

    if (!sessionToken || sessionToken.trim() === '') {
      // Only generate new token if none exists (first join)
      console.log('No valid session token found, fetching from server...');
      try {
        const studentData = localStorage.getItem('student');
        const student = studentData ? JSON.parse(studentData) : null;
        const studentId = student ? (student.studentId || student._id) : null;

        if (studentId) {
          // Call API to get or create canonical token. Pass any locally stored token as preferredToken to claim it.
          const tokenResp = await fetch('/api/bbb/session-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              classId: cls._id, 
              studentId, 
              preferredToken: sessionToken || undefined 
            })
          });

          const tokenData = await tokenResp.json();
          if (tokenData && tokenData.success && tokenData.sessionToken) {
            sessionToken = tokenData.sessionToken;
            try { localStorage.setItem(`bbbSessionToken_${cls._id}`, sessionToken); } catch (e) { console.warn('localStorage set failed', e); }
            console.log('Using canonical session token from server:', sessionToken, 'source:', tokenData.source);
          } else {
            // fallback to local token generation if server did not return one
            sessionToken = Math.random().toString(36).substring(2, 10);
            localStorage.setItem(`bbbSessionToken_${cls._id}`, sessionToken);
            console.log('Created fallback session token:', sessionToken);
          }
        } else {
          // No student id found — fallback to local token
          sessionToken = Math.random().toString(36).substring(2, 10);
          localStorage.setItem(`bbbSessionToken_${cls._id}`, sessionToken);
          console.log('Created new session token (no studentId):', sessionToken);
        }
      } catch (err) {
        console.warn('Failed to obtain canonical session token, falling back to local token:', err);
        sessionToken = Math.random().toString(36).substring(2, 10);
        try { localStorage.setItem(`bbbSessionToken_${cls._id}`, sessionToken); } catch (e) {}
      }
    } else {
      console.log('Using existing session token for rejoin:', sessionToken);
    }

    setJoiningClass(cls._id);

    try {
      console.log('=== STUDENT JOINING CLASS ===');
      console.log('Class:', cls, 'IsRejoining:', isRejoining);

      // Get student info
      const studentData = localStorage.getItem('student');
      if (!studentData) {
        alert('Please log in first');
        return;
      }

      const student = JSON.parse(studentData);
      // Use session token specific to this class to prevent duplicates when rejoining
      const studentName = `${student.name || student.studentName || 'Student'}-${sessionToken}`;

      console.log('Student name:', studentName);

      const response = await fetch('/api/join-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: cls._id,
          userName: studentName,
          userType: 'student',
          sessionToken: sessionToken,
          studentId: student.studentId || student._id
        })
      });

      const data = await response.json();
      console.log('Join response:', data);

      if (data.success && data.joinUrl) {
        console.log('Opening BBB join URL:', data.joinUrl);
        // If server returned a canonical session token, persist it to localStorage
        if (data.sessionToken && data.sessionToken !== sessionToken) {
          try {
            localStorage.setItem(`bbbSessionToken_${cls._id}`, data.sessionToken);
            sessionToken = data.sessionToken;
            console.log('Updated local session token from server:', data.sessionToken);
          } catch (e) {
            console.warn('Failed to update local session token:', e);
          }
        }

        // Open BigBlueButton in new window
        window.open(data.joinUrl, '_blank', 'width=1200,height=800');

        // Track that this student has joined this class (only on first join, not rejoin)
        if (!isRejoining || !joinedClasses.has(cls._id)) {
          setJoinedClasses(prev => {
            const newSet = new Set(prev);
            newSet.add(cls._id);
            // Persist to localStorage
            localStorage.setItem('studentJoinedClasses', JSON.stringify([...newSet]));
            return newSet;
          });
        }

        // Show success message
        const message = isRejoining
          ? `Rejoining ${data.className}\n\nThe BigBlueButton window should open automatically.`
          : `Joining ${data.className}\n\nThe BigBlueButton window should open automatically. If it doesn't, please enable pop-ups and try again.`;
        alert(message);
      } else if (data.enforcedToken) {
        // Handle session token enforcement - update localStorage and retry
        console.log('Server enforced correct session token:', data.correctSessionToken);
        
        if (data.correctSessionToken) {
          try {
            localStorage.setItem(`bbbSessionToken_${cls._id}`, data.correctSessionToken);
            alert(`🔄 Session Token Updated: Your session token has been corrected.\n\nPlease click "Join Class" again to proceed with the correct token.`);
          } catch (e) {
            console.warn('Failed to update session token:', e);
            alert(`❌ ${data.error}\n\nPlease refresh the page and try joining again.`);
          }
        } else {
          alert(`❌ ${data.error}\n\nPlease refresh the page and try joining again.`);
        }
      } else if (data.alreadyJoined) {
        // Handle duplicate join prevention from backend
        if (data.duplicateType === 'exact_token_match' || data.duplicateType === 'token_in_use') {
          alert(`🚫 Cannot Join: ${data.error}\n\nYour session token "${data.sessionToken || 'unknown'}" is already active in this meeting.\n\nPlease:\n1. Check your other browser tabs/windows\n2. Wait for your existing session to end\n3. Contact support if this persists`);
        } else {
          alert(`⚠️ ${data.error}\n\nPlease check your other browser tabs or windows to find the existing meeting.`);
        }
      } else if (data.rateLimited) {
        // Handle rate limiting
        alert(`⏳ Please Wait: ${data.error}\n\nThis prevents duplicate joins and server overload.`);
      } else {
        throw new Error(data.error || 'Failed to join class');
      }
    } catch (error: any) {
      console.error('Join error:', error);
      alert(`Failed to join class: ${error.message}\n\nPlease try again or contact your instructor.`);
    } finally {
      setJoiningClass(null);
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
                        {/* Check if student has already joined this class */}
                        {joinedClasses.has(cls._id) ? (
                          <Button
                            className="bg-blue-500 hover:bg-blue-600"
                            onClick={() => handleJoinClass(cls, true)}
                            disabled={joiningClass === cls._id}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            {joiningClass === cls._id ? 'Entering...' : 'Enter Class..'}
                          </Button>
                        ) : cls.status === 'live' ? (
                          <Button
                            className="bg-red-500 hover:bg-red-600"
                            onClick={() => handleJoinClass(cls, false)}
                            disabled={joiningClass === cls._id}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            {joiningClass === cls._id ? 'Joining...' : 'Join Now'}
                          </Button>
                        ) : canJoinClass(cls) ? (
                          <Button
                            className="bg-green-500 hover:bg-green-600"
                            onClick={() => handleJoinClass(cls, false)}
                            disabled={joiningClass === cls._id}
                          >
                            <Video className="w-4 h-4 mr-2" />
                            {joiningClass === cls._id ? 'Joining...' : 'Join Class'}
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