import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TrainerLayout from '@/src/trainer/common/TrainerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  PlayCircle,
  Video,
  AlertCircle,
  Loader2,
  Users,
  ArrowLeft,
  BookOpen,
  FileText,
  Eye,
  AlertTriangle,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

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
  bbbModeratorJoinUrl?: string;
  bbbJoinUrl?: string;
  sessionToken?: string;
  isVirtual?: boolean; // NEW: Indicates if this is a virtual class based on timing
}

interface Batch {
  _id: string;
  batchId?: string;
  batchName: string;
  courseTitle: string;
  studentCount: number;
  totalClasses: number;
  upcomingClasses: number;
  liveClasses: number;
  timing?: string;
  startDate?: string;
  endDate?: string;
}

interface BBBRecording {
  recordId: string;
  meetingId: string;
  name: string;
  published: boolean;
  state: string;
  videoUrl: string | null;
  previewUrl: string | null;
  startTime: string;
  endTime: string;
  duration: number;
  durationText: string;
  dateText: string;
  participants: string;
  sizeText: string;
  canDownload: boolean;
  status: string;
}
const TrainerBatchManagement = () => {
  const router = useRouter();
  const [trainerInfo, setTrainerInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Batch management state
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  
  // Classes state
  const [batchClasses, setBatchClasses] = useState<ScheduledClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [joiningClass, setJoiningClass] = useState<string | null>(null);
  
  // Recordings state
  const [batchRecordings, setBatchRecordings] = useState<BBBRecording[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'classes' | 'recordings'>('classes');

  // Manual refresh function for users to call when needed
  const handleRefreshClasses = () => {
    if (selectedBatch) {
      console.log('🔄 Manual refresh requested by user');
      fetchBatchClasses(selectedBatch);
    }
  };

  // Initialize trainer info and fetch batches
  useEffect(() => {
    const storedData = localStorage.getItem('trainer');
    if (!storedData) {
      router.push('/trainer/login');
      return;
    }

    const trainer = JSON.parse(storedData);
    setTrainerInfo(trainer);
    
    const trainerIdToUse = trainer._id || trainer.trainerId;
    fetchBatches(trainerIdToUse);
  }, []);

  // Fetch trainer's batches with statistics
  const fetchBatches = async (trainerId: string) => {
    try {
      setIsLoading(true);
      console.log('Fetching batches for trainer:', trainerId);
      
      const res = await fetch(`/api/trainer/dashboard?trainerId=${trainerId}`);
      const data = await res.json();
      
      if (res.ok && data.success && data.data && data.data.batches) {
        // Get class counts from course-modules API
        const courseModulesRes = await fetch(`/api/trainer/course-modules?trainerId=${trainerId}`);
        const courseModulesData = await courseModulesRes.json();
        
        let classCounts: Record<string, { total: number, upcoming: number, live: number }> = {};
        if (courseModulesRes.ok && courseModulesData.success && courseModulesData.data) {
          courseModulesData.data.forEach((course: any) => {
            const batchId = course.batchId;
            if (!classCounts[batchId]) {
              classCounts[batchId] = { total: 0, upcoming: 0, live: 0 };
            }
            
            course.scheduledClasses.forEach((cls: any) => {
              classCounts[batchId].total++;
              // Only count as live if it's actually marked as live in database AND within time window
              // TODO: Should also verify BBB meeting is actually active, but for now trust the database
              if (cls.status === 'live' && cls.isLive) {
                classCounts[batchId].live++;
              } else if (cls.status === 'scheduled') {
                classCounts[batchId].upcoming++;
              }
            });
          });
        }
        
        const batchesWithCounts = data.data.batches.map((batch: any) => {
          const counts = classCounts[batch._id || batch.batchId] || { total: 0, upcoming: 0, live: 0 };
          
          return {
            _id: batch._id || batch.batchId,
            batchId: batch.batchId || batch._id,
            batchName: batch.batchName || batch.name,
            courseTitle: batch.course_title || batch.courseTitle || 'Course',
            studentCount: batch.enrolled_students?.length || batch.students?.length || 0,
            totalClasses: counts.total,
            upcomingClasses: counts.upcoming,
            liveClasses: counts.live, // This will show actual live classes after cleanup
            timing: batch.schedule?.timing || batch.timing || 'TBD',
            startDate: batch.schedule?.startDate || batch.startDate || '',
            endDate: batch.schedule?.endDate || batch.endDate || ''
          };
        });
        
        setAvailableBatches(batchesWithCounts);
        console.log(`Loaded ${batchesWithCounts.length} batches:`, batchesWithCounts);
        toast.success(`Found ${batchesWithCounts.length} batches`);
      } else {
        console.error('Failed to load batches:', data);
        toast.error('Failed to load batches');
        setAvailableBatches([]);
      }
    } catch (error) {
      console.error('Batch fetch error:', error);
      toast.error('Failed to load batches');
      setAvailableBatches([]);
    } finally {
      setIsLoading(false);
    }
  };
  // Fetch classes for selected batch - PURE TIME-BASED SINGLE CLASS DISPLAY
  const fetchBatchClasses = async (batch: Batch) => {
    if (!trainerInfo) return;
    
    setLoadingClasses(true);
    try {
      const trainerIdToUse = trainerInfo._id || trainerInfo.trainerId;
      console.log('🎯 TRAINER - Fetching classes (PURE TIME-BASED MODE):', batch.batchName, 'Batch ID:', batch._id);
      
      // PURE TIME-BASED LOGIC: Create virtual class based on timing, ignore database status
      let displayClasses: ScheduledClass[] = [];

      // Get current time in IST
      const now = new Date();
      const istNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
      
      console.log(`🕒 Current IST time: ${istNow.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`);
      
      if (batch.timing) {
        console.log('🎯 Creating class based on batch timing (ignoring database):', batch.timing);
        
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

          console.log(`📅 Parsed class time: ${classHour}:${classMinute.toString().padStart(2, '0')}`);
          
          // ALWAYS show today's class if we haven't passed the extended grace period
          const todayClass = new Date(istNow);
          todayClass.setHours(classHour, classMinute, 0, 0);
          
          console.log(`📅 Today's class time: ${todayClass.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`);
          
          // Calculate extended grace period (3 hours after class ends)
          const todayClassEndTime = new Date(todayClass.getTime() + 60 * 60 * 1000); // 1 hour duration
          const extendedGracePeriodEnd = new Date(todayClassEndTime.getTime() + 3 * 60 * 60 * 1000); // 3 hours grace
          
          console.log(`📅 Today's class end + grace: ${extendedGracePeriodEnd.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`);
          
          let targetClassDate = todayClass;
          let isShowingTodayClass = true;
          
          // Only move to next day if today's class + extended grace has completely passed
          if (istNow > extendedGracePeriodEnd) {
            console.log('🔄 Today\'s class + extended grace has passed, showing next weekday class');
            isShowingTodayClass = false;
            
            // Find next weekday (skip weekends)
            let nextClassDate = new Date(istNow);
            nextClassDate.setDate(nextClassDate.getDate() + 1);
            nextClassDate.setHours(classHour, classMinute, 0, 0);
            
            // Skip weekends
            while (nextClassDate.getDay() === 0 || nextClassDate.getDay() === 6) {
              nextClassDate.setDate(nextClassDate.getDate() + 1);
            }
            
            targetClassDate = nextClassDate;
            console.log(`📅 Next class will be: ${targetClassDate.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})}`);
          } else {
            console.log('✅ Showing today\'s class (still within extended grace period)');
          }

          // Generate proper class number based on existing classes
          let classNumber = 1;
          try {
            const res = await fetch(`/api/trainer/course-modules?trainerId=${trainerIdToUse}`);
            const classData = await res.json();
            
            if (res.ok && classData.success && classData.data) {
              const selectedBatchData = classData.data.find((course: any) => course.batchId === batch._id);
              
              if (selectedBatchData && selectedBatchData.scheduledClasses) {
                // Count non-cancelled classes to determine next number
                const existingClasses = selectedBatchData.scheduledClasses.filter((cls: any) => cls.status !== 'cancelled');
                classNumber = existingClasses.length + 1;
                console.log(`📊 Found ${existingClasses.length} existing classes, next will be Class ${classNumber}`);
              }
            }
          } catch (countError) {
            console.log('⚠️ Could not count existing classes, defaulting to Class 1');
          }

          const batchDisplayName = batch.batchName || batch.courseTitle || 'Class';
          
          displayClasses = [{
            _id: `timing-${batch._id}-${targetClassDate.toISOString()}`,
            moduleTitle: `${batchDisplayName} - Class ${classNumber}`,
            scheduledDate: targetClassDate.toISOString().split('T')[0],
            scheduledTime: `${classHour.toString().padStart(2, '0')}:${classMinute.toString().padStart(2, '0')}`,
            duration: 60,
            status: 'scheduled', // This will be ignored by pure time-based status
            isLive: false, // This will be ignored by pure time-based status
            canJoin: true,
            batchName: batch.batchName,
            courseTitle: batch.courseTitle,
            isVirtual: true
          }];
          
          console.log('🎯 Created pure time-based class:', {
            title: displayClasses[0].moduleTitle,
            date: displayClasses[0].scheduledDate,
            time: displayClasses[0].scheduledTime,
            isToday: isShowingTodayClass,
            pureTimeBased: true
          });
        } else {
          console.log('⚠️ Could not parse batch timing format:', batch.timing);
        }
      } else {
        console.log('⚠️ No timing information available for batch:', batch.batchName);
      }

      // Set the classes (should be exactly 1 class)
      setBatchClasses(displayClasses);
      console.log(`✅ TRAINER VIEW: Showing ${displayClasses.length} class (PURE TIME-BASED POLICY)`);
      
      if (displayClasses.length === 1) {
        const cls = displayClasses[0];
        // Use the new pure time-based status
        const timeStatus = getClassStatus(cls);
        
        if (timeStatus.status === 'live') {
          toast.success(`Live time: ${cls.moduleTitle}`);
        } else if (timeStatus.status === 'can-start') {
          toast.success(`Ready to start: ${cls.moduleTitle}`);
        } else if (timeStatus.status === 'upcoming') {
          toast.success(`Upcoming: ${cls.moduleTitle}`);
        } else {
          toast.success(`Next class: ${cls.moduleTitle}`);
        }
      } else {
        toast.info(`No timing information for batch "${batch.batchName}"`);
      }

    } catch (error) {
      console.error('❌ Fetch batch classes error:', error);
      toast.error('Failed to load batch classes');
      setBatchClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };
  // Fetch recordings for selected batch
  const fetchBatchRecordings = async (batch: Batch) => {
    if (!trainerInfo) return;
    
    setLoadingRecordings(true);
    try {
      const trainerIdToUse = trainerInfo._id || trainerInfo.trainerId;
      console.log('Fetching recordings for batch:', batch.batchName, 'Batch ID:', batch._id);
      
      const res = await fetch(`/api/trainer-batch-recordings?trainerId=${trainerIdToUse}&batchId=${batch._id}`);
      const data = await res.json();

      if (data.success && data.selectedBatch) {
        setBatchRecordings(data.selectedBatch.recordings || []);
        console.log(`Loaded ${data.selectedBatch.recordings?.length || 0} recordings for batch ${batch.batchName}`);
      } else {
        console.error('Failed to fetch batch recordings:', data);
        setBatchRecordings([]);
      }
    } catch (error) {
      console.error('Fetch batch recordings error:', error);
      toast.error('Failed to load batch recordings');
      setBatchRecordings([]);
    } finally {
      setLoadingRecordings(false);
    }
  };

  // Handle batch selection
  const handleBatchSelect = (batch: Batch) => {
    console.log('Selected batch:', batch);
    setSelectedBatch(batch);
    setBatchClasses([]);
    setBatchRecordings([]);
    setActiveTab('classes');
    
    // Fetch data for the selected batch
    fetchBatchClasses(batch);
    fetchBatchRecordings(batch);
    
    toast.success(`Selected batch: ${batch.batchName}`);
  };

  // Handle going back to batch selection
  const handleBackToBatches = () => {
    setSelectedBatch(null);
    setBatchClasses([]);
    setBatchRecordings([]);
    setActiveTab('classes');
  };
  
  // Handle creating next class manually
  const handleCreateNextClass = async (batch: Batch) => {
    try {
      console.log('🔄 Creating next class for batch:', batch.batchName);
      
      const res = await fetch('/api/module-class/create-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          batchId: batch._id || batch.batchId,
          force: false 
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`✅ Created next class: ${data.nextClass.moduleTitle} on ${data.nextClass.scheduledDate} at ${data.nextClass.scheduledTime}`);
        
        // Refresh the classes for this batch
        fetchBatchClasses(batch);
      } else {
        if (res.status === 409) {
          toast.warning(`⚠️ Class already exists: ${data.error}`);
        } else {
          toast.error(`❌ Failed to create next class: ${data.error}`);
        }
      }
    } catch (error) {
      console.error('Create next class error:', error);
      toast.error('Failed to create next class');
    }
  };

  // Handle cleanup of stale live classes
  const handleCleanupStaleClasses = async () => {
    try {
      console.log('🧹 Starting cleanup of stale live classes...');
      toast.info('Cleaning up stale live classes...');
      
      const res = await fetch('/api/cleanup-stale-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`✅ Cleanup completed: ${data.cleanedUp} stale classes fixed out of ${data.total} checked`);
        console.log('🧹 Cleanup details:', data.details);
        
        // Refresh batches to update live class counts
        if (trainerInfo) {
          const trainerIdToUse = trainerInfo._id || trainerInfo.trainerId;
          fetchBatches(trainerIdToUse);
        }
      } else {
        toast.error(`❌ Cleanup failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error('Failed to run cleanup');
    }
  };

  // Handle cleanup of multiple live classes per batch
  const handleCleanupMultipleLive = async () => {
    try {
      console.log('🧹 Starting cleanup of multiple live classes...');
      toast.info('Fixing multiple live classes per batch...');
      
      const res = await fetch('/api/cleanup-multiple-live-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await res.json();
      
      if (data.success) {
        const { batchesProcessed, duplicateLiveClassesRemoved, summary } = data;
        
        if (duplicateLiveClassesRemoved > 0) {
          toast.success(`✅ Fixed multiple live classes: ${duplicateLiveClassesRemoved} duplicates removed from ${summary.batchesWithMultipleLive} batches`);
        } else {
          toast.success(`✅ All batches OK: No duplicate live classes found in ${batchesProcessed} batches`);
        }
        
        console.log('🧹 Multiple live cleanup details:', data.details);
        
        // Refresh batches and current batch classes
        if (trainerInfo) {
          const trainerIdToUse = trainerInfo._id || trainerInfo.trainerId;
          fetchBatches(trainerIdToUse);
          
          if (selectedBatch) {
            fetchBatchClasses(selectedBatch);
          }
        }
      } else {
        toast.error(`❌ Cleanup failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Multiple live cleanup error:', error);
      toast.error('Failed to fix multiple live classes');
    }
  };

  // Get class status - PURE TIME-BASED LOGIC (same as student page)
  const getClassStatus = (classItem: ScheduledClass) => {
    // Get current time in IST
    const now = new Date();
    const istNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    
    console.log(`🕒 TRAINER PURE TIME STATUS CHECK for ${classItem.moduleTitle}`);
    console.log(`  Current IST: ${istNow.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`  Scheduled Date: ${classItem.scheduledDate}`);
    console.log(`  Scheduled Time: ${classItem.scheduledTime}`);
    console.log(`  🚨 IGNORING database status and isLive flags - using PURE TIME logic`);
    
    // ONLY check for cancelled status (respect explicit cancellation)
    if (classItem.status === 'cancelled') {
      return {
        status: 'cancelled',
        canJoin: false,
        label: 'Cancelled',
        color: 'bg-red-600',
        message: 'This class has been cancelled'
      };
    }
    
    // PURE TIME-BASED STATUS (ignore database completely)
    try {
      // Parse the class date and time
      let classDate = new Date(classItem.scheduledDate);
      
      // Handle different date formats
      if (isNaN(classDate.getTime())) {
        // Try parsing without day name prefix (e.g., "Fri, Aug 14, 2026" -> "Aug 14, 2026")
        const dateWithoutDay = classItem.scheduledDate.replace(/^[A-Za-z]+,\s*/, '');
        classDate = new Date(dateWithoutDay);
      }
      
      if (isNaN(classDate.getTime())) {
        console.log(`  ❌ Could not parse date: ${classItem.scheduledDate}`);
        throw new Error(`Invalid date: ${classItem.scheduledDate}`);
      }
      
      // Parse time (format: "17:53" or "5:53")
      const timeParts = classItem.scheduledTime.split(':');
      const hours = parseInt(timeParts[0]) || 0;
      const minutes = parseInt(timeParts[1]) || 0;
      
      // Create full class datetime in IST
      const classDateTime = new Date(classDate);
      classDateTime.setHours(hours, minutes, 0, 0);
      
      // Convert to IST for comparison
      const istClassDateTime = new Date(classDateTime.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
      const classEndTime = new Date(istClassDateTime.getTime() + (classItem.duration || 60) * 60 * 1000);
      
      console.log(`  Class DateTime IST: ${istClassDateTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`  Class End Time IST: ${classEndTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      
      // Time windows for pure time-based status determination (more generous for trainers)
      const joinWindowStart = new Date(istClassDateTime.getTime() - 30 * 60 * 1000); // 30 minutes before for trainers
      const gracePeriodEnd = new Date(classEndTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours after for trainers
      
      console.log(`  Join Window Start: ${joinWindowStart.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`  Grace Period End: ${gracePeriodEnd.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      
      // PURE TIME-BASED STATUS DETERMINATION (trainers can start classes earlier)
      if (istNow < joinWindowStart) {
        // Before join window - show when class will start
        const timeUntilStart = istClassDateTime.getTime() - istNow.getTime();
        const minutesUntil = Math.ceil(timeUntilStart / (60 * 1000));
        const hoursUntil = Math.floor(minutesUntil / 60);
        
        let timeText = '';
        if (hoursUntil > 0) {
          const remainingMinutes = minutesUntil % 60;
          timeText = `${hoursUntil}h ${remainingMinutes}m`;
        } else if (minutesUntil > 0) {
          timeText = `${minutesUntil}m`;
        } else {
          timeText = 'soon';
        }
        
        const classTimeString = istClassDateTime.toLocaleTimeString('en-IN', { 
          timeZone: 'Asia/Kolkata', 
          hour12: true,
          hour: 'numeric',
          minute: '2-digit'
        });
        
        console.log(`  📅 UPCOMING: Class starts in ${timeText}`);
        return {
          status: 'upcoming',
          canJoin: false,
          label: 'Upcoming',
          color: 'bg-blue-600',
          message: `Class scheduled for ${classTimeString} (starts in ${timeText})`
        };
        
      } else if (istNow >= istClassDateTime && istNow <= classEndTime) {
        // During class time - show as LIVE (regardless of database)
        console.log(`  🔴 LIVE TIME: Current time is during class hours - showing as LIVE`);
        return {
          status: 'live',
          canJoin: true,
          label: 'Live Time',
          color: 'bg-red-600',
          message: 'Class time now - you can start the meeting'
        };
        
      } else if (istNow > joinWindowStart && istNow < istClassDateTime) {
        // In join window before class starts (trainers can start early)
        const minutesUntilStart = Math.ceil((istClassDateTime.getTime() - istNow.getTime()) / (60 * 1000));
        
        console.log(`  🟢 CAN START: In join window, class starts in ${minutesUntilStart} minutes`);
        return {
          status: 'can-start',
          canJoin: true,
          label: 'Can Start Now',
          color: 'bg-green-600',
          message: `You can start the class now (scheduled in ${minutesUntilStart} minutes)`
        };
        
      } else if (istNow > classEndTime && istNow <= gracePeriodEnd) {
        // In grace period after class ended
        console.log(`  🟠 GRACE PERIOD: Class time ended but still in grace period`);
        return {
          status: 'recently-ended',
          canJoin: true,
          label: 'Recently Ended',
          color: 'bg-orange-600',
          message: 'Class time ended but you can still start if needed'
        };
        
      } else {
        // Past grace period - expired
        console.log(`  ⏰ EXPIRED: Past grace period`);
        return {
          status: 'expired',
          canJoin: false,
          label: 'Expired',
          color: 'bg-gray-600',
          message: 'Class time window has expired'
        };
      }
      
    } catch (error) {
      console.error(`  ❌ Error determining class status:`, error);
      
      // Fallback: Show as upcoming if we can't parse time
      return {
        status: 'unknown',
        canJoin: false,
        label: 'Check Status',
        color: 'bg-gray-600',
        message: 'Unable to determine class status - please refresh'
      };
    }
  };
  // Handle joining a class (simplified for timing-based classes)
  const handleJoinClass = async (classItem: ScheduledClass) => {
    if (!trainerInfo || joiningClass === classItem._id) return;
    
    setJoiningClass(classItem._id);
    
    try {
      const trainerName = trainerInfo?.name || trainerInfo?.trainerName || 'Trainer';
      let actualClassId = classItem._id;
      
      // If this is a timing-based class (virtual), create a real class first
      if (classItem.isVirtual) {
        console.log('🎯 Creating real class from timing-based class:', classItem.moduleTitle);
        
        // CRITICAL: Check if there's already a LIVE class for this batch
        // Don't create multiple live classes - reuse existing one
        const existingLiveClassRes = await fetch(`/api/module-class?batchId=${selectedBatch?._id}`);
        
        if (existingLiveClassRes.ok) {
          const liveData = await existingLiveClassRes.json();
          if (liveData.success && liveData.data && Array.isArray(liveData.data)) {
            // Look for any LIVE class for this batch (not just today)
            const existingLiveClass = liveData.data.find((cls: any) => 
              cls.status === 'live' && cls.isLive === true
            );
            
            if (existingLiveClass) {
              console.log('✅ Found existing live class, using it instead of creating new one:', existingLiveClass.moduleTitle);
              actualClassId = existingLiveClass._id;
              
              // Update the current class item to reflect the real class
              classItem._id = actualClassId;
              classItem.moduleTitle = existingLiveClass.moduleTitle;
              classItem.isVirtual = false;
              
              // Skip the creation logic
            } else {
              // No live class exists, safe to create new one
              await createNewClassForBatch();
            }
          } else {
            // API call worked but no data, safe to create
            await createNewClassForBatch();
          }
        } else {
          // API call failed, still try to create (fallback)
          await createNewClassForBatch();
        }
        
        async function createNewClassForBatch() {
          // Generate proper class number by counting existing classes for this batch
          const countResponse = await fetch(`/api/module-class?batchId=${selectedBatch?._id}`);
          let classNumber = 1;
          
          if (countResponse.ok) {
            const countData = await countResponse.json();
            if (countData.success && countData.data) {
              // Count non-cancelled classes
              const existingClasses = countData.data.filter((cls: any) => cls.status !== 'cancelled');
              classNumber = existingClasses.length + 1;
            }
          }
          
          // Create proper class title with batch name and sequential number
          const batchDisplayName = selectedBatch?.batchName || selectedBatch?.courseTitle || 'Class';
          const properClassTitle = `${batchDisplayName} - Class ${classNumber}`;
          
          console.log(`🎯 Creating "${properClassTitle}" (Class #${classNumber})`);
          
          const createResponse = await fetch('/api/module-class', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              courseId: selectedBatch?._id,
              batchId: selectedBatch?._id,
              moduleIndex: classNumber,
              moduleTitle: properClassTitle,
              trainerId: trainerInfo._id || trainerInfo.trainerId,
              scheduledDate: classItem.scheduledDate,
              scheduledTime: classItem.scheduledTime,
              duration: classItem.duration,
              isTimingBased: true
            })
          });
          
          if (createResponse.ok) {
            const createData = await createResponse.json();
            actualClassId = createData.data._id;
            console.log('✅ Created real class from timing:', actualClassId);
          } else {
            throw new Error('Failed to create real class from timing-based class');
          }
        }
      }
      
      console.log('Joining class:', classItem.moduleTitle, 'in batch:', classItem.batchName);
      
      const response = await fetch('/api/join-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: actualClassId,
          userName: trainerName,
          userType: 'trainer',
          batchId: selectedBatch?._id
        })
      });

      const data = await response.json();

      if (data.success && data.joinUrl) {
        window.open(data.joinUrl, '_blank', 'width=1200,height=800');
        toast.success(`Joined class "${classItem.moduleTitle}" for batch ${classItem.batchName}`);
        
        // Refresh classes for this batch
        if (selectedBatch) {
          fetchBatchClasses(selectedBatch);
        }
      } else {
        // Handle error cases as before
        const joinErrorMessage = data.error || 'Failed to join class';
        const isAlreadyJoined = joinErrorMessage.includes('already joined') || 
                               joinErrorMessage.includes('cannot join multiple times') ||
                               joinErrorMessage.includes('session token') && joinErrorMessage.includes('joined');
        
        const isTokenMismatch = joinErrorMessage.includes('Session token mismatch') ||
                               joinErrorMessage.includes('must use the assigned token');
        
        if (isAlreadyJoined || isTokenMismatch) {
          let requiredToken = null;
          if (isTokenMismatch) {
            const tokenMatch = joinErrorMessage.match(/assigned token[:\s]+([a-zA-Z0-9]+)/i);
            if (tokenMatch) {
              requiredToken = tokenMatch[1];
            }
          }
          
          const confirmMessage = isTokenMismatch && requiredToken
            ? `Session token mismatch. The system requires you to use token "${requiredToken}". Would you like to join with the correct token?`
            : `You appear to have already joined this class. Would you like to rejoin? This will open the meeting in a new tab.`;
          
          const confirmRejoin = confirm(confirmMessage);
          
          if (confirmRejoin) {
            const rejoinResponse = await fetch('/api/join-class', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                classId: actualClassId,
                userName: trainerName,
                userType: 'trainer',
                batchId: selectedBatch?._id,
                sessionToken: requiredToken,
                forceRejoin: true
              })
            });

            const rejoinData = await rejoinResponse.json();
            
            if (rejoinData.success && rejoinData.joinUrl) {
              window.open(rejoinData.joinUrl, '_blank', 'width=1200,height=800');
              toast.success(`Rejoined class "${classItem.moduleTitle}" as trainer`);
            } else {
              toast.error('Failed to rejoin class - please try refreshing the page');
            }
          } else {
            toast.info('Join cancelled - you can try again later');
          }
        } else {
          throw new Error(joinErrorMessage);
        }
      }
      
    } catch (error: any) {
      console.error('Join class error:', error);
      toast.error('Failed to join class: ' + error.message);
    } finally {
      setJoiningClass(null);
    }
  };

  // Handle playing a recording
  const handlePlayRecording = (recording: BBBRecording) => {
    console.log('Playing recording:', recording.name, 'for batch:', selectedBatch?.batchName);
    
    if (recording.videoUrl) {
      window.open(recording.videoUrl, '_blank', 'width=1200,height=800');
      toast.success(`Opening recording: ${recording.name}`);
    } else {
      toast.error('Video URL not available for this recording');
    }
  };
  if (isLoading) {
    return (
      <TrainerLayout>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <p className="text-gray-600">Loading your batches...</p>
        </div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center gap-3">
            {selectedBatch && (
              <Button
                onClick={handleBackToBatches}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Users className="h-8 w-8" />
                {selectedBatch ? `${selectedBatch.batchName} Management` : 'Batch-wise Class & Recording Management'}
              </h1>
              <p className="text-purple-100 mt-2">
                {selectedBatch 
                  ? `Manage classes and recordings for ${selectedBatch.batchName} - ${selectedBatch.courseTitle}`
                  : 'Select a batch to view and manage its classes and recordings'
                }
              </p>
            </div>
            {/* Cleanup button for fixing stale live classes */}
            {!selectedBatch && (
              <Button
                onClick={handleCleanupStaleClasses}
                variant="ghost"
                size="sm" 
                className="text-white hover:bg-white/20"
              >
                🧹 Fix Live Classes
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        {!selectedBatch ? (
          // Batch Selection View
          <BatchSelector 
            batches={availableBatches}
            onBatchSelect={handleBatchSelect}
          />
        ) : (
          // Selected Batch Management View
          <div className="space-y-6">
            {/* Batch Info Card */}
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedBatch.batchName}</h2>
                    <p className="text-gray-600">{selectedBatch.courseTitle}</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{selectedBatch.studentCount}</div>
                      <div className="text-gray-600">Students</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{selectedBatch.totalClasses}</div>
                      <div className="text-gray-600">Total Classes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{selectedBatch.upcomingClasses}</div>
                      <div className="text-gray-600">Upcoming</div>
                    </div>
                    {selectedBatch.liveClasses > 0 && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{selectedBatch.liveClasses}</div>
                        <div className="text-gray-600">Live Now</div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Tab Navigation */}
            <Card className="border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => setActiveTab('classes')}
                    variant={activeTab === 'classes' ? 'default' : 'outline'}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Classes ({batchClasses.length})
                  </Button>
                  <Button
                    onClick={() => setActiveTab('recordings')}
                    variant={activeTab === 'recordings' ? 'default' : 'outline'}
                    className="flex items-center gap-2"
                  >
                    <Video className="h-4 w-4" />
                    Recordings ({batchRecordings.length})
                  </Button>
                  <div className="ml-auto flex gap-2">
                    <Button
                      onClick={handleRefreshClasses}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      disabled={loadingClasses}
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingClasses ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button
                      onClick={handleCleanupMultipleLive}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Fix Multiple Live
                    </Button>
                    <Button
                      onClick={() => window.open('/trainer/notes', '_blank')}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Add Notes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tab Content */}
            {activeTab === 'classes' ? (
              // Classes Tab
              <ClassesTab
                classes={batchClasses}
                loading={loadingClasses}
                joiningClass={joiningClass}
                onJoinClass={handleJoinClass}
                onCreateNextClass={handleCreateNextClass}
                selectedBatch={selectedBatch}
                batchName={selectedBatch.batchName}
                getClassStatus={getClassStatus}
              />
            ) : (
              // Recordings Tab
              <RecordingsTab
                recordings={batchRecordings}
                loading={loadingRecordings}
                onPlayRecording={handlePlayRecording}
                batchName={selectedBatch.batchName}
              />
            )}
          </div>
        )}
      </div>
    </TrainerLayout>
  );
};
// Batch Selector Component
const BatchSelector: React.FC<{ 
  batches: Batch[], 
  onBatchSelect: (batch: Batch) => void 
}> = ({ batches, onBatchSelect }) => {
  if (batches.length === 0) {
    return (
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Batches Found</h3>
          <p className="text-gray-500 text-center">
            You haven't been assigned to any batches yet. Contact your administrator to get batch assignments.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Select a Batch</h2>
        <div className="text-sm text-gray-500">
          {batches.length} batch{batches.length !== 1 ? 'es' : ''} available
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.map((batch) => (
          <BatchCard key={batch._id} batch={batch} onSelect={() => onBatchSelect(batch)} />
        ))}
      </div>
    </div>
  );
};

// Batch Card Component
const BatchCard: React.FC<{ batch: Batch, onSelect: () => void }> = ({ batch, onSelect }) => {
  const hasLiveClasses = batch.liveClasses > 0;
  const hasUpcomingClasses = batch.upcomingClasses > 0;
  
  return (
    <Card className={`border-gray-200 hover:shadow-lg transition-all duration-200 cursor-pointer group ${
      hasLiveClasses ? 'ring-2 ring-red-200 bg-red-50' : 
      hasUpcomingClasses ? 'hover:ring-2 hover:ring-blue-200' : ''
    }`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {batch.batchName}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{batch.courseTitle}</p>
              {batch.timing && (
                <p className="text-xs text-gray-500 mt-1">📅 {batch.timing}</p>
              )}
            </div>
            {hasLiveClasses && (
              <Badge className="bg-red-600 animate-pulse">
                <PlayCircle className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-gray-600">
                <span className="font-medium text-gray-900">{batch.studentCount}</span> students
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" />
              <span className="text-gray-600">
                <span className="font-medium text-gray-900">{batch.totalClasses}</span> classes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-gray-600">
                <span className="font-medium text-gray-900">{batch.upcomingClasses}</span> upcoming
              </span>
            </div>
            {hasLiveClasses && (
              <div className="flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-red-500" />
                <span className="text-gray-600">
                  <span className="font-medium text-red-600">{batch.liveClasses}</span> live now
                </span>
              </div>
            )}
          </div>

          {hasLiveClasses && (
            <div className="flex items-center gap-2 p-2 bg-red-100 rounded-md">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700 font-medium">
                {batch.liveClasses} class{batch.liveClasses !== 1 ? 'es' : ''} live now!
              </span>
            </div>
          )}

          <Button
            onClick={onSelect}
            className={`w-full group-hover:bg-blue-600 group-hover:text-white transition-colors ${
              hasLiveClasses 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-blue-600 hover:text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              {hasLiveClasses ? 'Join Live Classes' : 'Manage Batch'}
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
// Classes Tab Component
const ClassesTab: React.FC<{
  classes: ScheduledClass[],
  loading: boolean,
  joiningClass: string | null,
  onJoinClass: (classItem: ScheduledClass) => void,
  onCreateNextClass: (batch: Batch) => void,
  selectedBatch: Batch,
  batchName: string,
  getClassStatus: (classItem: ScheduledClass) => any
}> = ({ classes, loading, joiningClass, onJoinClass, onCreateNextClass, selectedBatch, batchName, getClassStatus }) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <p className="text-gray-600">Loading classes for {batchName}...</p>
        </CardContent>
      </Card>
    );
  }

  if (classes.length === 0) {
    return (
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Found</h3>
          <p className="text-gray-500 text-center">
            No classes have been scheduled for the batch "{batchName}" yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Classes for {batchName}
        </h3>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            {classes.length} class{classes.length !== 1 ? 'es' : ''} scheduled
          </div>
          <Button
            onClick={() => onCreateNextClass(selectedBatch)}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            + Add Next Class
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {classes.map((classItem) => {
          const statusInfo = getClassStatus(classItem);
          const isUrgent = statusInfo.status === 'live' || statusInfo.status === 'joinable';

          return (
            <Card key={classItem._id} className={`border-gray-200 hover:shadow-md transition-all duration-200 ${
              statusInfo.status === 'live' 
                ? 'bg-red-50 border-l-4 border-red-500' 
                : statusInfo.status === 'joinable'
                ? 'bg-green-50 border-l-4 border-green-500'
                : ''
            }`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {isUrgent && (
                        <div className={`w-2 h-2 rounded-full animate-pulse ${
                          statusInfo.status === 'live' ? 'bg-red-500' : 'bg-green-500'
                        }`} />
                      )}
                      <h3 className="text-xl font-semibold text-gray-900">
                        {classItem.moduleTitle}
                      </h3>
                      <Badge className={statusInfo.color}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">
                          {new Date(classItem.scheduledDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-green-500" />
                        <span className="font-medium">
                          {classItem.scheduledTime} ({classItem.duration} min)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">
                          {statusInfo.message}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4 text-purple-500" />
                      <span>Batch: <span className="font-medium">{classItem.batchName}</span></span>
                    </div>
                  </div>

                  <div className="ml-6">
                    <Button
                      onClick={() => statusInfo.canJoin ? onJoinClass(classItem) : null}
                      disabled={joiningClass === classItem._id || !statusInfo.canJoin}
                      className={`${
                        statusInfo.canJoin 
                          ? statusInfo.status === 'live' 
                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                            : 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-400 cursor-not-allowed text-white'
                      }`}
                    >
                      {joiningClass === classItem._id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Joining...
                        </>
                      ) : statusInfo.canJoin ? (
                        <>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          {statusInfo.status === 'live' ? 'Join Live Class' : 'Start Class'}
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 mr-2" />
                          {statusInfo.status === 'scheduled' ? 'Not Ready' : statusInfo.label}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
// Recordings Tab Component
const RecordingsTab: React.FC<{
  recordings: BBBRecording[],
  loading: boolean,
  onPlayRecording: (recording: BBBRecording) => void,
  batchName: string
}> = ({ recordings, loading, onPlayRecording, batchName }) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <p className="text-gray-600">Loading recordings for {batchName}...</p>
        </CardContent>
      </Card>
    );
  }

  if (recordings.length === 0) {
    return (
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Video className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Recordings Found</h3>
          <p className="text-gray-500 text-center">
            No recordings are available for the batch "{batchName}" yet. Recordings will appear here after live classes are completed and processed.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group recordings by date
  const groupedRecordings = recordings.reduce((groups: Record<string, BBBRecording[]>, recording) => {
    let dateKey: string;
    
    if (recording.startTime && recording.startTime.match(/^\d+$/)) {
      const date = new Date(parseInt(recording.startTime));
      dateKey = date.toISOString().split('T')[0];
    } else {
      dateKey = new Date().toISOString().split('T')[0];
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(recording);
    return groups;
  }, {});

  const sortedGroups = Object.entries(groupedRecordings)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([date, recs]) => ({
      date,
      dateLabel: new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      recordings: recs.sort((a, b) => {
        if (a.startTime && b.startTime) {
          return parseInt(b.startTime) - parseInt(a.startTime);
        }
        return 0;
      })
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Recordings for {batchName}
        </h3>
        <div className="text-sm text-gray-500">
          {recordings.length} recording{recordings.length !== 1 ? 's' : ''} available
        </div>
      </div>

      {sortedGroups.map((group) => (
        <div key={group.date}>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
            <Calendar className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {group.dateLabel}
            </h2>
            <span className="text-sm text-gray-500">
              ({group.recordings.length} {group.recordings.length === 1 ? 'recording' : 'recordings'})
            </span>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {group.recordings.map((recording) => (
              <Card key={recording.recordId} className="border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">
                        {recording.name || 'Class Recording'}
                      </h3>
                      {!recording.published && (
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                          Unpublished
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{recording.dateText}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{recording.durationText}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{recording.participants} participants</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Size: {recording.sizeText}</span>
                        <span className="capitalize">• {recording.state}</span>
                      </div>
                    </div>

                    <Button
                      onClick={() => onPlayRecording(recording)}
                      className="w-full mt-2"
                      variant="default"
                      disabled={!recording.videoUrl && !recording.previewUrl}
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Watch Recording
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TrainerBatchManagement;