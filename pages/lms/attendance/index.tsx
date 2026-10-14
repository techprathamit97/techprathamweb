import React, { useEffect, useState } from 'react';
import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Calendar,
  Clock,
  Eye,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface AttendanceMeeting {
  meetingIntId: string;
  meetingExtId: string;
  meetingName: string;
  status: 'COMPLETED' | 'IN_PROGRESS';
  startedAt: string | null;
  endedAt: string | null;
  archivedAt: string | null;
  participantCount: number | null;
  batchName: string | null;
  courseName: string | null;
  trainerName: string | null;
}

interface AttendanceSummary {
  sessions: {
    total: number;
    completed: number;
    inProgress: number;
    recentWeek: number;
    completionRate: number;
  };
  participants: {
    totalParticipantSessions: number;
    sessionsWithParticipants: number;
    averageParticipants: number;
    maxParticipants: number;
    minParticipants: number;
  };
}

const AttendanceDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [meetings, setMeetings] = useState<AttendanceMeeting[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMeetings, setTotalMeetings] = useState(0);
  
  // Pagination
  const itemsPerPage = 20;

  // Fetch attendance summary
  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/attendance/summary');
      const data = await response.json();
      
      if (data.success) {
        setSummary(data.data);
        console.log('✅ Loaded attendance summary:', data.data);
      } else {
        throw new Error(data.error || 'Failed to load summary');
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch summary:', error);
      toast.error('Failed to load attendance summary');
    }
  };

  // Fetch meetings with filters
  const fetchMeetings = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(`/api/attendance/meetings?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setMeetings(data.data.meetings);
        setTotalPages(data.data.pagination.totalPages);
        setTotalMeetings(data.data.pagination.total);
        console.log(`✅ Loaded ${data.data.meetings.length} meetings`);
      } else {
        throw new Error(data.error || 'Failed to load meetings');
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch meetings:', error);
      toast.error('Failed to load attendance meetings');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle view attendance details
  const handleViewAttendance = async (meetingIntId: string) => {
    console.log('👁️ Opening attendance details for meeting:', meetingIntId);
    setSelectedMeeting(meetingIntId);
    
    // You can implement a modal or navigate to detail page
    // For now, we'll show an alert with meeting ID
    toast.info(`Opening attendance details for meeting: ${meetingIntId}`);
  };

  // Load data on component mount and filter changes
  useEffect(() => {
    fetchSummary();
    fetchMeetings();
  }, [currentPage, searchTerm, statusFilter]);

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    return status === 'COMPLETED' ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Completed
      </Badge>
    ) : (
      <Badge className="bg-yellow-100 text-yellow-800">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        In Progress
      </Badge>
    );
  };

  if (isLoading && meetings.length === 0) {
    return (
      <LMSLayout>
        <div className="p-6 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Loading attendance data...</p>
          </div>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BarChart3 className="h-8 w-8" />
                Attendance Dashboard
              </h1>
              <p className="text-blue-100 mt-2">
                BigBlueButton meeting attendance tracking and analytics
              </p>
            </div>
            <Button
              onClick={() => {
                fetchSummary();
                fetchMeetings();
              }}
              className="bg-white text-blue-700 hover:bg-blue-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Sessions</p>
                    <p className="text-2xl font-bold">{summary.sessions.total}</p>
                    <p className="text-blue-200 text-xs mt-1">
                      {summary.sessions.recentWeek} this week
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Completed</p>
                    <p className="text-2xl font-bold">{summary.sessions.completed}</p>
                    <p className="text-green-200 text-xs mt-1">
                      {summary.sessions.completionRate}% completion rate
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-sm font-medium">In Progress</p>
                    <p className="text-2xl font-bold">{summary.sessions.inProgress}</p>
                    <p className="text-yellow-200 text-xs mt-1">Active sessions</p>
                  </div>
                  <Loader2 className="h-8 w-8 text-yellow-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Avg Participants</p>
                    <p className="text-2xl font-bold">
                      {Math.round(summary.participants.averageParticipants)}
                    </p>
                    <p className="text-purple-200 text-xs mt-1">
                      Max: {summary.participants.maxParticipants}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search meetings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="md:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Sessions</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
              <span>Showing {meetings.length} of {totalMeetings} meetings</span>
              {statusFilter !== 'all' && (
                <Badge variant="outline">Status: {statusFilter}</Badge>
              )}
              {searchTerm && (
                <Badge variant="outline">Search: "{searchTerm}"</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Meetings Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Meeting Sessions ({totalMeetings})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {meetings.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Meetings Found</h3>
                <p className="text-gray-500">
                  No attendance sessions match your current filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Meeting
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participants
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Started At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ended At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {meetings.map((meeting) => (
                      <tr key={meeting.meetingIntId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {meeting.meetingName || 'Unknown Meeting'}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {meeting.meetingIntId}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(meeting.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {meeting.participantCount || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(meeting.startedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(meeting.endedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            onClick={() => handleViewAttendance(meeting.meetingIntId)}
                            size="sm"
                            variant="outline"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </LMSLayout>
  );
};

export default AttendanceDashboard;