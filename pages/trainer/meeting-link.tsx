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
  Link as LinkIcon, 
  ExternalLink, 
  Users, 
  BookOpen, 
  Edit, 
  CheckCircle,
  AlertCircle,
  Copy,
  Calendar,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface Batch {
  _id: string;
  batchName: string;
  courseTitle: string;
  meetingLink: string;
  timing: string;
  days: string[];
  status: string;
  studentCount: number;
  startDate: string;
  endDate: string;
}

const TrainerMeetingLink = () => {
  const router = useRouter();
  const [trainerData, setTrainerData] = useState<any>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [meetingLink, setMeetingLink] = useState('');

  useEffect(() => {
    const storedData = localStorage.getItem('trainer');
    if (!storedData) {
      router.push('/trainer/login');
      return;
    }

    const trainer = JSON.parse(storedData);
    setTrainerData(trainer);
    fetchMeetingLinks(trainer.trainerId);
  }, []);

  const fetchMeetingLinks = async (trainerId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/trainer/meeting-link?trainerId=${trainerId}`);
      const data = await res.json();

      if (res.ok) {
        setBatches(data.data.batches);
      } else {
        toast.error(data.error || 'Failed to fetch meeting links');
      }
    } catch (error) {
      console.error('Fetch meeting links error:', error);
      toast.error('Failed to load meeting links');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (batch: Batch) => {
    setSelectedBatch(batch);
    setMeetingLink(batch.meetingLink || '');
    setIsEditDialogOpen(true);
  };

  const handleUpdateMeetingLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBatch || !meetingLink) {
      toast.error('Please provide a meeting link');
      return;
    }

    try {
      const res = await fetch('/api/trainer/meeting-link', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerId: trainerData.trainerId,
          batchId: selectedBatch._id,
          meetingLink: meetingLink
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Meeting link updated successfully!');
        setIsEditDialogOpen(false);
        setSelectedBatch(null);
        setMeetingLink('');
        fetchMeetingLinks(trainerData.trainerId);
      } else {
        toast.error(data.error || 'Failed to update meeting link');
      }
    } catch (error) {
      console.error('Update meeting link error:', error);
      toast.error('Failed to update meeting link');
    }
  };

  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Meeting link copied to clipboard!');
  };

  const joinMeeting = (link: string) => {
    window.open(link, '_blank');
  };

  if (isLoading || !trainerData) {
    return (
      <TrainerLayout>
        <div className="p-6 flex items-center justify-center">
          <div className="text-gray-900">Loading meeting links...</div>
        </div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">Add Meeting Link</h1>
          <p className="text-green-100 mt-2">Manage meeting links for your online classes</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <p className="text-gray-600 text-sm">With Links</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {batches.filter(b => b.meetingLink).length}
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
                  <p className="text-gray-600 text-sm">Missing Links</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {batches.filter(b => !b.meetingLink).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Active Classes</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {batches.filter(b => b.status === 'active').length}
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
              <LinkIcon className="h-5 w-5 text-green-600" />
              Meeting Links ({batches.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {batches.length === 0 ? (
              <div className="text-center py-12">
                <LinkIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
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
                        {batch.meetingLink ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            Link Added
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            No Link
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                      <div>
                        <p className="text-gray-600">Class Timing</p>
                        <p className="text-gray-900 font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {batch.timing || 'Not set'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Days</p>
                        <p className="text-gray-900 font-medium">
                          {batch.days && batch.days.length > 0 ? batch.days.join(', ') : 'Not set'}
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

                    {batch.meetingLink ? (
                      <div className="bg-gray-50 p-3 rounded-md mb-3">
                        <p className="text-gray-600 text-sm mb-2">Meeting Link:</p>
                        <div className="flex items-center gap-2">
                          <Input
                            value={batch.meetingLink}
                            readOnly
                            className="bg-white text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(batch.meetingLink)}
                            className="flex items-center gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                            onClick={() => joinMeeting(batch.meetingLink)}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Join
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-3">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                          <p className="text-orange-700 text-sm">No meeting link set for this batch</p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditClick(batch)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        {batch.meetingLink ? 'Update Link' : 'Add Link'}
                      </Button>
                      
                      {batch.meetingLink && batch.status === 'active' && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                          onClick={() => joinMeeting(batch.meetingLink)}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Start Class
                        </Button>
                      )}
                    </div>
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
              <DialogTitle>
                {selectedBatch?.meetingLink ? 'Update Meeting Link' : 'Add Meeting Link'}
              </DialogTitle>
            </DialogHeader>
            {selectedBatch && (
              <form onSubmit={handleUpdateMeetingLink} className="space-y-4">
                <div>
                  <Label>Batch</Label>
                  <Input
                    value={`${selectedBatch.courseTitle} - ${selectedBatch.batchName}`}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                
                <div>
                  <Label>Meeting Link *</Label>
                  <Input
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                    required
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    Enter a valid meeting link (Google Meet, Zoom, Teams, etc.)
                  </p>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-md">
                  <h4 className="font-medium text-blue-900 mb-2">Popular Meeting Platforms:</h4>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Google Meet: meet.google.com</li>
                    <li>• Zoom: zoom.us</li>
                    <li>• Microsoft Teams: teams.microsoft.com</li>
                    <li>• Jitsi Meet: meet.jit.si</li>
                  </ul>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                    {selectedBatch.meetingLink ? 'Update Link' : 'Add Link'}
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

export default TrainerMeetingLink;
