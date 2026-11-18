import React, { useEffect, useState } from 'react';
import TrainerLayout from '@/src/trainer/common/TrainerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Send,
  Users,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';

interface BatchStudent {
  studentId?: string;
  name: string;
  email?: string;
  phone?: string;
}

interface BatchGroup {
  batchId: string;
  course_title: string;
  students: BatchStudent[];
}

const TrainerSendWhatsApp = () => {
  const [trainerInfo, setTrainerInfo] = useState<any>(null);
  const [batches, setBatches] = useState<BatchGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const storedData = localStorage.getItem('trainer');
    if (!storedData) {
      setIsLoading(false);
      return;
    }
    const trainer = JSON.parse(storedData);
    setTrainerInfo(trainer);
    fetchBatches(trainer.trainerId || trainer._id);
  }, []);

  const fetchBatches = async (trainerId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/trainer/students?trainerId=${trainerId}`);
      const data = await res.json();

      if (res.ok && data?.success) {
        const groups: BatchGroup[] = (data.data?.studentsByBatch || []).map((b: any) => ({
          batchId: String(b.batchId),
          course_title: b.course_title || 'Course',
          students: b.students || [],
        }));
        setBatches(groups);
        if (groups.length > 0) setSelectedBatchId(groups[0].batchId);
      } else {
        toast.error(data?.error || 'Failed to load batches');
      }
    } catch (error: any) {
      console.error('Error loading batches:', error);
      toast.error('Failed to load batches');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedBatch = batches.find((b) => b.batchId === selectedBatchId) || null;

  // Students in the selected batch that actually have a phone number.
  const recipients = (selectedBatch?.students || [])
    .filter((s) => s.phone && String(s.phone).trim())
    .map((s) => ({ name: s.name, phone: s.phone as string }));

  const sendWhatsApp = async () => {
    if (!selectedBatch) {
      toast.error('Please select a batch');
      return;
    }
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    if (recipients.length === 0) {
      toast.error('None of the students in this batch have a phone number');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/whatsapp/batch-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, message }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`WhatsApp message sent to ${data.sentCount} student(s)`);
        if (data.skippedCount > 0) {
          toast.warning(`${data.skippedCount} student(s) skipped (invalid/missing phone)`);
        }
        setMessage('');
      } else {
        throw new Error(data.error || 'Failed to send WhatsApp message');
      }
    } catch (error: any) {
      console.error('Failed to send WhatsApp:', error);
      toast.error(error.message || 'Failed to send WhatsApp message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <TrainerLayout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-7 w-7" />
            Send WhatsApp Message
          </h1>
          <p className="text-green-100 mt-1">
            Select one of your batches and send a WhatsApp message to all its students.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading your batches…
          </div>
        ) : batches.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No batches found</p>
              <p className="text-sm">You don't have any assigned batches yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900 text-lg">Compose message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Batch selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Batch
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  {batches.map((b) => (
                    <option key={b.batchId} value={b.batchId}>
                      {b.course_title} ({b.students.length} student{b.students.length !== 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient summary */}
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 p-3">
                <Users className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-800">
                  {recipients.length} of {selectedBatch?.students.length || 0} student(s) have a phone number
                </span>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="w-full mt-2 p-3 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <p className="text-gray-500 text-xs mt-2">
                  Sent via the approved <span className="font-medium text-gray-700">tp_custom_message</span>{' '}
                  WhatsApp template. Your text fills the message body; the greeting and signature are added
                  automatically. Students without a saved phone number are skipped.
                </p>

                {/* Preview */}
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-gray-400 text-xs mb-1">Preview</p>
                  <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                    {`Hii,\n\n${message.trim() || '…'}\n\nRegards,\nTechPratham Training Team`}
                  </div>
                </div>
              </div>

              {/* Recipient chips */}
              {recipients.length > 0 && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-500 text-sm mb-2">Recipients:</p>
                  <div className="flex flex-wrap gap-2">
                    {recipients.slice(0, 10).map((r, i) => (
                      <Badge key={`${r.phone}-${i}`} className="bg-gray-200 text-gray-800">
                        {r.name}
                      </Badge>
                    ))}
                    {recipients.length > 10 && (
                      <Badge className="bg-gray-200 text-gray-800">
                        +{recipients.length - 10} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button
                  onClick={sendWhatsApp}
                  disabled={isSending || !message.trim() || recipients.length === 0}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSending ? 'Sending…' : `Send to ${recipients.length} Students`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TrainerLayout>
  );
};

export default TrainerSendWhatsApp;
