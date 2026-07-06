import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TrainerLayout from '@/src/trainer/common/TrainerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  CheckCircle,
  PlayCircle,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  Video,
  Plus,
  X,
  Trash2,
  Upload,
  FileVideo,
  Loader2,
  FolderOpen,
  Pencil,
  Users,
  BarChart3,
  AlertTriangle,
  Award,
  CheckSquare
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface ScheduledClass {
  _id: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  meetingLink: string;
  roomId: string;
  status: string;
  recordingUrl: string;
  isLive: boolean;
  isCompleted: boolean;
  canJoin: boolean;
  hasRecordings: boolean;
  recordings?: any[];
  moduleTitle?: string;
  moduleDescription?: string;
  moduleIndex: number;
  studentProgress?: StudentProgress[];
  // BigBlueButton fields
  bbbMeetingId?: string;
  bbbAttendeePassword?: string;
  bbbModeratorPassword?: string;
  bbbJoinUrl?: string;
  bbbModeratorJoinUrl?: string;
  bbbRecordingId?: string;
}

interface StudentProgress {
  studentId: string;
  progress: number;
  updatedAt: string;
  updatedBy: string;
}

interface Student {
  _id: string;
  studentId: string;
  name: string;
  email: string;
}

interface CourseData {
  batchId: string;
  batchName: string;
  courseId: string;
  courseTitle: string;
  courseDescription: string;
  completedModules: ScheduledClass[];
  scheduledClasses: ScheduledClass[];
  totalCompletedModules: number;
  totalScheduledClasses: number;
  students: Student[];
  courseProgress: number;
  progressUpdatedAt?: string;
  progressUpdatedBy?: string;
}

const TrainerCourseModules = () => {
  const router = useRouter();
  const [trainerInfo, setTrainerInfo] = useState<any>(null);
  const [coursesData, setCoursesData] = useState<CourseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const trainerId = trainerInfo?._id || trainerInfo?.trainerId;

  // Schedule modal state
  const [scheduleModal, setScheduleModal] = useState<{
    open: boolean;
    batchId: string;
    courseId: string;
  }>({ open: false, batchId: '', courseId: '' });
  const [scheduleForm, setScheduleForm] = useState({
    moduleIndex: 0,
    moduleTitle: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: 60,
    meetingLink: ''
  });

  // Video upload state
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Recording upload modal state - for entering module title/description
  const [recordingModal, setRecordingModal] = useState<{
    open: boolean;
    classId: string;
    moduleIndex: number;
    moduleTitle: string;
    file: File | null;
  }>({
    open: false,
    classId: '',
    moduleIndex: 0,
    moduleTitle: '',
    file: null
  });

  // Recording form state
  const [recordingForm, setRecordingForm] = useState({
    moduleTitle: '',
    moduleDescription: ''
  });

  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['completed', 'scheduled']));

  // Track which module's video is currently playing
  const [playingModuleId, setPlayingModuleId] = useState<string | null>(null);

  // Pending video backups state
  const [pendingBackups, setPendingBackups] = useState<any[]>([]);

  // Description edit modal state - for adding "what we covered" description
  const [descriptionModal, setDescriptionModal] = useState<{
    open: boolean;
    classId: string;
    currentDescription: string;
    moduleTitle: string;
    completeAfterSave: boolean; // Track if we should complete after saving
  }>({
    open: false,
    classId: '',
    currentDescription: '',
    moduleTitle: '',
    completeAfterSave: false
  });
  const [descriptionForm, setDescriptionForm] = useState({
    moduleDescription: ''
  });
  const [savingDescription, setSavingDescription] = useState(false);

  // Batch progress updating state
  const [updatingProgress, setUpdatingProgress] = useState<string | null>(null);

  // Confirmation dialog state for decreasing progress
  const [progressConfirm, setProgressConfirm] = useState<{
    open: boolean;
    batchId: string;
    newProgress: number;
    currentProgress: number;
  }>({
    open: false,
    batchId: '',
    newProgress: 0,
    currentProgress: 0
  });

  // Certificate assignment modal state
  const [certificateModal, setCertificateModal] = useState<{
    open: boolean;
    batchId: string;
    courseId: string;
    courseTitle: string;
    progress: number;
  }>({
    open: false,
    batchId: '',
    courseId: '',
    courseTitle: '',
    progress: 0
  });

  const [certificateForm, setCertificateForm] = useState({
    completionDate: new Date().toISOString().split('T')[0],
    issueDate: new Date().toISOString().split('T')[0],
    startDate: ''
  });

  const [assigningCertificate, setAssigningCertificate] = useState(false);
  const [assignedCertificates, setAssignedCertificates] = useState<Record<string, boolean>>({});

  // Check for pending backups on mount
  useEffect(() => {
    const checkPendingBackups = () => {
      const backups = JSON.parse(localStorage.getItem('videoBackups') || '[]');
      setPendingBackups(backups);
    };
    checkPendingBackups();

    // Poll for new backups every 30 seconds
    const interval = setInterval(checkPendingBackups, 30000);
    return () => clearInterval(interval);
  }, []);

  // Upload pending backup
  const uploadPendingBackup = async (backup: any, index: number) => {
    try {
      // Convert dataUrl back to file
      const response = await fetch(backup.dataUrl);
      const blob = await response.blob();
      const file = new File([blob], backup.fileName, { type: backup.fileType });

      // Get presigned URL
      const params = new URLSearchParams();
      params.set('fileName', backup.fileName);
      params.set('fileType', backup.fileType);
      params.set('classId', backup.classId);

      const res = await fetch(`/api/module-class/recordings?${params}`, {
        method: 'PUT'
      });

      const data = await res.json();

      if (data.success && data.uploadUrl) {
        // Upload to S3
        await fetch(data.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': backup.fileType }
        });

        // Save to database
        await fetch('/api/module-class/recordings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: data.s3Url,
            fileName: backup.fileName,
            fileType: backup.fileType,
            fileSize: backup.fileSize,
            classId: backup.classId,
            title: backup.moduleTitle || 'Recording',
            description: backup.moduleDescription || '',
            uploadedBy: backup.uploadedBy,
            duration: 0
          })
        });

        // Remove from local storage
        const updatedBackups = pendingBackups.filter((_, i) => i !== index);
        localStorage.setItem('videoBackups', JSON.stringify(updatedBackups));
        setPendingBackups(updatedBackups);

        toast.success('Video uploaded successfully!');
        if (trainerId) fetchCoursesData(trainerId);
      }
    } catch (error) {
      console.error('Backup upload error:', error);
      toast.error('Failed to upload pending video');
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
    const trainerObjectId = trainer._id || trainer.trainerId;
    fetchCoursesData(trainerObjectId);

    // Poll every 30 seconds to update class status
    const interval = setInterval(() => {
      fetchCoursesData(trainerObjectId);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Check if certificates are already assigned when coursesData changes
  useEffect(() => {
    const checkCertificates = async () => {
      for (const course of coursesData) {
        try {
          const res = await fetch(`/api/trainer/certificate-assign?batchId=${course.batchId}&courseId=${course.courseId}`);
          const data = await res.json();
          if (data.assignedCertificates > 0) {
            setAssignedCertificates(prev => ({ ...prev, [course.batchId]: true }));
          }
        } catch (error) {
          console.error('Error checking certificates:', error);
        }
      }
    };
    if (coursesData.length > 0) {
      checkCertificates();
    }
  }, [coursesData]);

  const fetchCoursesData = async (trainerId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/trainer/course-modules?trainerId=${trainerId}`);
      const data = await res.json();

      if (res.ok) {
        setCoursesData(data.data);
        if (data.data.length > 0 && !selectedCourse) {
          setSelectedCourse(data.data[0].courseId);
        }
      } else {
        toast.error(data.error || 'Failed to fetch courses');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const openScheduleModal = (batchId: string, courseId: string) => {
    // Find the next module index for this batch
    const course = coursesData.find(c => c.batchId === batchId);
    const nextModuleIndex = course ? course.completedModules.length + course.scheduledClasses.length : 0;

    // Auto-generate class title as "class-1", "class-2", etc.
    const nextClassNumber = nextModuleIndex + 1;
    const autoModuleTitle = `class-${nextClassNumber}`;

    setScheduleForm({
      moduleIndex: nextModuleIndex,
      moduleTitle: autoModuleTitle,
      scheduledDate: '',
      scheduledTime: '',
      duration: 60,
      meetingLink: ''
    });
    setScheduleModal({ open: true, batchId, courseId });
  };

  const handleScheduleClass = async () => {
    if (!scheduleForm.scheduledDate || !scheduleForm.scheduledTime) {
      toast.error('Please select date and time');
      return;
    }

    try {
      const trainerIdVal = trainerInfo?._id || trainerInfo?.trainerId;

      const res = await fetch('/api/module-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: scheduleModal.courseId,
          batchId: scheduleModal.batchId,
          moduleIndex: scheduleForm.moduleIndex,
          moduleTitle: scheduleForm.moduleTitle || `Module ${scheduleForm.moduleIndex + 1}`,
          trainerId: trainerIdVal,
          scheduledDate: scheduleForm.scheduledDate,
          scheduledTime: scheduleForm.scheduledTime,
          duration: scheduleForm.duration,
          meetingLink: scheduleForm.meetingLink
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Class scheduled successfully');
        setScheduleModal({ open: false, batchId: '', courseId: '' });
        fetchCoursesData(trainerIdVal);
      } else {
        toast.error(data.error || data.message || 'Failed to schedule class');
      }
    } catch (error) {
      console.error('Schedule error:', error);
      toast.error('Failed to schedule class');
    }
  };

  const handleCancelClass = async (classId: string) => {
    // Show warning about saving recordings first
    const confirmed = confirm(
      '⚠️ Warning: Are you sure you want to cancel this class?\n\n' +
      'Please make sure to:\n' +
      '1. Upload any recordings first\n' +
      '2. Save your work locally if needed\n\n' +
      'Click OK to cancel, Cancel to go back.'
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/module-class?classId=${classId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Class cancelled');
        fetchCoursesData(trainerId);
      } else {
        toast.error('Failed to cancel class');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel class. Please check your network connection.');
    }
  };

  // Save module description - "what we covered in this module"
  const handleSaveDescription = async () => {
    if (!descriptionModal.classId) return;

    setSavingDescription(true);
    try {
      const res = await fetch('/api/module-class', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: descriptionModal.classId,
          moduleDescription: descriptionForm.moduleDescription
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Description saved successfully');

        // If this was triggered from "Mark Complete", also complete the class
        if (descriptionModal.completeAfterSave) {
          await handleMarkCompleted(descriptionModal.classId);
        }

        setDescriptionModal({ open: false, classId: '', currentDescription: '', moduleTitle: '', completeAfterSave: false });
        setDescriptionForm({ moduleDescription: '' });
        fetchCoursesData(trainerId);
      } else {
        toast.error(data.error || 'Failed to save description');
      }
    } catch (error) {
      console.error('Save description error:', error);
      toast.error('Failed to save description');
    } finally {
      setSavingDescription(false);
    }
  };

  // Handle video file upload - opens modal first to get module title/description
  const handleVideoUploadClick = (classId: string, moduleIndex: number, moduleTitle: string, file: File) => {
    if (!file) return;

    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload MP4, WebM, or MOV files.');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 500MB.');
      return;
    }

    // Open modal to get module title and description
    setRecordingForm({
      moduleTitle: moduleTitle,
      moduleDescription: ''
    });
    setRecordingModal({
      open: true,
      classId,
      moduleIndex,
      moduleTitle,
      file
    });
  };

  // Handle actual video upload with module details
  const handleRecordingUpload = async () => {
    const file = recordingModal.file;
    if (!file) return;

    setUploadingVideo(true);
    setRecordingModal({ ...recordingModal, open: false });

    try {
      console.log('=== RECORDING UPLOAD DEBUG ===');
      console.log('recordingModal.classId:', recordingModal.classId);
      console.log('file.name:', file.name);
      console.log('recordingForm.moduleTitle:', recordingForm.moduleTitle);

      // First, get presigned URL for upload
      const params = new URLSearchParams();
      params.set('fileName', file.name);
      params.set('fileType', file.type);
      params.set('classId', recordingModal.classId);

      const res = await fetch(`/api/module-class/recordings?${params}`, {
        method: 'PUT'
      });

      const data = await res.json();
      console.log('Presigned URL response:', data);

      if (data.success && data.uploadUrl) {
        // Upload file directly to S3
        const uploadRes = await fetch(data.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type
          }
        });

        console.log('S3 upload response status:', uploadRes.status, uploadRes.ok);

        if (uploadRes.ok) {
          // Save recording to module class with module title/description
          const recordingData = {
            url: data.s3Url,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            classId: recordingModal.classId,
            title: recordingForm.moduleTitle || `Recording`,
            description: recordingForm.moduleDescription || '',
            uploadedBy: trainerInfo?.name || trainerInfo?.trainerName || 'Trainer',
            duration: 0
          };

          console.log('Recording data being sent:', recordingData);

          const saveRes = await fetch('/api/module-class/recordings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recordingData)
          });

          const saveData = await saveRes.json();
          console.log('Recording save response:', saveData);

          if (saveRes.ok && saveData.recordingSaved) {
            // Update the class status to completed
            await fetch('/api/module-class', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                classId: recordingModal.classId,
                status: 'completed',
                isCompleted: true
              })
            });

            toast.success('Video uploaded and module created successfully!');
            fetchCoursesData(trainerId);
          } else {
            console.error('Recording save failed:', saveData);
            const debugInfo = saveData.debug ?
              `\n\nDebug info:\n- classId: ${saveData.debug.classIdValue}\n- Valid ObjectId: ${saveData.debug.isValidObjectId}\n- Find Error: ${saveData.debug.findError}` :
              '';
            toast.error('Recording uploaded but could not save to module.' + debugInfo);
          }
        } else {
          throw new Error('Upload failed');
        }
      } else {
        throw new Error(data.error || 'Failed to get upload URL');
      }
    } catch (error: any) {
      console.error('Upload error:', error);

      // Check if it's a network error - save video to local storage
      if (error.name === 'TypeError' && error.message.includes('fetch') || error.message.includes('network') || !navigator.onLine) {
        // Save video to local storage for later upload
        try {
          const reader = new FileReader();
          reader.onload = async () => {
            const localBackup = {
              id: `backup_${Date.now()}`,
              classId: recordingModal.classId,
              moduleIndex: recordingModal.moduleIndex,
              moduleTitle: recordingForm.moduleTitle,
              moduleDescription: recordingForm.moduleDescription,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              dataUrl: reader.result as string,
              uploadedBy: trainerInfo?.name || trainerInfo?.trainerName || 'Trainer',
              createdAt: new Date().toISOString()
            };

            // Get existing backups
            const existingBackups = JSON.parse(localStorage.getItem('videoBackups') || '[]');
            existingBackups.push(localBackup);
            localStorage.setItem('videoBackups', JSON.stringify(existingBackups));

            toast.warning(
              '⚠️ Network error! Video saved to local storage.\n\n' +
              'The video will be saved locally and you can upload it later when the network is available.',
              { duration: 8000 }
            );
          };
          reader.onerror = () => {
            toast.error('Failed to upload video: ' + error.message);
          };
          reader.readAsDataURL(file);
        } catch (backupError) {
          console.error('Local backup error:', backupError);
          toast.error('Failed to upload video: ' + error.message);
        }
      } else {
        toast.error('Failed to upload video: ' + error.message);
      }
    } finally {
      setUploadingVideo(false);
      setRecordingModal({
        open: false,
        classId: '',
        moduleIndex: 0,
        moduleTitle: '',
        file: null
      });
    }
  };

  // Handle manual class completion
  const handleMarkCompleted = async (classId: string) => {
    try {
      const res = await fetch('/api/module-class', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId,
          status: 'completed',
          isCompleted: true
        })
      });

      if (res.ok) {
        toast.success('Class marked as completed. Meeting link has expired.');
        fetchCoursesData(trainerId);
      } else {
        toast.error('Failed to mark class as completed');
      }
    } catch (error) {
      console.error('Complete error:', error);
      toast.error('Failed to mark class as completed');
    }
  };

  // Update batch course progress (applies to all students at once)
  const handleUpdateBatchProgress = async (batchId: string, progress: number, showConfirm: boolean = true) => {
    const course = coursesData.find(c => c.batchId === batchId);
    const currentProgress = course?.courseProgress || 0;

    // If trying to decrease progress and showConfirm is true, open confirmation dialog
    if (showConfirm && progress < currentProgress) {
      setProgressConfirm({
        open: true,
        batchId,
        newProgress: progress,
        currentProgress
      });
      return;
    }

    // Proceed with progress update (increasing or no confirmation needed)
    setUpdatingProgress(batchId);
    try {
      const res = await fetch('/api/trainer/batch-progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          courseProgress: progress
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Course progress updated to ${progress}% for all students`);

        // Update local state
        setCoursesData(prev => prev.map(course =>
          course.batchId === batchId
            ? { ...course, courseProgress: progress }
            : course
        ));
      } else {
        toast.error(data.error || 'Failed to update progress');
      }
    } catch (error) {
      console.error('Progress update error:', error);
      toast.error('Failed to update progress');
    } finally {
      setUpdatingProgress(null);
    }
  };

  // Handle the confirmed progress decrease
  const handleConfirmProgressDecrease = async () => {
    const { batchId, newProgress } = progressConfirm;
    setProgressConfirm({ open: false, batchId: '', newProgress: 0, currentProgress: 0 });
    await handleUpdateBatchProgress(batchId, newProgress, false);
  };

  // Handle certificate assignment click
  const handleCertificateAssignClick = (batchId: string, courseId: string, courseTitle: string, progress: number) => {
    setCertificateModal({
      open: true,
      batchId,
      courseId,
      courseTitle,
      progress
    });
    setCertificateForm({
      completionDate: new Date().toISOString().split('T')[0],
      issueDate: new Date().toISOString().split('T')[0]
    });
  };

  // Handle actual certificate assignment
  const handleAssignCertificate = async () => {
    setAssigningCertificate(true);
    try {
      const res = await fetch('/api/trainer/certificate-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: certificateModal.batchId,
          courseId: certificateModal.courseId,
          completionDate: certificateForm.completionDate,
          issueDate: certificateForm.issueDate,
          startDate: certificateForm.startDate
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Certificates assigned to ${data.certificates.length} students`);
        setAssignedCertificates(prev => ({ ...prev, [certificateModal.batchId]: true }));
        setCertificateModal({ open: false, batchId: '', courseId: '', courseTitle: '', progress: 0 });
      } else {
        toast.error(data.error || 'Failed to assign certificates');
      }
    } catch (error) {
      console.error('Certificate assignment error:', error);
      toast.error('Failed to assign certificates');
    } finally {
      setAssigningCertificate(false);
    }
  };

  if (isLoading) {
    return (
      <TrainerLayout>
        <div className="p-6 flex items-center justify-center">
          <p className="text-gray-600">Loading courses...</p>
        </div>
      </TrainerLayout>
    );
  }

  // Pending backups banner
  const showBackupsBanner = pendingBackups.length > 0;

  return (
    <TrainerLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">Course Modules</h1>
          <p className="text-green-100 mt-2">Manage your class recordings and schedule new classes</p>
        </div>

        {/* Pending Backups Warning Banner */}
        {showBackupsBanner && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-yellow-600 mt-1">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800">
                  ⚠️ {pendingBackups.length} video{pendingBackups.length > 1 ? 's' : ''} saved locally due to network error
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  These videos were saved to your browser and will be lost if you clear your browser data.
                </p>
                <div className="mt-3 space-y-2">
                  {pendingBackups.map((backup, index) => (
                    <div key={backup.id} className="flex items-center justify-between bg-white rounded-lg p-2 border border-yellow-100">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{backup.moduleTitle || 'Recording'}</p>
                        <p className="text-xs text-gray-500">{backup.fileName} • {new Date(backup.createdAt).toLocaleString()}</p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-yellow-600 hover:bg-yellow-700"
                        onClick={() => uploadPendingBackup(backup, index)}
                      >
                        Upload Now
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Course Tabs */}
        {coursesData.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[...coursesData].reverse().map((course) => (
              <button
                key={course.batchId}
                onClick={() => setSelectedCourse(course.courseId)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${selectedCourse === course.courseId
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {course.courseTitle}
                <span className="ml-2 text-xs opacity-75">({course.batchName})</span>
              </button>
            ))}
          </div>
        )}

        {/* Course Details */}
        {selectedCourse && (() => {
          const course = coursesData.find(c => c.courseId === selectedCourse);
          if (!course) return null;

          return (
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200 bg-gray-50">
                <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  {course.courseTitle}
                </CardTitle>
                <p className="text-gray-600 mt-1">{course.courseDescription}</p>
                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                  <span>Batch: {course.batchName}</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    {course.totalCompletedModules} Completed
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    {course.totalScheduledClasses} Scheduled
                  </span>
                </div>
                {/* Course Progress - Checkout Style Progress Bar */}
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        Course Progress (All Students)
                      </p>
                      <p className="text-sm text-gray-500">Click on steps to update course progress</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${course.courseProgress === 100 ? 'text-green-600' :
                          course.courseProgress >= 70 ? 'text-blue-600' :
                            course.courseProgress >= 30 ? 'text-yellow-600' :
                              course.courseProgress >= 10 ? 'text-orange-600' :
                                'text-gray-400'
                        }`}>{course.courseProgress || 0}%</span>
                    </div>
                  </div>

                  {/* Checkout-Style Progress Steps */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between relative">
                      {/* Progress Line Background */}
                      <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200 z-0"></div>
                      {/* Active Progress Line */}
                      <div
                        className="absolute top-6 left-6 h-0.5 bg-blue-500 z-0 transition-all duration-300"
                        style={{
                          width: `${Math.max(0, ((course.courseProgress || 0) / 100) * 100 - 12)}%`
                        }}
                      ></div>

                      {/* Progress Steps */}
                      {[
                        { value: 0, label: 'Start', icon: '🚀' },
                        { value: 10, label: 'Basics', icon: '📚' },
                        { value: 30, label: 'Foundation', icon: '🏗️' },
                        { value: 50, label: 'Intermediate', icon: '⚡' },
                        { value: 70, label: 'Advanced', icon: '🎯' },
                        { value: 100, label: 'Complete', icon: '🎓' }
                      ].map((step, index) => {
                        const isActive = (course.courseProgress || 0) >= step.value;
                        const isCurrent = (course.courseProgress || 0) === step.value;
                        const canClick = step.value !== 0; // Can't click on start

                        return (
                          <div key={step.value} className="flex flex-col items-center relative z-10">
                            {/* Step Circle */}
                            <button
                              onClick={() => {
                                if (canClick && !updatingProgress) {
                                  // If clicking on an earlier step, show confirmation
                                  const needsConfirmation = step.value < (course.courseProgress || 0);
                                  handleUpdateBatchProgress(course.batchId, step.value, needsConfirmation);
                                }
                              }}
                              disabled={!canClick || updatingProgress === course.batchId}
                              className={`
                                w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-bold transition-all duration-300 relative
                                ${canClick ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                                ${isActive
                                  ? (step.value === 100 ? 'bg-green-500 border-green-500 text-white' : 'bg-blue-500 border-blue-500 text-white')
                                  : 'bg-white border-gray-300 text-gray-400 hover:border-blue-400'
                                }
                                ${isCurrent ? 'ring-4 ring-blue-200 shadow-lg' : ''}
                                disabled:opacity-50 disabled:cursor-not-allowed
                              `}
                              title={canClick ? `Set progress to ${step.value}%` : 'Starting point'}
                            >
                              {updatingProgress === course.batchId && isCurrent ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <span>{step.icon}</span>
                              )}
                            </button>

                            {/* Step Label */}
                            <div className="mt-2 text-center">

                              <div className={`text-xs ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                                {step.value}%
                              </div>
                            </div>

                            {/* Current Step Indicator */}
                            {isCurrent && (
                              <div className="absolute -top-2 -right-2">
                                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white animate-pulse"></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress Description */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>
                          {(course.courseProgress || 0) === 0 && "Course not started yet"}
                          {(course.courseProgress || 0) === 10 && "Students learning basic concepts"}
                          {(course.courseProgress || 0) === 30 && "Foundation topics being covered"}
                          {(course.courseProgress || 0) === 50 && "Students working on intermediate topics"}
                          {(course.courseProgress || 0) === 70 && "Advanced concepts in progress"}
                          {(course.courseProgress || 0) === 100 && "🎉 Course completed! All students have finished the curriculum."}
                          {![0, 10, 30, 50, 70, 100].includes(course.courseProgress || 0) && `Progress: ${course.courseProgress}%`}
                        </span>
                      </div>
                    </div>

                    {/* Timestamp showing when progress was last updated */}
                    {course.progressUpdatedAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Last updated: {new Date(course.progressUpdatedAt).toLocaleString()}
                        {course.progressUpdatedBy && ` by ${course.progressUpdatedBy}`}
                      </p>
                    )}

                    {/* Certificate Assignment Section */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-purple-600" />
                          <span className="font-semibold text-gray-900">Certificate Assignment</span>
                        </div>
                        <button
                          onClick={() => handleCertificateAssignClick(
                            course.batchId,
                            course.courseId,
                            course.courseTitle,
                            course.courseProgress || 0
                          )}
                          disabled={assigningCertificate}
                          className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                            ${assignedCertificates[course.batchId]
                              ? 'bg-green-100 text-green-700 cursor-default'
                              : (course.courseProgress || 0) < 100
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                            }
                          `}
                        >
                          {assignedCertificates[course.batchId] ? (
                            <>
                              <CheckSquare className="h-4 w-4" />
                              Certificates Assigned
                            </>
                          ) : (course.courseProgress || 0) < 100 ? (
                            <>
                              <Award className="h-4 w-4" />
                              Assign Certificate (100% required)
                            </>
                          ) : (
                            <>
                              <Award className="h-4 w-4" />
                              Assign Certificate
                            </>
                          )}
                        </button>
                      </div>
                      {assignedCertificates[course.batchId] && (
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Certificates have been issued to all students in this batch
                        </p>
                      )}
                      {(course.courseProgress || 0) < 100 && !assignedCertificates[course.batchId] && (
                        <p className="text-xs text-orange-600 mt-2">
                          ⚠️ Course must be 100% complete to assign certificates
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Section 1: Completed Modules with Recordings */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('completed')}
                    className="w-full bg-green-50 p-4 flex items-center justify-between hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">Completed Modules</h3>
                        <p className="text-sm text-gray-500">{course.completedModules.length} modules with recordings</p>
                      </div>
                    </div>
                    {expandedSections.has('completed') ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </button>

                  {expandedSections.has('completed') && (
                    <div className="p-4 bg-white space-y-4">
                      {course.completedModules.length > 0 ? (
                        <div className="space-y-4">
                          {[...course.completedModules].reverse().map((module) => (
                            <div
                              key={module._id}
                              className="bg-white border border-gray-200 rounded-lg p-4 flex gap-4 hover:shadow-md transition-shadow"
                            >
                              {/* Video player - show icon initially, click to play */}
                              <div className="w-64 flex-shrink-0">
                                {module.recordings && module.recordings.length > 0 && module.recordings[0].url ? (
                                  <div className="relative">
                                    {/* Initial state: show video icon */}
                                    {playingModuleId !== module._id && (
                                      <div
                                        className="w-full h-36 bg-gray-900 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-800 transition-colors"
                                        onClick={() => setPlayingModuleId(module._id)}
                                      >
                                        <PlayCircle className="h-16 w-16 text-white" />
                                      </div>
                                    )}
                                    {/* When clicked: show video player */}
                                    {playingModuleId === module._id && (
                                      <video
                                        src={module.recordings[0].url}
                                        controls
                                        className="w-full h-36 object-cover rounded-lg"
                                        preload="metadata"
                                        autoPlay
                                      />
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-full h-36 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <Video className="h-12 w-12 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              {/* Module info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-gray-900 text-lg">{module.moduleTitle || `Module ${module.moduleIndex + 1}`}</h4>
                                  {/* Edit description button */}
                                  <button
                                    onClick={() => {
                                      setDescriptionModal({
                                        open: true,
                                        classId: module._id,
                                        currentDescription: module.moduleDescription || '',
                                        moduleTitle: module.moduleTitle || ''
                                      });
                                      setDescriptionForm({ moduleDescription: module.moduleDescription || '' });
                                    }}
                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Add what we covered in this module"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                </div>
                                <p className="text-gray-500 text-sm mt-1">
                                  {new Date(module.scheduledDate).toLocaleDateString()} • {module.scheduledTime} • {module.duration} min
                                </p>
                                {module.moduleDescription && (
                                  <p className="text-gray-600 text-sm mt-2">{module.moduleDescription}</p>
                                )}
                                <div className="flex items-center gap-2 mt-3">
                                  <Badge className="bg-green-100 text-green-700 border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Completed
                                  </Badge>
                                  <span className="text-xs text-gray-500">
                                    {module.recordings?.length || 0} recording{(module.recordings?.length || 0) !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                          <p>No completed modules yet</p>
                          <p className="text-gray-400 text-sm mt-1">Complete a class and upload recording to create a module</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 2: Scheduled Classes */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('scheduled')}
                    className="w-full bg-blue-50 p-4 flex items-center justify-between hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">Scheduled Classes</h3>
                        <p className="text-sm text-gray-500">{course.scheduledClasses.length} upcoming classes</p>
                      </div>
                    </div>
                    {expandedSections.has('scheduled') ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                  </button>

                  {expandedSections.has('scheduled') && (
                    <div className="p-4 bg-white space-y-3">
                      {course.scheduledClasses.length > 0 ? (
                        [...course.scheduledClasses].reverse().map((classItem) => (
                          <div
                            key={classItem._id}
                            className="bg-gray-50 rounded-lg p-4 flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">{classItem.moduleTitle || `Module ${classItem.moduleIndex + 1}`}</h4>
                                {/* Edit description button */}
                                <button
                                  onClick={() => {
                                    setDescriptionModal({
                                      open: true,
                                      classId: classItem._id,
                                      currentDescription: classItem.moduleDescription || '',
                                      moduleTitle: classItem.moduleTitle || ''
                                    });
                                    setDescriptionForm({ moduleDescription: classItem.moduleDescription || '' });
                                  }}
                                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Add what we covered in this module"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(classItem.scheduledDate).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {classItem.scheduledTime}
                                </span>
                                <span>{classItem.duration} min</span>
                              </div>
                              {classItem.bbbMeetingId && (
                                <div className="text-sm text-green-600 mt-1 flex items-center gap-1">
                                  <Video className="h-4 w-4" />
                                  BigBlueButton Live Class
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 items-center">
                              {/* Join Class button - show if not completed */}
                              {(classItem.status === 'scheduled' || classItem.status === 'live' || classItem.isLive) && classItem.status !== 'completed' && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={async () => {
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
                                        
                                        // Open directly - bypasses Greenlight auth
                                        window.open(data.joinUrl, '_blank', 'width=1200,height=800');
                                        
                                        toast.success(`Joining BigBlueButton: ${data.className}`);
                                        
                                        if (data.meetingCreated) {
                                          toast.info('Meeting created! You can now admit students.', { duration: 5000 });
                                        }
                                      } else {
                                        throw new Error(data.error || 'Failed to generate join URL');
                                      }
                                      
                                    } catch (error: any) {
                                      console.error('Join error:', error);
                                      toast.error('Failed to join class: ' + error.message);
                                      
                                      // Show helpful message
                                      toast.info('Please try again or contact support if the issue persists', { duration: 5000 });
                                    }
                                  }}
                                >
                                  <PlayCircle className="h-4 w-4 mr-1" />
                                  {classItem.isLive ? 'Join Live' : 'Join Class'}
                                </Button>
                              )}
                              {/* Mark Complete Checkbox - requires description first */}
                              {classItem.status !== 'completed' && (
                                <label className="flex items-center gap-2 cursor-pointer bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 hover:bg-orange-100 transition-colors">
                                  <input
                                    type="checkbox"
                                    className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        // Check if description exists - if not, open modal
                                        if (!classItem.moduleDescription || classItem.moduleDescription.trim() === '') {
                                          // Open description modal first with flag to complete after save
                                          setDescriptionModal({
                                            open: true,
                                            classId: classItem._id,
                                            currentDescription: classItem.moduleDescription || '',
                                            moduleTitle: classItem.moduleTitle || '',
                                            completeAfterSave: true
                                          });
                                          setDescriptionForm({ moduleDescription: classItem.moduleDescription || '' });
                                          toast.warning('Please add "What We Covered" before marking complete');
                                          // Uncheck the checkbox
                                          e.target.checked = false;
                                          return;
                                        }
                                        // Description exists, proceed with completion
                                        handleMarkCompleted(classItem._id);
                                        // Uncheck after completion
                                        e.target.checked = false;
                                      }
                                    }}
                                  />
                                  <span className="text-sm font-medium text-orange-700">Mark Complete</span>
                                </label>
                              )}
                              {/* Upload Recording button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const fileInput = document.getElementById(`video-upload-${classItem._id}`) as HTMLInputElement;
                                  if (fileInput) fileInput.click();
                                }}
                              >
                                <Upload className="h-4 w-4 mr-1" />
                                Upload Recording
                              </Button>
                              <input
                                type="file"
                                accept="video/mp4,video/webm,video/quicktime"
                                id={`video-upload-${classItem._id}`}
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleVideoUploadClick(classItem._id, classItem.moduleIndex, classItem.moduleTitle || '', file);
                                  }
                                }}
                                disabled={uploadingVideo}
                              />
                              {/* Cancel button */}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleCancelClass(classItem._id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                          <p>No scheduled classes</p>
                          <p className="text-gray-400 text-sm mt-1">Schedule a new class below</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 3: Schedule New Class */}
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <div className="p-4 bg-gray-100 border-b">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Plus className="h-5 w-5 text-green-600" />
                      Schedule New Class
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Create a new class session. Upload recording later to create a module.</p>
                  </div>
                  <div className="p-4">
                    <Button
                      onClick={() => openScheduleModal(course.batchId, course.courseId)}
                      className="bg-green-600 hover:bg-green-700 w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule Class
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Schedule Modal */}
        {scheduleModal.open && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-gray-900">Schedule New Class</h3>
                <button
                  onClick={() => setScheduleModal({ open: false, batchId: '', courseId: '' })}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Module Title (optional)</label>
                  <input
                    type="text"
                    value={scheduleForm.moduleTitle}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, moduleTitle: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="class-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-generated (e.g., class-1, class-2, class-3). You can rename it after uploading recording.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduleForm.scheduledDate}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduleForm.scheduledTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <select
                    value={scheduleForm.duration}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                  <p className="font-medium">Using BigBlueButton</p>
                  <p className="mt-1">A BigBlueButton meeting will be created automatically. You can join when the class starts. Recordings will be saved automatically.</p>
                </div>
                <Button
                  onClick={handleScheduleClass}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Schedule Class
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Description Modal - Add "What we covered" */}
        {descriptionModal.open && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-gray-900">What We Covered</h3>
                <button
                  onClick={() => setDescriptionModal({ open: false, classId: '', currentDescription: '', moduleTitle: '' })}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                  <p className="font-medium">Module: {descriptionModal.moduleTitle}</p>
                  <p className="mt-1">Describe what topics were covered in this class. This will be shown to students.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">What We Covered</label>
                  <textarea
                    value={descriptionForm.moduleDescription}
                    onChange={(e) => setDescriptionForm({ ...descriptionForm, moduleDescription: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={4}
                    placeholder="e.g., Introduction to React hooks, state management, useEffect lifecycle, building a counter app..."
                  />
                </div>
                <Button
                  onClick={handleSaveDescription}
                  disabled={savingDescription}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {savingDescription ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Description'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Progress Decrease Confirmation Dialog - AWS Style */}
        <AlertDialog open={progressConfirm.open} onOpenChange={(open) => setProgressConfirm({ ...progressConfirm, open })}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-6 w-6" />
                Decrease Course Progress
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <p className="text-red-800 text-sm font-medium">⚠️ This action will decrease student progress</p>
                </div>
                <div className="text-sm text-gray-600">
                  <p>You are about to change the course progress for all students from:</p>
                  <div className="mt-2 p-2 bg-gray-100 rounded text-center">
                    <span className="font-bold text-blue-600">{progressConfirm.currentProgress}%</span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="font-bold text-red-600">{progressConfirm.newProgress}%</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">This will affect all students in this batch and cannot be undone automatically.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="flex-1">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmProgressDecrease}
                className="bg-red-600 hover:bg-red-700 text-white flex-1"
              >
                Decrease Progress
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Recording Upload Modal - for entering module title and description */}
        {recordingModal.open && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-gray-900">Upload Recording</h3>
                <button
                  onClick={() => setRecordingModal({
                    open: false,
                    classId: '',
                    moduleIndex: 0,
                    moduleTitle: '',
                    file: null
                  })}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                  <p className="font-medium">Create Module</p>
                  <p className="mt-1">Enter the module title and description. This will create the module from your class.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Module Title</label>
                  <input
                    type="text"
                    value={recordingForm.moduleTitle}
                    onChange={(e) => setRecordingForm({ ...recordingForm, moduleTitle: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Introduction to React"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Module Description</label>
                  <textarea
                    value={recordingForm.moduleDescription}
                    onChange={(e) => setRecordingForm({ ...recordingForm, moduleDescription: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                    placeholder="Describe what this module covers..."
                  />
                </div>
                {recordingModal.file && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Selected file:</p>
                    <p className="text-sm font-medium text-gray-900">{recordingModal.file.name}</p>
                    <p className="text-xs text-gray-500">{(recordingModal.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                )}
                <Button
                  onClick={handleRecordingUpload}
                  disabled={uploadingVideo || !recordingForm.moduleTitle}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                >
                  {uploadingVideo ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Recording'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Certificate Assignment Modal */}
        {certificateModal.open && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-600" />
                  Assign Certificate
                </h3>
                <button
                  onClick={() => setCertificateModal({ open: false, batchId: '', courseId: '', courseTitle: '', progress: 0 })}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="bg-purple-50 p-3 rounded-lg text-sm text-purple-700">
                  <p className="font-medium">Course: {certificateModal.courseTitle}</p>
                  <p className="mt-1">This will issue certificates to all students in this batch.</p>
                </div>

                {certificateModal.progress < 100 && (
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 text-sm">
                    <p className="font-medium text-orange-700">⚠️ Warning: Course progress is {certificateModal.progress}%</p>
                    <p className="text-orange-600 mt-1">Certificates should only be assigned when course is 100% complete.</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Training Start Date</label>
                  <input
                    type="date"
                    value={certificateForm.startDate}
                    onChange={(e) => setCertificateForm({ ...certificateForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">When the training started (will show as training period)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Completion Date</label>
                  <input
                    type="date"
                    value={certificateForm.completionDate}
                    onChange={(e) => setCertificateForm({ ...certificateForm, completionDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Date when the student completed the course</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={certificateForm.issueDate}
                    onChange={(e) => setCertificateForm({ ...certificateForm, issueDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">Date when the certificate is being issued</p>
                </div>



                <Button
                  onClick={handleAssignCertificate}
                  disabled={assigningCertificate}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {assigningCertificate ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Assigning Certificates...
                    </>
                  ) : (
                    <>
                      <Award className="h-4 w-4 mr-2" />
                      Assign Certificates to All Students
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TrainerLayout>
  );
};

export default TrainerCourseModules;