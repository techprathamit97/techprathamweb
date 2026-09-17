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
  Play,
  Edit
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

  // Delete confirmation: admin must type the recording's batch name to confirm,
  // so a recording is never deleted from the wrong batch by mistake.
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  // Rename recording state
  const [renameTarget, setRenameTarget] = useState<any | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Manual (non-BBB) recording upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadForm, setUploadForm] = useState({
    batchId: '',
    title: '',
    classDate: '',
    platform: 'other',
    file: null as File | null,
  });
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

  // Upload a manual (non-BBB) recording: presign → PUT to S3 → save metadata.
  const handleUploadRecording = async () => {
    const { batchId, title, classDate, platform, file } = uploadForm;
    if (!batchId || !title.trim() || !classDate || !file) {
      toast.error('Batch, title, class date and a video file are required');
      return;
    }
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      // 1. Get a presigned PUT URL
      const presignRes = await fetch('/api/lms/recordings/manual/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, fileName: file.name, contentType: file.type }),
      });
      const presign = await presignRes.json();
      if (!presignRes.ok || !presign.success) {
        throw new Error(presign.error || 'Failed to prepare upload');
      }

      // 2. Upload the file directly to S3 with progress (XHR for progress events).
      //    Content-Type is intentionally NOT set: the presigned URL does not
      //    sign it, so setting it here is unnecessary and avoids any header
      //    mismatch. This isolates a 403 to IAM/CORS on the bucket.
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presign.uploadUrl, true);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            // Surface S3's actual error (XML) so the real cause is visible.
            const body = xhr.responseText || '';
            const codeMatch = body.match(/<Code>(.*?)<\/Code>/);
            const msgMatch = body.match(/<Message>(.*?)<\/Message>/);
            const s3Code = codeMatch ? codeMatch[1] : 'Unknown';
            const s3Msg = msgMatch ? msgMatch[1] : '';
            console.error('S3 PUT failed:', xhr.status, s3Code, s3Msg, body);
            reject(new Error(`S3 upload failed (${xhr.status}) ${s3Code}: ${s3Msg}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload (likely CORS — check bucket CORS config)'));
        xhr.send(file);
      });

      // 3. Save metadata
      const saveRes = await fetch('/api/lms/recordings/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          title: title.trim(),
          classDate,
          platform,
          s3Key: presign.s3Key,
          fileSize: file.size,
        }),
      });
      const saved = await saveRes.json();
      if (!saveRes.ok || !saved.success) {
        throw new Error(saved.error || 'Failed to save recording');
      }

      toast.success('Recording uploaded successfully');
      setShowUpload(false);
      setUploadForm({ batchId: '', title: '', classDate: '', platform: 'other', file: null });
      fetchAllRecordings();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
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
  // Confirmed delete. Called only after the admin types the exact batch name.
  const handleDeleteRecording = async () => {
    if (!deleteTarget) return;

    const recordId: string = deleteTarget.recordId;
    const recordingName: string = deleteTarget.name;
    const expectedBatchName: string = deleteTarget.batchInfo?.batchName || '';

    // Safety check: typed batch name must exactly match the recording's batch.
    if (deleteConfirmInput.trim() !== expectedBatchName.trim()) {
      toast.error('Batch name does not match. Deletion cancelled.');
      return;
    }

    setDeletingRecording(recordId);

    try {
      let res: Response;

      // Manual (uploaded) recordings have a `manual-<mongoId>` recordId. They
      // are deleted via the manual API, which also removes the file from S3.
      if (recordId.startsWith('manual-')) {
        const manualId = recordId.replace(/^manual-/, '');
        res = await fetch(`/api/lms/recordings/manual?id=${encodeURIComponent(manualId)}`, {
          method: 'DELETE',
        });
      } else {
        // BBB recordings are deleted through the BBB delete action.
        res = await fetch(`/api/lms/recordings/${recordId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete' }),
        });
      }

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Recording "${recordingName}" deleted successfully`);
        setDeleteTarget(null);
        setDeleteConfirmInput('');
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

  // Save a renamed recording title.
  const handleRenameRecording = async () => {
    if (!renameTarget) return;
    const newTitle = renameInput.trim();
    if (!newTitle) {
      toast.error('Title cannot be empty');
      return;
    }
    setRenaming(true);
    try {
      const res = await fetch('/api/lms/recordings/title', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: renameTarget.recordId,
          title: newTitle,
          batchId: renameTarget.batchInfo?.batchId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to rename');

      toast.success('Recording renamed');
      setRenameTarget(null);
      setRenameInput('');
      fetchAllRecordings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to rename recording');
    } finally {
      setRenaming(false);
    }
  };

  // Handle recording download.
  // Routes through our own API which fetches the MP4 from the BBB server over
  // HTTP and streams it back with a Content-Disposition: attachment header, so
  // the browser saves a real file instead of opening the BBB playback page.
  const handleDownloadRecording = (recording: BBBRecording) => {
    if (!recording.canDownload) {
      toast.error('This recording is not available for download yet');
      return;
    }
    if (!recording.recordId) {
      toast.error('Recording ID is missing');
      return;
    }

    console.log('🔽 Starting recording download:', recording.recordId);

    // Manual (uploaded) recordings download via the manual download API, which
    // presigns a GetObject for the stored S3 key.
    if (recording.recordId.startsWith('manual-')) {
      const manualId = recording.recordId.replace(/^manual-/, '');
      window.location.href = `/api/lms/recordings/manual/${encodeURIComponent(manualId)}/download`;
      toast.success('Preparing download…');
      return;
    }

    // BBB recordings: the API resolves the combined MP4 on the BBB server.
    window.location.href = `/api/lms/recordings/${encodeURIComponent(recording.recordId)}/download`;
    toast.success('Preparing download…');
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
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Video className="h-8 w-8" />
              Recordings Management
            </h1>
            <p className="text-purple-100 mt-2">
              Manage BBB recordings and upload recordings from other platforms (Zoom, Meet, etc.)
            </p>
          </div>
          <Button
            onClick={() => setShowUpload(true)}
            className="bg-white text-purple-700 hover:bg-purple-50 flex-shrink-0"
          >
            Upload Recording
          </Button>
        </div>

        {/* Upload Recording Modal */}
        {showUpload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Upload Recording</h2>
                <button
                  onClick={() => !uploading && setShowUpload(false)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch *</label>
                <select
                  value={uploadForm.batchId}
                  onChange={(e) => setUploadForm(f => ({ ...f, batchId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900"
                  disabled={uploading}
                >
                  <option value="" className="text-gray-900">Select a batch</option>
                  {batches.map(b => (
                    <option key={b._id} value={b._id} className="text-gray-900">
                      {b.batchName} {b.courseName ? `— ${b.courseName}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900"
                  placeholder="e.g. Class 12 - Zoom session"
                  disabled={uploading}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Class Date *</label>
                  <input
                    type="datetime-local"
                    value={uploadForm.classDate}
                    onChange={(e) => setUploadForm(f => ({ ...f, classDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900"
                    disabled={uploading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                  <select
                    value={uploadForm.platform}
                    onChange={(e) => setUploadForm(f => ({ ...f, platform: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900"
                    disabled={uploading}
                  >
                    <option value="zoom" className="text-gray-900">Zoom</option>
                    <option value="meet" className="text-gray-900">Google Meet</option>
                    <option value="other" className="text-gray-900">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Video File *</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setUploadForm(f => ({ ...f, file: e.target.files?.[0] || null }))}
                  className="w-full text-sm"
                  disabled={uploading}
                />
                {uploadForm.file && (
                  <p className="text-xs text-gray-500 mt-1">
                    {uploadForm.file.name} ({Math.round(uploadForm.file.size / 1024 / 1024)} MB)
                  </p>
                )}
              </div>

              {uploading && (
                <div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Uploading… {uploadProgress}%</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowUpload(false)} disabled={uploading}>
                  Cancel
                </Button>
                <Button onClick={handleUploadRecording} disabled={uploading} className="bg-purple-600 hover:bg-purple-700">
                  {uploading ? 'Uploading…' : 'Upload'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal — requires typing the exact batch name */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-semibold text-gray-900">Delete Recording</h2>
              </div>

              <p className="text-sm text-gray-700">
                You are about to permanently delete{' '}
                <span className="font-semibold">&quot;{deleteTarget.name}&quot;</span>. This action
                cannot be undone.
              </p>

              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">
                  To confirm, type the batch name exactly:
                </p>
                <p className="text-sm font-semibold text-red-900 mt-1">
                  {deleteTarget.batchInfo?.batchName || 'Unknown'}
                </p>
              </div>

              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="Enter batch name to confirm"
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900"
                autoFocus
              />

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => { setDeleteTarget(null); setDeleteConfirmInput(''); }}
                  disabled={deletingRecording === deleteTarget.recordId}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteRecording}
                  disabled={
                    deletingRecording === deleteTarget.recordId ||
                    deleteConfirmInput.trim() !== (deleteTarget.batchInfo?.batchName || '').trim()
                  }
                >
                  {deletingRecording === deleteTarget.recordId ? 'Deleting…' : 'Delete Recording'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Rename Recording Modal */}
        {renameTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Rename Recording</h2>
              </div>
              <p className="text-sm text-gray-600">
                Batch: <span className="font-medium">{renameTarget.batchInfo?.batchName || 'Unknown'}</span>
              </p>
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                placeholder="Recording title"
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900"
                autoFocus
              />
              {renameTarget.autoTitle && (
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => setRenameInput(renameTarget.autoTitle)}
                >
                  Reset to default ({renameTarget.autoTitle})
                </button>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => { setRenameTarget(null); setRenameInput(''); }} disabled={renaming}>
                  Cancel
                </Button>
                <Button onClick={handleRenameRecording} disabled={renaming || !renameInput.trim()}>
                  {renaming ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        )}

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
                          onClick={() => { setRenameTarget(recording); setRenameInput(recording.name || ''); }}
                          size="sm"
                          variant="outline"
                          title="Rename recording"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          onClick={() => { setDeleteTarget(recording); setDeleteConfirmInput(''); }}
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