import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import TrainerLayout from '@/src/trainer/common/TrainerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import {
  ClipboardList,
  Plus,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  FileText,
  Search,
  Filter,
  Upload,
  Download,
  Loader2,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface Assignment {
  _id: string;
  title: string;
  description: string;
  dueDate: string;
  maxMarks: number;
  batchId: string;
  batchName: string;
  courseTitle: string;
  status: string;
  totalSubmissions: number;
  pendingSubmissions: number;
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
  }>;
  submissions: Array<{
    studentId: string;
    studentName: string;
    submittedAt: string;
    marks: number;
    feedback: string;
    status: string;
    fileUrl?: string;
    fileName?: string;
  }>;
  createdAt: string;
}

interface Batch {
  _id: string;
  batchName: string;
  courseTitle: string;
  studentCount: number;
}

const TrainerAssignments = () => {
  const router = useRouter();
  const [trainerData, setTrainerData] = useState<any>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all');
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    dueDate: '',
    maxMarks: 100,
    batchId: '',
    attachments: [] as Array<{ fileName: string; fileUrl: string; fileType: string }>
  });
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  useEffect(() => {
    const storedData = localStorage.getItem('trainer');
    if (!storedData) {
      router.push('/trainer/login');
      return;
    }

    const trainer = JSON.parse(storedData);
    setTrainerData(trainer);
    fetchAssignments(trainer.trainerId);
  }, []);

  const fetchAssignments = async (trainerId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/trainer/assignments?trainerId=${trainerId}`);
      const data = await res.json();

      if (res.ok) {
        setAssignments(data.data.assignments);
        setBatches(data.data.batches);
        setStats(data.data.stats);
      } else {
        toast.error(data.error || 'Failed to fetch assignments');
      }
    } catch (error) {
      console.error('Fetch assignments error:', error);
      toast.error('Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    const uploadedAttachments: Array<{ fileName: string; fileUrl: string; fileType: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 10MB)`);
        continue;
      }

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload/assignments', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (res.ok) {
          uploadedAttachments.push({
            fileName: data.fileName,
            fileUrl: data.url,
            fileType: data.fileType
          });
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
      setIsUploading(false);
    }

    return uploadedAttachments;
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newAssignment.title || !newAssignment.description || !newAssignment.dueDate || !newAssignment.batchId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      let attachments = newAssignment.attachments;

      // Upload files if selected
      if (selectedFiles && selectedFiles.length > 0) {
        attachments = await handleFileUpload(selectedFiles);
      }

      const res = await fetch('/api/trainer/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAssignment,
          attachments,
          trainerId: trainerData.trainerId
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Assignment created successfully!');
        setIsCreateDialogOpen(false);
        setNewAssignment({
          title: '',
          description: '',
          dueDate: '',
          maxMarks: 100,
          batchId: '',
          attachments: []
        });
        setSelectedFiles(null);
        fetchAssignments(trainerData.trainerId);
      } else {
        toast.error(data.error || 'Failed to create assignment');
      }
    } catch (error) {
      console.error('Create assignment error:', error);
      toast.error('Failed to create assignment');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(e.target.files);
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.courseTitle.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || assignment.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading || !trainerData) {
    return (
      <TrainerLayout>
        <div className="p-6 flex items-center justify-center">
          <div className="text-gray-900">Loading assignments...</div>
        </div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-green-100 mt-2">Create and manage assignments for your students</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Assignments</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalAssignments || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ClipboardList className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Active</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeAssignments || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Expired</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.expiredAssignments || 0}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Pending Submissions</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.pendingSubmissions || 0}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Create Button */}
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search assignments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Assignment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Assignment</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateAssignment} className="space-y-4">
                    <div>
                      <Label>Title *</Label>
                      <Input
                        value={newAssignment.title}
                        onChange={(e) => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Assignment title"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label>Description *</Label>
                      <Textarea
                        value={newAssignment.description}
                        onChange={(e) => setNewAssignment(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Assignment description"
                        rows={3}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label>Batch *</Label>
                      <select
                        value={newAssignment.batchId}
                        onChange={(e) => setNewAssignment(prev => ({ ...prev, batchId: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      >
                        <option value="">Select Batch</option>
                        {batches.map(batch => (
                          <option key={batch._id} value={batch._id}>
                            {batch.batchName} - {batch.courseTitle}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Due Date *</Label>
                        <Input
                          type="datetime-local"
                          value={newAssignment.dueDate}
                          onChange={(e) => setNewAssignment(prev => ({ ...prev, dueDate: e.target.value }))}
                          required
                        />
                      </div>

                      <div>
                        <Label>Max Marks</Label>
                        <Input
                          type="number"
                          value={newAssignment.maxMarks}
                          onChange={(e) => setNewAssignment(prev => ({ ...prev, maxMarks: parseInt(e.target.value) }))}
                          min="1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Attachments (Optional)</Label>
                      <Input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                        onChange={handleFileSelect}
                        className="mt-1"
                      />
                      <p className="text-gray-500 text-xs mt-1">Max 10MB per file</p>
                      {selectedFiles && selectedFiles.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {Array.from(selectedFiles).map((file, index) => (
                            <p key={index} className="text-sm text-gray-600">
                              {file.name} ({(file.size / 1024).toFixed(2)} KB)
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                        Create Assignment
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Assignments List */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-green-600" />
              All Assignments ({filteredAssignments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {filteredAssignments.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No assignments found</p>
                <p className="text-gray-400 text-sm mt-2">Create your first assignment to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAssignments.map((assignment) => (
                  <div key={assignment._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-gray-900 font-semibold text-lg">{assignment.title}</h3>
                        <p className="text-gray-600 text-sm mt-1">{assignment.courseTitle} - {assignment.batchName}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={
                          assignment.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' :
                          'bg-red-100 text-red-700 border-red-200'
                        }>
                          {assignment.status}
                        </Badge>
                        <Badge variant="outline">
                          {assignment.maxMarks} marks
                        </Badge>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-3">{assignment.description}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-600">Due Date</p>
                        <p className="text-gray-900 font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Submissions</p>
                        <p className="text-gray-900 font-medium flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {assignment.totalSubmissions}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Pending</p>
                        <p className="text-gray-900 font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {assignment.pendingSubmissions}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Created</p>
                        <p className="text-gray-900 font-medium">
                          {assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Attachments */}
                    {assignment.attachments && assignment.attachments.length > 0 && (
                      <div className="mb-3">
                        <p className="text-gray-600 text-sm mb-1">Attachments:</p>
                        <div className="flex flex-wrap gap-2">
                          {assignment.attachments.map((attachment, index) => (
                            <a
                              key={index}
                              href={attachment.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-md text-sm text-gray-700 hover:bg-gray-200"
                            >
                              <Download className="h-3 w-3" />
                              {attachment.fileName}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {assignment.submissions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-2">Submissions ({assignment.submissions.length})</h4>
                        <div className="space-y-2">
                          {assignment.submissions.slice(0, 5).map((submission, index) => (
                            <div key={index} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-md">
                              <div className="flex-1">
                                <span className="text-gray-700 font-medium">{submission.studentName}</span>
                                {submission.fileUrl && (
                                  <a
                                    href={submission.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 text-blue-600 hover:underline text-xs flex items-center gap-1 inline"
                                  >
                                    <Download className="h-3 w-3" />
                                    {submission.fileName || 'Download'}
                                  </a>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600 text-xs">
                                  {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'N/A'}
                                </span>
                                {submission.marks !== undefined && submission.marks !== null && (
                                  <Badge variant="outline">
                                    {submission.marks}/{assignment.maxMarks}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                          {assignment.submissions.length > 5 && (
                            <p className="text-gray-500 text-xs">
                              +{assignment.submissions.length - 5} more submissions
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TrainerLayout>
  );
};

export default TrainerAssignments;
