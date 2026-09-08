import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Users,
  Plus,
  Search,
  Mail,
  BookOpen,
  DollarSign,
  Award,
  Edit,
  Eye,
  EyeOff,
  UserPlus,
  Key,
  X,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface StudentBatch {
  batchId: string;
  batchName: string;
  courseId?: string;
  courseName: string;
}

interface Student {
  _id: string;
  studentId: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  isRestricted?: boolean;
  enrollmentDate?: string;
  batches: StudentBatch[];
  createdAt: string;
}

interface AvailableBatch {
  _id: string;
  batchName: string;
  courseId?: string;
  courseName: string;
  studentCount: number;
  capacity: number;
}

interface EditForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  password: string;     // prefilled with current password; edit to change
  isActive: boolean;
  batchIds: string[];
}

const StudentsManagement = () => {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: '', email: '', phone: '', address: '', password: '', isActive: true, batchIds: [],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [availableBatches, setAvailableBatches] = useState<AvailableBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // ─── Fetch all students ───────────────────────────────────────────────────
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

  // ─── Fetch all available batches (for the batch picker) ──────────────────
  const fetchAvailableBatches = async () => {
    setLoadingBatches(true);
    try {
      const res = await fetch('/api/lms/batches');
      const data = await res.json();
      if (res.ok) {
        const list = Array.isArray(data) ? data : [];
        setAvailableBatches(
          list.map((b: any) => ({
            _id: b._id,
            batchName: b.batchName,
            courseId: b.courseId,
            courseName: b.course_title || b.courseName || 'N/A',
            studentCount: b.studentCount || 0,
            capacity: b.capacity || 30,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    } finally {
      setLoadingBatches(false);
    }
  };

  // ─── Open edit dialog (prefills everything, incl. current password) ──────
  const handleEditClick = async (student: Student) => {
    setLoadingEdit(true);
    setEditDialogOpen(true);
    try {
      const res = await fetch(`/api/lms/students/${student._id}`);
      const full = await res.json();
      if (!res.ok) throw new Error(full.error || 'Failed to load student');

      setEditStudent(full);
      setEditForm({
        name: full.name || '',
        email: full.email || '',
        phone: full.phone || '',
        address: full.address || '',
        password: full.plainPassword || '',
        isActive: full.isActive !== false,
        batchIds: (full.batches || []).map((b: StudentBatch) => b.batchId),
      });
      await fetchAvailableBatches();
    } catch (err: any) {
      toast.error(err.message || 'Failed to load student details');
      setEditDialogOpen(false);
    } finally {
      setLoadingEdit(false);
    }
  };

  const toggleBatch = (batchId: string) => {
    setEditForm((prev) => ({
      ...prev,
      batchIds: prev.batchIds.includes(batchId)
        ? prev.batchIds.filter((id) => id !== batchId)
        : [...prev.batchIds, batchId],
    }));
  };

  // ─── Save changes ─────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editStudent) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setIsSaving(true);
    try {
      const payload: any = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        address: editForm.address.trim(),
        isActive: editForm.isActive,
        batchIds: editForm.batchIds,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const res = await fetch(`/api/lms/students/${editStudent._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update student');

      toast.success(`${editForm.name} updated successfully`);
      setEditDialogOpen(false);
      setEditStudent(null);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Filtering ────────────────────────────────────────────────────────────
  const filterStudents = () => {
    let filtered = students;
    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => (statusFilter === 'active' ? s.isActive : !s.isActive));
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((s) =>
        s.batches.some((b) => b.courseName.toLowerCase().includes(categoryFilter.toLowerCase()))
      );
    }
    setFilteredStudents(filtered);
  };

  const getStatusColor = (isActive: boolean) => (isActive ? 'bg-green-600' : 'bg-gray-600');

  const stats = {
    totalStudents: students.length,
    activeStudents: students.filter((s) => s.isActive).length,
    completedStudents: students.filter((s) => s.batches.length > 0).length,
    totalRevenue: 0,
  };

  const categories = [
    ...new Set(students.flatMap((s) => s.batches.map((b) => b.courseName)).filter(Boolean)),
  ];

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
          {[
            { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-400' },
            { label: 'Active Students', value: stats.activeStudents, icon: BookOpen, color: 'text-green-400' },
            { label: 'Enrolled in Batches', value: stats.completedStudents, icon: Award, color: 'text-yellow-400' },
            { label: 'Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-purple-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{label}</p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
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
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
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
                      <th className="text-left p-4 text-gray-300 font-medium">Batches / Courses</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Student ID</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Status</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Enrolled Date</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student._id} className="border-t border-gray-700 hover:bg-gray-750">
                        <td className="p-4">
                          <p className="text-white font-medium">{student.name}</p>
                          <p className="text-gray-400 text-sm">{student.email}</p>
                          <p className="text-gray-400 text-sm">{student.phone || 'N/A'}</p>
                        </td>
                        <td className="p-4">
                          {student.batches.length > 0 ? (
                            student.batches.map((b, idx) => (
                              <div key={idx}>
                                <p className="text-white font-medium">{b.courseName}</p>
                                <p className="text-gray-400 text-sm">{b.batchName}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-400">Not enrolled in any batch</p>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge className="bg-blue-600">{student.studentId}</Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={getStatusColor(student.isActive)}>
                            {student.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </Badge>
                          <p className="text-gray-400 text-sm mt-1">
                            {new Date(student.enrollmentDate || student.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="text-gray-300 text-sm">
                            {new Date(student.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="manual"
                              className="gap-1"
                              onClick={() => handleEditClick(student)}
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" className="p-2">
                              <Mail className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── Edit Student Dialog ──────────────────────────────────────────── */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditDialogOpen(false);
            setEditStudent(null);
          }
        }}
      >
        <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Student {editStudent ? `— ${editStudent.studentId}` : ''}
            </DialogTitle>
          </DialogHeader>

          {loadingEdit ? (
            <div className="py-10 text-center text-gray-400">Loading student details…</div>
          ) : editStudent ? (
            <div className="space-y-5 py-2">
              {/* Personal Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Full Name *</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label className="text-white">Email *</Label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Phone</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <Label className="text-white">Address</Label>
                  <Input
                    value={editForm.address}
                    onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white mt-1"
                    placeholder="Address"
                  />
                </div>
              </div>

              {/* Credentials */}
              <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-700/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-yellow-400" />
                  <h3 className="text-white font-semibold text-sm">Login Credentials</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white text-xs">Student ID</Label>
                    <Input
                      value={editStudent.studentId}
                      readOnly
                      className="bg-gray-900 border-gray-600 text-white font-mono font-semibold mt-1 cursor-not-allowed focus-visible:ring-0"
                    />
                  </div>
                  <div>
                    <Label className="text-white text-xs">Password</Label>
                    <div className="relative mt-1">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={editForm.password}
                        onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                        className="bg-gray-700 border-gray-600 text-white pr-10"
                        placeholder="Current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-gray-400 text-xs mt-1">
                      {editForm.password
                        ? 'Current password shown. Edit to change it.'
                        : 'No stored password. Type a new one to set it.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="isActive"
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-500 bg-gray-700"
                  />
                  <Label htmlFor="isActive" className="text-white text-sm cursor-pointer">
                    Account active (can log in)
                  </Label>
                </div>
              </div>

              {/* Batch Assignment */}
              <div>
                <Label className="text-white">Batch Assignment</Label>
                <p className="text-gray-400 text-xs mb-2">
                  Tick to enroll, untick to remove. Currently in {editForm.batchIds.length} batch(es).
                </p>

                {loadingBatches ? (
                  <p className="text-gray-400 text-sm">Loading batches…</p>
                ) : availableBatches.length === 0 ? (
                  <p className="text-gray-400 text-sm">No batches available.</p>
                ) : (
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-600 divide-y divide-gray-700">
                    {availableBatches.map((batch) => {
                      const enrolled = editForm.batchIds.includes(batch._id);
                      return (
                        <button
                          key={batch._id}
                          type="button"
                          onClick={() => toggleBatch(batch._id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                            enrolled ? 'bg-blue-900/40 hover:bg-blue-900/50' : 'bg-gray-700 hover:bg-gray-600'
                          }`}
                        >
                          <div
                            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                              enrolled ? 'bg-blue-500 border-blue-500' : 'border-gray-500'
                            }`}
                          >
                            {enrolled && <CheckCircle className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{batch.batchName}</p>
                            <p className="text-gray-400 text-xs truncate">{batch.courseName}</p>
                          </div>
                          <span className="text-gray-400 text-xs flex-shrink-0">
                            {batch.studentCount}/{batch.capacity}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {editForm.batchIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {editForm.batchIds.map((bid) => {
                      const b = availableBatches.find((x) => x._id === bid);
                      return b ? (
                        <span
                          key={bid}
                          className="flex items-center gap-1 bg-blue-700 text-white text-xs px-2 py-1 rounded-full"
                        >
                          {b.batchName}
                          <button onClick={() => toggleBatch(bid)} className="hover:text-red-300">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setEditStudent(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="manual" onClick={handleSaveEdit} disabled={isSaving || loadingEdit}>
              {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LMSLayout>
  );
};

export default StudentsManagement;
