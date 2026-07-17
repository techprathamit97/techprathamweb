import React, { useEffect, useState } from 'react';

import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Calendar,
  Users,
  Plus,
  Clock,
  User,
  Mail,
  Video,
  Edit,
  Trash2,
  UserPlus,
  MessageSquare,
  BarChart3,
  Search,
  Award,
  CheckSquare,
  Square,
  CalendarDays
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface Student {
  _id: string;
  studentId: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  enrollmentDate: string;
  isActive: boolean;
  isRestricted?: boolean;
  profileImage?: string;
  batches?: string[];
}

interface Batch {
  _id: string;
  batchId: string;
  batchName: string;
  batchCode: string;
  courseId: string;
  course_title?: string;
  trainerId: any;
  trainerName?: string;
  trainer?: {
    name: string;
    email: string;
    profile?: string;
    experience: string;
    rating: number;
  };
  startDate: string;
  endDate: string;
  timing?: string;
  capacity: number;
  studentIds: string[];
  studentCount?: number;
  status: 'upcoming' | 'ongoing' | 'completed';
  meetingLink?: string;
  description?: string;
  createdAt: string;
}

const BatchesManagement = () => {
  
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [isViewStudentsDialogOpen, setIsViewStudentsDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [batchStudentsDetails, setBatchStudentsDetails] = useState<Student[]>([]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Certificate assignment state
  const [isCertificateDialogOpen, setIsCertificateDialogOpen] = useState(false);
  const [isCertificateEditDialogOpen, setIsCertificateEditDialogOpen] = useState(false);
  const [certificateStudents, setCertificateStudents] = useState<Student[]>([]);
  const [selectedForCertificate, setSelectedForCertificate] = useState<string[]>([]);
  const [existingCertificates, setExistingCertificates] = useState<any[]>([]);
  const [certificateData, setCertificateData] = useState({
    template: 'standard',
    customMessage: '',
    startDate: '' // Global start date for all students
  });

  // Individual student certificate dates
  const [studentCertificateDates, setStudentCertificateDates] = useState<Record<string, { startDate: string; endDate: string }>>({});
  const [isAssigningCertificates, setIsAssigningCertificates] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [editCertificateData, setEditCertificateData] = useState({
    startDate: '',
    endDate: '',
    grade: 'A',
    score: 85
  });

  // Bulk actions state
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  
  const [newBatch, setNewBatch] = useState({
    batchName: '',
    courseId: '',
    trainerId: '',
    startDate: '',
    endDate: '',
    timing: '',
    capacity: 30,
    meetingLink: '',
    description: ''
  });

  // Function to determine batch status based on dates
  const getBatchStatus = (batch: Batch): 'upcoming' | 'ongoing' | 'completed' => {
    const today = new Date();
    const startDate = new Date(batch.startDate);
    const endDate = new Date(batch.endDate);
    
    if (today > endDate) {
      return 'completed';
    } else if (today >= startDate && today <= endDate) {
      return 'ongoing';
    } else {
      return 'upcoming';
    }
  };

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/lms/batches');
      const data = await res.json();
      
      if (res.ok) {
        // Update batch statuses based on dates
        const batchesWithUpdatedStatus = Array.isArray(data) ? data.map(batch => ({
          ...batch,
          status: getBatchStatus(batch)
        })) : [];
        
        setBatches(batchesWithUpdatedStatus);
        
        // Update batch statuses in database if needed
        batchesWithUpdatedStatus.forEach(async (batch) => {
          if (batch.status !== data.find((b: Batch) => b._id === batch._id)?.status) {
            await updateBatchStatus(batch._id, batch.status);
          }
        });
      } else {
        throw new Error(data.message || 'Failed to fetch batches');
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
      toast.error('Failed to fetch batches');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/lms/students');
      const data = await res.json();
      
      if (res.ok) {
        setStudents(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const updateBatchStatus = async (batchId: string, status: string) => {
    try {
      await fetch(`/api/lms/batches/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (error) {
      console.error('Failed to update batch status:', error);
    }
  };

  const assignStudentsToBatch = async () => {
    if (!selectedBatch || selectedStudents.length === 0) {
      toast.error('Please select students to assign');
      return;
    }

    try {
      const res = await fetch(`/api/lms/batches/${selectedBatch._id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedStudents })
      });

      if (res.ok) {
        toast.success(`${selectedStudents.length} students assigned to batch`);
        setIsStudentDialogOpen(false);
        setSelectedStudents([]);
        fetchBatches(); // Refresh batches
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to assign students');
      }
    } catch (error: any) {
      console.error('Failed to assign students:', error);
      toast.error(error.message || 'Failed to assign students');
    }
  };

  const fetchBatchStudents = async (batch: Batch) => {
    try {
      // Fetch students by their IDs
      const res = await fetch('/api/lms/students');
      const data = await res.json();
      
      if (res.ok) {
        // Filter students that are in this batch
        const batchStudents = Array.isArray(data) ? 
          data.filter((student: Student) => 
            batch.studentIds.includes(student._id)
          ) : [];
        
        setBatchStudentsDetails(batchStudents);
        setSelectedBatch(batch);
        setIsViewStudentsDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch batch students:', error);
      toast.error('Failed to fetch student details');
    }
  };

  const openEmailDialog = async (batch: Batch) => {
    try {
      // Fetch students by their IDs
      const res = await fetch('/api/lms/students');
      const data = await res.json();
      
      if (res.ok) {
        // Filter students that are in this batch
        const batchStudents = Array.isArray(data) ? 
          data.filter((student: Student) => 
            batch.studentIds.includes(student._id)
          ) : [];
        
        setBatchStudentsDetails(batchStudents);
        setSelectedBatch(batch);
        setEmailSubject('');
        setEmailMessage('');
        setIsEmailDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch batch students:', error);
      toast.error('Failed to fetch student details');
    }
  };

  const sendEmailToAllStudents = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error('Please enter both subject and message');
      return;
    }

    if (batchStudentsDetails.length === 0) {
      toast.error('No students enrolled in this batch');
      return;
    }

    setIsSendingEmail(true);

    try {
      // Get all student emails
      const studentEmails = batchStudentsDetails.map(student => student.email);
      
      // Send email to all students
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: studentEmails.join(', '),
          subject: emailSubject,
          message: emailMessage
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Email sent successfully to ${studentEmails.length} students`);
        setIsEmailDialogOpen(false);
        setEmailSubject('');
        setEmailMessage('');
      } else {
        throw new Error(data.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Failed to send email:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Certificate assignment functions
  const openCertificateDialog = async (batch: Batch) => {
    try {
      // Fetch students by their IDs
      const res = await fetch('/api/lms/students');
      const data = await res.json();

      if (res.ok) {
        // Filter students that are in this batch
        const batchStudents = Array.isArray(data)
          ? data.filter((student: Student) =>
              batch.studentIds.includes(student._id)
            )
          : [];

        setBatchStudentsDetails(batchStudents);

        // Fetch existing certificates
        const certRes = await fetch('/api/lms/certificates');
        const certData = await certRes.json();

        if (certRes.ok) {
          setExistingCertificates(Array.isArray(certData) ? certData : []);
        }

        setSelectedBatch(batch);
        setCertificateStudents(batchStudents);
        setSelectedForCertificate([]);
        setCertificateData({
          template: 'standard',
          customMessage: '',
          startDate: ''
        });
        setStudentCertificateDates({});
        setIsCertificateDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch batch students:', error);
      toast.error('Failed to fetch student details');
    }
  };

  const toggleCertificateSelection = (studentId: string) => {
    setSelectedForCertificate(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllForCertificate = () => {
    // Get students who don't have certificates yet
    const studentsWithoutCerts = certificateStudents.filter(
      (student) =>
        !existingCertificates.some(
          (cert) => cert.studentEmail === student.email && cert.courseName === selectedBatch?.course_title
        )
    );
    setSelectedForCertificate(studentsWithoutCerts.map((s) => s._id));
  };

  const clearCertificateSelection = () => {
    setSelectedForCertificate([]);
  };

  const updateStudentDate = (studentId: string, field: 'startDate' | 'endDate', value: string) => {
    setStudentCertificateDates(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const assignCertificatesToSelected = async () => {
    if (selectedForCertificate.length === 0) {
      toast.error('Please select students to assign certificates');
      return;
    }

    // Check if all selected students have dates
    // Check if start date is set (global) and end dates for each student
    if (!certificateData.startDate) {
      toast.error('Please set the Start Date (training start date)');
      return;
    }

    const studentsWithoutEndDate = selectedForCertificate.filter(
      (id) => !studentCertificateDates[id]?.endDate
    );

    if (studentsWithoutEndDate.length > 0) {
      toast.error('Please set end date for all selected students');
      return;
    }

    setIsAssigningCertificates(true);

    try {
      const studentsToAssign = certificateStudents.filter((s) =>
        selectedForCertificate.includes(s._id)
      );

      // Add individual dates to each student
      const studentsWithDates = studentsToAssign.map((student) => ({
        ...student,
        startDate: certificateData.startDate || studentCertificateDates[student._id]?.startDate,
        endDate: studentCertificateDates[student._id]?.endDate
      }));

      const res = await fetch('/api/lms/certificates/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: studentsWithDates,
          courseName: selectedBatch?.course_title,
          courseCategory: selectedBatch?.courseId,
          batchId: selectedBatch?._id,
          trainerName: selectedBatch?.trainer?.name,
          template: certificateData.template,
          customMessage: certificateData.customMessage
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          `Certificates assigned to ${data.results?.created?.length || 0} students`
        );
        setIsCertificateDialogOpen(false);
        setSelectedForCertificate([]);
        // Refresh certificates
        const certRes = await fetch('/api/lms/certificates');
        const certData = await certRes.json();
        if (certRes.ok) {
          setExistingCertificates(Array.isArray(certData) ? certData : []);
        }
      } else {
        throw new Error(data.error || 'Failed to assign certificates');
      }
    } catch (error: any) {
      console.error('Failed to assign certificates:', error);
      toast.error(error.message || 'Failed to assign certificates');
    } finally {
      setIsAssigningCertificates(false);
    }
  };

  const hasCertificate = (studentEmail: string) => {
    return existingCertificates.some(
      (cert) =>
        cert.studentEmail === studentEmail && cert.courseName === selectedBatch?.course_title
    );
  };

  const getCertificateStatus = (studentEmail: string) => {
    const cert = existingCertificates.find(
      (c) =>
        c.studentEmail === studentEmail && c.courseName === selectedBatch?.course_title
    );
    return cert?.status || null;
  };

  // Edit certificate functions
  const openEditCertificateDialog = (cert: any) => {
    setSelectedCertificate(cert);
    setEditCertificateData({
      startDate: cert.startDate ? new Date(cert.startDate).toISOString().split('T')[0] : '',
      endDate: cert.endDate ? new Date(cert.endDate).toISOString().split('T')[0] : '',
      grade: cert.grade || 'A',
      score: cert.score || 85
    });
    setIsCertificateEditDialogOpen(true);
  };

  const handleUpdateCertificate = async () => {
    if (!selectedCertificate) return;

    try {
      const res = await fetch(`/api/debug/update-certificate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificateId: selectedCertificate._id,
          startDate: editCertificateData.startDate || null,
          endDate: editCertificateData.endDate || null
        })
      });

      if (res.ok) {
        toast.success('Certificate updated successfully');
        setIsCertificateEditDialogOpen(false);
        setSelectedCertificate(null);
        // Refresh existing certificates
        const certRes = await fetch('/api/lms/certificates');
        const certData = await certRes.json();
        if (certRes.ok) {
          setExistingCertificates(Array.isArray(certData) ? certData : []);
        }
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update certificate');
      }
    } catch (error: any) {
      console.error('Failed to update certificate:', error);
      toast.error(error.message || 'Failed to update certificate');
    }
  };

  const handleApproveCertificate = async (certId: string) => {
    try {
      const res = await fetch(`/api/debug/approve-certificate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificateId: certId,
          action: 'approve'
        })
      });

      if (res.ok) {
        toast.success('Certificate approved successfully');
        // Refresh existing certificates
        const certRes = await fetch('/api/lms/certificates');
        const certData = await certRes.json();
        if (certRes.ok) {
          setExistingCertificates(Array.isArray(certData) ? certData : []);
        }
      } else {
        throw new Error('Failed to approve certificate');
      }
    } catch (error: any) {
      console.error('Failed to approve certificate:', error);
      toast.error(error.message || 'Failed to approve certificate');
    }
  };

  // Bulk approve all pending certificates for the selected batch
  const handleBulkApproveCertificates = async () => {
    if (!selectedBatch) return;

    // Find all pending certificates for this batch's course
    const pendingCerts = existingCertificates.filter(
      (cert) =>
        cert.courseName === selectedBatch?.course_title &&
        cert.status === 'pending'
    );

    if (pendingCerts.length === 0) {
      toast.error('No pending certificates to approve');
      return;
    }

    setIsBulkApproving(true);

    try {
      let approvedCount = 0;
      let failedCount = 0;

      for (const cert of pendingCerts) {
        try {
          const res = await fetch(`/api/debug/approve-certificate`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              certificateId: cert._id,
              action: 'approve'
            })
          });

          if (res.ok) {
            approvedCount++;
          } else {
            failedCount++;
          }
        } catch (err) {
          failedCount++;
        }
      }

      if (approvedCount > 0) {
        toast.success(`${approvedCount} certificate(s) approved successfully`);
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} certificate(s) failed to approve`);
      }

      // Refresh existing certificates
      const certRes = await fetch('/api/lms/certificates');
      const certData = await certRes.json();
      if (certRes.ok) {
        setExistingCertificates(Array.isArray(certData) ? certData : []);
      }
    } catch (error: any) {
      console.error('Failed to bulk approve certificates:', error);
      toast.error(error.message || 'Failed to bulk approve certificates');
    } finally {
      setIsBulkApproving(false);
    }
  };

  const openStudentDialog = (batch: Batch) => {
    setSelectedBatch(batch);
    setSelectedStudents([]);
    setStudentSearchTerm('');
    setIsStudentDialogOpen(true);
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = studentSearchTerm === '' || 
      student.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(studentSearchTerm.toLowerCase());
    
    // Only show students not already in this batch
    const notInBatch = !selectedBatch?.studentIds?.includes(student._id);
    
    return matchesSearch && notInBatch;
  });

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/course/fetch');
      const data = await res.json();
      if (res.ok) {
        setCourses(data);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const fetchTrainers = async () => {
    try {
      const res = await fetch('/api/lms/trainers');
      const data = await res.json();
      if (res.ok) {
        setTrainers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch trainers:', error);
    }
  };

  const handleCreateBatch = async () => {
    // Validate required fields
    if (!newBatch.batchName || !newBatch.courseId || !newBatch.trainerId || !newBatch.startDate || !newBatch.endDate || !newBatch.timing) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const batchData = {
        batchName: newBatch.batchName,
        courseId: newBatch.courseId,
        trainerId: newBatch.trainerId,
        startDate: new Date(newBatch.startDate),
        endDate: new Date(newBatch.endDate),
        timing: newBatch.timing,
        capacity: newBatch.capacity,
        meetingLink: newBatch.meetingLink,
        description: newBatch.description
      };

      const res = await fetch('/api/lms/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData)
      });

      const responseData = await res.json();

      if (res.ok) {
        toast.success('Batch created successfully');
        setIsCreateDialogOpen(false);
        fetchBatches();
        // Reset form
        setNewBatch({
          batchName: '',
          courseId: '',
          trainerId: '',
          startDate: '',
          endDate: '',
          timing: '',
          capacity: 30,
          meetingLink: '',
          description: ''
        });
      } else {
        throw new Error(responseData.error || responseData.message || 'Failed to create batch');
      }
    } catch (error: any) {
      console.error('Failed to create batch:', error);
      toast.error(error.message || 'Failed to create batch');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-600';
      case 'ongoing': return 'bg-green-600';
      case 'completed': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const getCapacityPercentage = (enrolled: number, capacity: number) => {
    return Math.round((enrolled / capacity) * 100);
  };

  // Student management functions
  const handleRestrictStudent = async (studentId: string, studentName: string) => {
    try {
      const res = await fetch('/api/lms/students/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, action: 'restrict' })
      });

      if (res.ok) {
        toast.success(`${studentName} has been restricted from dashboard`);
        // Refresh batch students
        if (selectedBatch) {
          fetchBatchStudents(selectedBatch);
        }
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to restrict student');
      }
    } catch (error: any) {
      console.error('Failed to restrict student:', error);
      toast.error(error.message || 'Failed to restrict student');
    }
  };

  const handleUnrestrictStudent = async (studentId: string, studentName: string) => {
    try {
      const res = await fetch('/api/lms/students/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, action: 'unrestrict' })
      });

      if (res.ok) {
        toast.success(`${studentName} has been unrestricted - can access dashboard now`);
        // Refresh batch students
        if (selectedBatch) {
          fetchBatchStudents(selectedBatch);
        }
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to unrestrict student');
      }
    } catch (error: any) {
      console.error('Failed to unrestrict student:', error);
      toast.error(error.message || 'Failed to unrestrict student');
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/lms/students/manage?studentId=${studentId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success(`${studentName} has been deleted`);
        // Refresh batch students
        if (selectedBatch) {
          fetchBatchStudents(selectedBatch);
        }
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete student');
      }
    } catch (error: any) {
      console.error('Failed to delete student:', error);
      toast.error(error.message || 'Failed to delete student');
    }
  };

  const stats = {
    totalBatches: batches.length,
    upcomingBatches: batches.filter(b => b.status === 'upcoming').length,
    ongoingBatches: batches.filter(b => b.status === 'ongoing').length,
    completedBatches: batches.filter(b => b.status === 'completed').length
  };

  useEffect(() => {
    fetchBatches();
    fetchCourses();
    fetchStudents();
    fetchTrainers();
    fetchExistingCertificates();
  }, []);

  const fetchExistingCertificates = async () => {
    try {
      const res = await fetch('/api/lms/certificates');
      const data = await res.json();
      if (res.ok) {
        setExistingCertificates(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
    }
  };

  return (
    <LMSLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Batch Management</h1>
            <p className="text-gray-400 mt-2">Create and manage course batches with trainers</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="manual" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Batch
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Batch</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Batch Name *</Label>
                    <Input
                      placeholder="e.g., Java Batch 1"
                      value={newBatch.batchName}
                      onChange={(e) => setNewBatch(prev => ({ ...prev, batchName: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-white">Course *</Label>
                    <Select 
                      value={newBatch.courseId} 
                      onValueChange={(value) => {
                        setNewBatch(prev => ({
                          ...prev,
                          courseId: value
                        }));
                      }}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {courses.map((course: any) => (
                          <SelectItem key={course._id} value={course._id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Capacity</Label>
                    <Input
                      type="number"
                      value={newBatch.capacity}
                      onChange={(e) => setNewBatch(prev => ({
                        ...prev,
                        capacity: parseInt(e.target.value) || 30
                      }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Trainer Name *</Label>
                    <Select 
                      value={newBatch.trainerId} 
                      onValueChange={(value) => {
                        setNewBatch(prev => ({
                          ...prev,
                          trainerId: value
                        }));
                      }}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select trainer" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        {trainers.map((trainer: any) => (
                          <SelectItem key={trainer._id} value={trainer._id}>
                            {trainer.name} - {trainer.experience} (ID: {trainer.trainerId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-white">Trainer Email</Label>
                    <Input
                      type="email"
                      value={
                        newBatch.trainerId 
                          ? trainers.find((t: any) => t._id === newBatch.trainerId)?.email || ''
                          : ''
                      }
                      readOnly
                      className="bg-gray-700 border-gray-600 text-white cursor-not-allowed"
                      placeholder="Auto-filled from trainer selection"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Start Date *</Label>
                    <Input
                      type="date"
                      value={newBatch.startDate}
                      onChange={(e) => setNewBatch(prev => ({
                        ...prev,
                        startDate: e.target.value
                      }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-white">End Date *</Label>
                    <Input
                      type="date"
                      value={newBatch.endDate}
                      onChange={(e) => setNewBatch(prev => ({
                        ...prev,
                        endDate: e.target.value
                      }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white">Timing *</Label>
                  <Input
                    placeholder="e.g., 10:00 AM - 12:00 PM"
                    value={newBatch.timing}
                    onChange={(e) => setNewBatch(prev => ({
                      ...prev,
                      timing: e.target.value
                    }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div>
                  <Label className="text-white">Meeting Link</Label>
                  <Input
                    placeholder="Zoom/Meet link"
                    value={newBatch.meetingLink}
                    onChange={(e) => setNewBatch(prev => ({
                      ...prev,
                      meetingLink: e.target.value
                    }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="manual" 
                  onClick={handleCreateBatch}
                  disabled={!newBatch.batchName || !newBatch.courseId || !newBatch.trainerId}
                >
                  Create Batch
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Batches</p>
                  <p className="text-2xl font-bold text-white">{stats.totalBatches}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Upcoming</p>
                  <p className="text-2xl font-bold text-white">{stats.upcomingBatches}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Ongoing</p>
                  <p className="text-2xl font-bold text-white">{stats.ongoingBatches}</p>
                </div>
                <Users className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Completed</p>
                  <p className="text-2xl font-bold text-white">{stats.completedBatches}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Batches Grid */}
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Loading batches...</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No batches created yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map((batch) => {
              const capacityPercentage = getCapacityPercentage(batch.studentIds.length, batch.capacity);
              
              return (
                <Card key={batch._id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white text-lg">{batch.course_title}</CardTitle>
                        <p className="text-gray-400 text-sm">{batch.batchId}</p>
                      </div>
                      <Badge className={getStatusColor(batch.status)}>
                        {batch.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Trainer Info */}
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={batch.trainer?.profile || ''} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                          {(batch.trainer?.name || 'T').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-medium">{batch.trainer?.name || 'Trainer not assigned'}</p>
                        <p className="text-gray-400 text-sm">{batch.trainer?.experience || 'No details'}</p>
                      </div>
                    </div>

                    {/* Schedule Info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(batch.startDate).toLocaleDateString()} - 
                          {new Date(batch.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {batch.timing && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <Clock className="h-4 w-4" />
                          <span>{batch.timing}</span>
                        </div>
                      )}
                    </div>

                    {/* Capacity */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">Students Enrolled</span>
                        <span className="text-sm text-white font-medium">
                          {batch.studentIds.length}/{batch.capacity}
                        </span>
                      </div>
                      <Progress value={capacityPercentage} className="h-2" />
                      {batch.studentIds.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {batch.studentIds.length} student(s) enrolled
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex items-center gap-1"
                        onClick={() => openStudentDialog(batch)}
                      >
                        <UserPlus className="h-3 w-3" />
                        Add Students
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex items-center gap-1"
                        onClick={() => fetchBatchStudents(batch)}
                        disabled={batch.studentIds.length === 0}
                      >
                        <Users className="h-3 w-3" />
                        Show All Students
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex items-center gap-1"
                        onClick={() => openEmailDialog(batch)}
                        disabled={batch.studentIds.length === 0}
                      >
                        <Mail className="h-3 w-3" />
                        Send Email to All
                      </Button>
                      <Button size="sm" variant="outline" className="flex items-center gap-1">
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="manual"
                        className="flex items-center gap-1"
                        onClick={() => openCertificateDialog(batch)}
                        disabled={batch.studentIds.length === 0}
                      >
                        <Award className="h-3 w-3" />
                        Assign Certificates
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Send Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              Send Email to All Students in {selectedBatch?.batchId}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                <span className="text-white font-medium">
                  {batchStudentsDetails.length} students will receive this email
                </span>
              </div>
              <Badge className="bg-blue-600">
                {selectedBatch?.course_title}
              </Badge>
            </div>

            <div>
              <Label className="text-white">Subject</Label>
              <Input
                placeholder="Enter email subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-white">Message</Label>
              <textarea
                placeholder="Enter your message here..."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={8}
                className="w-full mt-2 p-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {batchStudentsDetails.length > 0 && (
              <div className="p-3 bg-gray-700 rounded-lg">
                <p className="text-gray-400 text-sm mb-2">Recipients:</p>
                <div className="flex flex-wrap gap-2">
                  {batchStudentsDetails.slice(0, 5).map((student) => (
                    <Badge key={student._id} className="bg-gray-600">
                      {student.name}
                    </Badge>
                  ))}
                  {batchStudentsDetails.length > 5 && (
                    <Badge className="bg-gray-600">
                      +{batchStudentsDetails.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsEmailDialogOpen(false)}
              disabled={isSendingEmail}
            >
              Cancel
            </Button>
            <Button 
              variant="manual" 
              onClick={sendEmailToAllStudents}
              disabled={isSendingEmail || !emailSubject.trim() || !emailMessage.trim()}
            >
              {isSendingEmail ? 'Sending...' : `Send Email to ${batchStudentsDetails.length} Students`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Batch Students Dialog */}
      <Dialog open={isViewStudentsDialogOpen} onOpenChange={setIsViewStudentsDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Students in {selectedBatch?.batchId} - {selectedBatch?.course_title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-gray-400 text-sm">
                Total Students: {batchStudentsDetails.length}
              </p>
              <Badge className="bg-blue-600">
                Batch: {selectedBatch?.batchId}
              </Badge>
            </div>

            {batchStudentsDetails.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No students enrolled in this batch</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Phone</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Student ID</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Enrollment Date</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchStudentsDetails.map((student, index) => (
                      <tr 
                        key={student._id} 
                        className={`border-b border-gray-700 hover:bg-gray-700 transition-colors ${
                          index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xs">
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-white font-medium">
                              {student.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 text-gray-300">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{student.email}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-300 text-sm">
                          {student.phone || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-blue-600">
                            {student.studentId}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-300 text-sm">
                          {new Date(student.enrollmentDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <Badge className={student.isActive ? 'bg-green-600' : 'bg-gray-600'}>
                              {student.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </Badge>
                            {student.isRestricted && (
                              <Badge className="bg-red-600 text-xs">
                                RESTRICTED
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            {student.isRestricted ? (
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white border-0"
                                onClick={() => handleUnrestrictStudent(student._id, student.name)}
                                title="Unrestrict - allow dashboard access"
                              >
                                Unrestrict
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-yellow-600 hover:bg-yellow-700 text-white border-0"
                                onClick={() => handleRestrictStudent(student._id, student.name)}
                                title="Restrict - block dashboard access"
                              >
                                Restrict
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white border-0"
                              onClick={() => handleDeleteStudent(student._id, student.name)}
                              title="Delete - remove student account"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsViewStudentsDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Assignment Dialog */}
      <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Assign Students to {selectedBatch?.batchId}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search students by name, ID, or course..."
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            {/* Selected Count */}
            <div className="flex justify-between items-center">
              <p className="text-gray-400 text-sm">
                {selectedStudents.length} students selected
              </p>
              <p className="text-gray-400 text-sm">
                Batch Capacity: {selectedBatch?.studentIds.length || 0}/{selectedBatch?.capacity}
              </p>
            </div>

            {/* Students List */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No available students found</p>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div 
                    key={student._id} 
                    className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <Checkbox
                      checked={selectedStudents.includes(student._id)}
                      onCheckedChange={() => toggleStudentSelection(student._id)}
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-white font-medium">{student.name}</p>
                          <p className="text-gray-400 text-sm">{student.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Badge className="bg-blue-600 mb-1">
                        {student.studentId}
                      </Badge>
                      <p className="text-gray-400 text-xs">
                        {student.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    
                    <Badge className={student.isActive ? 'bg-green-600' : 'bg-gray-600'}>
                      {student.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsStudentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="manual"
              onClick={assignStudentsToBatch}
              disabled={selectedStudents.length === 0}
            >
              Assign {selectedStudents.length} Students
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Certificate Assignment Dialog */}
      <Dialog open={isCertificateDialogOpen} onOpenChange={setIsCertificateDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Assign Certificates - {selectedBatch?.batchId} - {selectedBatch?.course_title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-400" />
                <span className="text-white font-medium">
                  {certificateStudents.length} students in batch
                </span>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <Badge className="bg-green-600 text-white">
                  {certificateStudents.filter(s => hasCertificate(s.email) && getCertificateStatus(s.email) === 'issued').length} issued
                </Badge>
                <Badge className="bg-yellow-600 text-black">
                  {certificateStudents.filter(s => !hasCertificate(s.email)).length} need certs
                </Badge>
                <Badge className="bg-orange-500 text-white font-semibold">
                  {certificateStudents.filter(s => getCertificateStatus(s.email) === 'pending').length} pending
                </Badge>
                {certificateStudents.filter(s => getCertificateStatus(s.email) === 'pending').length > 0 && (
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white font-medium border-0"
                    onClick={handleBulkApproveCertificates}
                    disabled={isBulkApproving}
                  >
                    {isBulkApproving ? 'Approving...' : 'Approve All Pending'}
                  </Button>
                )}
              </div>
            </div>

            {/* Certificate Settings */}
           

            {/* Selection Actions */}
           

            {/* Students List */}
            <div className="max-h-80 overflow-y-auto space-y-2">
              {certificateStudents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">No students in this batch</p>
                </div>
              ) : (
                certificateStudents.map((student) => {
                  const hasCert = hasCertificate(student.email);
                  const certStatus = getCertificateStatus(student.email);
                  const isSelected = selectedForCertificate.includes(student._id);
                  const studentDates = studentCertificateDates[student._id] || { startDate: '', endDate: '' };

                  return (
                    <div
                      key={student._id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        hasCert ? 'bg-gray-750 opacity-60' : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      {!hasCert ? (
                        <Checkbox
                          checked={selectedForCertificate.includes(student._id)}
                          onCheckedChange={() => toggleCertificateSelection(student._id)}
                        />
                      ) : (
                        <div className="w-6 h-6 flex items-center justify-center">
                          <Badge className={certStatus === 'issued' ? 'bg-green-600' : certStatus === 'pending' ? 'bg-yellow-600' : 'bg-red-600'}>
                            {certStatus}
                          </Badge>
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-white font-medium">{student.name}</p>
                            <p className="text-gray-400 text-sm">{student.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Individual Date Pickers */}
                      {!hasCert && isSelected && (
                        <div className="flex gap-2 items-center">
                          <div>
                            <Label className="text-gray-400 text-xs">Start</Label>
                            <Input
                              type="date"
                              value={studentDates.startDate}
                              onChange={(e) => updateStudentDate(student._id, 'startDate', e.target.value)}
                              className="bg-gray-600 border-gray-500 text-white text-xs h-8 w-32"
                            />
                          </div>
                          <div>
                            <Label className="text-gray-400 text-xs">End</Label>
                            <Input
                              type="date"
                              value={studentDates.endDate}
                              onChange={(e) => updateStudentDate(student._id, 'endDate', e.target.value)}
                              className="bg-gray-600 border-gray-500 text-white text-xs h-8 w-32"
                            />
                          </div>
                        </div>
                      )}

                      <div className="text-right">
                        <Badge className="bg-blue-600 mb-1">
                          {student.studentId}
                        </Badge>
                        {hasCert && (
                          <div className="flex gap-1 mt-1">
                            {certStatus === 'pending' && (
                              <Button
                                size="sm"
                                className="h-6 text-xs bg-green-600 hover:bg-green-700 text-white border-0"
                                onClick={() => {
                                  const cert = existingCertificates.find(
                                    (c) => c.studentEmail === student.email && c.courseName === selectedBatch?.course_title
                                  );
                                  if (cert) handleApproveCertificate(cert._id);
                                }}
                              >
                                Approve
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="h-6 text-xs bg-gray-600 hover:bg-gray-700 text-white border-0"
                              onClick={() => {
                                const cert = existingCertificates.find(
                                  (c) => c.studentEmail === student.email && c.courseName === selectedBatch?.course_title
                                );
                                if (cert) openEditCertificateDialog(cert);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              className="bg-gray-600 hover:bg-gray-700 text-white border-0"
              onClick={() => setIsCertificateDialogOpen(false)}
            >
              Close
            </Button>
            
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Certificate Dialog */}
      <Dialog open={isCertificateEditDialogOpen} onOpenChange={setIsCertificateEditDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">
              Edit Certificate - {selectedCertificate?.studentName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-gray-700 rounded-lg">
              <p className="text-gray-400 text-sm">Course</p>
              <p className="text-white font-medium">{selectedCertificate?.courseName}</p>
            </div>

            <div>
              <Label className="text-white">Start Date</Label>
              <Input
                type="date"
                value={editCertificateData.startDate}
                onChange={(e) => setEditCertificateData(prev => ({ ...prev, startDate: e.target.value }))}
                className="bg-gray-600 border-gray-500 text-white mt-1"
              />
            </div>

            <div>
              <Label className="text-white">End Date</Label>
              <Input
                type="date"
                value={editCertificateData.endDate}
                onChange={(e) => setEditCertificateData(prev => ({ ...prev, endDate: e.target.value }))}
                className="bg-gray-600 border-gray-500 text-white mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsCertificateEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="manual" onClick={handleUpdateCertificate}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </LMSLayout>
  );
};

export default BatchesManagement;












