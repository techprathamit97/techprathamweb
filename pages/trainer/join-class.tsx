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
  FileVideo
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

  useEffect(() => {
    const storedData = localStorage.getItem('trainer');
    if (!storedData) {
      router.push('/trainer/login');
      return;
    }

    const trainer = JSON.parse(storedData);
    setTrainerInfo(trainer);
    fetchScheduledClasses(trainer._id || trainer.trainerId);

    // Poll every 30 seconds to update class status
    const interval = setInterval(() => {
      fetchScheduledClasses(trainer._id || trainer.trainerId);
    }, 30000);

    // Start automatic meeting monitoring when there are live classes
    const monitorInterval = setInterval(async () => {
      try {
        // Check if there are any live classes
        const hasLiveClasses = scheduledClasses.some(cls => cls.isLive || cls.status === 'live');
        
        if (hasLiveClasses && !monitoringActive) {
          console.log('🔍 Starting automatic meeting monitoring...');
          setMonitoringActive(true);
          
          const response = await fetch('/api/monitor-meetings', {
            method: 'POST'
          });
          
          const data = await response.json();
          console.log('Meeting monitor result:', data);
          
          if (data.success && data.classesEnded > 0) {
            toast.success(`${data.classesEnded} class(es) ended. Recordings are being processed automatically!`);
            
            // Refresh the classes list to show updated status
            fetchScheduledClasses(trainer._id || trainer.trainerId);
          }
          
          setMonitoringActive(false);
        }
      } catch (error) {
        console.error('Meeting monitoring error:', error);
        setMonitoringActive(false);
      }
    }, 45000); // Check every 45 seconds

    return () => {
      clearInterval(interval);
      clearInterval(monitorInterval);
    };
  }, [scheduledClasses, monitoringActive]);

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
        
        // Open directly - this bypasses Greenlight authentication
        window.open(data.joinUrl, '_blank', 'width=1200,height=800');
        
        toast.success(`Joining BigBlueButton: ${data.className}`);
        
        if (data.meetingCreated) {
          toast.info('Meeting created successfully! You can now admit students.', { duration: 5000 });
        }

        // Start monitoring this meeting for automatic recording processing
        setTimeout(() => {
          toast.info('🎬 Automatic recording processing is now active. Recordings will upload to S3 when you leave the meeting.', { duration: 7000 });
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
      console.log('Processing BBB recordings for class:', classItem._id);
      
      const response = await fetch('/api/process-bbb-recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: classItem._id,
          meetingId: `class-${classItem._id}`
        })
      });

      const data = await response.json();
      console.log('Recording processing response:', data);

      if (data.success) {
        if (data.totalProcessed > 0) {
          toast.success(`Successfully processed ${data.totalProcessed} recording(s) from BigBlueButton!`);
          toast.info(`Recordings have been uploaded to AWS S3 and are now available to students.`);
          
          // Refresh the classes list to show updated recording count
          if (trainerInfo) {
            fetchScheduledClasses(trainerInfo._id || trainerInfo.trainerId);
          }
        } else {
          toast.info('No new recordings found to process. Recordings may still be processing in BigBlueButton.');
        }
        
  const handleProcessRecordings = async (classItem: ScheduledClass) => {
    setProcessingRecordings(classItem._id);
    
    try {
      console.log('Processing BBB recordings for class:', classItem._id);
      
      const response = await fetch('/api/process-bbb-recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: classItem._id,
          meetingId: `class-${classItem._id}`
        })
      });

      const data = await response.json();
      console.log('Recording processing response:', data);

      if (data.success) {
        if (data.totalProcessed > 0) {
          toast.success(`Successfully processed ${data.totalProcessed} recording(s) from BigBlueButton!`);
          toast.info(`Recordings have been uploaded to AWS S3 and are now available to students.`);
          
          // Refresh the classes list to show updated recording count
          if (trainerInfo) {
            fetchScheduledClasses(trainerInfo._id || trainerInfo.trainerId);
          }
        } else {
          toast.info('No new recordings found to process. Recordings may still be processing in BigBlueButton.');
        }
        
        if (data.totalSkipped > 0) {
          toast.info(`${data.totalSkipped} recording(s) were skipped (already processed or not ready).`);
        }
      } else {
        throw new Error(data.error || 'Failed to process recordings');
      }
      
    } catch (error: any) {
      console.error('Recording processing error:', error);
      toast.error('Failed to process recordings: ' + error.message);
      toast.info('Note: Recordings may take a few minutes to be available in BigBlueButton after class ends.');
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

        {/* BigBlueButton Recording Info Card */}
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
                        const response = await fetch('/api/auto-process-recordings', {
                          method: 'POST'
                        });
                        const data = await response.json();
                        
                        console.log('Auto-process result:', data);
                        
                        if (data.success) {
                          const info = `
✅ Auto-Processing Results:

📊 SUMMARY:
• Classes checked: ${data.classesChecked}
• Recordings processed: ${data.totalRecordingsProcessed}

📝 CLASS DETAILS:
${data.processResults.map((result: any) => 
  `• ${result.className}: ${result.recordingsProcessed || 0} processed, ${result.recordingsSkipped || 0} skipped`
).join('\n') || 'No classes processed'}

This will automatically find completed classes and download their recordings to S3.
                          `.trim();
                          
                          alert(info);
                          
                          if (data.totalRecordingsProcessed > 0) {
                            toast.success(`Processed ${data.totalRecordingsProcessed} recordings!`);
                            // Refresh classes list to show new recordings
                            if (trainerInfo) {
                              fetchScheduledClasses(trainerInfo._id || trainerInfo.trainerId);
                            }
                          }
                        } else {
                          alert('❌ Auto-processing failed:\n\n' + data.error);
                        }
                      } catch (error) {
                        console.error('Auto-processing failed:', error);
                        alert('Auto-processing failed: ' + error);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="text-orange-600 border-orange-600"
                  >
                    Auto-Process All
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

                        {/* End Class Button - Show for live classes */}
                        {statusInfo.status === 'live' && (
                          <Button
                            onClick={async () => {
                              if (confirm('Are you sure you want to end this class? This will stop the meeting and process recordings.')) {
                                try {
                                  const response = await fetch('/api/end-class', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      classId: classItem._id,
                                      meetingId: `class-${classItem._id}`
                                    })
                                  });
                                  
                                  const data = await response.json();
                                  
                                  if (data.success) {
                                    toast.success('Class ended successfully!');
                                    toast.info('Recordings will be processed automatically in a few minutes.');
                                    
                                    // Refresh the classes list
                                    if (trainerInfo) {
                                      fetchScheduledClasses(trainerInfo._id || trainerInfo.trainerId);
                                    }
                                  } else {
                                    throw new Error(data.error);
                                  }
                                } catch (error: any) {
                                  toast.error('Failed to end class: ' + error.message);
                                }
                              }
                            }}
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            End Class
                          </Button>
                        )}

                        {/* Recording Processing Button - Show for completed classes */}
                        {(statusInfo.status === 'completed' || statusInfo.status === 'expired') && (
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
          </CardContent>
        </Card>
      </div>
    </TrainerLayout>
  );
};

export default TrainerJoinClass;