import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TrainerLayout from '@/src/trainer/common/TrainerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  PlayCircle,
  Users,
  Video,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Loader2,
  Download,
  Upload,
  FileVideo,
  FolderDown,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

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
}

const TrainerJoinClass = () => {
  const router = useRouter();
  const [trainerInfo, setTrainerInfo] = useState<any>(null);
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningClass, setJoiningClass] = useState<string | null>(null);
  const [processingRecordings, setProcessingRecordings] = useState<string | null>(null);
  const [monitoringActive, setMonitoringActive] = useState(false);
  const [autoUploadStatus, setAutoUploadStatus] = useState<'stopped' | 'running' | 'unknown'>('unknown');
  const [activeMeeting, setActiveMeeting] = useState<{
    classId: string;
    meetingId: string;
    startedAt: number;
  } | null>(null);

  // Store active meeting in localStorage and set up unload handler
  useEffect(() => {
    // Load active meeting from localStorage on mount
    const storedMeeting = localStorage.getItem('activeBBBMeeting');
    if (storedMeeting) {
      try {
        const meeting = JSON.parse(storedMeeting);
        setActiveMeeting(meeting);
        console.log('Found active meeting in localStorage:', meeting);
      } catch (e) {
        console.error('Error parsing stored meeting:', e);
      }
    }

    // Handle beforeunload - trigger recording processing when trainer closes the tab
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeMeeting) {
        console.log('Trainer closing tab with active meeting:', activeMeeting);

        // Trigger recording processing before closing
        triggerRecordingOnExit(activeMeeting.classId, activeMeeting.meetingId);

        // Note: We can't block the unload, but we can send the request
        e.preventDefault();
        // Modern browsers ignore this message, but the request will still be sent
      }
    };

    // Also handle visibility change (when tab becomes hidden)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && activeMeeting) {
        console.log('Tab became hidden with active meeting');
        // Don't trigger immediately on tab switch - wait for a while
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeMeeting]);

  // Heartbeat to detect if trainer is still active in meeting
  useEffect(() => {
    if (!activeMeeting) return;

    console.log('Starting heartbeat for meeting:', activeMeeting.meetingId);

    const heartbeatInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/bbb/meetings?meetingId=${activeMeeting.meetingId}&action=status`);
        const data = await response.json();

        if (data.success && data.running) {
          // Meeting is still running
          console.log('Meeting still running, participant count:', data.participantCount);

          // Update last seen timestamp
          const updatedMeeting = {
            ...activeMeeting,
            lastSeen: Date.now()
          };
          localStorage.setItem('activeBBBMeeting', JSON.stringify(updatedMeeting));
          setActiveMeeting(updatedMeeting);
        } else {
          // Meeting not running - trigger recording processing
          console.log('Meeting no longer running, triggering recording processing');
          await triggerRecordingOnExit(activeMeeting.classId, activeMeeting.meetingId);

          // Clear active meeting
          localStorage.removeItem('activeBBBMeeting');
          setActiveMeeting(null);
        }
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    }, 60000); // Check every minute

    return () => clearInterval(heartbeatInterval);
  }, [activeMeeting]);

  // Function to trigger recording when trainer exits
  const triggerRecordingOnExit = async (classId: string, meetingId: string) => {
    try {
      console.log('Triggering recording processing for class:', classId);

      const response = await fetch('/api/trigger-recording-on-exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, meetingId })
      });

      const data = await response.json();
      console.log('Recording trigger result:', data);

      if (data.success) {
        toast.success('Recording processing started automatically!');
      }
    } catch (error) {
      console.error('Error triggering recording:', error);
    }
  };

  useEffect(() => {
    const storedData = localStorage.getItem('trainer');
    if (!storedData) {
      router.push('/trainer/login');
      return;
    }

    const trainer = JSON.parse(storedData);
    setTrainerInfo(trainer);
    fetchScheduledClasses(trainer._id || trainer.trainerId);

    // Start auto-upload service automatically
    startAutoUploadService();

    // Poll every 30 seconds to update class status
    const interval = setInterval(() => {
      fetchScheduledClasses(trainer._id || trainer.trainerId);
    }, 30000);

    // Check auto-upload status every 2 minutes
    const statusInterval = setInterval(() => {
      checkAutoUploadStatus();
    }, 2 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearInterval(statusInterval);
    };
  }, []);

  const startAutoUploadService = async () => {
    try {
      const response = await fetch('/api/start-auto-upload-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });

      const data = await response.json();
      
      if (data.success) {
        setAutoUploadStatus('running');
        console.log('🚀 Auto-upload service started');
        toast.success('🔄 Automatic recording upload is now active!');
      }
    } catch (error) {
      console.error('Failed to start auto-upload service:', error);
      setAutoUploadStatus('stopped');
    }
  };

  const checkAutoUploadStatus = async () => {
    try {
      const response = await fetch('/api/start-auto-upload-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      });

      const data = await response.json();
      setAutoUploadStatus(data.status);
    } catch (error) {
      console.error('Failed to check auto-upload status:', error);
    }
  };

  const fetchScheduledClasses = async (trainerId: string) => {
    try {
      const res = await fetch(`/api/trainer/course-modules?trainerId=${trainerId}`);
      const data = await res.json();

      if (res.ok && data.data) {
        // Extract all scheduled classes from all courses
        const allScheduledClasses: ScheduledClass[] = [];
        
        data.data.forEach((course: any) => {
          course.scheduledClasses.forEach((cls: any) => {
            allScheduledClasses.push({
              ...cls,
              batchName: course.batchName,
              courseTitle: course.courseTitle
            });
          });
        });

        // Sort by date and time
        allScheduledClasses.sort((a, b) => {
          const dateA = new Date(`${a.scheduledDate} ${a.scheduledTime}`);
          const dateB = new Date(`${b.scheduledDate} ${b.scheduledTime}`);
          return dateA.getTime() - dateB.getTime();
        });

        setScheduledClasses(allScheduledClasses);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load scheduled classes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinClass = async (classItem: ScheduledClass) => {
    setJoiningClass(classItem._id);
    
    try {
      const trainerName = trainerInfo?.name || trainerInfo?.trainerName || 'Trainer';
      
      console.log('Joining via direct BBB API...');
      
      const response = await fetch('/api/join-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: classItem._id,
          userName: trainerName,
          userType: 'trainer'
        })
      });

      const data = await response.json();
      console.log('Join response:', data);

      if (data.success && data.joinUrl) {
        console.log('Opening direct BBB join URL:', data.joinUrl);

        // Store active meeting in localStorage for automatic recording processing
        const meetingInfo = {
          classId: classItem._id,
          meetingId: data.meetingId || `class-${classItem._id}`,
          startedAt: Date.now(),
          lastSeen: Date.now()
        };
        localStorage.setItem('activeBBBMeeting', JSON.stringify(meetingInfo));
        setActiveMeeting(meetingInfo);
        console.log('Stored active meeting:', meetingInfo);

        // Open directly - this bypasses Greenlight authentication
        window.open(data.joinUrl, '_blank', 'width=1200,height=800');

        toast.success(`Joining BigBlueButton: ${data.className}`);

        if (data.meetingCreated) {
          toast.info('Meeting created successfully! You can now admit students.', { duration: 5000 });
        }

        // Start monitoring this meeting for automatic recording processing
        setTimeout(() => {
          toast.info('🎬 Automatic recording processing is now active. Recordings will upload to S3 when you leave the meeting or close this tab.', { duration: 7000 });
        }, 3000);
      } else {
        throw new Error(data.error || 'Failed to generate join URL');
      }
      
    } catch (error: any) {
      console.error('Join error:', error);
      toast.error('Failed to join class: ' + error.message);
      
      // Show helpful message instead of broken demo link
      toast.info('Please try again or contact support if the issue persists', { duration: 5000 });
    } finally {
      setJoiningClass(null);
    }
  };

  const handleProcessRecordings = async (classItem: ScheduledClass) => {
    setProcessingRecordings(classItem._id);
    
    try {
      console.log('🎬 Processing BBB recordings for class:', classItem._id);
      console.log('Class details:', {
        title: classItem.moduleTitle,
        status: classItem.status,
        batchName: classItem.batchName
      });
      
      toast.info('🔍 Checking BigBlueButton for recordings... Please wait.');
      
      const response = await fetch('/api/process-bbb-recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: classItem._id,
          meetingId: `class-${classItem._id}`
        })
      });

      const data = await response.json();
      console.log('📊 Recording processing response:', data);

      if (data.success) {
        if (data.totalProcessed > 0) {
          toast.success(`🎉 Successfully processed ${data.totalProcessed} recording(s) from BigBlueButton!`);
          toast.info(`📤 Recordings uploaded to AWS S3 and are now available to students.`, { duration: 7000 });
          
          // Show detailed info
          const processedRecordings = data.processedRecordings || [];
          if (processedRecordings.length > 0) {
            const recordingDetails = processedRecordings.map((rec: any, index: number) => 
              `${index + 1}. ${rec.title} (${Math.round(rec.fileSize / 1024 / 1024)}MB)`
            ).join('\n');
            
            console.log('📹 Processed recordings:', recordingDetails);
          }
          
          // Refresh the classes list to show updated recording count
          if (trainerInfo) {
            fetchScheduledClasses(trainerInfo._id || trainerInfo.trainerId);
          }
        } else {
          toast.warning('⏳ No new recordings found to process.');
          toast.info('📝 This could mean:\n• Recordings are still processing in BigBlueButton (wait 2-5 minutes)\n• No recording was made during the class\n• Recordings were already processed', { duration: 8000 });
        }

        if (data.totalSkipped > 0) {
          toast.info(`⏭️ ${data.totalSkipped} recording(s) were skipped (already processed or not ready).`);
        }

        // Show detailed debug info in console
        console.log('🔍 Processing details:', {
          classId: data.classId,
          meetingId: data.meetingId,
          totalProcessed: data.totalProcessed,
          totalSkipped: data.totalSkipped,
          recordingsInClass: data.recordingsInClass
        });

      } else {
        throw new Error(data.error || 'Failed to process recordings');
      }

    } catch (error: any) {
      console.error('❌ Recording processing error:', error);
      toast.error('❌ Failed to process recordings: ' + error.message);
      
      // Provide helpful troubleshooting info
      toast.info('🛠️ Troubleshooting tips:\n• Wait 2-5 minutes after class ends\n• Ensure recording was started during class\n• Check BigBlueButton server status\n• Try "Check BBB Recordings" button for diagnostics', { duration: 10000 });
    } finally {
      setProcessingRecordings(null);
    }
  };

  const canJoinClass = (classItem: ScheduledClass) => {
    const now = new Date();
    const classDate = new Date(classItem.scheduledDate);
    const [hours, minutes] = classItem.scheduledTime.split(':');
    classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const endTime = new Date(classDate.getTime() + classItem.duration * 60 * 1000);
    const joinTime = new Date(classDate.getTime() - 15 * 60 * 1000); // 15 minutes before
    
    return now >= joinTime && now <= endTime && classItem.status === 'scheduled';
  };

  const getClassStatus = (classItem: ScheduledClass) => {
    const now = new Date();
    const classDate = new Date(classItem.scheduledDate);
    const [hours, minutes] = classItem.scheduledTime.split(':');
    classDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const endTime = new Date(classDate.getTime() + classItem.duration * 60 * 1000);
    const joinTime = new Date(classDate.getTime() - 15 * 60 * 1000);
    
    if (classItem.status === 'completed') {
      return { status: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-700' };
    } else if (classItem.status === 'cancelled') {
      return { status: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700' };
    } else if (classItem.isLive || classItem.status === 'live') {
      return { status: 'live', label: 'LIVE NOW', color: 'bg-red-100 text-red-700 animate-pulse' };
    } else if (now >= joinTime && now <= endTime) {
      return { status: 'ready', label: 'Ready to Join', color: 'bg-green-100 text-green-700' };
    } else if (now < joinTime) {
      return { status: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-700' };
    } else {
      return { status: 'expired', label: 'Expired', color: 'bg-gray-100 text-gray-700' };
    }
  };

  if (isLoading) {
    return (
      <TrainerLayout>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <p className="text-gray-600">Loading scheduled classes...</p>
        </div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Video className="h-8 w-8" />
            Join Live Classes
          </h1>
          <p className="text-blue-100 mt-2">
            Join your scheduled BigBlueButton classes and start teaching
          </p>
        </div>

        {/* BigBlueButton Info Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Video className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">BigBlueButton Integration</h3>
                <p className="text-blue-700 text-sm mt-1">
                  Your classes are hosted on BigBlueButton with automatic recording, screen sharing, 
                  whiteboard, and interactive features. Join 15 minutes before the scheduled time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto-Upload Status Card */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Upload className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-900">Automatic Recording Upload</h3>
                <p className="text-green-700 text-sm mt-1">
                  System automatically checks BigBlueButton every 5 minutes and uploads new recordings to AWS S3.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className={`w-2 h-2 rounded-full ${
                    autoUploadStatus === 'running' ? 'bg-green-500' : 
                    autoUploadStatus === 'stopped' ? 'bg-red-500' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-sm font-medium text-green-800">
                    Status: {autoUploadStatus === 'running' ? 'Active' : 
                             autoUploadStatus === 'stopped' ? 'Stopped' : 'Checking...'}
                  </span>
                  {autoUploadStatus === 'running' && (
                    <span className="text-xs text-green-600 ml-2">• Checking every 5 minutes</span>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={async () => {
                      try {
                        const action = autoUploadStatus === 'running' ? 'stop' : 'start';
                        const response = await fetch('/api/start-auto-upload-service', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action })
                        });
                        
                        const data = await response.json();
                        if (data.success) {
                          setAutoUploadStatus(data.status);
                          toast.success(action === 'start' ? '🚀 Auto-upload started!' : '⏹️ Auto-upload stopped!');
                        }
                      } catch (error) {
                        toast.error('❌ Failed to toggle auto-upload service');
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className={autoUploadStatus === 'running' ? 'text-red-600 border-red-600' : 'text-green-600 border-green-600'}
                  >
                    {autoUploadStatus === 'running' ? '⏹️ Stop Auto-Upload' : '▶️ Start Auto-Upload'}
                  </Button>
                  
                  <Button
                    onClick={async () => {
                      try {
                        toast.info('🔄 Running manual check...');
                        
                        const response = await fetch('/api/auto-upload-recordings', {
                          method: 'POST'
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                          if (data.processed > 0) {
                            toast.success(`✅ ${data.processed} new recordings uploaded!`);
                            // Refresh classes
                            if (trainerInfo) {
                              fetchScheduledClasses(trainerInfo._id || trainerInfo.trainerId);
                            }
                          } else {
                            toast.info('ℹ️ No new recordings found to process');
                          }
                        }
                      } catch (error) {
                        toast.error('❌ Manual check failed');
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-600"
                  >
                    🔄 Check Now
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <FileVideo className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900">Automatic Recording Feature</h3>
                <p className="text-purple-700 text-sm mt-1">
                  When you join as a trainer, recording starts automatically. After class ends, 
                  click "Get Recordings" to download and save recordings to AWS S3. 
                  Recordings will then be available to students in their course materials.
                </p>
                <div className="mt-2 text-xs text-purple-600">
                  <strong>Note:</strong> Only trainers can start/stop recordings. Recordings may take 2-5 minutes to process after class ends.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BBB Management Center */}
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Settings className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-purple-900">BBB Status: CONFIRMED BROKEN ❌</h3>
                <p className="text-purple-700 text-sm mt-1">
                  <strong>Issue:</strong> BBB server returns HTML presentation viewer pages instead of downloadable video files.
                  <br />
                  <strong>Impact:</strong> All video downloads fail with "JSON parse error" - server needs administrator attention.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => window.open('/bbb-issue-summary', '_blank')}
                    className="bg-red-600 hover:bg-red-700"
                    size="sm"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    View Issue Summary
                  </Button>
                  
                  <Button
                    onClick={() => window.open('/view-bbb-recordings', '_blank')}
                    className="bg-purple-600 hover:bg-purple-700"
                    size="sm"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    View BBB Recordings
                  </Button>
                </div>
                
                <div className="mt-2 text-xs text-purple-600">
                  <strong>Root Cause:</strong> Server misconfiguration • <strong>Status:</strong> Needs server administrator • <strong>Workaround:</strong> Manual upload only
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BBB Recording Troubleshooting Guide */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">Quick Recording Troubleshooting</h3>
                <p className="text-yellow-700 text-sm mt-1">
                  If recordings don't appear after ending a meeting, try these quick fixes:
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => window.open('/bbb-management', '_blank')}
                    variant="outline"
                    size="sm"
                    className="text-purple-600 border-purple-600"
                  >
                    🔧 Full BBB Diagnostic
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      const helpInfo = `
🎬 QUICK BBB RECORDING TROUBLESHOOTING

❌ NO RECORDINGS FOUND? Common causes:

1️⃣ RECORDING NOT STARTED:
   • Recording button not clicked in BBB meeting
   • Meeting ended too quickly (less than 30 seconds)

2️⃣ BBB SERVER ISSUE (Current Problem):
   • Server returns 862-byte HTML error pages instead of videos
   • All July 2026 recordings are broken due to this

3️⃣ PROCESSING DELAY:
   • BBB needs 2-5 minutes to process recordings

🔧 IMMEDIATE SOLUTIONS:

✅ USE BBB MANAGEMENT CENTER:
   • Test all BBB endpoints
   • Download working recordings locally
   • Clean up broken 862-byte files

⚠️ CURRENT STATUS:
   • BBB server is broken (returns HTML error pages)
   • Only June 2026 recordings work (5-40 MB files)
   • July 2026 recordings are all 862 bytes (junk)

💡 BEST PRACTICE:
   Always record locally as backup until BBB server is fixed!`;
                      
                      alert(helpInfo);
                      toast.info('💡 Open BBB Management Center for comprehensive diagnostics!');
                    }}
                    variant="outline" 
                    size="sm"
                    className="text-orange-600 border-orange-600"
                  >
                    Quick Help Guide
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900">BBB Configuration Debug</h3>
                <p className="text-orange-700 text-sm mt-1">
                  If you're getting "Checksums do not match" errors, test your BBB configuration.
                </p>
                <div className="flex gap-2 mt-2">
                  <Button 
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/check-env');
                        const data = await response.json();
                        
                        console.log('Environment Check:', data);
                        
                        if (data.success) {
                          const env = data.environment;
                          const expected = data.expectedValues;
                          
                          const envInfo = `
Environment Variables:
• Server URL: ${env.BIGBLUEBUTTON_SERVER_URL}
• API Secret: ${env.BIGBLUEBUTTON_API_SECRET === 'NOT SET' ? 'NOT SET' : 'SET (' + env.secretLength + ' chars)'}

Expected:
• Server URL: ${expected.BIGBLUEBUTTON_SERVER_URL}  
• API Secret: ${expected.BIGBLUEBUTTON_API_SECRET}

Status: ${env.BIGBLUEBUTTON_SERVER_URL === expected.BIGBLUEBUTTON_SERVER_URL && env.secretLength === 42 ? '✅ Correct' : '❌ Mismatch'}
                          `.trim();
                          
                          alert(envInfo);
                        } else {
                          alert('Error checking environment: ' + data.error);
                        }
                      } catch (error) {
                        console.error('Env check failed:', error);
                        alert('Env check failed: ' + error);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-600"
                  >
                    Check Env
                  </Button>
                  
                  <Button 
                    onClick={async () => {
                      try {
                        console.log('Testing exact BBB API replication...');
                        
                        const response = await fetch('/api/test-exact-bbb', {
                          method: 'POST'
                        });
                        const data = await response.json();
                        
                        console.log('Exact BBB Test Result:', data);
                        
                        if (data.success) {
                          alert('✅ Exact BBB API Test Successful!\n\n' +
                                `Meeting ID: ${data.meetingId}\n` +
                                `Checksum: ${data.checksum}\n\n` +
                                'This confirms BBB API is working!');
                        } else {
                          alert('❌ Exact BBB API Test Failed:\n\n' + 
                                data.error + '\n\n' +
                                'Check console for full response.');
                        }
                      } catch (error) {
                        console.error('Exact BBB test failed:', error);
                        alert('Exact BBB test failed: ' + error);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-purple-600 border-purple-600"
                  >
                    Test Exact BBB
                  </Button>
                  
                  <Button 
                    onClick={async () => {
                      try {
                        console.log('Testing BBB meeting creation...');
                        
                        const response = await fetch('/api/test-bbb-create', {
                          method: 'POST'
                        });
                        const data = await response.json();
                        
                        console.log('BBB Create Test Result:', data);
                        
                        if (data.success) {
                          alert('✅ BBB Meeting Creation Test Successful!\n\n' +
                                `Meeting ID: ${data.meetingData.meetingId}\n` +
                                `Join URL: ${data.meetingData.joinUrl}`);
                        } else {
                          alert('❌ BBB Meeting Creation Failed:\n\n' + 
                                data.error + '\n\n' +
                                'Check console for details.');
                        }
                      } catch (error) {
                        console.error('BBB create test failed:', error);
                        alert('BBB create test failed: ' + error);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-600"
                  >
                    Test BBB Create
                  </Button>
                  
                  <Button 
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/test-same-meeting');
                        const data = await response.json();
                        
                        console.log('Same Meeting Test Result:', data);
                        
                        if (data.success) {
                          const info = `
✅ Same Meeting Test Results:

Meeting Created: ${data.meetingCreated ? 'YES' : 'NO'}
Meeting ID: ${data.meetingId}
Same Meeting ID Verified: ${data.verification.sameMeetingId ? 'YES' : 'NO'}

TRAINER URL:
${data.trainer.joinUrl}

STUDENT URL:  
${data.student.joinUrl}

🔍 TESTING INSTRUCTIONS:
1. Both URLs use the SAME Meeting ID: ${data.meetingId}
2. Open Trainer URL in one browser tab/window
3. Open Student URL in another browser tab/window  
4. Both should join the SAME BigBlueButton room
5. Check that session tokens are the same

If you get different session tokens, the issue persists.
If you get the same session token, the fix is working!
                          `.trim();
                          
                          alert(info);
                          
                        } else {
                          alert('❌ Same Meeting Test Failed:\n\n' + data.error);
                        }
                      } catch (error) {
                        console.error('Same meeting test failed:', error);
                        alert('Same meeting test failed: ' + error);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-indigo-600 border-indigo-600"
                  >
                    Test Same Meeting
                  </Button>
                  
                  <Button 
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/test-same-meeting');
                        const data = await response.json();
                        
                        if (data.success) {
                          if (navigator.clipboard) {
                            await navigator.clipboard.writeText(data.trainer.joinUrl);
                            toast.success('Trainer join URL copied to clipboard!');
                            
                            alert(`Trainer URL copied!\n\nOpen this in one browser tab:\n${data.trainer.joinUrl}\n\nThen click "Copy Student URL" for the second tab.`);
                          } else {
                            alert(`Copy this Trainer URL manually:\n\n${data.trainer.joinUrl}`);
                          }
                        } else {
                          alert('Failed to generate test URLs: ' + data.error);
                        }
                      } catch (error) {
                        alert('Error: ' + error);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-600"
                  >
                    Copy Trainer URL
                  </Button>
                  
                  <Button 
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/test-same-meeting');
                        const data = await response.json();
                        
                        if (data.success) {
                          if (navigator.clipboard) {
                            await navigator.clipboard.writeText(data.student.joinUrl);
                            toast.success('Student join URL copied to clipboard!');
                            
                            alert(`Student URL copied!\n\nOpen this in a second browser tab:\n${data.student.joinUrl}\n\nBoth tabs should join the SAME meeting room!`);
                          } else {
                            alert(`Copy this Student URL manually:\n\n${data.student.joinUrl}`);
                          }
                        } else {
                          alert('Failed to generate test URLs: ' + data.error);
                        }
                      } catch (error) {
                        alert('Error: ' + error);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-600"
                  >
                    Copy Student URL
                  </Button>
                  
                  <Button 
                    onClick={async () => {
                      try {
                        console.log('🔍 Running comprehensive BBB recording debug...');
                        
                        toast.info('🔍 Analyzing BigBlueButton recordings... Please wait.');
                        
                        const response = await fetch('/api/debug-bbb-recordings');
                        const data = await response.json();
                        
                        console.log('🔍 Debug BBB recordings result:', data);
                        
                        if (data.success) {
                          const summary = data.summary;
                          const recordings = data.recordings;
                          const troubleshooting = data.troubleshooting;
                          
                          let debugInfo = `
🎬 BBB Recording Debug Report

🔧 SERVER STATUS:
• BBB Server: ${data.bbbServer.url}
• API Secret: ${data.bbbServer.secretConfigured ? '✅ Configured' : '❌ Missing'} (${data.bbbServer.secretLength} chars)
• API Call: ${data.apiTest.success ? '✅ SUCCESS' : '❌ FAILED'}
${data.apiTest.error ? `• API Error: ${data.apiTest.error}` : ''}

📊 RECORDINGS SUMMARY:
• Total recordings found: ${recordings.total}
• Ready to process: ${summary.canProcessNow}
• Published recordings: ${recordings.published}
• Unpublished (processing): ${recordings.unpublished}
• With video URLs: ${recordings.withVideo}

📹 RECORDING DETAILS:`;

                          if (recordings.list.length > 0) {
                            recordings.list.forEach((rec: any, index: number) => {
                              if (rec.error) {
                                debugInfo += `\n${index + 1}. ERROR: ${rec.error}`;
                              } else {
                                debugInfo += `\n${index + 1}. ${rec.name}
   • Meeting: ${rec.meetingId}
   • Status: ${rec.state} | Published: ${rec.published ? '✅' : '❌'}
   • Video URL: ${rec.videoUrl ? '✅ Available' : '❌ Missing'}
   • Can Process: ${rec.canProcess ? '✅ YES' : '❌ NO'}
   • Duration: ${rec.duration || 0} minutes`;
                              }
                            });
                          } else {
                            debugInfo += '\n❌ No recordings found';
                          }

                          debugInfo += `\n\n🛠️ TROUBLESHOOTING:`;
                          Object.entries(troubleshooting).forEach(([key, value]) => {
                            if (value) {
                              debugInfo += `\n• ${value}`;
                            }
                          });

                          debugInfo += `\n\n🚀 NEXT STEPS:`;
                          data.nextSteps.forEach((step: string, index: number) => {
                            debugInfo += `\n${index + 1}. ${step}`;
                          });

                          alert(debugInfo);
                          
                          // Provide specific guidance
                          if (summary.canProcessNow > 0) {
                            toast.success(`🎉 ${summary.canProcessNow} recording(s) are ready for processing!`);
                            toast.info('Click "Process All Recordings" to download and upload to S3.');
                          } else if (recordings.unpublished > 0) {
                            toast.warning(`⏳ ${recordings.unpublished} recording(s) are still being processed by BigBlueButton.`);
                            toast.info('Wait 2-5 more minutes and try again.');
                          } else if (recordings.total === 0) {
                            toast.info('ℹ️ No recordings found. Create a test class with recording enabled.');
                          } else {
                            toast.warning('⚠️ Recordings found but cannot be processed. Check troubleshooting info.');
                          }
                        } else {
                          alert('❌ Debug failed:\n\n' + data.error + '\n\nTroubleshooting:\n' + 
                                Object.values(data.troubleshooting || {}).join('\n'));
                        }
                      } catch (error) {
                        console.error('❌ Debug failed:', error);
                        alert('❌ Debug failed: ' + error);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-600"
                  >
                    Debug BBB Recordings
                  </Button>
                  
                  <Button 
                    onClick={async () => {
                      if (!confirm('🚀 This will download ALL 13 recordings from BigBlueButton and upload them to S3. This may take several minutes. Continue?')) {
                        return;
                      }
                      
                      try {
                        toast.info('🔄 Processing all BBB recordings... This will take a few minutes.', { duration: 10000 });
                        
                        const response = await fetch('/api/process-all-bbb-recordings', {
                          method: 'POST'
                        });
                        const data = await response.json();
                        
                        console.log('📊 BBB processing result:', data);
                        
                        if (data.success) {
                          const info = `
🎉 BBB Recording Processing Complete!

📊 RESULTS:
• Total recordings found: ${data.totalRecordings}
• Successfully processed: ${data.processedRecordings}
• Skipped: ${data.skippedRecordings}
• Errors: ${data.errorRecordings}

📁 S3 LOCATION:
${data.s3Folder}

📝 DETAILED RESULTS:
${data.processResults.slice(0, 5).map((result: any) => 
  `${result.index}. ${result.name || 'Unknown'} - ${result.status.toUpperCase()}${result.className ? ` (${result.className})` : ''}`
).join('\n')}${data.processResults.length > 5 ? `\n... and ${data.processResults.length - 5} more` : ''}

${data.processedRecordings > 0 
  ? '✅ SUCCESS! Videos are now uploaded to S3 and available to students!' 
  : '⚠️ No recordings were processed. Check the detailed results above.'}`;
                          
                          alert(info);
                          
                          if (data.processedRecordings > 0) {
                            toast.success(`🎉 ${data.processedRecordings} recordings uploaded to S3!`);
                            toast.info('📁 Check: techpratham-image-storage/module_recordings/', { duration: 8000 });
                            
                            // Refresh classes to show new recordings
                            if (trainerInfo) {
                              fetchScheduledClasses(trainerInfo._id || trainerInfo.trainerId);
                            }
                          } else {
                            toast.warning('⚠️ No recordings were processed.');
                          }
                        } else {
                          alert('❌ Processing failed:\n\n' + data.error);
                          toast.error('❌ Processing failed. Check console for details.');
                        }
                      } catch (error) {
                        console.error('❌ Processing failed:', error);
                        alert('❌ Processing failed: ' + error);
                        toast.error('❌ Network error occurred.');
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-600"
                  >
                    📥 Download All BBB Videos
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Classes */}
        {scheduledClasses.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Your Scheduled Classes</h2>
            
            {scheduledClasses.map((classItem) => {
              const statusInfo = getClassStatus(classItem);
              const canJoin = canJoinClass(classItem);
              
              return (
                <Card key={classItem._id} className="border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {classItem.moduleTitle}
                          </h3>
                          <Badge className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <p className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(classItem.scheduledDate).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          <p className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {classItem.scheduledTime} ({classItem.duration} minutes)
                          </p>
                          <p className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {classItem.courseTitle} - {classItem.batchName}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 items-end">
                        {/* Join Button */}
                        <Button
                          onClick={() => handleJoinClass(classItem)}
                          disabled={joiningClass === classItem._id}
                          className={`${
                            classItem.isLive 
                              ? 'bg-red-600 hover:bg-red-700' 
                              : 'bg-green-600 hover:bg-green-700'
                          } text-white`}
                        >
                          {joiningClass === classItem._id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Joining...
                            </>
                          ) : (
                            <>
                              <PlayCircle className="h-4 w-4 mr-2" />
                              {classItem.isLive ? 'Join Live Class' : 'Start Class'}
                            </>
                          )}
                        </Button>

                        {/* Manual Upload Button - Show for any class */}
                        <Button
                          onClick={() => {
                            // Create a file input element
                            const fileInput = document.createElement('input');
                            fileInput.type = 'file';
                            fileInput.accept = 'video/*';
                            fileInput.onchange = async (e) => {
                              const target = e.target as HTMLInputElement;
                              const file = target.files?.[0];
                              
                              if (file) {
                                try {
                                  toast.info(`📤 Uploading ${file.name} to S3...`);
                                  
                                  const formData = new FormData();
                                  formData.append('file', file);
                                  formData.append('classId', classItem._id);
                                  formData.append('title', `${classItem.moduleTitle} - Manual Upload`);
                                  formData.append('description', 'Manually uploaded video recording');
                                  formData.append('uploadedBy', trainerInfo?.name || 'Trainer');
                                  
                                  const uploadResponse = await fetch('/api/module-class/recordings', {
                                    method: 'POST',
                                    body: formData
                                  });
                                  
                                  const uploadData = await uploadResponse.json();
                                  
                                  if (uploadData.success) {
                                    toast.success('✅ Video uploaded successfully to S3!');
                                    toast.info('🎥 Video is now available to students.');
                                    
                                    // Refresh the classes list
                                    if (trainerInfo) {
                                      fetchScheduledClasses(trainerInfo._id || trainerInfo.trainerId);
                                    }
                                  } else {
                                    throw new Error(uploadData.error || 'Upload failed');
                                  }
                                } catch (error: any) {
                                  toast.error('❌ Upload failed: ' + error.message);
                                }
                              }
                            };
                            fileInput.click();
                          }}
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Video
                        </Button>

                        {/* End & Upload Button - Show for live classes */}
                        {statusInfo.status === 'live' && (
                          <Button
                            onClick={async () => {
                              if (confirm('End this class and automatically upload the recording to S3?\n\nThis will:\n1. End the BigBlueButton meeting\n2. Wait for recording to process\n3. Download and upload to AWS S3\n4. Make video available to students')) {
                                try {
                                  setProcessingRecordings(classItem._id);
                                  
                                  toast.info('🔚 Ending class and uploading recording...');
                                  
                                  // Use the working end-class API
                                  const response = await fetch('/api/end-class', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      classId: classItem._id,
                                      meetingId: activeMeeting?.meetingId || `class-${classItem._id}`,
                                      moderatorPW: 'tp2024'
                                    })
                                  });
                                  
                                  const data = await response.json();
                                  
                                  if (data.success) {
                                    if (data.recordingsProcessed > 0) {
                                      toast.success(`🎉 Class ended and ${data.recordingsProcessed} recording(s) uploaded to S3!`);
                                      toast.info(`📁 Recordings are now available to students in their course materials`);
                                      
                                      // Show recording details
                                      if (data.recordings && data.recordings.length > 0) {
                                        console.log('📹 Uploaded recordings:', data.recordings);
                                        const recordingTitles = data.recordings.map((r: any) => r.title).join(', ');
                                        toast.info(`📹 Recordings: ${recordingTitles}`);
                                      }
                                    } else {
                                      toast.success('✅ Class ended successfully!');
                                      toast.warning('⚠️ No recordings found yet - they may still be processing');
                                      toast.info('💡 Recording will automatically appear when ready, or use "Get Recordings" button in 2-5 minutes');
                                    }
                                    
                                    // Clear active meeting
                                    localStorage.removeItem('activeBBBMeeting');
                                    setActiveMeeting(null);
                                    
                                  } else {
                                    throw new Error(data.error || data.message);
                                  }
                                  
                                  // Refresh the classes list
                                  if (trainerInfo) {
                                    fetchScheduledClasses(trainerInfo._id || trainerInfo.trainerId);
                                  }
                                  
                                } catch (error: any) {
                                  console.error('End & Upload error:', error);
                                  toast.error('❌ Failed to end class and upload: ' + error.message);
                                  toast.info('💡 Try using "Get Recordings" button in a few minutes');
                                } finally {
                                  setProcessingRecordings(null);
                                }
                              }
                            }}
                            disabled={processingRecordings === classItem._id}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            {processingRecordings === classItem._id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                End & Upload
                              </>
                            )}
                          </Button>
                        )}



                        {/* Check BBB Recordings Button - Show for completed classes */}
                        {(statusInfo.status === 'completed' || statusInfo.status === 'expired') && (
                          <Button
                            onClick={async () => {
                              try {
                                toast.info('🔍 Checking BBB server for this class...');
                                
                                // First check BBB server configuration
                                const configResponse = await fetch('/api/check-bbb-recording-config');
                                const configData = await configResponse.json();
                                
                                // Then check specific recordings for this meeting
                                const recordingsResponse = await fetch(`/api/debug-bbb-recordings`);
                                const recordingsData = await recordingsResponse.json();
                                
                                console.log('Class BBB check:', { configData, recordingsData });
                                
                                if (configData.success && recordingsData.success) {
                                  const hasRecordings = configData.recordings.total > 0;
                                  const classRecordings = recordingsData.recordings.list.filter((rec: any) => 
                                    rec.meetingId && rec.meetingId.includes(classItem._id)
                                  );
                                  
                                  let info = `
🔍 BBB Check for: ${classItem.moduleTitle}

🔧 SERVER STATUS:
• BBB Connection: ${configData.summary.bbbServerWorking ? '✅' : '❌'}
• Recording Feature: ${configData.summary.canCreateRecordingMeetings ? '✅ Enabled' : '❌ Disabled'}
• Total BBB Recordings: ${configData.recordings.total}

📹 CLASS RECORDINGS:
${classRecordings.length > 0 
  ? classRecordings.map((rec: any) => `• ${rec.name} (${rec.state})`).join('\n')
  : '❌ No recordings found for this class'}

${!hasRecordings 
  ? '\n💡 SOLUTION: Use "Upload Video" button to manually upload recordings'
  : classRecordings.length > 0 
  ? '\n✅ NEXT: Use "Get Recordings" to process these recordings'
  : '\n⚠️ Recordings exist on server but not for this specific class'}`;
                                
                                  alert(info);
                                  
                                  if (classRecordings.length > 0) {
                                    toast.success('🎉 Found recordings for this class!');
                                  } else if (hasRecordings) {
                                    toast.info('📹 BBB has recordings but none for this specific class.');
                                  } else {
                                    toast.warning('⚠️ No recordings found on BBB server. Use manual upload.');
                                  }
                                } else {
                                  toast.error('❌ Cannot check BBB server. Use manual upload instead.');
                                }
                              } catch (error: any) {
                                console.error('Class BBB check failed:', error);
                                toast.error('❌ Check failed: ' + error.message);
                              }
                            }}
                            variant="outline"
                            className="text-purple-600 border-purple-600 hover:bg-purple-50"
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Check BBB
                          </Button>
                        )}

                        {/* Recording Processing Button - Show for completed classes */}
                        {(statusInfo.status === 'completed' || statusInfo.status === 'expired') && (
                          <>
                            <Button
                              onClick={() => handleProcessRecordings(classItem)}
                              disabled={processingRecordings === classItem._id}
                              variant="outline"
                              className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            >
                              {processingRecordings === classItem._id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4 mr-2" />
                                  Get Recordings
                                </>
                              )}
                            </Button>

                            {/* Download to Local Button */}
                            <Button
                              onClick={async () => {
                                try {
                                  toast.info('🔍 Finding working video URL from BBB...');

                                  const meetingId = `class-${classItem._id}`;
                                  const response = await fetch(`/api/test-bbb-video-download?meetingId=${meetingId}`);
                                  const data = await response.json();

                                  console.log('BBB Video Test Result:', data);

                                  if (data.success && data.results.workingUrl) {
                                    const workingUrl = data.results.workingUrl;
                                    const sizeInMB = (data.results.workingUrlSize / 1024 / 1024).toFixed(2);

                                    toast.info(`⬇️ Downloading video (${sizeInMB} MB)...`);

                                    // Download the video file
                                    const videoResponse = await fetch(workingUrl);
                                    const videoBlob = await videoResponse.blob();

                                    // Create download link
                                    const downloadUrl = window.URL.createObjectURL(videoBlob);
                                    const link = document.createElement('a');
                                    link.href = downloadUrl;
                                    link.download = `${classItem.moduleTitle || 'recording'}_${Date.now()}.mp4`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(downloadUrl);

                                    toast.success('✅ Video downloaded to local successfully!');
                                    toast.info(`💾 File size: ${(videoBlob.size / 1024 / 1024).toFixed(2)} MB`);
                                  } else if (data.results.testedUrls && data.results.testedUrls.length > 0) {
                                    // Show what was tested
                                    const testedInfo = data.results.testedUrls.map((u: any) =>
                                      `• ${u.type}: ${u.url} (${u.contentLength || 'failed'})`
                                    ).join('\n');

                                    toast.error('❌ No working video URL found');
                                    alert(`Tested URLs:\n${testedInfo}\n\nYour BBB server may not have MP4 recording enabled.`);
                                  } else {
                                    toast.error('❌ No recordings found on BBB server');
                                  }
                                } catch (error: any) {
                                  console.error('Download error:', error);
                                  toast.error('❌ Download failed: ' + error.message);
                                }
                              }}
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download Local
                            </Button>
                          </>
                        )}

                        {/* Status Messages */}
                        {statusInfo.status === 'scheduled' && (
                          <p className="text-xs text-gray-500 text-right">
                            You can join 15 minutes before class starts
                          </p>
                        )}
                        
                        {statusInfo.status === 'expired' && (
                          <p className="text-xs text-red-500 text-right">
                            Class time has passed
                          </p>
                        )}

                        {!classItem.bbbModeratorJoinUrl && (
                          <div className="flex items-center gap-1 text-xs text-red-500">
                            <AlertCircle className="h-3 w-3" />
                            No meeting link
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-gray-200">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Scheduled Classes</h3>
              <p className="text-gray-500">
                You don't have any scheduled classes at the moment.
              </p>
              <Button 
                onClick={() => router.push('/trainer/course-modules')}
                className="mt-4"
                variant="outline"
              >
                Schedule New Class
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => router.push('/trainer/course-modules')}
              variant="outline" 
              className="w-full justify-start"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule New Class
            </Button>
            <Button 
              onClick={() => router.push('/trainer/students')}
              variant="outline" 
              className="w-full justify-start"
            >
              <Users className="h-4 w-4 mr-2" />
              View Students
            </Button>
            <Button 
              onClick={() => router.push('/trainer/dashboard')}
              variant="outline" 
              className="w-full justify-start"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
            
            {/* Debug Test Button - For completed classes */}
            <Button 
              onClick={async () => {
                const completedClass = scheduledClasses.find(cls => cls.status === 'completed');
                if (!completedClass) {
                  toast.error('No completed classes found to test');
                  return;
                }
                
                try {
                  toast.info('🕵️ Running comprehensive End & Upload diagnostic...', { duration: 10000 });
                  
                  const response = await fetch('/api/debug-end-upload-issue', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ classId: completedClass._id })
                  });
                  
                  const data = await response.json();
                  
                  if (data.success) {
                    const bbb = data.bbbResults;
                    const recordings = data.recordings;
                    
                    let message = `🕵️ COMPREHENSIVE DIAGNOSTIC for ${data.classInfo.title}\n\n`;
                    message += `📊 BBB SERVER:\n`;
                    message += `• Connection: ${bbb.serverAccessible ? '✅ Working' : '❌ Failed'}\n`;
                    message += `• Total BBB Recordings: ${bbb.totalRecordings}\n`;
                    message += `• Target Meeting ID: ${bbb.targetMeetingId}\n`;
                    message += `• Target Recordings: ${bbb.targetRecordings}\n`;
                    message += `• DB Recordings: ${data.classInfo.dbRecordings}\n\n`;
                    
                    message += `🎯 TARGET RECORDINGS:\n`;
                    if (recordings.target.length > 0) {
                      recordings.target.forEach((rec: any, i: number) => {
                        message += `${i + 1}. ${rec.name} - ${rec.published ? '✅' : '⏳'} ${rec.state} ${rec.hasVideoUrl ? '🎥' : '❌'}\n`;
                      });
                    } else {
                      message += `❌ No recordings found for meeting: ${bbb.targetMeetingId}\n`;
                    }
                    
                    message += `\n🔍 DIAGNOSIS:\n`;
                    data.diagnosis.forEach((d: string) => message += d + '\n');
                    
                    if (data.testResult) {
                      message += `\n🧪 TEST RESULT:\n`;
                      message += `• Success: ${data.testResult.success ? '✅' : '❌'}\n`;
                      message += `• Processed: ${data.testResult.totalProcessed || 0}\n`;
                      message += `• Skipped: ${data.testResult.totalSkipped || 0}\n`;
                      if (data.testResult.error) {
                        message += `• Error: ${data.testResult.error}\n`;
                      }
                    }
                    
                    alert(message);
                    
                    // Show specific guidance based on results
                    if (bbb.targetRecordings === 0) {
                      toast.error('❌ No recordings found! Recording was not started during the meeting or meeting ID is wrong.');
                      toast.info('💡 Start recording in BBB by clicking the red record button during class.');
                    } else if (data.testResult && data.testResult.totalProcessed > 0) {
                      toast.success('✅ Recordings processed! Check if they appear in the interface now.');
                      // Refresh classes
                      if (trainerInfo) {
                        fetchScheduledClasses(trainerInfo._id || trainerInfo.trainerId);
                      }
                    } else {
                      toast.warning('⚠️ Recordings found but not processed. Check the detailed diagnostic above.');
                    }
                  } else {
                    alert('❌ Diagnostic failed: ' + data.error);
                  }
                } catch (error: any) {
                  toast.error('Test error: ' + error.message);
                }
              }}
              variant="outline" 
              className="w-full justify-start text-blue-600 border-blue-600"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              🕵️ Diagnose End & Upload
            </Button>

            {/* Video Playback Test Button */}
            <Button 
              onClick={async () => {
                // Find a class with recordings
                const classWithRecordings = scheduledClasses.find(cls => 
                  cls.status === 'completed' && 
                  (cls as any).recordings && 
                  (cls as any).recordings.length > 0
                );
                
                if (!classWithRecordings) {
                  toast.error('No classes with recordings found to test video playback');
                  return;
                }
                
                const recording = (classWithRecordings as any).recordings[0];
                const videoUrl = recording.url;
                
                try {
                  toast.info('🎥 Testing video playback...', { duration: 8000 });
                  
                  const response = await fetch('/api/test-video-playback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      videoUrl: videoUrl, 
                      classId: classWithRecordings._id 
                    })
                  });
                  
                  const data = await response.json();
                  
                  if (data.success) {
                    let message = `🎥 VIDEO PLAYBACK TEST RESULTS\n\n`;
                    message += `📹 Video: ${recording.title}\n`;
                    message += `🔗 URL: ${videoUrl}\n\n`;
                    
                    message += `🧪 TESTS:\n`;
                    message += `• URL Format: ${data.tests.urlFormat.isHttps ? '✅' : '❌'} HTTPS, ${data.tests.urlFormat.format} format\n`;
                    
                    if (data.tests.s3Object) {
                      message += `• S3 Object: ${data.tests.s3Object.exists ? '✅' : '❌'} ${data.tests.s3Object.exists ? `Exists (${Math.round(data.tests.s3Object.size / 1024 / 1024)}MB)` : 'Not found'}\n`;
                    }
                    
                    if (data.tests.httpAccess) {
                      message += `• HTTP Access: ${data.tests.httpAccess.accessible ? '✅' : '❌'} Status ${data.tests.httpAccess.status}\n`;
                      message += `• CORS Headers: ${data.tests.httpAccess.headers.accessControlAllowOrigin ? '✅' : '⚠️'} ${data.tests.httpAccess.headers.accessControlAllowOrigin || 'Missing'}\n`;
                    }
                    
                    message += `\n❌ ISSUES:\n`;
                    if (data.issues.length === 0) {
                      message += `✅ No issues found - video should play correctly!\n`;
                    } else {
                      data.issues.forEach((issue: string) => message += issue + '\n');
                    }
                    
                    message += `\n🔧 RECOMMENDATIONS:\n`;
                    data.recommendations.forEach((rec: string) => message += rec + '\n');
                    
                    alert(message);
                    
                    if (data.issues.length > 0) {
                      toast.warning(`⚠️ Found ${data.issues.length} video playback issue(s). Check the detailed report.`);
                      
                      if (data.issues.some((i: string) => i.includes('CORS'))) {
                        toast.info('💡 Try fixing S3 CORS configuration with the "Fix S3 CORS" button below.');
                      }
                    } else {
                      toast.success('✅ Video should play correctly!');
                    }
                  } else {
                    alert('❌ Video test failed: ' + data.error);
                  }
                } catch (error: any) {
                  toast.error('Video test error: ' + error.message);
                }
              }}
              variant="outline" 
              className="w-full justify-start text-green-600 border-green-600"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              🎥 Test Video Playback
            </Button>

            {/* Fix S3 CORS Button */}
            <Button 
              onClick={async () => {
                if (!confirm('Fix S3 CORS configuration for video playback?\n\nThis will set CORS headers to allow videos to play in browsers.')) {
                  return;
                }
                
                try {
                  toast.info('🔧 Fixing S3 CORS configuration...');
                  
                  const response = await fetch('/api/fix-s3-cors', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'set' })
                  });
                  
                  const data = await response.json();
                  
                  if (data.success) {
                    toast.success('✅ S3 CORS configuration updated for video playback!');
                    toast.info('🎥 Try playing videos now - they should work correctly.');
                    
                    console.log('CORS configuration:', data.corsConfiguration);
                  } else {
                    toast.error('❌ Failed to update CORS: ' + data.error);
                  }
                } catch (error: any) {
                  toast.error('CORS fix error: ' + error.message);
                }
              }}
              variant="outline" 
              className="w-full justify-start text-purple-600 border-purple-600"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              🔧 Fix S3 CORS
            </Button>

            {/* Compare Working vs Broken Videos */}
            <Button 
              onClick={async () => {
                const classWithMultipleRecordings = scheduledClasses.find(cls => 
                  cls.status === 'completed' && 
                  (cls as any).recordings && 
                  (cls as any).recordings.length > 1
                );
                
                if (!classWithMultipleRecordings) {
                  toast.error('Need a class with multiple recordings to compare');
                  toast.info('💡 This compares working vs broken videos to find differences');
                  return;
                }
                
                try {
                  toast.info('🔍 Comparing working vs broken videos...', { duration: 10000 });
                  
                  const response = await fetch('/api/compare-video-urls', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ classId: classWithMultipleRecordings._id })
                  });
                  
                  const data = await response.json();
                  
                  if (data.success) {
                    let message = `🔍 VIDEO COMPARISON ANALYSIS for ${data.className}\n\n`;
                    message += `📊 SUMMARY:\n`;
                    message += `• Total Videos: ${data.totalVideos}\n`;
                    message += `• Working Videos: ${data.workingVideos} ✅\n`;
                    message += `• Broken Videos: ${data.brokenVideos} ❌\n\n`;
                    
                    if (data.differences.length > 0) {
                      message += `🔍 KEY DIFFERENCES:\n`;
                      data.differences.forEach((diff: string) => message += diff + '\n');
                      message += '\n';
                    }
                    
                    if (data.summary.workingPattern) {
                      message += `✅ WORKING VIDEO PATTERN:\n`;
                      message += `• Folder: ${data.summary.workingPattern.folder}\n`;
                      message += `• Upload Method: ${data.summary.workingPattern.uploadMethod}\n`;
                      message += `• Content-Type: ${data.summary.workingPattern.contentType}\n\n`;
                    }
                    
                    if (Object.keys(data.summary.commonIssues).length > 0) {
                      message += `❌ COMMON ISSUES:\n`;
                      Object.entries(data.summary.commonIssues).forEach(([issue, count]) => {
                        message += `• ${issue} (${count} videos)\n`;
                      });
                    }
                    
                    alert(message);
                    
                    // Detailed analysis in console
                    console.log('📊 Detailed Video Analysis:', data.videoAnalysis);
                    
                    if (data.brokenVideos > 0) {
                      toast.warning(`⚠️ Found ${data.brokenVideos} broken video(s). Check the analysis report.`);
                      
                      if (Object.keys(data.summary.commonIssues).some(issue => issue.includes('CORS'))) {
                        toast.info('💡 CORS issues detected - try "Fix S3 CORS" button');
                      }
                      
                      if (Object.keys(data.summary.commonIssues).some(issue => issue.includes('Content-Type'))) {
                        toast.info('💡 Content-Type issues detected - videos need re-upload with correct format');
                      }
                    } else {
                      toast.success('✅ All videos look good!');
                    }
                  } else {
                    alert('❌ Video comparison failed: ' + data.error);
                  }
                } catch (error: any) {
                  toast.error('Comparison error: ' + error.message);
                }
              }}
              variant="outline" 
              className="w-full justify-start text-orange-600 border-orange-600"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              🔍 Compare Working vs Broken Videos
            </Button>

            {/* Fix Broken Videos Button */}
            <Button 
              onClick={async () => {
                const classWithRecordings = scheduledClasses.find(cls => 
                  cls.status === 'completed' && 
                  (cls as any).recordings && 
                  (cls as any).recordings.length > 0
                );
                
                if (!classWithRecordings) {
                  toast.error('Need a class with recordings to fix videos');
                  return;
                }

                if (!confirm(`Fix broken videos in class: ${classWithRecordings.moduleTitle}?\n\nThis will:\n• Check all videos for issues\n• Fix Content-Type and CORS problems\n• Update S3 metadata\n\nProceed?`)) {
                  return;
                }
                
                try {
                  toast.info('🔧 Analyzing and fixing broken videos...', { duration: 15000 });
                  
                  // First analyze
                  const analyzeResponse = await fetch('/api/fix-broken-videos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      classId: classWithRecordings._id,
                      action: 'analyze'
                    })
                  });
                  
                  const analyzeData = await analyzeResponse.json();
                  
                  if (analyzeData.success && analyzeData.brokenVideos > 0) {
                    toast.warning(`Found ${analyzeData.brokenVideos} broken videos. Attempting to fix...`);
                    
                    // Now fix them
                    const fixResponse = await fetch('/api/fix-broken-videos', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        classId: classWithRecordings._id,
                        action: 'fix'
                      })
                    });
                    
                    const fixData = await fixResponse.json();
                    
                    if (fixData.success) {
                      let message = `🔧 VIDEO FIX RESULTS for ${fixData.className}\n\n`;
                      message += `📊 SUMMARY:\n`;
                      message += `• Total Videos: ${fixData.totalVideos}\n`;
                      message += `• Working Videos: ${fixData.workingVideos} ✅\n`;
                      message += `• Broken Videos: ${fixData.brokenVideos} ❌\n`;
                      message += `• Fixed Videos: ${fixData.fixedVideos} 🔧\n\n`;
                      
                      if (Object.keys(fixData.summary.commonIssues).length > 0) {
                        message += `🔧 ISSUES FIXED:\n`;
                        Object.entries(fixData.summary.commonIssues).forEach(([issue, count]) => {
                          message += `• ${issue} (${count} videos)\n`;
                        });
                      }
                      
                      alert(message);
                      
                      if (fixData.fixedVideos > 0) {
                        toast.success(`✅ Fixed ${fixData.fixedVideos} video(s)! Try playing them now.`);
                        
                        // Refresh the classes list
                        if (trainerInfo) {
                          fetchScheduledClasses(trainerInfo._id || trainerInfo.trainerId);
                        }
                      } else if (fixData.brokenVideos === 0) {
                        toast.success('✅ All videos are already working correctly!');
                      } else {
                        toast.warning('⚠️ Could not fix all videos - check detailed report above');
                      }
                    }
                  } else if (analyzeData.success && analyzeData.brokenVideos === 0) {
                    toast.success('✅ All videos are working correctly! No fixes needed.');
                  }
                } catch (error: any) {
                  toast.error('Video fix error: ' + error.message);
                }
              }}
              variant="outline" 
              className="w-full justify-start text-red-600 border-red-600"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              🔧 Fix Broken Videos
            </Button>

            {/* Clean Up Tiny Junk Files Button */}
            <Button 
              onClick={async () => {
                if (!confirm('⚠️ CLEAN UP JUNK VIDEO FILES?\n\nBased on your S3 listing, all July 2026 videos are only 862 bytes (not real videos).\n\nThis will:\n• Analyze what these tiny files contain\n• Delete broken 862-byte files\n• Clean up S3 storage\n\nProceed?')) {
                  return;
                }
                
                try {
                  toast.info('🔍 Analyzing tiny video files in S3...', { duration: 10000 });
                  
                  // First analyze the files
                  const analyzeResponse = await fetch('/api/fix-tiny-video-files', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'analyze' })
                  });
                  
                  const analyzeData = await analyzeResponse.json();
                  
                  if (analyzeData.success) {
                    let message = `🔍 TINY FILE ANALYSIS RESULTS\n\n`;
                    message += `📊 SUMMARY:\n`;
                    message += `• Total Files Checked: ${analyzeData.totalAnalyzed}\n`;
                    message += `• Suspicious Files: ${analyzeData.suspiciousFiles} ❌\n`;
                    message += `• Valid Files: ${analyzeData.validFiles} ✅\n\n`;
                    
                    message += `🚨 ISSUE IDENTIFIED:\n`;
                    message += `${analyzeData.summary.issue}\n\n`;
                    
                    message += `🔧 ROOT CAUSE:\n`;
                    message += `${analyzeData.summary.cause}\n\n`;
                    
                    message += `💡 NEXT STEPS:\n`;
                    analyzeData.summary.nextSteps.forEach((step: string) => {
                      message += `• ${step}\n`;
                    });
                    
                    alert(message);
                    
                    if (analyzeData.suspiciousFiles > 0) {
                      if (confirm(`Found ${analyzeData.suspiciousFiles} junk files to delete.\n\nDelete these broken 862-byte files now?`)) {
                        toast.info('🗑️ Deleting junk files...', { duration: 8000 });
                        
                        const deleteResponse = await fetch('/api/fix-tiny-video-files', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'delete' })
                        });
                        
                        const deleteData = await deleteResponse.json();
                        
                        if (deleteData.success) {
                          toast.success(`✅ Deleted ${deleteData.deletedFiles} junk files from S3!`);
                          toast.info('💡 Now fix the BBB recording download process and re-record classes.');
                        }
                      }
                    } else {
                      toast.success('✅ No junk files found - all videos look good!');
                    }
                  }
                } catch (error: any) {
                  toast.error('Cleanup error: ' + error.message);
                }
              }}
              variant="outline" 
              className="w-full justify-start text-yellow-600 border-yellow-600"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              🗑️ Clean Up 862-Byte Junk Files
            </Button>

            {/* View All BBB Recordings Button */}
            <Button 
              onClick={() => {
                // Open BBB recordings page in new tab
                window.open('/view-bbb-recordings', '_blank');
              }}
              variant="outline" 
              className="w-full justify-start text-indigo-600 border-indigo-600"
            >
              <Video className="h-4 w-4 mr-2" />
              📹 View All BBB Recordings
            </Button>

            {/* Download BBB Recordings Locally Button */}
            <Button 
              onClick={() => {
                // Open BBB recordings viewer in new tab
                window.open('/view-bbb-recordings', '_blank');
              }}
              variant="outline" 
              className="w-full justify-start text-green-600 border-green-600"
            >
              <FolderDown className="h-4 w-4 mr-2" />
              📺 View BBB Recordings
            </Button>
          </CardContent>
        </Card>
      </div>
    </TrainerLayout>
  );
};

export default TrainerJoinClass;