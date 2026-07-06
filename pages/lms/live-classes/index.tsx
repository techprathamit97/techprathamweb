import React, { useState, useEffect, useCallback } from 'react';
import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Video, Calendar, Clock, Users, Play, Circle, Plus, Settings, Edit,
  Trash2, Eye, Search, Filter, BarChart3, FileVideo, AlertTriangle,
  CheckCircle, XCircle, MoreVertical, Save, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface LiveClass {
  _id: string;
  title: string;
  description: string;
  batchId: string;
  batchName: string;
  trainerId: string;
  trainerName: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  status: string;
  roomConfig: {
    platform?: string;
    meetingLink?: string;
    meetingId?: string;
    meetingPassword?: string;
  };
  recording: {
    enabled: boolean;
    recordingUrl?: string;
    recordingStatus?: string;
  };
  enrolledStudents: Array<{ _id: string; name: string }>;
  classSettings?: {
    enableChat?: boolean;
    enableScreenShare?: boolean;
    enableRaiseHand?: boolean;
  };
  createdAt: string;
}

interface Session {
  _id: string;
  sessionNumber: number;
  status: string;
  scheduledStart: string;
  actualStart: string;
  actualEnd: string;
  duration: number;
  attendanceSummary: {
    totalRegistered: number;
    totalPresent: number;
    attendancePercentage: number;
  };
  recording: {
    recordingStatus: string;
    recordingUrl?: string;
  };
}

const LMSLiveClasses = () => {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<LiveClass | null>(null);
  const [batches, setBatches] = useState<Array<{ _id: string; batchName: string; trainerId?: string; trainerName?: string }>>([]);
  const [trainers, setTrainers] = useState<Array<{ _id: string; name: string; email: string }>>([]);

  const [newClass, setNewClass] = useState({
    title: '',
    description: '',
    batchId: '',
    trainerId: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: 60,
    platform: 'zoom',
    meetingLink: '',
    meetingId: '',
    meetingPassword: '',
    recordingEnabled: true,
    maxParticipants: 100
  });

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      params.set('limit', '100');

      const response = await fetch(`/api/lms/live-classes?${params}`);
      const data = await response.json();

      if (data.success) {
        setClasses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to fetch live classes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchBatches = useCallback(async () => {
    try {
      const response = await fetch('/api/lms/batches');
      const data = await response.json();

      if (Array.isArray(data)) {
        setBatches(data.map((b: any) => ({
          _id: b._id,
          batchName: b.batchName,
          trainerId: b.trainerId,
          trainerName: b.trainerName
        })));
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  }, []);

  const fetchTrainers = useCallback(async () => {
    try {
      const response = await fetch('/api/lms/trainers');
      const data = await response.json();

      if (Array.isArray(data)) {
        setTrainers(data.map((t: any) => ({
          _id: t._id,
          name: t.name,
          email: t.email
        })));
      }
    } catch (error) {
      console.error('Error fetching trainers:', error);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchBatches();
    fetchTrainers();
  }, [fetchClasses, fetchBatches, fetchTrainers]);

  const handleCreateClass = async () => {
    try {
      const response = await fetch('/api/lms/live-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClass)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Class scheduled successfully');
        setShowCreateModal(false);
        setNewClass({
          title: '',
          description: '',
          batchId: '',
          trainerId: '',
          scheduledDate: '',
          scheduledTime: '',
          duration: 60,
          platform: 'zoom',
          meetingLink: '',
          meetingId: '',
          meetingPassword: '',
          recordingEnabled: true,
          maxParticipants: 100
        });
        fetchClasses();
      } else {
        toast.error(data.error || 'Failed to create class');
      }
    } catch (error) {
      console.error('Error creating class:', error);
      toast.error('Failed to create class');
    }
  };

  const handleCancelClass = async (classId: string) => {
    if (!confirm('Are you sure you want to cancel this class?')) return;

    try {
      const response = await fetch(`/api/lms/live-classes/${classId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Class cancelled');
        fetchClasses();
      }
    } catch (error) {
      console.error('Error cancelling class:', error);
      toast.error('Failed to cancel class');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to permanently delete this class?')) return;

    try {
      const response = await fetch(`/api/lms/live-classes/${classId}?hardDelete=true`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Class deleted');
        fetchClasses();
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error('Failed to delete class');
    }
  };

  const handleViewDetails = async (cls: LiveClass) => {
    setSelectedClass(cls);

    // Fetch sessions for this class
    try {
      const params = new URLSearchParams();
      params.set('liveClassId', cls._id);

      const response = await fetch(`/api/lms/live-classes/sessions?${params}`);
      const data = await response.json();

      if (data.success) {
        setSessions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }

    setShowDetailsModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return <Badge className="bg-red-500"><Circle className="w-3 h-3 mr-1 animate-pulse" /> Live</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-500">Scheduled</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-500">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.batchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.trainerName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    total: classes.length,
    scheduled: classes.filter(c => c.status === 'scheduled').length,
    live: classes.filter(c => c.status === 'live').length,
    completed: classes.filter(c => c.status === 'completed').length
  };

  return (
    <LMSLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Video className="h-8 w-8" />
              Live Classes
            </h1>
            <p className="text-gray-500 mt-1">Manage all live class sessions across batches</p>
          </div>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Schedule Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule New Live Class</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={newClass.title}
                    onChange={(e) => setNewClass({ ...newClass, title: e.target.value })}
                    placeholder="Class title"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newClass.description}
                    onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                    placeholder="Class description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Batch *</Label>
                    <Select
                      value={newClass.batchId}
                      onValueChange={(value) => setNewClass({ ...newClass, batchId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map(batch => (
                          <SelectItem key={batch._id} value={batch._id}>{batch.batchName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Trainer</Label>
                    <Select
                      value={newClass.trainerId}
                      onValueChange={(value) => setNewClass({ ...newClass, trainerId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select trainer" />
                      </SelectTrigger>
                      <SelectContent>
                        {trainers.map(trainer => (
                          <SelectItem key={trainer._id} value={trainer._id}>{trainer.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={newClass.scheduledDate}
                      onChange={(e) => setNewClass({ ...newClass, scheduledDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Time *</Label>
                    <Input
                      type="time"
                      value={newClass.scheduledTime}
                      onChange={(e) => setNewClass({ ...newClass, scheduledTime: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Duration (min)</Label>
                    <Input
                      type="number"
                      value={newClass.duration}
                      onChange={(e) => setNewClass({ ...newClass, duration: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Platform</Label>
                    <Select
                      value={newClass.platform}
                      onValueChange={(value) => setNewClass({ ...newClass, platform: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="googlemeet">Google Meet</SelectItem>
                        <SelectItem value="jitsi">Jitsi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Meeting Link</Label>
                  <Input
                    value={newClass.meetingLink}
                    onChange={(e) => setNewClass({ ...newClass, meetingLink: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Meeting ID</Label>
                    <Input
                      value={newClass.meetingId}
                      onChange={(e) => setNewClass({ ...newClass, meetingId: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input
                      value={newClass.meetingPassword}
                      onChange={(e) => setNewClass({ ...newClass, meetingPassword: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button onClick={handleCreateClass}>Create Class</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Classes</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Video className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Scheduled</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Live Now</p>
                  <p className="text-2xl font-bold text-red-600">{stats.live}</p>
                </div>
                <Circle className="h-8 w-8 text-red-400 animate-pulse" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchClasses}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Classes Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Live Classes</CardTitle>
            <CardDescription>View and manage scheduled sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="text-center py-12">
                <Video className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No live classes found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium text-gray-500">Class</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-500">Batch</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-500">Trainer</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-500">Schedule</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-500">Status</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClasses.map(cls => (
                      <tr key={cls._id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{cls.title}</p>
                            <p className="text-xs text-gray-500">{cls.duration} min</p>
                          </div>
                        </td>
                        <td className="p-3 text-sm">{cls.batchName}</td>
                        <td className="p-3 text-sm">{cls.trainerName}</td>
                        <td className="p-3 text-sm">
                          <div>
                            <p>{new Date(cls.scheduledDate).toLocaleDateString()}</p>
                            <p className="text-gray-500">{cls.scheduledTime}</p>
                          </div>
                        </td>
                        <td className="p-3">{getStatusBadge(cls.status)}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(cls)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {cls.status === 'scheduled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelClass(cls._id)}
                              >
                                <XCircle className="w-4 h-4 text-orange-500" />
                              </Button>
                            )}
                            {(cls.status === 'cancelled' || cls.status === 'completed') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClass(cls._id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedClass?.title} - Details</DialogTitle>
            </DialogHeader>
            {selectedClass && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Batch</Label>
                    <p className="font-medium">{selectedClass.batchName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Trainer</Label>
                    <p className="font-medium">{selectedClass.trainerName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Scheduled</Label>
                    <p className="font-medium">
                      {new Date(selectedClass.scheduledDate).toLocaleDateString()} at {selectedClass.scheduledTime}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Duration</Label>
                    <p className="font-medium">{selectedClass.duration} minutes</p>
                  </div>
                </div>

                {selectedClass.description && (
                  <div>
                    <Label className="text-gray-500">Description</Label>
                    <p>{selectedClass.description}</p>
                  </div>
                )}

                {sessions.length > 0 && (
                  <div>
                    <Label className="text-gray-500">Sessions ({sessions.length})</Label>
                    <div className="mt-2 space-y-2">
                      {sessions.map(session => (
                        <div key={session._id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Session #{session.sessionNumber}</span>
                            {getStatusBadge(session.status)}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {session.actualStart && (
                              <span>
                                Duration: {session.duration || 'N/A'} min | Attendance: {session.attendanceSummary?.attendancePercentage || 0}%
                              </span>
                            )}
                          </div>
                          {session.recording?.recordingUrl && (
                            <Button variant="link" size="sm" className="mt-1 p-0">
                              <FileVideo className="w-4 h-4 mr-1" />
                              View Recording
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LMSLayout>
  );
};

export default LMSLiveClasses;