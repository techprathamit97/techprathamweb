import React, { useEffect, useState } from 'react';
import TrainerLayout from '@/src/trainer/common/TrainerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Send,
  Users,
  BookOpen,
  Calendar,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
  Clock,
  VideoOff
} from 'lucide-react';
import { toast } from 'sonner';

interface Batch {
  _id: string;
  batchId: string;
  batchName: string;
  courseId: string;
  courseTitle: string;
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
  students: Student[];
}

const TrainerSendEmail = () => {
  const [trainerInfo, setTrainerInfo] = useState<any>(null);
  const [coursesData, setCoursesData] = useState<CourseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selection state
  const [selectedBatch, setSelectedBatch] = useState<CourseData | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState('');

  // Email content
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailType, setEmailType] = useState<string>('announcement');
  const [sendNotification, setSendNotification] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const storedData = localStorage.getItem('trainer');
    if (!storedData) {
      return;
    }

    const trainer = JSON.parse(storedData);
    setTrainerInfo(trainer);
    fetchTrainerData(trainer._id || trainer.trainerId);
  }, []);

  const fetchTrainerData = async (trainerId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/trainer/course-modules?trainerId=${trainerId}`);
      const data = await res.json();

      if (res.ok && data.data) {
        setCoursesData(data.data);
        if (data.data.length > 0) {
          setSelectedBatch(data.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching trainer data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const selectAllStudents = () => {
    if (!selectedBatch) return;
    const allIds = selectedBatch.students.map(s => s.studentId);
    setSelectedStudents(new Set(allIds));
  };

  const deselectAllStudents = () => {
    setSelectedStudents(new Set());
  };

  const filteredStudents = selectedBatch?.students.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  ) || [];

  const sendEmail = async () => {
    if (!selectedBatch || selectedStudents.size === 0) {
      toast.error('Please select at least one student');
      return;
    }

    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error('Please enter subject and message');
      return;
    }

    setIsSending(true);

    try {
      // Get selected student emails
      const selectedStudentList = selectedBatch.students.filter(
        s => selectedStudents.has(s.studentId)
      );
      const emails = selectedStudentList.map(s => s.email);

      // Send email
      const emailRes = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emails.join(', '),
          subject: emailSubject,
          message: emailMessage,
          batchId: selectedBatch.batchId
        })
      });

      const emailData = await emailRes.json();

      if (!emailRes.ok || !emailData.success) {
        throw new Error(emailData.error || 'Failed to send email');
      }

      toast.success(`Email sent to ${emails.length} students`);

      // Send notifications if enabled
      if (sendNotification) {
        const notificationType = emailType === 'cancelled' ? 'class_cancelled' :
          emailType === 'rescheduled' ? 'class_rescheduled' :
          emailType === 'leave' ? 'trainer_leave' : 'announcement';

        const notificationPromises = selectedStudentList.map(student =>
          fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: student._id,
              title: emailSubject,
              message: emailMessage,
              type: notificationType,
              priority: emailType === 'leave' ? 'high' : 'medium',
              batchId: selectedBatch.batchId,
              actionUrl: '/student/courses'
            })
          })
        );

        await Promise.all(notificationPromises);
        toast.success(`Notifications sent to ${emails.length} students`);
      }

      // Clear form
      setEmailSubject('');
      setEmailMessage('');
      setSelectedStudents(new Set());

    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.message || 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  // Quick message templates
  const messageTemplates = [
    {
      type: 'announcement',
      label: 'Announcement',
      subject: 'Important Announcement',
      message: 'Dear Students,\n\nThis is to inform you about an important update regarding your course.\n\nBest regards,\nTrainer'
    },
    {
      type: 'cancelled',
      label: 'Class Cancelled',
      subject: 'Class Cancelled',
      message: 'Dear Students,\n\nThe scheduled class has been cancelled. We apologize for the inconvenience. A new schedule will be shared soon.\n\nBest regards,\nTrainer'
    },
    {
      type: 'rescheduled',
      label: 'Class Rescheduled',
      subject: 'Class Rescheduled',
      message: 'Dear Students,\n\nYour class has been rescheduled. Please check the updated schedule.\n\nBest regards,\nTrainer'
    },
    {
      type: 'leave',
      label: 'Trainer on Leave',
      subject: 'Trainer Leave Notice',
      message: 'Dear Students,\n\nI will be on leave from [START DATE] to [END DATE]. The class schedule will resume after my return.\n\nBest regards,\nTrainer'
    }
  ];

  const applyTemplate = (template: typeof messageTemplates[0]) => {
    setEmailType(template.type);
    setEmailSubject(template.subject);
    setEmailMessage(template.message);
  };

  if (isLoading) {
    return (
      <TrainerLayout>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout>
      <div className="p-6 space-y-6">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">Send Email & Notifications</h1>
          <p className="text-green-100 mt-2">Send emails and notifications to your students</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Batch & Student Selection */}
          <div className="lg:col-span-1 space-y-4">
            {/* Batch Selection */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200 py-4">
                <CardTitle className="text-gray-900 flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  Select Batch
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <select
                  value={selectedBatch?.batchId || ''}
                  onChange={(e) => {
                    const batch = coursesData.find(c => c.batchId === e.target.value);
                    setSelectedBatch(batch || null);
                    setSelectedStudents(new Set());
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {coursesData.map(course => (
                    <option key={course.batchId} value={course.batchId}>
                      {course.courseTitle} ({course.batchName})
                    </option>
                  ))}
                </select>

                {selectedBatch && (
                  <div className="mt-3 text-sm text-gray-600">
                    <p>{selectedBatch.students.length} students in this batch</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Student Selection */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200 py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gray-900 flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-green-600" />
                    Select Students
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={selectAllStudents}>
                      All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllStudents}>
                      None
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                {/* Student List */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredStudents.map(student => (
                    <label
                      key={student.studentId}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedStudents.has(student.studentId)
                          ? 'bg-green-50 border border-green-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student.studentId)}
                        onChange={() => toggleStudent(student.studentId)}
                        className="w-4 h-4 text-green-600 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {student.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{student.email}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                  <p>Selected: {selectedStudents.size} of {selectedBatch?.students.length || 0} students</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Email Composition */}
          <div className="lg:col-span-2 space-y-4">
            {/* Quick Templates */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200 py-4">
                <CardTitle className="text-gray-900 flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5 text-green-600" />
                  Message Templates
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  {messageTemplates.map(template => (
                    <button
                      key={template.type}
                      onClick={() => applyTemplate(template)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        emailType === template.type
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Email Composer */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-200 py-4">
                <CardTitle className="text-gray-900 flex items-center gap-2 text-lg">
                  <Send className="h-5 w-5 text-green-600" />
                  Compose Email
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Enter email subject"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder="Enter your message"
                    rows={8}
                    className="w-full px-3 py-2 border rounded-lg resize-none"
                  />
                </div>

                {/* Options */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      Also send in-app notification
                    </span>
                  </label>
                </div>

                {/* Send Button */}
                <div className="pt-2 border-t">
                  <Button
                    onClick={sendEmail}
                    disabled={isSending || selectedStudents.size === 0}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send to {selectedStudents.size} Student{selectedStudents.size !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TrainerLayout>
  );
};

export default TrainerSendEmail;