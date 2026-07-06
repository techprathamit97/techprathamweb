import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import StudentLayout from '@/src/student/common/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Certificate {
  _id: string;
  certificateId: string;
  courseName: string;
  courseCategory: string;
  completionDate: string;
  issueDate?: string;
  grade: string;
  score: number;
  status: string;
  certificateUrl?: string;
  verificationCode: string;
}

const StudentCertificates = () => {
  const router = useRouter();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedData = localStorage.getItem('student');
    if (!storedData) {
      router.push('/student/login');
      return;
    }

    const student = JSON.parse(storedData);
    fetchCertificates(student.studentId);
  }, []);

  const fetchCertificates = async (studentId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/student/dashboard?studentId=${studentId}`);
      const data = await res.json();

      if (res.ok) {
        setCertificates(data.data.certificates);
      } else {
        toast.error(data.error || 'Failed to fetch certificates');
      }
    } catch (error) {
      console.error('Certificates fetch error:', error);
      toast.error('Failed to load certificates');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'issued':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'revoked':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-600';
    if (grade.startsWith('B')) return 'text-blue-600';
    if (grade.startsWith('C')) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="p-6 flex items-center justify-center">
          <p className="text-gray-600">Loading certificates...</p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="p-6 space-y-6">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">Certificates</h1>
          <p className="text-purple-100 mt-2">Your earned certificates and achievements</p>
        </div>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-600" />
              All Certificates ({certificates.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {certificates.length === 0 ? (
              <div className="text-center py-12">
                <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No certificates earned yet</p>
                <p className="text-gray-400 text-sm mt-2">Complete your courses to earn certificates</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {certificates.map((cert) => (
                  <Card key={cert._id} className="border-gray-200 hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <Award className="h-8 w-8 text-purple-600" />
                        <Badge className={getStatusColor(cert.status)}>
                          {cert.status}
                        </Badge>
                      </div>
                      
                      <h3 className="text-gray-900 font-semibold text-lg mb-2">
                        {cert.courseName}
                      </h3>
                      
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Certificate ID:</span>
                          <span className="text-gray-900 font-medium">{cert.certificateId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Grade:</span>
                          <span className={`font-bold ${getGradeColor(cert.grade)}`}>{cert.grade}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Score:</span>
                          <span className="text-gray-900 font-medium">{cert.score}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Completed:</span>
                          <span className="text-gray-900">
                            {new Date(cert.completionDate).toLocaleDateString()}
                          </span>
                        </div>
                        {cert.issueDate && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Issued:</span>
                            <span className="text-gray-900">
                              {new Date(cert.issueDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {cert.status === 'issued' && cert.certificateUrl && (
                        <Button
                          size="sm"
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => window.open(cert.certificateUrl, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Certificate
                        </Button>
                      )}
                      
                      {cert.status === 'pending' && (
                        <div className="text-center py-2 bg-yellow-50 rounded text-yellow-700 text-sm">
                          Certificate is being processed
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default StudentCertificates;
