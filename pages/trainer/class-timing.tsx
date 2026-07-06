import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TrainerLayout from '@/src/trainer/common/TrainerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Clock, 
  Calendar, 
  Users, 
  BookOpen, 
  Edit, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Batch {
  _id: string;
  batchName: string;
  courseTitle: string;
  currentTiming: string;
  startDate: string;
  endDate: string;
  days: string[];
  status: string;
  studentCount: number;
  meetingLink: string;
}

const TrainerClassTiming = () => {
  const router = useRouter();
  const [trainerData, setTrainerData] = useState<any>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [editForm, setEditForm] = useState({
    timing: '',
    days: [] as string[],
    startDate: '',
    endDate: ''
  });

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    const storedData = localStorage.getItem('trainer');
    if (!storedData) {
      router.push('/trainer/login');
      return;
    }

    const trainer = JSON.parse(storedData);
    setTrainerData(trainer);
    fetchClassTiming(trainer.trainerId);
  }, []);

  const fetchClassTiming = async (trainerId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/trainer/class-timing?trainerId=${trainerId}`);
      const data = await res.json();

      if (res.ok) {
        setBatches(data.data.batches);
      } else {
        toast.error(data.error || 'Failed to fetch class timing data');
      }
    } catch (error) {
      console.error('Fetch class timing error:', error);
      toast.error('Failed to load class timing data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (batch: Batch) => {
    setSelectedBatch(batch);
    setEditForm({
      timing: batch.currentTiming,
      days: batch.days || [],
      startDate: batch.startDate ? new Date(batch.startDate).toISOString().split('T')[0] : '',
      endDate: batch.endDate ? new Date(batch.endDate).toISOString().split('T')[0] : ''
    });
    setIsEditDialogOpen(true);
  };

  const handleDayToggle = (day: string) => {
    setEditForm(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const handleUpdateTiming = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBatch || !editForm.timing) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const res = await fetch('/api/trainer/class-timing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerId: trainerData.trainerId,
          batchId: selectedBatch._id,
          timing: editForm.timing,
          days: editForm.days,
          startDate: editForm.startDate,
          endDate: editForm.endDate
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Class timing updated successfully!');
        setIsEditDialogOpen(false);
        setSelectedBatch(null);
        fetchClassTiming(trainerData.trainerId);
      } else {
        toast.error(data.error || 'Failed to update class timing');
      }
    } catch (error) {
      console.error('Update timing error:', error);
      toast.error('Failed to update class timing');
    }
  };

  if (isLoading || !trainerData) {
    return (
      <TrainerLayout>
        <div className="p-6 flex items-center justify-center">
          <div className="text-gray-900">Loading class timing...</div>
        </div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">Change Class Timing</h1>
          <p className="text-green-100 mt-2">Update class schedules and timings for your batches</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Batches</p>
                  <p className="text-3xl font-bold text-gray-900">{batches.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Active Batches</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {batches.filter(b => b.status === 'active').length}
                  </p>
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
                  <p className="text-gray-600 text-sm">Total Students</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {batches.reduce((sum, batch) => sum + batch.studentCount, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Batches List */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              Class Schedules ({batches.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {batches.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No batches assigned yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {batches.map((batch) => (
                  <div key={batch._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-gray-900 font-semibold text-lg">{batch.courseTitle}</h3>
                        <p className="text-gray-600 text-sm mt-1">Batch: {batch.batchName}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={
                          batch.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' :
                          batch.status === 'upcoming' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }>
                          {batch.status}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClick(batch)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Current Timing</p>
                        <p className="text-gray-900 font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {batch.currentTiming || 'Not set'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Days</p>
                        <p className="text-gray-900 font-medium">
                          {batch.days && batch.days.length > 0 ? batch.days.join(', ') : 'Not set'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Duration</p>
                        <p className="text-gray-900 font-medium">
                          {batch.startDate && batch.endDate ? (
                            `${new Date(batch.startDate).toLocaleDateString()} - ${new Date(batch.endDate).toLocaleDateString()}`
                          ) : 'Not set'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Students</p>
                        <p className="text-gray-900 font-medium flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {batch.studentCount}
                        </p>
                      </div>
                    </div>

                    {!batch.currentTiming && (
                      <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                          <p className="text-orange-700 text-sm">Class timing not set for this batch</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Class Timing</DialogTitle>
            </DialogHeader>
            {selectedBatch && (
              <form onSubmit={handleUpdateTiming} className="space-y-4">
                <div>
                  <Label>Batch</Label>
                  <Input
                    value={`${selectedBatch.courseTitle} - ${selectedBatch.batchName}`}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                
                <div>
                  <Label>Class Timing *</Label>
                  <Input
                    value={editForm.timing}
                    onChange={(e) => setEditForm(prev => ({ ...prev, timing: e.target.value }))}
                    placeholder="e.g., 10:00 AM - 12:00 PM"
                    required
                  />
                </div>
                
                <div>
                  <Label>Class Days</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {daysOfWeek.map(day => (
                      <label key={day} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.days.includes(day)}
                          onChange={() => handleDayToggle(day)}
                          className="rounded"
                        />
                        <span className="text-sm">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) => setEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={editForm.endDate}
                      onChange={(e) => setEditForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                    Update Timing
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TrainerLayout>
  );
};

export default TrainerClassTiming;
