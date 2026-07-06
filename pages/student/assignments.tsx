import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import StudentLayout from '@/src/student/common/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ClipboardList,
  Upload,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface Assignment {
  _id: string;
  title: string;
  description: string;
  dueDate: string;
  maxMarks: number;
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
  }>;
  batchId: string;
  batchName: string;
  courseTitle: string;
  trainerName: string;
  status: string;
  submission: {
    _id: string;
    fileUrl: string;
    fileName: string;
    submittedAt: string;
    score: number;
    maxMarks: number;
    feedback: string;
    status: string;
  } | null;
  createdAt: string;
}

const StudentAssignments = () => {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, submitted: 0, graded: 0 });
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedData = localStorage.getItem('student');
    if (!storedData) {
      router.push('/student/login');
      return;
    }

    const student = JSON.parse(storedData);
    fetchAssignments(student.studentId);
  }, []);

  const fetchAssignments = async (studentId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/student/assignments?studentId=${studentId}`);
      const data = await res.json();

      if (res.ok) {
        setAssignments(data.data.assignments);
        setStats(data.data.stats);
      } else {
        toast.error(data.error || 'Failed to fetch assignments');
      }
    } catch (error) {
      console.error('Assignments fetch error:', error);
      toast.error('Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!selectedFile || !selectedAssignment) {
      toast.error('Please select a file to upload');
      return;
    }

    const storedData = localStorage.getItem('student');
    if (!storedData) return;

    const student = JSON.parse(storedData);
    setIsUploading(true);

    try {
      // Upload file to S3
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadRes = await fetch('/api/upload/assignments', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Failed to upload file');
      }

      // Submit assignment
      const submitRes = await fetch('/api/student/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.studentId,
          assignmentId: selectedAssignment._id,
          fileUrl: uploadData.url,
          fileName: selectedFile.name
        })
      });

      const submitData = await submitRes.json();

      if (submitRes.ok) {
        toast.success('Assignment submitted successfully!');
        setIsSubmitDialogOpen(false);
        setSelectedFile(null);
        setSelectedAssignment(null);
        fetchAssignments(student.studentId);
      } else {
        throw new Error(submitData.error || 'Failed to submit assignment');
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to submit assignment');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Available</Badge>;
      case 'submitted':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Submitted</Badge>;
      case 'graded':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Graded</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Overdue</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="p-6 flex items-center justify-center">
          <p className="text-gray-600">Loading assignments...</p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="p-6 space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-blue-100 mt-2">View and submit your assignments</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Assignments</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
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
                  <p className="text-gray-600 text-sm">Pending</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Submitted</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.submitted}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Upload className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Graded</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.graded}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments List */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              All Assignments ({assignments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {assignments.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No assignments yet</p>
                <p className="text-gray-400 text-sm mt-2">Your trainer will assign tasks here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div key={assignment._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-gray-900 font-semibold text-lg">{assignment.title}</h3>
                        <p className="text-gray-600 text-sm mt-1">{assignment.courseTitle} - {assignment.batchName}</p>
                      </div>
                      {getStatusBadge(assignment.status)}
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
                        <p className="text-gray-600">Max Marks</p>
                        <p className="text-gray-900 font-medium flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {assignment.maxMarks}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Trainer</p>
                        <p className="text-gray-900 font-medium">{assignment.trainerName}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Created</p>
                        <p className="text-gray-900 font-medium">
                          {new Date(assignment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Attachments */}
                    {assignment.attachments && assignment.attachments.length > 0 && (
                      <div className="mb-3">
                        <p className="text-gray-600 text-sm mb-2">Attachments:</p>
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

                    {/* Submission Status */}
                    {assignment.submission && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-gray-900 font-medium">Your Submission</p>
                            <p className="text-gray-600 text-sm">
                              Submitted on: {new Date(assignment.submission.submittedAt).toLocaleString()}
                            </p>
                            {assignment.submission.fileUrl && (
                              <a
                                href={assignment.submission.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 text-sm hover:underline flex items-center gap-1 mt-1"
                              >
                                <Download className="h-3 w-3" />
                                View Submission
                              </a>
                            )}
                          </div>
                          <div className="text-right">
                            {assignment.submission.score !== null && (
                              <p className="text-lg font-bold text-green-600">
                                {assignment.submission.score}/{assignment.submission.maxMarks}
                              </p>
                            )}
                            {assignment.submission.feedback && (
                              <p className="text-gray-600 text-sm mt-1">
                                Feedback: {assignment.submission.feedback}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {assignment.status === 'available' || assignment.status === 'overdue' ? (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <Dialog open={isSubmitDialogOpen && selectedAssignment?._id === assignment._id} onOpenChange={(open) => {
                          setIsSubmitDialogOpen(open);
                          if (open) setSelectedAssignment(assignment);
                          else {
                            setSelectedAssignment(null);
                            setSelectedFile(null);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                              <Upload className="h-4 w-4 mr-2" />
                              Submit Assignment
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Submit: {assignment.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <Label>Upload File</Label>
                                <Input
                                  ref={fileInputRef}
                                  type="file"
                                  accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                                  onChange={handleFileSelect}
                                  className="mt-1"
                                />
                                <p className="text-gray-500 text-xs mt-1">Max file size: 10MB</p>
                              </div>
                              {selectedFile && (
                                <div className="p-3 bg-gray-50 rounded-md">
                                  <p className="text-sm text-gray-700">
                                    <strong>Selected:</strong> {selectedFile.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Size: {(selectedFile.size / 1024).toFixed(2)} KB
                                  </p>
                                </div>
                              )}
                              <div className="text-sm text-gray-600">
                                <p>Due Date: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'}</p>
                                <p>Max Marks: {assignment.maxMarks}</p>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={handleSubmitAssignment}
                                disabled={isUploading || !selectedFile}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                {isUploading ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Submit
                                  </>
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default StudentAssignments;