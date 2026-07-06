import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  DollarSign,
  Award,
  Edit,
  Eye,
  UserPlus
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Student {
  _id: string;
  studentId: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  enrollmentDate?: string;
  batches: Array<{
    batchName: string;
    courseName: string;
  }>;
  createdAt: string;
}

const StudentsManagement = () => {
  const router = useRouter();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/lms/students');
      const data = await res.json();
      
      if (res.ok) {
        const studentsData = Array.isArray(data) ? data : [];
        setStudents(studentsData);
        setFilteredStudents(studentsData);
      } else {
        throw new Error(data.error || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
      toast.error('Failed to fetch students');
    } finally {
      setIsLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(student => student.isActive);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(student => !student.isActive);
      }
    }

    // Category filter (based on enrolled courses)
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(student => 
        student.batches.some(b => b.courseName.toLowerCase().includes(categoryFilter.toLowerCase()))
      );
    }

    setFilteredStudents(filtered);
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-600' : 'bg-gray-600';
  };

  const stats = {
    totalStudents: students.length,
    activeStudents: students.filter(s => s.isActive).length,
    completedStudents: students.filter(s => s.batches.length > 0).length,
    totalRevenue: 0 // Can be calculated from payment records if needed
  };

  const categories = [...new Set(students.flatMap(s => s.batches.map(b => b.courseName)).filter(Boolean))];

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [searchTerm, statusFilter, categoryFilter, students]);

  return (
    <LMSLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Students Management</h1>
            <p className="text-gray-400 mt-2">Manage student enrollments and progress</p>
          </div>
          
          <Link href="/lms/students/add">
            <Button variant="manual" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Students</p>
                  <p className="text-2xl font-bold text-white">{stats.totalStudents}</p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Students</p>
                  <p className="text-2xl font-bold text-white">{stats.activeStudents}</p>
                </div>
                <BookOpen className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Completed</p>
                  <p className="text-2xl font-bold text-white">{stats.completedStudents}</p>
                </div>
                <Award className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Revenue</p>
                  <p className="text-2xl font-bold text-white">₹{stats.totalRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-400" />
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
                  placeholder="Search students..."
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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

        {/* Students Table */}
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Loading students...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-8">
            <UserPlus className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No students found</p>
            <p className="text-gray-500 text-sm">Add your first student to get started</p>
          </div>
        ) : (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="text-left p-4 text-gray-300 font-medium">Student</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Batches/Courses</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Student ID</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Status</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Enrolled Date</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      return (
                        <tr key={student._id} className="border-t border-gray-700 hover:bg-gray-750">
                          <td className="p-4">
                            <div>
                              <p className="text-white font-medium">{student.name}</p>
                              <p className="text-gray-400 text-sm">{student.email}</p>
                              <p className="text-gray-400 text-sm">{student.phone || 'N/A'}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              {student.batches.length > 0 ? (
                                student.batches.map((batch, idx) => (
                                  <div key={idx}>
                                    <p className="text-white font-medium">{batch.courseName}</p>
                                    <p className="text-gray-400 text-sm">{batch.batchName}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-400">Not enrolled in any batch</p>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className="bg-blue-600">
                              {student.studentId}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div>
                              <Badge className={getStatusColor(student.isActive)}>
                                {student.isActive ? 'ACTIVE' : 'INACTIVE'}
                              </Badge>
                              <p className="text-gray-400 text-sm mt-1">
                                Enrolled: {new Date(student.enrollmentDate || student.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="text-gray-300 text-sm">
                              {new Date(student.createdAt).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="p-2">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="p-2">
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="p-2">
                                <Mail className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </LMSLayout>
  );
};

export default StudentsManagement;