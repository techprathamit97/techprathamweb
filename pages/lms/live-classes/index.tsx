import React, { useState, useEffect, useCallback } from 'react';
import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Video, Calendar, Clock, Users, Play, Circle, 
  Trash2, Eye, Search, RefreshCw, ArrowLeft, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import TimeStatusIndicator from '@/components/ui/time-status-indicator';

interface ScheduledClass {
  _id: string;
  moduleTitle: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  status: string;
  isLive: boolean;
  canJoin: boolean;
  batchName: string;
  courseTitle: string;
  bbbMeetingId?: string;
  bbbJoinUrl?: string;
  sessionToken?: string;
  isVirtual?: boolean; // Indicates if this is a virtual class based on timing
}

interface Batch {
  _id: string;
  batchId?: string;
  batchName: string;
  courseTitle: string;
  trainerName: string;
  studentCount: number;
  timing?: string;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: string[];
  totalClasses?: number;
  upcomingClasses?: number;
  liveClasses?: number;
}

const LMSLiveClasses = () => {
  // State for all classes from all batches (for table display)
  const [allClasses, setAllClasses] = useState<ScheduledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Batch management state (for backend functionality)
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [liveStatusMap, setLiveStatusMap] = useState<Record<string, any>>({});
  const [checkingLiveStatus, setCheckingLiveStatus] = useState(false);

  // Track last regeneration time
  const [lastRegenerationTime, setLastRegenerationTime] = useState<number>(0);

  // Fetch all batches and generate time-based classes for table display
  const fetchAllBatchClasses = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🚀 ADMIN - Fetching all batch classes for table view');
      
      // First fetch all batches
      const batchResponse = await fetch('/api/lms/batches');
      const batchData = await batchResponse.json();

      if (!Array.isArray(batchData)) {
        console.error('❌ Invalid batches data:', batchData);
        setAllClasses([]);
        setAvailableBatches([]);
        return;
      }

      // Transform batch data
      const batchesWithInfo: Batch[] = batchData.map((batch: any) => ({
        _id: batch._id,
        batchId: batch.batchId || batch._id,
        batchName: batch.batchName || batch.name || 'Unknown Batch',
        courseTitle: batch.courseTitle || batch.course_title || 'Course',
        trainerName: batch.trainerName || 'Unknown Trainer',
        studentCount: batch.enrolled_students?.length || batch.students?.length || 0,
        timing: batch.schedule?.timing || batch.timing || null,
        startDate: batch.schedule?.startDate || batch.startDate || '',
        endDate: batch.schedule?.endDate || batch.endDate || '',
        daysOfWeek: batch.daysOfWeek || batch.schedule?.days || [],
        totalClasses: 0,
        upcomingClasses: 0,
        liveClasses: 0
      }));

      setAvailableBatches(batchesWithInfo);

      // Generate time-based classes for each batch
      const allGeneratedClasses: ScheduledClass[] = [];
      const now = new Date();
      const istNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));

      for (const batch of batchesWithInfo) {
        if (batch.timing) {
          const timingMatch = batch.timing.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (timingMatch) {
            const [, hours, minutes, ampm] = timingMatch;
            let classHour = parseInt(hours);
            const classMinute = parseInt(minutes);
            
            // Convert to 24-hour format
            if (ampm.toUpperCase() === 'PM' && classHour !== 12) {
              classHour += 12;
            } else if (ampm.toUpperCase() === 'AM' && classHour === 12) {
              classHour = 0;
            }

            // Calculate allowed days
            const days = batch.daysOfWeek || [];
            const allowedDays = days.length > 0 ? 
              days.map(d => DAY_NAME_TO_INDEX[String(d).trim().toLowerCase()]).filter(n => n !== undefined) :
              [1, 2, 3, 4, 5, 6]; // Mon-Sat

            // Today's class time
            const todayClass = new Date(istNow);
            todayClass.setHours(classHour, classMinute, 0, 0);

            // Extended grace period (3 hours after class ends)
            const todayClassEndTime = new Date(todayClass.getTime() + 60 * 60 * 1000);
            const extendedGracePeriodEnd = new Date(todayClassEndTime.getTime() + 3 * 60 * 60 * 1000);

            // Show today's class only if today is scheduled AND within grace period
            const isTodayScheduled = allowedDays.includes(istNow.getDay());
            let targetClassDate = todayClass;

            if (!isTodayScheduled || istNow > extendedGracePeriodEnd) {
              console.log(`🔄 ADMIN: ${batch.batchName} - ${!isTodayScheduled ? 'Not today\'s scheduled day' : 'Extended grace period expired'}, finding next class`);
              // Find next scheduled day
              let nextClassDate = new Date(istNow);
              for (let i = 1; i <= 7; i++) {
                nextClassDate = new Date(istNow);
                nextClassDate.setDate(istNow.getDate() + i);
                nextClassDate.setHours(classHour, classMinute, 0, 0);
                if (allowedDays.includes(nextClassDate.getDay())) break;
              }
              targetClassDate = nextClassDate;
              console.log(`📅 ADMIN: ${batch.batchName} - Next class: ${targetClassDate.toLocaleDateString()} ${targetClassDate.toLocaleTimeString()}`);
            } else {
              console.log(`✅ ADMIN: ${batch.batchName} - Showing today's class (within 3-hour grace period)`);
            }

            // Generate class number
            let classNumber = 1;
            try {
              const res = await fetch(`/api/module-class?batchId=${batch._id}`);
              const classData = await res.json();
              
              if (res.ok && classData.success && classData.data && Array.isArray(classData.data)) {
                const existingClasses = classData.data.filter((cls: any) => cls.status !== 'cancelled');
                classNumber = existingClasses.length + 1;
              }
            } catch (countError) {
              // Default to 1
            }

            const generatedClass: ScheduledClass = {
              _id: `timing-${batch._id}-${targetClassDate.toISOString()}`,
              moduleTitle: `${batch.batchName} - Class ${classNumber}`,
              scheduledDate: targetClassDate.toISOString().split('T')[0],
              scheduledTime: `${classHour.toString().padStart(2, '0')}:${classMinute.toString().padStart(2, '0')}`,
              duration: 60,
              status: 'scheduled',
              isLive: false,
              canJoin: true,
              batchName: batch.batchName,
              courseTitle: batch.courseTitle,
              isVirtual: true
            };

            allGeneratedClasses.push(generatedClass);
          }
        }
      }

      setAllClasses(allGeneratedClasses);
      console.log(`✅ Generated ${allGeneratedClasses.length} time-based classes for admin table`);
      
    } catch (error) {
      console.error('❌ Fetch all batch classes error:', error);
      toast.error('Failed to load batch classes');
      setAllClasses([]);
      setAvailableBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check live status for all batches
  const checkAllBatchesLiveStatus = useCallback(async () => {
    if (availableBatches.length === 0) return;
    
    setCheckingLiveStatus(true);
    
    try {
      const statusMap: Record<string, any> = {};
      
      // Check each batch's live status
      for (const batch of availableBatches) {
        try {
          const res = await fetch(`/api/batch-live-status?batchId=${batch._id}`);
          const data = await res.json();
          
          if (data.success && data.isLive && data.trainerPresent && data.liveClass) {
            // Map live status to the corresponding generated class
            const classId = `timing-${batch._id}-*`; // Will match by batch ID
            statusMap[batch._id] = data;
          }
        } catch (error) {
          // Silent error for individual batch
        }
      }
      
      setLiveStatusMap(statusMap);
    } catch (error) {
      // Silent error
    } finally {
      setCheckingLiveStatus(false);
    }
  }, [availableBatches]);

  // Admin join function - uses SAME API as students (/api/join-class)
  const handleAdminJoin = async (cls: ScheduledClass) => {
    try {
      console.log('🚀 Admin joining class using student API:', {
        classId: cls._id,
        title: cls.moduleTitle,
        batchName: cls.batchName,
        status: cls.status
      });
      
      // Use the SAME API that students use for joining classes
      const response = await fetch('/api/join-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: cls._id,
          userType: 'admin',
          userId: 'admin-' + Date.now(),
          userName: 'LMS Admin',
          purpose: 'attendance-monitoring'
        })
      });

      const data = await response.json();
      console.log('🚀 Admin join response:', data);

      if (data.success && data.joinUrl) {
        window.open(data.joinUrl, '_blank', 'noopener,noreferrer');
        toast.success(`Joining ${cls.moduleTitle} for attendance monitoring`);
      } else {
        console.error('❌ Admin join failed:', data);
        toast.error(data.error || 'Failed to join class');
      }
    } catch (error) {
      console.error('❌ Error joining class:', error);
      toast.error('Failed to join class');
    }
  };

  // Manual refresh function
  const handleRefreshAll = () => {
    fetchAllBatchClasses();
    checkAllBatchesLiveStatus();
  };

  // Map day-of-week name -> JS Date.getDay() index (Sun=0 ... Sat=6)
  const DAY_NAME_TO_INDEX: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6
  };

  // Get class status - PURE TIME-BASED LOGIC (same as trainer/student pages)
  const getClassStatus = (classItem: ScheduledClass) => {
    const now = new Date();
    const istNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    
    // Extract batch ID from class ID
    const batchId = classItem._id.includes('timing-') ? 
      classItem._id.split('-')[1] : 
      classItem.batchName; // fallback
    
    // Check if this batch has live status
    const batchLiveStatus = liveStatusMap[batchId];
    
    // ONLY check for cancelled status
    if (classItem.status === 'cancelled') {
      return {
        status: 'cancelled',
        canJoin: false,
        label: 'Cancelled',
        color: 'bg-red-600',
        message: 'This class has been cancelled'
      };
    }
    
    // PURE TIME-BASED STATUS
    try {
      let classDate = new Date(classItem.scheduledDate);
      
      if (isNaN(classDate.getTime())) {
        const dateWithoutDay = classItem.scheduledDate.replace(/^[A-Za-z]+,\s*/, '');
        classDate = new Date(dateWithoutDay);
      }
      
      if (isNaN(classDate.getTime())) {
        throw new Error(`Invalid date: ${classItem.scheduledDate}`);
      }
      
      const timeParts = classItem.scheduledTime.split(':');
      const hours = parseInt(timeParts[0]) || 0;
      const minutes = parseInt(timeParts[1]) || 0;
      
      const classDateTime = new Date(classDate);
      classDateTime.setHours(hours, minutes, 0, 0);
      
      const istClassDateTime = new Date(classDateTime.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
      const classEndTime = new Date(istClassDateTime.getTime() + (classItem.duration || 60) * 60 * 1000);
      
      const joinWindowStart = new Date(istClassDateTime.getTime() - 15 * 60 * 1000); // 15 minutes before
      // Use EXTENDED grace period (3 hours) to match class generation logic
      const extendedGracePeriodEnd = new Date(classEndTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours after
      
      // TRAINER PRESENCE OVERRIDES THE CLOCK
      if (batchLiveStatus?.isLive && batchLiveStatus?.trainerPresent) {
        return {
          status: 'live',
          canJoin: false, // Admin join logic is handled separately in the UI
          label: 'Live Now',
          color: 'bg-red-600',
          message: 'Trainer has started the class - admin can join for monitoring'
        };
      }

      // Check if we're within the class time window (including extended grace period)
      if (istNow >= istClassDateTime && istNow <= extendedGracePeriodEnd) {
        return {
          status: 'waiting-for-trainer',
          canJoin: false,
          label: 'Waiting for Trainer',
          color: 'bg-orange-500',
          message: 'Class time reached but trainer has not started the session'
        };
      }

      // For time-based classes, we should NEVER show "Time Up" 
      // because the class generation logic already switched to next day's class
      // after the extended grace period. So anything beyond that is "upcoming".

      if (istNow >= joinWindowStart && istNow < istClassDateTime) {
        return {
          status: 'starting-soon',
          canJoin: false,
          label: 'Starting Soon',
          color: 'bg-blue-500',
          message: 'Class starts soon - waiting for trainer'
        };
      }

      return {
        status: 'upcoming',
        canJoin: false,
        label: 'Upcoming',
        color: 'bg-blue-500',
        message: 'Scheduled for future'
      };
      
    } catch (error) {
      console.error('Error calculating time status:', error);
      return {
        status: 'unknown',
        canJoin: false,
        label: 'Unknown',
        color: 'bg-gray-500',
        message: 'Could not determine class status'
      };
    }
  };

  // Get status badge for display
  const getStatusBadge = (cls: ScheduledClass) => {
    const status = getClassStatus(cls);
    return <Badge className={status.color}>{status.label}</Badge>;
  };

  useEffect(() => {
    fetchAllBatchClasses();
    // Set initial regeneration time to avoid immediate regeneration
    setLastRegenerationTime(Date.now());
  }, [fetchAllBatchClasses]);

  // Check live status after batches are loaded
  useEffect(() => {
    if (availableBatches.length > 0) {
      checkAllBatchesLiveStatus();
    }
  }, [availableBatches, checkAllBatchesLiveStatus]);

  // Poll live status continuously AND regenerate classes periodically
  useEffect(() => {
    if (availableBatches.length === 0) return;

    const interval = setInterval(async () => {
      console.log('📡 Auto-polling live status and checking for class regeneration');
      
      // Check live status for real-time updates
      checkAllBatchesLiveStatus();
      
      // Also regenerate classes every 5 minutes to catch time transitions
      const now = Date.now();
      const FIVE_MINUTES = 5 * 60 * 1000;
      
      if (now - lastRegenerationTime > FIVE_MINUTES) {
        console.log('🔄 Regenerating time-based classes due to time progression');
        fetchAllBatchClasses();
        setLastRegenerationTime(now);
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [availableBatches.length, checkAllBatchesLiveStatus, fetchAllBatchClasses, lastRegenerationTime]);

  // Filter classes based on search and status
  const filteredClasses = allClasses.filter(cls => {
    const matchesSearch = cls.moduleTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.batchName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    
    const status = getClassStatus(cls);
    
    // Map our status to filter options
    const statusMapping: Record<string, string[]> = {
      'scheduled': ['upcoming', 'starting-soon'],
      'live': ['live'],
      'waiting': ['waiting-for-trainer'],
      'cancelled': ['cancelled']
    };
    
    const matchingStatuses = statusMapping[statusFilter] || [];
    return matchesSearch && matchingStatuses.includes(status.status);
  });

  // Calculate stats
  const stats = {
    total: allClasses.length,
    scheduled: allClasses.filter(cls => {
      const status = getClassStatus(cls);
      return ['upcoming', 'starting-soon'].includes(status.status);
    }).length,
    live: allClasses.filter(cls => {
      const status = getClassStatus(cls);
      return status.status === 'live';
    }).length,
    waiting: allClasses.filter(cls => {
      const status = getClassStatus(cls);
      return status.status === 'waiting-for-trainer';
    }).length
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
            <p className="text-gray-500 mt-1">
              Manage all live class sessions
              {allClasses.length > 0 && (
                <span className="ml-2 text-green-600">
                  • {allClasses.length} classes loaded
                </span>
              )}
            </p>
          </div>
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
                  <p className="text-sm text-gray-500">Waiting for Trainer</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.waiting}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-400" />
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
              <SelectItem value="waiting">Waiting for Trainer</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefreshAll} disabled={loading || checkingLiveStatus}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading || checkingLiveStatus ? 'animate-spin' : ''}`} />
            Refresh All
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
                      <th className="text-left p-3 text-sm font-medium text-gray-500">Time Status</th>
                      <th className="text-left p-3 text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClasses.map(cls => {
                      const status = getClassStatus(cls);
                      return (
                        <tr key={cls._id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{cls.moduleTitle}</p>
                              <p className="text-xs text-gray-500">{cls.duration} min</p>
                            </div>
                          </td>
                          <td className="p-3 text-sm">{cls.batchName}</td>
                          <td className="p-3 text-sm">
                            {availableBatches.find(b => b.batchName === cls.batchName)?.trainerName || 'Unknown'}
                          </td>
                          <td className="p-3 text-sm">
                            <div>
                              <p>{new Date(cls.scheduledDate).toLocaleDateString()}</p>
                              <p className="text-gray-500">{cls.scheduledTime}</p>
                            </div>
                          </td>
                          <td className="p-3">{getStatusBadge(cls)}</td>
                          <td className="p-3">
                            {status.status === 'live' ? (
                              <TimeStatusIndicator 
                                scheduledTime={cls.scheduledTime}
                                duration={cls.duration}
                                actualStart={new Date().toISOString()}
                              />
                            ) : (
                              <span className={`text-sm ${
                                status.status === 'waiting-for-trainer' ? 'text-orange-600' : 
                                status.status === 'time-up' ? 'text-red-600 font-semibold animate-pulse' : 
                                'text-gray-400'
                              }`}>
                                {status.status === 'waiting-for-trainer' ? 'Waiting for Trainer' :
                                 status.status === 'time-up' ? 'Time Up' :
                                 status.status === 'starting-soon' ? 'Starting Soon' :
                                 status.status === 'upcoming' ? 'Upcoming' :
                                 'Not started'}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  toast.info(`Class: ${cls.moduleTitle}\nStatus: ${status.message}`);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              
                              {/* Admin Enter Class Button - ONLY when there's a verified live meeting */}
                              {(() => {
                                // Extract batch ID from timing-based class ID
                                const batchId = cls._id.includes('timing-') ? 
                                  cls._id.split('-')[1] : 
                                  cls.batchName;
                                
                                // Check if this batch has a verified live meeting with trainer present
                                const batchLiveStatus = liveStatusMap[batchId];
                                const hasLiveMeeting = batchLiveStatus?.isLive && batchLiveStatus?.trainerPresent && batchLiveStatus?.liveClass;
                                
                                if (hasLiveMeeting) {
                                  return (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => {
                                        // Use the REAL class ID from live status, not the timing-based ID
                                        const realClass: ScheduledClass = {
                                          ...cls,
                                          _id: batchLiveStatus.liveClass._id, // Use real class ID
                                          moduleTitle: batchLiveStatus.liveClass.moduleTitle
                                        };
                                        handleAdminJoin(realClass);
                                      }}
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      title="Join live class for attendance monitoring"
                                    >
                                      Enter Class
                                    </Button>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </LMSLayout>
  );
};

export default LMSLiveClasses;