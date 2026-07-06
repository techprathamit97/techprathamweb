import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Award, 
  Download, 
  CheckCircle, 
  Clock, 
  Search,
  Eye,
  Mail,
  FileText,
  Users,
  Calendar,
  TrendingUp,
  Plus,
  Filter,
  Send,
  Edit,
  Trash2,
  Star,
  AlertCircle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface Certificate {
  _id: string;
  certificateId: string;
  studentName: string;
  studentEmail: string;
  courseName: string;
  courseCategory: string;
  completionDate: string;
  issueDate: string;
  grade: string;
  score: number;
  batchId: string;
  trainerName: string;
  status: 'pending' | 'issued' | 'revoked';
  certificateUrl: string;
  verificationCode: string;
  template: string;
  createdAt: string;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  course_title: string;
  category: string;
  batchId: string;
  status: string;
  finalScore?: number;
  completionDate?: string;
}

const CertificateManagement = () => {
  const router = useRouter();
  
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<Student[]>([]);
  const [filteredCertificates, setFilteredCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [certificateData, setCertificateData] = useState({
    grade: 'A',
    score: 85,
    template: 'standard',
    customMessage: ''
  });

  const fetchCertificates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/lms/certificates');
      const data = await res.json();
      
      if (res.ok) {
        setCertificates(Array.isArray(data) ? data : []);
        setFilteredCertificates(Array.isArray(data) ? data : []);
      } else {
        throw new Error(data.message || 'Failed to fetch certificates');
      }
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
      toast.error('Failed to fetch certificates');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEligibleStudents = async () => {
    try {
      const res = await fetch('/api/course/fetch');
      const data = await res.json();
      
      if (res.ok) {
        // Filter students who have completed courses but don't have certificates
        const completedStudents = data.filter((student: Student) => 
          student.status === 'Completed' && 
          !certificates.some(cert => cert.studentEmail === student.email)
        );
        setEligibleStudents(completedStudents);
      }
    } catch (error) {
      console.error('Failed to fetch eligible students:', error);
    }
  };

  const filterCertificates = () => {
    let filtered = certificates;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(cert => 
        cert.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.certificateId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(cert => cert.status === statusFilter);
    }

    // Course filter
    if (courseFilter !== 'all') {
      filtered = filtered.filter(cert => cert.courseCategory === courseFilter);
    }

    setFilteredCertificates(filtered);
  };

  const handleIssueCertificate = async () => {
    if (!selectedStudent) return;

    try {
      const res = await fetch('/api/lms/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: selectedStudent.name,
          studentEmail: selectedStudent.email,
          courseName: selectedStudent.course_title,
          courseCategory: selectedStudent.category,
          batchId: selectedStudent.batchId,
          grade: certificateData.grade,
          score: certificateData.score,
          template: certificateData.template,
          customMessage: certificateData.customMessage
        })
      });

      const responseData = await res.json();

      if (res.ok) {
        toast.success('Certificate issued successfully');
        setIsIssueDialogOpen(false);
        setSelectedStudent(null);
        fetchCertificates();
        fetchEligibleStudents();
        // Reset form
        setCertificateData({
          grade: 'A',
          score: 85,
          template: 'standard',
          customMessage: ''
        });
      } else {
        throw new Error(responseData.error || responseData.message || 'Failed to issue certificate');
      }
    } catch (error: any) {
      console.error('Failed to issue certificate:', error);
      toast.error(error.message || 'Failed to issue certificate');
    }
  };

  const handleRevokeCertificate = async (certificateId: string) => {
    try {
      const res = await fetch(`/api/lms/certificates/${certificateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'revoked' })
      });

      if (res.ok) {
        toast.success('Certificate revoked successfully');
        fetchCertificates();
      } else {
        throw new Error('Failed to revoke certificate');
      }
    } catch (error) {
      console.error('Failed to revoke certificate:', error);
      toast.error('Failed to revoke certificate');
    }
  };

  const handleDownloadCertificate = async (certificateId: string) => {
    try {
      const res = await fetch(`/api/lms/certificates/${certificateId}/download`);
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-${certificateId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to download certificate');
      }
    } catch (error) {
      console.error('Failed to download certificate:', error);
      toast.error('Failed to download certificate');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'issued': return 'bg-green-600';
      case 'pending': return 'bg-yellow-600';
      case 'revoked': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': case 'A': return 'text-green-400';
      case 'B+': case 'B': return 'text-blue-400';
      case 'C+': case 'C': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const stats = {
    totalCertificates: certificates.length,
    issuedCertificates: certificates.filter(c => c.status === 'issued').length,
    pendingCertificates: certificates.filter(c => c.status === 'pending').length,
    eligibleStudents: eligibleStudents.length
  };

  const categories = [...new Set(certificates.map(c => c.courseCategory).filter(Boolean))];

  useEffect(() => {
    fetchCertificates();
      fetchEligibleStudents();
    }, []);

  useEffect(() => {
    filterCertificates();
  }, [searchTerm, statusFilter, courseFilter, certificates]);

  

  

  

  return (
    <LMSLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Certificate Management</h1>
            <p className="text-gray-400 mt-2">Issue and manage course completion certificates</p>
          </div>
          
          <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="manual" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Issue Certificate
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Issue New Certificate</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-white">Select Student</Label>
                  <Select 
                    value={selectedStudent?._id || ''} 
                    onValueChange={(value) => {
                      const student = eligibleStudents.find(s => s._id === value);
                      setSelectedStudent(student || null);
                    }}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Choose a student" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {eligibleStudents.map((student) => (
                        <SelectItem key={student._id} value={student._id}>
                          {student.name} - {student.course_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedStudent && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white">Grade</Label>
                        <Select 
                          value={certificateData.grade} 
                          onValueChange={(value) => setCertificateData(prev => ({ ...prev, grade: value }))}
                        >
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            <SelectItem value="A+">A+ (95-100%)</SelectItem>
                            <SelectItem value="A">A (90-94%)</SelectItem>
                            <SelectItem value="B+">B+ (85-89%)</SelectItem>
                            <SelectItem value="B">B (80-84%)</SelectItem>
                            <SelectItem value="C+">C+ (75-79%)</SelectItem>
                            <SelectItem value="C">C (70-74%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-white">Score (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={certificateData.score}
                          onChange={(e) => setCertificateData(prev => ({ 
                            ...prev, 
                            score: parseInt(e.target.value) || 0 
                          }))}
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-white">Certificate Template</Label>
                      <Select 
                        value={certificateData.template} 
                        onValueChange={(value) => setCertificateData(prev => ({ ...prev, template: value }))}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600">
                          <SelectItem value="standard">Standard Template</SelectItem>
                          <SelectItem value="premium">Premium Template</SelectItem>
                          <SelectItem value="modern">Modern Template</SelectItem>
                          <SelectItem value="classic">Classic Template</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white">Custom Message (Optional)</Label>
                      <Textarea
                        value={certificateData.customMessage}
                        onChange={(e) => setCertificateData(prev => ({ ...prev, customMessage: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Add a personalized message for the certificate"
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsIssueDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="manual" 
                  onClick={handleIssueCertificate}
                  disabled={!selectedStudent}
                >
                  Issue Certificate
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
                  <p className="text-gray-400 text-sm">Total Certificates</p>
                  <p className="text-2xl font-bold text-white">{stats.totalCertificates}</p>
                </div>
                <Award className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Issued</p>
                  <p className="text-2xl font-bold text-white">{stats.issuedCertificates}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pending</p>
                  <p className="text-2xl font-bold text-white">{stats.pendingCertificates}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Eligible Students</p>
                  <p className="text-2xl font-bold text-white">{stats.eligibleStudents}</p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search certificates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white w-64"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>

              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Certificates Grid */}
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Loading certificates...</p>
          </div>
        ) : filteredCertificates.length === 0 ? (
          <div className="text-center py-8">
            <Award className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No certificates found</p>
            <p className="text-gray-500 text-sm">Issue your first certificate to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCertificates.map((certificate) => (
              <Card key={certificate._id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white text-lg">{certificate.studentName}</CardTitle>
                      <p className="text-gray-400 text-sm">{certificate.certificateId}</p>
                    </div>
                    <Badge className={getStatusColor(certificate.status)}>
                      {certificate.status}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Course Info */}
                  <div>
                    <p className="text-white font-medium">{certificate.courseName}</p>
                    <p className="text-gray-400 text-sm">{certificate.courseCategory}</p>
                  </div>

                  {/* Performance */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Grade</p>
                      <p className={`font-bold text-lg ${getGradeColor(certificate.grade)}`}>
                        {certificate.grade}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Score</p>
                      <p className="text-white font-medium">{certificate.score}%</p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Completed</p>
                      <p className="text-white">
                        {new Date(certificate.completionDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Issued</p>
                      <p className="text-white">
                        {certificate.issueDate ? new Date(certificate.issueDate).toLocaleDateString() : 'Pending'}
                      </p>
                    </div>
                  </div>

                  {/* Trainer & Batch */}
                  <div className="text-sm">
                    <p className="text-gray-400">Trainer: <span className="text-white">{certificate.trainerName}</span></p>
                    <p className="text-gray-400">Batch: <span className="text-white">{certificate.batchId}</span></p>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    {certificate.status === 'issued' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="manual" 
                          className="flex items-center gap-1"
                          onClick={() => handleDownloadCertificate(certificate._id)}
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex items-center gap-1"
                          onClick={() => handleRevokeCertificate(certificate._id)}
                        >
                          <AlertCircle className="h-3 w-3" />
                          Revoke
                        </Button>
                      </>
                    )}
                    
                    {certificate.status === 'pending' && (
                      <>
                        <Button size="sm" variant="manual" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="flex items-center gap-1">
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                      </>
                    )}

                    <Button size="sm" variant="outline" className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      Preview
                    </Button>
                    <Button size="sm" variant="outline" className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Send
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </LMSLayout>
  );
};

export default CertificateManagement;












