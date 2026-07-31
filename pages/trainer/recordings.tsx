import React, { useEffect, useState, useMemo } from 'react';
import TrainerLayout from '@/src/trainer/common/TrainerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoIcon, Calendar, PlayCircle, X, Clock, Users, Filter, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface TrainerBatch {
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

interface TrainerData {
  _id: string;
  trainerId: string;
  name: string;
  email: string;
  id?: string; // Optional fallback ID
}

const TrainerRecordings = () => {
  const [recordings, setRecordings] = useState<BBBRecording[]>([]);
  const [batches, setBatches] = useState<TrainerBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [hasMultipleBatches, setHasMultipleBatches] = useState(false);
  const [trainerData, setTrainerData] = useState<TrainerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<BBBRecording | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [showUnpublished, setShowUnpublished] = useState(false);

  useEffect(() => {
    // Get trainer data from localStorage
    const storedData = localStorage.getItem('trainer');
    console.log('Stored trainer data:', storedData);
    
    if (storedData) {
      try {
        const trainer = JSON.parse(storedData);
        console.log('Parsed trainer data:', trainer);
        console.log('Trainer ID fields:', {
          _id: trainer._id,
          trainerId: trainer.trainerId,
          id: trainer.id
        });
        
        setTrainerData(trainer);
        const idToUse = trainer._id || trainer.trainerId || trainer.id;
        
        if (idToUse) {
          console.log('Using trainer ID:', idToUse);
          fetchTrainerBatchRecordings(idToUse);
        } else {
          console.error('No valid trainer ID found in stored data');
          setError('Invalid trainer authentication data');
          setLoading(false);
        }
      } catch (parseError) {
        console.error('Error parsing trainer data:', parseError);
        setError('Invalid trainer authentication data');
        setLoading(false);
      }
    } else {
      console.error('No trainer data found in localStorage');
      setError('Trainer authentication required');
      setLoading(false);
    }
  }, []);

  const fetchTrainerBatchRecordings = async (trainerId: string) => {
    try {
      console.log('=== FETCHING BATCH-WISE RECORDINGS FOR TRAINER ===', trainerId);
      console.log('Trainer ID type:', typeof trainerId);
      console.log('Trainer ID value:', trainerId);

      const response = await fetch(`/api/trainer-batch-recordings?trainerId=${trainerId}`);
      const data = await response.json();

      console.log('Trainer Batch Recordings API Response:', data);
      console.log('Response success:', data.success);
      console.log('Response error:', data.error);

      if (data.success) {
        setBatches(data.batches || []);
        setHasMultipleBatches(data.hasMultipleBatches || false);
        
        // Update trainer data from API response if available
        if (data.trainer) {
          setTrainerData(data.trainer);
        }
        
        // Flatten all recordings from all batches
        const allRecordings = (data.batches || []).flatMap((batch: TrainerBatch) => batch.recordings);
        setRecordings(allRecordings);
        
        console.log(`Found ${data.totalBatches} batches with ${data.totalRecordings} recordings`);
        console.log('Batches data:', data.batches);
        console.log('Batches length:', data.batches?.length);
        console.log('All recordings flattened:', allRecordings.length);
        
        // Debug information
        if (data.debug) {
          console.log('🔍 Debug Info:', data.debug);
          console.log('📊 Recordings per batch:', data.batches?.map((b: any) => `${b.batchName}: ${b.recordings.length}`));
        }
        
        if (data.unmatchedRecordings && data.unmatchedRecordings.length > 0) {
          console.warn(`⚠️ ${data.unmatchedRecordings.length} recordings could not be matched to any batch`);
        }
      } else {
        console.error('Batch recordings API error:', data.error);
        setError(data.error || 'Failed to fetch batch recordings');
      }
    } catch (err: any) {
      console.error('Error fetching batch recordings:', err);
      setError('Failed to load batch recordings');
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

  // Filter recordings based on toggle
  const filteredRecordings = useMemo(() => {
    if (showUnpublished) {
      return currentRecordings;
    }
    // Only show published recordings by default
    return currentRecordings.filter((rec) => rec.published && rec.state === 'published' && rec.videoUrl);
  }, [currentRecordings, showUnpublished]);

  const handlePlayRecording = async (recording: BBBRecording) => {
    console.log('=== PLAYING BBB RECORDING ===');
    console.log('Recording:', recording);
    console.log('Video URL:', recording.videoUrl);

    setSelectedRecording(recording);
    setVideoLoading(true);

    // For BBB recordings, we have the direct URL
    if (recording.videoUrl) {
      setVideoUrl(recording.videoUrl);
    } else if (recording.previewUrl) {
      setVideoUrl(recording.previewUrl);
    } else {
      console.error('No video URL available for this recording');
      alert('Video URL not available for this recording');
      setSelectedRecording(null);
    }

    setVideoLoading(false);
  };

  const handleRefresh = () => {
    if (trainerData) {
      setLoading(true);
      setError(null);
      const idToUse = trainerData._id || trainerData.trainerId || trainerData.id;
      if (idToUse) {
        console.log('Refreshing with trainer ID:', idToUse);
        fetchTrainerBatchRecordings(idToUse);
      } else {
        console.error('No valid trainer ID for refresh');
        setError('Invalid trainer authentication data');
        setLoading(false);
      }
    } else {
      console.error('No trainer data available for refresh');
      setError('Trainer authentication required');
    }
  };

  // Calculate stats
  const totalRecordings = currentRecordings.length;
  const publishedCount = currentRecordings.filter(r => r.published && r.state === 'published').length;
  const unpublishedCount = currentRecordings.filter(r => !r.published || r.state !== 'published').length;

  const handleClosePlayer = () => {
    setSelectedRecording(null);
    setVideoUrl('');
    setVideoLoading(false);
  };

  const selectedBatchInfo = selectedBatch === 'all' 
    ? null 
    : batches.find(b => b._id === selectedBatch);

  return (
    <TrainerLayout>
      <div className="p-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <VideoIcon className="h-5 w-5 text-green-600" />
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
            ) : recordings.length === 0 ? (
              <div className="text-center py-8">
                <VideoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No recordings available yet.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Recordings will appear here after your live classes are completed and processed.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Trainer Info */}
                {trainerData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900">
                        Welcome, {trainerData.name}
                      </span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Viewing recordings from your training batches and courses.
                    </p>
                  </div>
                )}

                {/* Batch Selection - Show when trainer has more than 1 batch */}
                {batches.length > 1 ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Filter className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-blue-900">Filter by Batch</span>
                        <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                          {batches.length} batches available
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                          <SelectTrigger className="w-80">
                            <SelectValue placeholder="Select a batch to filter recordings" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">All Batches</div>
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
                            Selected Batch
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
                              <span><strong>Students:</strong> {selectedBatchInfo.studentCount}</span>
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
                ) : batches.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-gray-500" />
                      <span className="text-gray-700">
                        You have {batches.length} batch{batches.length === 1 ? '' : 'es'}. 
                        Batch filtering is available when you have more than 1 batch.
                      </span>
                    </div>
                    {batches.length === 1 && (
                      <div className="mt-3 p-3 bg-white rounded-lg border">
                        <h4 className="font-semibold text-gray-900">{batches[0].batchName}</h4>
                        <div className="text-sm text-gray-600 mt-1">
                          <span><strong>Course:</strong> {batches[0].courseName} • </span>
                          <span><strong>Students:</strong> {batches[0].studentCount} • </span>
                          <span><strong>Recordings:</strong> {batches[0].recordings.length}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Stats and Controls */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <VideoIcon className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900">
                        {totalRecordings} Recording{totalRecordings === 1 ? '' : 's'} Available
                        {selectedBatch !== 'all' && selectedBatchInfo && (
                          <span className="text-sm text-gray-600 ml-2">
                            (from {selectedBatchInfo.batchName})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-green-700">
                        <strong>{publishedCount}</strong> published
                      </span>
                      <span className="text-gray-500">
                        <strong>{unpublishedCount}</strong> unpublished
                      </span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showUnpublished}
                          onChange={(e) => setShowUnpublished(e.target.checked)}
                          className="w-4 h-4 text-green-600 rounded"
                        />
                        <span className="text-gray-700">Show unpublished</span>
                      </label>
                    </div>
                  </div>
                  <p className="text-sm text-green-700 mt-2">
                    These are your live class recordings from Tech Pratham LMS
                    {selectedBatch !== 'all' && selectedBatchInfo && (
                      <span> for {selectedBatchInfo.batchName}</span>
                    )}
                    . Click "Watch Recording" to view.
                  </p>
                </div>

                {filteredRecordings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">
                      {showUnpublished
                        ? 'No recordings found'
                        : 'No published recordings available. Enable "Show unpublished" to see all recordings.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {groupedRecordings.map((group) => {
                      // Filter recordings in this group based on showUnpublished
                      const groupRecordings = group.recordings.filter(rec => {
                        if (showUnpublished) return true;
                        return rec.published && rec.state === 'published' && rec.videoUrl;
                      });

                      if (groupRecordings.length === 0) return null;

                      return (
                        <div key={group.date}>
                          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                            <Calendar className="h-5 w-5 text-green-600" />
                            <h2 className="text-lg font-semibold text-gray-900">
                              {group.dateLabel}
                            </h2>
                            <span className="text-sm text-gray-500">
                              ({groupRecordings.length} {groupRecordings.length === 1 ? 'recording' : 'recordings'})
                            </span>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {groupRecordings.map((recording) => (
                              <Card key={recording.recordId} className={`border ${!recording.published ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'} hover:shadow-md transition-shadow`}>
                                <CardContent className="p-4">
                                  <div className="flex flex-col gap-3">
                                    <div className="flex items-start justify-between">
                                      <h3 className="font-semibold text-gray-900 line-clamp-2">
                                        {recording.name || 'Class Recording'}
                                      </h3>
                                      {!recording.published && (
                                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                                          Unpublished
                                        </span>
                                      )}
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

                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>Size: {recording.sizeText}</span>
                                        <span className="capitalize">• {recording.state}</span>
                                      </div>
                                    </div>

                                    <Button
                                      onClick={() => handlePlayRecording(recording)}
                                      className="w-full mt-2"
                                      variant="default"
                                      disabled={!recording.videoUrl && !recording.previewUrl}
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
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BBB Video Player Modal */}
      {selectedRecording && videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="relative w-full max-w-6xl mx-4">
            <button
              onClick={handleClosePlayer}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2 z-20"
            >
              <X className="w-8 h-8" />
            </button>

            <div className="bg-black rounded-lg overflow-hidden">
              <div className="relative w-full aspect-video">
                {videoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white">Loading Tech Pratham LMS recording...</div>
                  </div>
                )}

                {/* BBB recordings are HTML presentations, so we use an iframe */}
                <iframe
                  src={videoUrl}
                  className="w-full h-full"
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

            <div className="mt-4 text-white">
              <h3 className="text-lg font-semibold">{selectedRecording.name}</h3>
              <div className="flex gap-4 text-sm text-gray-300 mt-2">
                <span>{selectedRecording.dateText}</span>
                <span>Duration: {selectedRecording.durationText}</span>
                <span>{selectedRecording.participants} participants</span>
                <span>Size: {selectedRecording.sizeText}</span>
                <span className="capitalize">Status: {selectedRecording.state}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </TrainerLayout>
  );
};

export default TrainerRecordings;