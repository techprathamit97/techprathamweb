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
  AlertTriangle,
  Plus,
  X
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

  // Schedule class modal state
  const [scheduleModal, setScheduleModal] = useState<{
    open: boolean;
    loading: boolean;
  }>({ open: false, loading: false });
  const [scheduleForm, setScheduleForm] = useState({
    batchId: '',
    moduleTitle: '',
    moduleIndex: 1,
    scheduledDate: '',
    scheduledTime: '10:00',
    duration: 60
  });
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);

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
    
    // Use the MongoDB _id if available, fallback to trainerId
    const trainerIdToUse = trainer._id || trainer.trainerId;
    console.log('Using trainer ID:', trainerIdToUse);
    
    fetchScheduledClasses(trainerIdToUse);

    // Start auto-upload service automatically
    startAutoUploadService();

    // Poll every 30 seconds to update class status
    const interval = setInterval(() => {
      fetchScheduledClasses(trainerIdToUse);
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
      // Auto-upload service not implemented yet
      console.log('Auto-upload service not implemented');
      setAutoUploadStatus('unknown');
      // Don't show error toast for missing feature
    } catch (error) {
      console.error('Auto-upload service error:', error);
      setAutoUploadStatus('stopped');
    }
  };

  const checkAutoUploadStatus = async () => {
    try {
      // Auto-upload service not implemented yet
      setAutoUploadStatus('unknown');
    } catch (error) {
      console.error('Auto-upload status check error:', error);
    }
  };

  const fetchScheduledClasses = async (trainerId: string) => {
    try {
      console.log('Fetching scheduled classes for trainer:', trainerId);
      
      // Try with the trainer _id first, then fall back to trainerId field
      let res = await fetch(`/api/trainer/course-modules?trainerId=${trainerId}`);
      let data = await res.json();

      if (!res.ok || !data.success) {
        console.log('First attempt failed, trying alternative approach...');
        
        // If failed, try to get trainer's MongoDB _id from dashboard API first
        const dashboardRes = await fetch(`/api/trainer/dashboard?trainerId=${trainerId}`);
        const dashboardData = await dashboardRes.json();
        
        if (dashboardRes.ok && dashboardData.success && dashboardData.data.trainer) {
          // Try with the MongoDB _id
          const mongoId = dashboardData.data.trainer._id || dashboardData.data.trainer.trainerId;
          console.log('Trying with MongoDB _id:', mongoId);
          
          res = await fetch(`/api/trainer/course-modules?trainerId=${mongoId}`);
          data = await res.json();
        }
      }

      if (res.ok && data.success && data.data) {
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
        console.log('Loaded scheduled classes:', allScheduledClasses);
      } else {
        console.error('Failed to fetch scheduled classes:', data);
        toast.error('Failed to load scheduled classes: ' + (data.error || 'Unknown error'));
        
        // Set empty array so UI doesn't break
        setScheduledClasses([]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load scheduled classes');
      setScheduledClasses([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available batches for scheduling
  const fetchAvailableBatches = async (trainerId: string) => {
    try {
      const res = await fetch(`/api/trainer/dashboard?trainerId=${trainerId}`);
      const data = await res.json();

      if (res.ok && data.success && data.data && data.data.batches) {
        setAvailableBatches(data.data.batches);
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  // Open schedule modal and fetch batches
  const openScheduleModal = async () => {
    setScheduleForm({
      batchId: '',
      moduleTitle: '',
      moduleIndex: 1,
      scheduledDate: '',
      scheduledTime: '10:00',
      duration: 60
    });
    setScheduleModal({ open: true, loading: false });

    // Always fetch fresh batches when opening modal
    if (trainerInfo) {
      const trainerIdToUse = trainerInfo._id || trainerInfo.trainerId;
      console.log('Fetching batches for trainer:', trainerIdToUse);
      toast.info('Loading batches...');
      
      try {
        console.log('Fetching batches for trainer:', trainerInfo._id || trainerInfo.trainerId);
        toast.info('Loading batches...');
        
        const res = await fetch(`/api/trainer/dashboard?trainerId=${trainerIdToUse}`);
        const data = await res.json();
        
        console.log('Full trainer dashboard API response:', data);
        
        if (res.ok && data.success && data.data && data.data.batches) {
          const batches = data.data.batches;
          console.log('Extracted batches:', batches);
          setAvailableBatches(batches);
          toast.success(`Loaded ${batches.length} batches`);
        } else {
          console.error('Failed to load batches:', data);
          toast.error('Failed to load batches: ' + (data.error || 'Unknown error'));
          
          // Try alternative API endpoint
          console.log('Trying alternative LMS batches API...');
          const altRes = await fetch(`/api/lms/batches?trainerId=${trainerIdToUse}`);
          const altData = await altRes.json();
          
          console.log('Alternative API response:', altData);
          
          if (altRes.ok && altData.data) {
            setAvailableBatches(altData.data);
            toast.success(`Loaded ${altData.data.length} batches from alternative API`);
          } else {
            toast.error('No batches found. Please create a batch first.');
          }
        }
      } catch (error) {
        console.error('Batch fetch error:', error);
        toast.error('Network error loading batches');
      }
    }
  };

  // Schedule a new class
  const handleScheduleClass = async () => {
    if (!scheduleForm.batchId || !scheduleForm.moduleTitle || !scheduleForm.scheduledDate || !scheduleForm.scheduledTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    setScheduleModal(prev => ({ ...prev, loading: true }));

    try {
      // Get batch info to find courseId
      const selectedBatch = availableBatches.find(b => (b._id === scheduleForm.batchId || b.batchId === scheduleForm.batchId));
      if (!selectedBatch) {
        throw new Error('Please select a valid batch');
      }

      console.log('Selected batch:', selectedBatch);
      console.log('Creating class with BBB integration...');

      // Get courseId from the selected batch
      const courseId = selectedBatch.courseId || selectedBatch._id;

      console.log('Course ID for batch:', courseId);

      const response = await fetch('/api/module-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: scheduleForm.batchId,
          courseId: courseId,
          moduleIndex: scheduleForm.moduleIndex,
          moduleTitle: scheduleForm.moduleTitle,
          trainerId: trainerInfo?._id || trainerInfo?.trainerId,
          scheduledDate: scheduleForm.scheduledDate,
          scheduledTime: scheduleForm.scheduledTime,
          duration: scheduleForm.duration,
          // BBB will auto-generate meeting link, no manual link needed
          useBBB: true, // Flag to indicate BBB integration
          autoGenerateBBB: true
        })
      });

      const data = await response.json();

      console.log('Class creation response:', data);

      if (data.success) {
        toast.success('Class scheduled successfully with BigBlueButton!');
        if (data.bbbMeetingId) {
          toast.info(`BBB Meeting ID: ${data.bbbMeetingId}`);
        }
        setScheduleModal({ open: false, loading: false });

        // Refresh scheduled classes
        if (trainerInfo) {
          const trainerIdToUse = trainerInfo._id || trainerInfo.trainerId;
          fetchScheduledClasses(trainerIdToUse);
        }
      } else {
        throw new Error(data.error || 'Failed to schedule class');
      }
    } catch (error: any) {
      console.error('Schedule error:', error);
      toast.error('Failed to schedule class: ' + error.message);
      setScheduleModal(prev => ({ ...prev, loading: false }));
    }
  };

      
     

  const handleJoinClass = async (classItem: ScheduledClass) => {
    // Prevent multiple join attempts for the same class
    if (joiningClass === classItem._id) {
      console.log('Already joining this class, preventing duplicate');
      return;
    }
    
    setJoiningClass(classItem._id);
    
    try {
      const trainerName = trainerInfo?.name || trainerInfo?.trainerName || 'Trainer';
      
      console.log('Attempting to join class via BBB API...');
      
      // Try direct BBB API first
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
        console.log('Opening BBB join URL:', data.joinUrl);

        // Store active meeting for automatic recording
        const meetingInfo = {
          classId: classItem._id,
          meetingId: data.meetingId || `class-${classItem._id}`,
          startedAt: Date.now(),
          lastSeen: Date.now()
        };
        localStorage.setItem('activeBBBMeeting', JSON.stringify(meetingInfo));
        setActiveMeeting(meetingInfo);

        // Open BBB room
        window.open(data.joinUrl, '_blank', 'width=1200,height=800');

        toast.success(`Joining BigBlueButton: ${data.className}`);

        if (data.meetingCreated) {
          toast.info('Meeting created successfully! You can now admit students.', { duration: 5000 });
        }

        setTimeout(() => {
          toast.info('🎬 Automatic recording processing is active. Recordings will upload when you leave the meeting.', { duration: 7000 });
        }, 3000);
        
      } else if (data.alreadyJoined) {
        // Handle duplicate join prevention from backend
        toast.warning(`⚠️ ${data.error}`, { duration: 6000 });
        toast.info('Please check your other browser tabs or windows to find the existing meeting.', { duration: 6000 });
      } else {
        throw new Error(data.error || 'Failed to generate join URL');
      }
      
    } catch (error: any) {
      console.error('BBB API join failed:', error);
      
      // Fallback: Show manual Greenlight instructions
      const fallbackMessage = `
BBB API access is currently having issues. 

TEMPORARY WORKAROUND:
1. Go to: https://class.techpratham.org
2. Create a room named: "${classItem.moduleTitle}"
3. Copy the room link and share with students
4. Use "Get Recordings" button after class to process recordings

We're working on fixing the direct integration.`;

      if (confirm(fallbackMessage + '\n\nWould you like to open Greenlight now?')) {
        window.open('https://class.techpratham.org', '_blank');
      }
      
      toast.error('BBB integration temporarily unavailable. Please use Greenlight directly.', { duration: 8000 });
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

       
       

       
        

       

       


        {/* Schedule New Class Button */}
        <div className="flex justify-between items-center">
          
          
          <Button
            onClick={openScheduleModal}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Schedule New Class
          </Button>
        </div>

        {/* Schedule Class Modal */}
        {scheduleModal.open && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Schedule New Class</span>
                  <button
                    onClick={() => setScheduleModal({ open: false, loading: false })}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Debug Info */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">Debug: Batch Loading</p>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p>Available batches: {availableBatches.length}</p>
                    <p>Trainer info: {trainerInfo ? `${trainerInfo.name} (${trainerInfo._id || trainerInfo.trainerId})` : 'Not loaded'}</p>
                    {availableBatches.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">First batch:</p>
                        <pre className="text-xs bg-white p-1 rounded border max-h-20 overflow-auto">
                          {JSON.stringify(availableBatches[0], null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={async () => {
                      if (trainerInfo) {
                        const trainerIdToUse = trainerInfo._id || trainerInfo.trainerId;
                        console.log('Testing API call with trainer ID:', trainerIdToUse);
                        
                        try {
                          const res = await fetch(`/api/trainer/dashboard?trainerId=${trainerIdToUse}`);
                          const data = await res.json();
                          console.log('API Response:', data);
                          toast.info(`API Response: ${res.status} - Check console for details`);
                        } catch (error) {
                          console.error('API Test Error:', error);
                          toast.error('API Test Failed - Check console');
                        }
                      }
                    }}
                    size="sm"
                    className="mt-2"
                  >
                    Test API Call
                  </Button>
                </div>

                {/* Batch Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Batch *
                  </label>
                  <select
                    value={scheduleForm.batchId}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, batchId: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select a Batch --</option>
                    {availableBatches.length === 0 ? (
                      <option value="" disabled>Loading batches...</option>
                    ) : (
                      availableBatches.map((batch) => (
                        <option key={batch._id || batch.batchId} value={batch._id || batch.batchId}>
                          {batch.batchName || batch.name || 'Unknown Batch'} - {batch.course_title || batch.courseTitle || 'Course'}
                        </option>
                      ))
                    )}
                  </select>
                  {availableBatches.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No batches found. Make sure you have created batches for your courses.
                    </p>
                  )}
                  {availableBatches.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ {availableBatches.length} batch(es) available
                    </p>
                  )}
                </div>

                {/* Module Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Module/Class Title *
                  </label>
                  <input
                    type="text"
                    value={scheduleForm.moduleTitle}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, moduleTitle: e.target.value }))}
                    placeholder="e.g., Introduction to React"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Module Index */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Module Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={scheduleForm.moduleIndex}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, moduleIndex: parseInt(e.target.value) || 1 }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={scheduleForm.scheduledDate}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time *
                    </label>
                    <input
                      type="time"
                      value={scheduleForm.scheduledTime}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <select
                    value={scheduleForm.duration}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>120 minutes</option>
                  </select>
                </div>

                {/* BBB Integration Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Video className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">BigBlueButton Integration</span>
                  </div>
                  <p className="text-xs text-blue-700">
                    Meeting room will be automatically created when you start the class. 
                    Students can join 15 minutes before the scheduled time.
                  </p>
                  <div className="mt-2 text-xs text-blue-600">
                    ✓ Automatic recording enabled<br/>
                    ✓ Screen sharing & whiteboard<br/>
                    ✓ Interactive features included
                  </div>
                </div>

                {/* Debug Info */}
                {availableBatches.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Debug: Available Batches</p>
                    <p className="text-xs text-gray-600">
                      Found {availableBatches.length} batches. First batch: {JSON.stringify(availableBatches[0], null, 2).substring(0, 200)}...
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleScheduleClass}
                    disabled={scheduleModal.loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {scheduleModal.loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Class
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setScheduleModal({ open: false, loading: false })}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
     
      </div>
    </TrainerLayout>
  );
};

export default TrainerJoinClass;