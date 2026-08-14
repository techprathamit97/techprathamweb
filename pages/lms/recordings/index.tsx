import React, { useEffect, useState } from 'react';
import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  Download,
  Trash2,
  Calendar,
  Clock,
  Users,
  HardDrive,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Play
} from 'lucide-react';
import { toast } from 'sonner';

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
  size: string;
  sizeText: string;
  canDownload: boolean;
  status: string;
}

interface BatchInfo {
  _id: string;
  batchName: string;
  batchCode: string;
  courseName: string;
  studentCount: number;
  timing?: string;
  recordings: BBBRecording[];
}

const LMSRecordingsManagement = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [allRecordings, setAllRecordings] = useState<BBBRecording[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<BBBRecording[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deletingRecording, setDeletingRecording] = useState<string | null>(null);
  // Fetch all recordings from all batches
  const fetchAllRecordings = async () => {
    try {
      setIsLoading(true);
      console.log('🎬 Fetching all recordings for LMS admin...');
      
      const res = await fetch('/api/lms/recordings');
      const data = await res.json();
      
      if (res.ok && data.success) {
        setBatches(data.batches || []);
        
        // Collect all recordings from all batches
        const allRecs: BBBRecording[] = [];
        data.batches?.forEach((batch: BatchInfo) => {
          batch.recordings?.forEach((recording: BBBRecording) => {
            allRecs.push({
              ...recording,
              batchInfo: {
                batchId: batch._id,
                batchName: batch.batchName,
                courseName: batch.courseName
              }
            } as any);
          });
        });
        
        setAllRecordings(allRecs);
        setFilteredRecordings(allRecs);
        
        console.log(`✅ Loaded ${allRecs.length} recordings from ${data.batches?.length || 0} batches`);
        toast.success(`Loaded ${allRecs.length} recordings from ${data.batches?.length || 0} batches`);
      } else {
        throw new Error(data.error || 'Failed to fetch recordings');
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch recordings:', error);
      toast.error('Failed to load recordings: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter recordings based on batch, search, and status
  const filterRecordings = () => {
    let filtered = [...allRecordings];
    
    // Filter by batch
    if (selectedBatch !== 'all') {
      filtered = filtered.filter((rec: any) => rec.batchInfo?.batchId === selectedBatch);
    }
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((rec: any) => 
        rec.name?.toLowerCase().includes(searchLower) ||
        rec.batchInfo?.batchName?.toLowerCase().includes(searchLower) ||
        rec.batchInfo?.courseName?.toLowerCase().includes(searchLower) ||
        rec.meetingId?.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter((rec: BBBRecording) => {
        if (filterStatus === 'published') return rec.published && rec.state === 'published';
        if (filterStatus === 'processing') return !rec.published || rec.state !== 'published';
        if (filterStatus === 'downloadable') return rec.canDownload;
        return true;
      });
    }
    
    setFilteredRecordings(filtered);
  };

  useEffect(() => {
    fetchAllRecordings();
  }, []);

  useEffect(() => {
    filterRecordings();
  }, [selectedBatch, searchTerm, filterStatus, allRecordings]);
  // Handle recording deletion
  const handleDeleteRecording = async (recordId: string, recordingName: string) => {
    const confirmed = confirm(`Are you sure you want to delete the recording "${recordingName}"? This action cannot be undone.`);
    if (!confirmed) return;
    
    setDeletingRecording(recordId);
    
    try {
      const res = await fetch(`/api/lms/recordings/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success(`Recording "${recordingName}" deleted successfully`);
        // Refresh recordings list
        fetchAllRecordings();
      } else {
        throw new Error(data.error || 'Failed to delete recording');
      }
    } catch (error: any) {
      console.error('❌ Delete recording error:', error);
      toast.error('Failed to delete recording: ' + error.message);
    } finally {
      setDeletingRecording(null);
    }
  };

  // Handle BigBlueButton recording download - enhanced for Blindside Networks
  const handleDownloadRecording = (recording: BBBRecording) => {
    if (!recording.videoUrl) {
      toast.error('No download URL available for this recording');
      return;
    }
    
    console.log('🔽 Processing BBB Recording URL:', recording.videoUrl);
    
    // Check if this is a Blindside Networks recording
    if (recording.videoUrl.includes('blindsidenetworks.com') || recording.videoUrl.includes('recordings.blindsidenetworks.com')) {
      console.log('🔍 Detected Blindside Networks recording');
      
      // Try to construct potential download URLs for Blindside Networks
      try {
        const url = new URL(recording.videoUrl);
        const pathParts = url.pathname.split('/');
        
        // Extract the recording ID from the path
        const recordingId = pathParts.find(part => part.length > 20); // Long hash-like ID
        
        if (recordingId) {
          // Try different Blindside Networks download formats
          const possibleDownloadUrls = [
            `${url.origin}/bn/${recordingId}/video/webcams.webm`, // Webcam video
            `${url.origin}/bn/${recordingId}/video/webcams.mp4`,  // Webcam video MP4
            `${url.origin}/bn/${recordingId}/deskshare/deskshare.webm`, // Screen share
            `${url.origin}/bn/${recordingId}/deskshare/deskshare.mp4`,  // Screen share MP4
            `${url.origin}/bn/${recordingId}/presentation/slides_export.zip`, // Slides export
            `${url.origin}/download/${recordingId}`, // Direct download
          ];
          
          console.log('🔽 Trying Blindside Networks download URLs:', possibleDownloadUrls);
          
          // Create a clean filename
          const cleanName = recording.name.replace(/[^a-zA-Z0-9\s-]/g, '');
          const dateStr = recording.dateText.replace(/[^a-zA-Z0-9]/g, '_');
          
          // Try each potential download URL
          let attempted = false;
          possibleDownloadUrls.forEach((downloadUrl, index) => {
            setTimeout(() => {
              try {
                const downloadLink = document.createElement('a');
                downloadLink.href = downloadUrl;
                downloadLink.download = `${cleanName}_${dateStr}_${index}`;
                downloadLink.style.display = 'none';
                downloadLink.target = '_blank';
                
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                console.log(`🔽 Attempted download URL ${index + 1}:`, downloadUrl);
                attempted = true;
              } catch (err) {
                console.log(`🔽 Download URL ${index + 1} failed:`, downloadUrl, err);
              }
            }, index * 500); // Stagger attempts
          });
          
          if (attempted) {
            toast.success('Attempting to download recording files...');
            setTimeout(() => {
              toast.info('If downloads didn\'t start, the recording will open in a new tab for manual saving', {
                duration: 8000,
              });
            }, 3000);
          }
        }
      } catch (urlError) {
        console.log('🔽 Failed to parse Blindside Networks URL:', urlError);
      }
    }
    
    // Fallback: Open the recording in a new tab (original approach)
    window.open(recording.videoUrl, '_blank');
    
    // Show instructions to the user
    setTimeout(() => {
      toast.info('Recording opened in new tab. To save: Press Ctrl+S (or Cmd+S on Mac) → Select "Webpage, Complete" → Save to your computer', {
        duration: 12000,
      });
    }, 2000);
  };

  // Handle play recording
  const handlePlayRecording = (recording: BBBRecording) => {
    if (!recording.videoUrl) {
      toast.error('No video URL available for this recording');
      return;
    }
    
    window.open(recording.videoUrl, '_blank', 'width=1200,height=800');
    toast.success(`Playing recording: ${recording.name}`);
  };

  // Get status badge component
  const getStatusBadge = (recording: BBBRecording) => {
    if (recording.published && recording.state === 'published') {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Published
        </Badge>
      );
    } else if (recording.state === 'processing') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-gray-100 text-gray-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          {recording.state || 'Unknown'}
        </Badge>
      );
    }
  };
  if (isLoading) {
    return (
      <LMSLayout>
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Loading recordings...</p>
          </div>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Video className="h-8 w-8" />
            Recordings Management
          </h1>
          <p className="text-purple-100 mt-2">
            Manage all BigBlueButton recordings across batches - view, download, and delete recordings
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Recordings</p>
                  <p className="text-2xl font-bold">{allRecordings.length}</p>
                </div>
                <Video className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Published</p>
                  <p className="text-2xl font-bold">
                    {allRecordings.filter(r => r.published && r.state === 'published').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Processing</p>
                  <p className="text-2xl font-bold">
                    {allRecordings.filter(r => !r.published || r.state !== 'published').length}
                  </p>
                </div>
                <Loader2 className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Total Batches</p>
                  <p className="text-2xl font-bold">{batches.length}</p>
                </div>
                <Users className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search recordings, batches, or meeting IDs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Batch Filter */}
              <div className="md:w-64">
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Batches</option>
                  {batches.map((batch) => (
                    <option key={batch._id} value={batch._id}>
                      {batch.batchName} ({batch.recordings.length} recordings)
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="md:w-48">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="processing">Processing</option>
                  <option value="downloadable">Downloadable</option>
                </select>
              </div>

              {/* Refresh Button */}
              <Button
                onClick={fetchAllRecordings}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>

            <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
              <span>Showing {filteredRecordings.length} of {allRecordings.length} recordings</span>
              {selectedBatch !== 'all' && (
                <Badge variant="outline">
                  Batch: {batches.find(b => b._id === selectedBatch)?.batchName}
                </Badge>
              )}
              {filterStatus !== 'all' && (
                <Badge variant="outline">Status: {filterStatus}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
        {/* Recordings List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Recordings ({filteredRecordings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRecordings.length === 0 ? (
              <div className="text-center py-12">
                <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Recordings Found</h3>
                <p className="text-gray-500">
                  {allRecordings.length === 0 
                    ? 'No recordings available in the system yet.'
                    : 'No recordings match your current filters. Try adjusting your search criteria.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRecordings.map((recording: any) => (
                  <div
                    key={recording.recordId}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {recording.name}
                          </h3>
                          {getStatusBadge(recording)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span>
                              <strong>Batch:</strong> {recording.batchInfo?.batchName || 'Unknown'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-green-500" />
                            <span>
                              <strong>Date:</strong> {recording.dateText}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <span>
                              <strong>Duration:</strong> {recording.durationText}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-purple-500" />
                            <span>
                              <strong>Size:</strong> {recording.sizeText}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span><strong>Course:</strong> {recording.batchInfo?.courseName || 'N/A'}</span>
                          <span><strong>Participants:</strong> {recording.participants}</span>
                          <span><strong>Meeting ID:</strong> {recording.meetingId}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {recording.videoUrl && (
                          <Button
                            onClick={() => handlePlayRecording(recording)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Play
                          </Button>
                        )}
                        
                        {recording.canDownload && (
                          <Button
                            onClick={() => handleDownloadRecording(recording)}
                            size="sm"
                            variant="outline"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => handleDeleteRecording(recording.recordId, recording.name)}
                          size="sm"
                          variant="destructive"
                          disabled={deletingRecording === recording.recordId}
                        >
                          {deletingRecording === recording.recordId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </LMSLayout>
  );
};

export default LMSRecordingsManagement;