import React, { useEffect, useState, useMemo } from 'react';
import StudentLayout from '@/src/student/common/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoIcon, Calendar, User, PlayCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Recording {
  _id: string;
  topic: string;
  description: string;
  classDate: string;
  recordingUrl: string;
  batchName: string;
  trainerName: string;
}

// Group recordings by date
interface GroupedRecordings {
  date: string;
  dateLabel: string;
  recordings: Recording[];
}

const StudentRecordings = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoLoading, setVideoLoading] = useState(false);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const studentData = localStorage.getItem('student');
      if (!studentData) {
        setError('Please login first');
        setLoading(false);
        return;
      }

      const student = JSON.parse(studentData);
      console.log('=== FETCHING RECORDINGS ===');
      console.log('Student ID:', student.studentId);
      
      const response = await fetch(`/api/student/recordings?studentId=${student.studentId}`);
      const data = await response.json();

      console.log('API Response:', data);
      console.log('Success:', data.success);
      console.log('Recordings count:', data.recordings?.length);

      if (data.success) {
        console.log('Recordings:', data.recordings);
        if (data.recordings.length > 0) {
          console.log('First recording URL:', data.recordings[0].recordingUrl);
          console.log('First recording URL type:', typeof data.recordings[0].recordingUrl);
        }
        setRecordings(data.recordings);
      } else {
        console.error('API error:', data.error);
        setError(data.error || 'Failed to fetch recordings');
      }
    } catch (err: any) {
      console.error('Error fetching recordings:', err);
      setError('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Group recordings by day
  const groupedRecordings = useMemo(() => {
    const groups: Record<string, Recording[]> = {};

    recordings.forEach((recording) => {
      const dateKey = new Date(recording.classDate).toISOString().split('T')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(recording);
    });

    // Sort by date ascending (oldest first, latest at bottom)
    return Object.entries(groups)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, recs]) => ({
        date,
        dateLabel: formatDate(date),
        recordings: recs.sort((a, b) =>
          new Date(a.classDate).getTime() - new Date(b.classDate).getTime()
        )
      }));
  }, [recordings]);

  const handlePlayRecording = async (recording: Recording) => {
    console.log('=== PLAYING RECORDING ===');
    console.log('Recording object:', recording);
    console.log('Recording URL:', recording.recordingUrl);

    setSelectedRecording(recording);
    setVideoLoading(true);

    try {
      // Try to get recordings from BBB first
      console.log('Fetching BBB recordings...');
      const response = await fetch(`/api/bbb/meetings?action=recordings&meetingId=${recording._id || recording.sessionId}`);
      const data = await response.json();

      console.log('BBB recordings response:', data);

      if (data.success && data.data && data.data.length > 0) {
        console.log('✅ Using BBB playback URL');
        const bbbRecording = data.data[0];
        setVideoUrl(bbbRecording.playback?.url || recording.recordingUrl);
      } else {
        console.log('⚠️ BBB recordings not found, using direct URL');
        setVideoUrl(recording.recordingUrl);
      }
    } catch (error) {
      console.error('Error getting playback URL:', error);
      console.log('⚠️ Using direct URL as fallback');
      setVideoUrl(recording.recordingUrl);
    } finally {
      setVideoLoading(false);
    }
  };

  const handleClosePlayer = () => {
    setSelectedRecording(null);
    setVideoUrl('');
    setVideoLoading(false);
  };

  return (
    <StudentLayout>
      <div className="p-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <VideoIcon className="h-5 w-5 text-indigo-600" />
              Class Recordings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <p className="text-gray-600">Loading recordings...</p>
            ) : error ? (
              <p className="text-red-600">{error}</p>
            ) : recordings.length === 0 ? (
              <p className="text-gray-600">No recordings available yet.</p>
            ) : (
              <div className="space-y-8">
                {groupedRecordings.map((group) => (
                  <div key={group.date}>
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                      <h2 className="text-lg font-semibold text-gray-900">
                        {group.dateLabel}
                      </h2>
                      <span className="text-sm text-gray-500">
                        ({group.recordings.length} {group.recordings.length === 1 ? 'recording' : 'recordings'})
                      </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {group.recordings.map((recording) => (
                        <Card key={recording._id} className="border border-gray-200 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-3">
                              <div className="flex items-start justify-between">
                                <h3 className="font-semibold text-gray-900 line-clamp-2">
                                  {recording.topic || 'Class Recording'}
                                </h3>
                              </div>

                              {recording.description && (
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {recording.description}
                                </p>
                              )}

                              <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>{recording.trainerName}</span>
                                </div>

                                <div className="text-xs text-gray-500">
                                  Batch: {recording.batchName}
                                </div>
                              </div>

                              <Button
                                onClick={() => handlePlayRecording(recording)}
                                className="w-full mt-2"
                                variant="default"
                              >
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Watch Recording
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Video Player Modal - Matching your working implementation */}
      {selectedRecording && videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="relative w-full max-w-4xl mx-4">
            <button
              onClick={handleClosePlayer}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2 z-20"
            >
              <X className="w-8 h-8" />
            </button>

            <div className="bg-black rounded-lg overflow-hidden">
              <div className="relative w-full aspect-video">
                {videoLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white">Loading video...</div>
                  </div>
                ) : null}
                
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-cover"
                  onLoadStart={() => {
                    console.log('✅ Video loading started');
                    console.log('Video element src:', videoUrl);
                    setVideoLoading(true);
                  }}
                  onCanPlay={() => {
                    console.log('✅ Video can play');
                    setVideoLoading(false);
                  }}
                  onPlay={() => {
                    console.log('✅ Video is playing');
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLVideoElement;
                    console.error('❌ Video playback error');
                    console.error('Video URL:', videoUrl);
                    console.error('Video src attribute:', target.src);
                    console.error('Error code:', target.error?.code);
                    console.error('Error message:', target.error?.message);
                    console.error('Network state:', target.networkState);
                    console.error('Ready state:', target.readyState);
                    
                    // Error codes:
                    // 1 = MEDIA_ERR_ABORTED
                    // 2 = MEDIA_ERR_NETWORK
                    // 3 = MEDIA_ERR_DECODE
                    // 4 = MEDIA_ERR_SRC_NOT_SUPPORTED
                    
                    let errorMsg = 'Error loading video. ';
                    if (target.error?.code === 4) {
                      errorMsg += 'Video format not supported or URL is invalid.';
                    } else if (target.error?.code === 2) {
                      errorMsg += 'Network error. Check your connection.';
                    } else if (target.error?.code === 3) {
                      errorMsg += 'Video file is corrupted.';
                    }
                    
                    setVideoLoading(false);
                    alert(errorMsg + '\n\nTry opening the URL directly: ' + videoUrl);
                  }}
                  preload="metadata"
                  playsInline
                >
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>

            <div className="mt-4 text-white">
              <h3 className="text-lg font-semibold">{selectedRecording.topic}</h3>
              <p className="text-sm text-gray-300">
                {selectedRecording.batchName} • {selectedRecording.trainerName} • {formatDate(selectedRecording.classDate)}
              </p>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentRecordings;
