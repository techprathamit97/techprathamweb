import React, { useEffect, useState, useMemo } from 'react';
import TrainerLayout from '@/src/trainer/common/TrainerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VideoIcon, Calendar, User, PlayCircle, X, Clock, Users, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

// Group recordings by date
interface GroupedRecordings {
  date: string;
  dateLabel: string;
  recordings: BBBRecording[];
}

const TrainerRecordings = () => {
  const [recordings, setRecordings] = useState<BBBRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<BBBRecording | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [showUnpublished, setShowUnpublished] = useState(false);

  useEffect(() => {
    fetchBBBRecordings();
  }, []);

  const fetchBBBRecordings = async () => {
    try {
      console.log('=== FETCHING BBB RECORDINGS FOR TRAINERS ===');

      const response = await fetch('/api/view-all-bbb-recordings');
      const data = await response.json();

      console.log('BBB API Response:', data);
      console.log('Success:', data.success);
      console.log('Total recordings:', data.totalRecordings);

      if (data.success) {
        console.log('BBB Recordings:', data.recordings);
        // Show all recordings to trainers (including unpublished)
        setRecordings(data.recordings || []);
      } else {
        console.error('BBB API error:', data.error);
        setError(data.error || 'Failed to fetch recordings from BigBlueButton');
      }
    } catch (err: any) {
      console.error('Error fetching BBB recordings:', err);
      setError('Failed to load recordings from BigBlueButton server');
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

  // Group recordings by day
  const groupedRecordings = useMemo(() => {
    const groups: Record<string, BBBRecording[]> = {};

    recordings.forEach((recording) => {
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
  }, [recordings]);

  // Filter recordings based on toggle
  const filteredRecordings = useMemo(() => {
    if (showUnpublished) {
      return recordings;
    }
    // Only show published recordings by default
    return recordings.filter((rec) => rec.published && rec.state === 'published' && rec.videoUrl);
  }, [recordings, showUnpublished]);

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

  const handleClosePlayer = () => {
    setSelectedRecording(null);
    setVideoUrl('');
    setVideoLoading(false);
  };

  // Calculate stats
  const totalRecordings = recordings.length;
  const publishedCount = recordings.filter(r => r.published && r.state === 'published').length;
  const unpublishedCount = recordings.filter(r => !r.published || r.state !== 'published').length;

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
                <div className="text-gray-600">Loading recordings from BigBlueButton...</div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-600 mb-2">{error}</div>
                <Button onClick={fetchBBBRecordings} variant="outline">
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
                {/* Stats and Controls */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <VideoIcon className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900">
                        {totalRecordings} Recording{totalRecordings === 1 ? '' : 's'} Available
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
                    These are your live class recordings from BigBlueButton. Click "Watch Recording" to view.
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
                    <div className="text-white">Loading BigBlueButton recording...</div>
                  </div>
                )}

                {/* BBB recordings are HTML presentations, so we use an iframe */}
                <iframe
                  src={videoUrl}
                  className="w-full h-full"
                  allowFullScreen
                  frameBorder="0"
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