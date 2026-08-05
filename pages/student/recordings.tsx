import React, { useEffect, useState, useMemo, useRef } from 'react';
import StudentLayout from '@/src/student/common/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoIcon, Calendar, PlayCircle, X, Clock, Users, Maximize2, Minimize2, Filter, BookOpen, FileText, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface BBBRecording {
  recordId: string;
  meetingId: string;
  name: string;
  published: boolean;
  state: string;
  videoUrl: string | null;
  previewUrl: string | null;
  startTime: string;
  endTime: string;
  duration: number;
  durationText: string;
  dateText: string;
  participants: string;
  sizeText: string;
  canDownload: boolean;
  status: string;
}

interface StudentBatch {
  _id: string;
  batchName: string;
  batchCode: string;
  courseName: string;
  studentCount: number;
  timing: string;
  startDate: string;
  endDate: string;
  recordings: BBBRecording[];
}

interface StudentNote {
  _id: string;
  title: string;
  description: string;
  noteType: 'text' | 'pdf';
  textContent: Array<{
    title: string;
    content: string;
    order: number;
  }>;
  pdfFile?: {
    url: string;
    fileName: string;
    fileSize: number;
    uploadedAt: string;
  };
  moduleIndex?: number;
  moduleTitle?: string;
  publishedAt: string;
  viewCount: number;
  trainer: {
    name: string;
    email: string;
  };
  batches: Array<{
    _id: string;
    batchName: string;
    batchCode: string;
  }>;
  courses: Array<{
    _id: string;
    title: string;
  }>;
  tags: string[];
}

interface StudentData {
  _id: string;
  studentId: string;
  name: string;
  email: string;
}

// Group recordings by date
interface GroupedRecordings {
  date: string;
  dateLabel: string;
  recordings: BBBRecording[];
}

const StudentRecordings = () => {
  const [recordings, setRecordings] = useState<BBBRecording[]>([]);
  const [batches, setBatches] = useState<StudentBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<BBBRecording | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get student data from localStorage
    const storedData = localStorage.getItem('student');
    if (storedData) {
      const student = JSON.parse(storedData);
      setStudentData(student);
      fetchStudentBatchRecordings(student._id || student.studentId);
    } else {
      setError('Student authentication required');
      setLoading(false);
    }
  }, []);

  const fetchStudentBatchRecordings = async (studentId: string) => {
    try {
      console.log('=== FETCHING STUDENT BATCH-WISE RECORDINGS ===', studentId);

      const response = await fetch(`/api/student-batch-recordings?studentId=${studentId}`);
      const data = await response.json();

      console.log('Student Batch Recordings API Response:', data);

      if (data.success) {
        setBatches(data.batches || []);
        setStudentData(data.student || null);
        
        // Flatten all recordings from all enrolled batches
        const allRecordings = (data.batches || []).flatMap((batch: StudentBatch) => batch.recordings);
        setRecordings(allRecordings);
        
        console.log(`Student enrolled in ${data.totalBatches} batches with ${data.totalRecordings} recordings`);
        console.log('Student batches:', data.batches);
        
        // Debug information
        if (data.debug) {
          console.log('🔍 Debug Info:', data.debug);
          console.log('📊 Recordings per batch:', data.batches?.map((b: any) => `${b.batchName}: ${b.recordings.length}`));
        }
        
        if (data.unmatchedRecordings && data.unmatchedRecordings.length > 0) {
          console.warn(`⚠️ ${data.unmatchedRecordings.length} recordings could not be matched to student's batches`);
        }
      } else {
        console.error('Student batch recordings API error:', data.error);
        setError(data.error || 'Failed to fetch batch recordings');
      }
    } catch (err: any) {
      console.error('Error fetching student batch recordings:', err);
      setError('Failed to load recordings from your enrolled courses');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown Date';
    
    // Handle timestamp format
    if (dateString.match(/^\d+$/)) {
      const date = new Date(parseInt(dateString));
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    // Handle regular date string
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get current batch recordings based on selection
  const currentRecordings = useMemo(() => {
    if (selectedBatch === 'all') {
      return recordings;
    }
    
    const batch = batches.find(b => b._id === selectedBatch);
    return batch?.recordings || [];
  }, [recordings, batches, selectedBatch]);

  // Group recordings by day
  const groupedRecordings = useMemo(() => {
    const groups: Record<string, BBBRecording[]> = {};

    currentRecordings.forEach((recording) => {
      let dateKey: string;
      
      if (recording.startTime && recording.startTime.match(/^\d+$/)) {
        // Handle timestamp
        const date = new Date(parseInt(recording.startTime));
        dateKey = date.toISOString().split('T')[0];
      } else {
        // Fallback to current date
        dateKey = new Date().toISOString().split('T')[0];
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(recording);
    });

    // Sort by date descending (newest first)
    return Object.entries(groups)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([date, recs]) => ({
        date,
        dateLabel: formatDate(date),
        recordings: recs.sort((a, b) => {
          // Sort by start time descending within the same day
          if (a.startTime && b.startTime) {
            return parseInt(b.startTime) - parseInt(a.startTime);
          }
          return 0;
        })
      }));
  }, [currentRecordings]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsPlayerFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const enterPlayerFullscreen = async () => {
    const element = playerContainerRef.current;
    if (!element) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      await element.requestFullscreen();
      setIsPlayerFullscreen(true);
    } catch (error) {
      console.error('Unable to open fullscreen recording player:', error);
    }
  };

  const exitPlayerFullscreen = async () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.error('Unable to close fullscreen recording player:', error);
      }
    }
    setIsPlayerFullscreen(false);
  };

  const handlePlayRecording = async (recording: BBBRecording) => {
    console.log('=== PLAYING BBB RECORDING ===');
    console.log('Recording:', recording);
    console.log('Video URL:', recording.videoUrl);

    setSelectedRecording(recording);
    setVideoLoading(true);

    // For BBB recordings, we have the direct URL
    if (recording.videoUrl) {
      setVideoUrl(recording.videoUrl);
      setTimeout(() => {
        const shouldAutoFullscreen = window.innerWidth < 768;
        if (shouldAutoFullscreen) {
          enterPlayerFullscreen();
        }
      }, 250);
    } else {
      console.error('No video URL available for this recording');
      alert('Video URL not available for this recording');
      setSelectedRecording(null);
    }
    
    setVideoLoading(false);
  };

  const handleClosePlayer = async () => {
    await exitPlayerFullscreen();
    setSelectedRecording(null);
    setVideoUrl('');
    setVideoLoading(false);
  };

  const handleRefresh = () => {
    if (studentData) {
      setLoading(true);
      fetchStudentBatchRecordings(studentData._id || studentData.studentId);
    }
  };

  const selectedBatchInfo = selectedBatch === 'all' 
    ? null 
    : batches.find(b => b._id === selectedBatch);

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
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-600">Loading recordings from Tech Pratham LMS...</div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-600 mb-2">{error}</div>
                <Button onClick={handleRefresh} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : currentRecordings.length === 0 ? (
              <div className="text-center py-8">
                <VideoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No published recordings available yet.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Recordings will appear here after your classes are completed and processed.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Student Info */}
                {studentData && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-indigo-600" />
                      <span className="font-medium text-indigo-900">
                        Welcome, {studentData.name}
                      </span>
                    </div>
                    <p className="text-sm text-indigo-700 mt-1">
                      Viewing recordings from your enrolled courses and batches.
                    </p>
                  </div>
                )}

                {/* Batch Selection - Show when student has more than 1 batch */}
                {batches.length > 1 ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-blue-900">Filter by Course/Batch</span>
                        <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                          {batches.length} enrolled batches
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                          <SelectTrigger className="w-80">
                            <SelectValue placeholder="Select a course/batch" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">All My Courses</div>
                                  <div className="text-xs text-gray-500">{recordings.length} total recordings</div>
                                </div>
                              </div>
                            </SelectItem>
                            {batches.map((batch) => (
                              <SelectItem key={batch._id} value={batch._id}>
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{batch.batchName}</span>
                                    <span className="text-xs text-gray-500">
                                      {batch.courseName} • {batch.recordings.length} recordings
                                    </span>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {selectedBatchInfo && (
                      <div className="mt-4 p-4 bg-white rounded-lg border shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900 text-lg">{selectedBatchInfo.batchName}</h4>
                          <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                            Currently Viewing
                          </span>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-blue-500" />
                              <span><strong>Course:</strong> {selectedBatchInfo.courseName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-green-500" />
                              <span><strong>Classmates:</strong> {selectedBatchInfo.studentCount}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-purple-500" />
                              <span><strong>Timing:</strong> {selectedBatchInfo.timing || 'Not specified'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <VideoIcon className="h-4 w-4 text-red-500" />
                              <span><strong>Recordings:</strong> {selectedBatchInfo.recordings.length}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : batches.length === 1 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-gray-500" />
                      <span className="text-gray-700">
                        You are enrolled in: <strong>{batches[0].batchName}</strong>
                      </span>
                    </div>
                    <div className="mt-3 p-3 bg-white rounded-lg border">
                      <div className="text-sm text-gray-600">
                        <span><strong>Course:</strong> {batches[0].courseName} • </span>
                        <span><strong>Classmates:</strong> {batches[0].studentCount} • </span>
                        <span><strong>Recordings:</strong> {batches[0].recordings.length}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recording Stats */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <VideoIcon className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900">
                        {currentRecordings.length} Recording{currentRecordings.length === 1 ? '' : 's'} Available
                        {selectedBatch !== 'all' && selectedBatchInfo && (
                          <span className="text-sm text-gray-600 ml-2">
                            (from {selectedBatchInfo.batchName})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={() => window.open('/student/notes', '_blank')}
                        className="flex items-center gap-2"
                        variant="outline"
                      >
                        <FileText className="h-4 w-4" />
                        View Notes
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    These are your live class recordings from Tech Pratham LMS
                    {selectedBatch !== 'all' && selectedBatchInfo && (
                      <span> for {selectedBatchInfo.batchName}</span>
                    )}
                    . Click "Watch Recording" to view or "View Notes" to see training notes.
                  </p>
                </div>

                {currentRecordings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {selectedBatch === 'all' 
                        ? 'No recordings available in any of your enrolled courses yet.'
                        : `No recordings available for ${selectedBatchInfo?.batchName || 'this course'} yet.`
                      }
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Recordings will appear here after your classes are completed and processed.
                    </p>
                  </div>
                ) : (

                  <div className="space-y-8">{groupedRecordings.map((group) => (
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
                        <Card key={recording.recordId} className="border border-gray-200 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-3">
                              <div className="flex items-start justify-between">
                                <h3 className="font-semibold text-gray-900 line-clamp-2">
                                  {recording.name || 'Class Recording'}
                                </h3>
                              </div>

                              <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>{recording.dateText}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>{recording.durationText}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  <span>{recording.participants} participants</span>
                                </div>

                                <div className="text-xs text-gray-500">
                                  Size: {recording.sizeText}
                                </div>
                              </div>

                              <Button
                                onClick={() => handlePlayRecording(recording)}
                                className="w-full mt-2"
                                variant="default"
                                disabled={!recording.videoUrl}
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BBB Video Player Modal */}
      {selectedRecording && videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-0 sm:p-3">
          <div
            ref={playerContainerRef}
            className={`relative flex flex-col ${isPlayerFullscreen ? 'w-screen h-screen' : 'w-full h-[90vh] max-w-7xl'}`}
          >
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <button
                onClick={enterPlayerFullscreen}
                className="rounded-full bg-black/70 p-2 text-white hover:bg-black/90"
                aria-label="Toggle fullscreen"
              >
                {isPlayerFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button
                onClick={handleClosePlayer}
                className="rounded-full bg-black/70 p-2 text-white hover:bg-black/90"
                aria-label="Close recording"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-black rounded-none sm:rounded-lg overflow-hidden">
              <div className="relative w-full h-full">
                {videoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <div className="text-white">Loading Tech Pratham LMS recording...</div>
                  </div>
                )}
                
                {/* BBB recordings are HTML presentations, so we use an iframe */}
                <iframe
                  src={videoUrl}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  style={{ border: 0 }}
                  title={`Recording: ${selectedRecording.name}`}
                  onLoad={() => {
                    console.log('✅ BBB recording iframe loaded');
                    setVideoLoading(false);
                  }}
                />
              </div>
            </div>

            <div className="bg-black/90 px-4 py-3 text-white border-t border-white/10">
              <h3 className="text-lg font-semibold">{selectedRecording.name}</h3>
              <div className="flex flex-wrap gap-4 text-sm text-gray-300 mt-2">
                <span>{selectedRecording.dateText}</span>
                <span>Duration: {selectedRecording.durationText}</span>
                <span>{selectedRecording.participants} participants</span>
                <span>Size: {selectedRecording.sizeText}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
};

export default StudentRecordings;
