import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import StudentLayout from '@/src/student/common/StudentLayout';
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
  Play,
  Circle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeNoteHtml } from '@/utils/sanitizeHtml';

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
  isVirtual?: boolean; // NEW: Indicates if this is a virtual class based on timing
}

interface StudentBatch {
  _id: string;
  batchName: string;
  courseTitle: string;
  courseName: string;
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
const StudentBatchManagement = () => {
  const router = useRouter();
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Batch management state
  const [selectedBatch, setSelectedBatch] = useState<StudentBatch | null>(null);
  const [availableBatches, setAvailableBatches] = useState<StudentBatch[]>([]);
  
  // Classes state
  const [batchClasses, setBatchClasses] = useState<ScheduledClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [joiningClass, setJoiningClass] = useState<string | null>(null);
  const [joinedClasses, setJoinedClasses] = useState<Set<string>>(new Set()); // Track which classes user has joined
  
  // Recordings state
  const [batchRecordings, setBatchRecordings] = useState<BBBRecording[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  
  // Notes state (read-only)
  const [batchNotes, setBatchNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesDiagnostics, setNotesDiagnostics] = useState<any>(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'classes' | 'recordings' | 'notes'>('classes');

  // Manual refresh function for users to call when needed
  const handleRefreshClasses = () => {
    if (selectedBatch) {
      console.log('🔄 Manual refresh requested by user');
      fetchBatchClasses(selectedBatch);
    }
  };

  // Initialize student info and fetch batches
  useEffect(() => {
    const storedData = localStorage.getItem('student');
    console.log('🔍 STUDENT INIT - Stored data:', storedData ? 'EXISTS' : 'NOT FOUND');
    
    if (!storedData) {
      console.log('❌ No stored student data - redirecting to login');
      router.push('/student/login');
      return;
    }

    const student = JSON.parse(storedData);
    console.log('✅ Student data loaded:', { id: student._id || student.studentId, name: student.name });
    setStudentInfo(student);
    
    const studentIdToUse = student._id || student.studentId;
    console.log('🚀 INITIALIZING STUDENT BATCH MANAGEMENT');
    console.log('Student ID:', studentIdToUse);
    console.log('Student data:', student);
    
    fetchBatches(studentIdToUse);
  }, []);

  // Fetch student's enrolled batches
  const fetchBatches = async (studentId: string) => {
    try {
      setIsLoading(true);
      console.log('🚀 === FETCH BATCHES DEBUG START ===');
      console.log('Student ID:', studentId);
      
      // Use the SAME API as the profile page - this works correctly!
      const res = await fetch(`/api/student/profile?studentId=${studentId}`);
      const data = await res.json();
      
      console.log('=== PROFILE API RESPONSE ANALYSIS ===');
      console.log('API URL:', `/api/student/profile?studentId=${studentId}`);
      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);
      console.log('Response success:', data.success);
      console.log('Response has data:', !!data.data);
      console.log('Full API response:', JSON.stringify(data, null, 2));
      
      if (res.ok && data.success && data.data) {
        const profileData = data.data;
        console.log('=== PROFILE DATA ANALYSIS ===');
        console.log('Profile data keys:', Object.keys(profileData));
        console.log('Profile batches exists:', !!profileData.batches);
        console.log('Profile batches count:', profileData.batches?.length || 0);
        console.log('Profile batches data:', JSON.stringify(profileData.batches, null, 2));
        
        // PRIORITY 1: Use the same batch data as shown in profile page
        if (profileData.batches && profileData.batches.length > 0) {
          console.log('✅ FOUND REAL BATCHES FROM PROFILE API - Same as profile page!');
          console.log(`Processing ${profileData.batches.length} real batches from profile`);
          
          const realBatches: StudentBatch[] = profileData.batches.map((batch: any, index: number) => {
            console.log(`=== PROCESSING BATCH ${index + 1} ===`);
            console.log('Raw batch data:', JSON.stringify(batch, null, 2));
            console.log('Batch ID:', batch.batchId);
            console.log('Batch Name:', batch.batchName);
            console.log('Course Title:', batch.courseTitle);
            console.log('Status:', batch.status);
            console.log('Schedule:', batch.schedule);
            console.log('Timing:', batch.schedule?.timing);
            
            const processedBatch = {
              _id: batch.batchId.toString(),
              batchName: batch.batchName || batch.courseTitle || `Batch ${index + 1}`,
              courseTitle: batch.courseTitle || 'Course',
              courseName: batch.courseTitle || 'Course',
              studentCount: batch.enrolledStudents || 0,
              totalClasses: 0, // Will be updated when classes are fetched
              upcomingClasses: 0, // Will be updated when classes are fetched
              liveClasses: 0, // Will be updated when classes are fetched
              timing: batch.schedule?.timing || 'TBD',
              startDate: batch.schedule?.startDate || '',
              endDate: batch.schedule?.endDate || ''
            };
            
            console.log('Processed batch:', JSON.stringify(processedBatch, null, 2));
            return processedBatch;
          });
          
          console.log('✅ FINAL CONVERTED BATCHES:', JSON.stringify(realBatches, null, 2));
          setAvailableBatches(realBatches);
          
          const batchNames = realBatches.map(b => b.batchName).join(', ');
          toast.success(`Found ${realBatches.length} enrolled batch${realBatches.length !== 1 ? 'es' : ''}: ${batchNames}`);
          return;
        }
        
        // PRIORITY 2: Fallback to courses if no batches
        if (profileData.courses && profileData.courses.length > 0) {
          console.log('⚠️ NO BATCHES - Using courses as fallback');
          console.log('Courses data:', JSON.stringify(profileData.courses, null, 2));
          
          const courseBatches: StudentBatch[] = profileData.courses.map((course: any, index: number) => ({
            _id: course.batchId.toString(),
            batchName: `${course.title} Batch`,
            courseTitle: course.title,
            courseName: course.title,
            studentCount: 1,
            totalClasses: 0,
            upcomingClasses: 0,
            liveClasses: 0,
            timing: course.schedule?.timing || 'TBD',
            startDate: course.schedule?.startDate || '',
            endDate: course.schedule?.endDate || ''
          }));
          
          console.log('✅ CONVERTED COURSES TO BATCHES:', JSON.stringify(courseBatches, null, 2));
          setAvailableBatches(courseBatches);
          
          const courseNames = courseBatches.map(b => b.courseTitle).join(', ');
          toast.success(`Found ${courseBatches.length} enrolled course${courseBatches.length !== 1 ? 's' : ''}: ${courseNames}`);
          return;
        }
        
        // PRIORITY 3: No batches or courses found
        console.log('⚠️ Profile API successful but no batches/courses found');
        console.log('Profile data structure:', JSON.stringify(profileData, null, 2));
        toast.warning('No enrolled batches found. Please contact your administrator.');
        setAvailableBatches([]);
        return;
      }
      
      // FALLBACK: Profile API failed
      console.log('❌ PROFILE API FAILED');
      console.log('Response details:', {
        status: res.status,
        ok: res.ok,
        success: data?.success,
        error: data?.error,
        message: data?.message
      });
      
      toast.error('Failed to load batches from profile API');
      setAvailableBatches([]);
      
    } catch (error) {
      console.error('❌ PROFILE API FETCH ERROR:', error);
      toast.error('System error while loading batches');
      setAvailableBatches([]);
    } finally {
      setIsLoading(false);
      console.log('🏁 === FETCH BATCHES DEBUG END ===');
    }
  };
  // Fetch classes for selected batch - PURE TIME-BASED SINGLE CLASS DISPLAY
  const fetchBatchClasses = async (batch: StudentBatch) => {
    if (!studentInfo) return;
    
    setLoadingClasses(true);
    try {
      const studentIdToUse = studentInfo._id || studentInfo.studentId;
      console.log('🎯 STUDENT - Fetching classes (PURE TIME-BASED MODE):', batch.batchName, 'ID:', batch._id);
      
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
            const res = await fetch(`/api/module-class?batchId=${batch._id}`);
            const classData = await res.json();
            
            if (res.ok && classData.success && classData.data && Array.isArray(classData.data)) {
              // Count non-cancelled classes to determine next number
              const existingClasses = classData.data.filter((cls: any) => cls.status !== 'cancelled');
              classNumber = existingClasses.length + 1;
              console.log(`📊 Found ${existingClasses.length} existing classes, next will be Class ${classNumber}`);
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

      // Set classes (should be exactly 1 class)
      setBatchClasses(displayClasses);
      console.log(`✅ STUDENT: Showing ${displayClasses.length} class (PURE TIME-BASED POLICY)`);
      
      if (displayClasses.length === 1) {
        const cls = displayClasses[0];
        // Use the new pure time-based status
        const timeStatus = getClassStatus(cls);
        
        if (timeStatus.status === 'live') {
          toast.success(`Live now: ${cls.moduleTitle}`);
        } else if (timeStatus.status === 'starting-soon') {
          toast.success(`Starting soon: ${cls.moduleTitle}`);
        } else if (timeStatus.status === 'upcoming') {
          toast.success(`Upcoming: ${cls.moduleTitle}`);
        } else {
          toast.success(`Next class: ${cls.moduleTitle}`);
        }
      } else {
        toast.info(`No timing information for "${batch.batchName}"`);
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
  const fetchBatchRecordings = async (batch: StudentBatch) => {
    if (!studentInfo) return;
    
    setLoadingRecordings(true);
    try {
      const studentIdToUse = studentInfo._id || studentInfo.studentId;
      console.log('Fetching recordings for batch:', batch.batchName, 'Batch ID:', batch._id);
      
      const res = await fetch(`/api/student-batch-recordings?studentId=${studentIdToUse}&batchId=${batch._id}`);
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

  // Fetch notes for selected batch (read-only)
  const fetchBatchNotes = async (batch: StudentBatch) => {
    if (!studentInfo) return;
    
    setLoadingNotes(true);
    try {
      const studentIdToUse = studentInfo._id || studentInfo.studentId;
      console.log('📝 Fetching notes for batch:', batch.batchName, 'ID:', batch._id);
      
      // Fetch WITHOUT batchId - this is the same call /student/notes uses and it
      // resolves every batch the student is enrolled in. Scoping the request to a
      // single batch server-side returns nothing whenever the trainer assigned the
      // note to a different batch, so filter client-side instead.
      const res = await fetch(`/api/student-notes?studentId=${studentIdToUse}`);
      const data = await res.json();

      console.log('📝 Notes API response:', data);

      if (!res.ok || !data.success) {
        console.error('❌ Failed to fetch notes:', data);
        setBatchNotes([]);
        setNotesDiagnostics(null);
        return;
      }

      const allNotes: any[] = Array.isArray(data.notes) ? data.notes : [];

      // Notes explicitly assigned to the batch the student is viewing
      const matchedNotes = allNotes.filter((note: any) =>
        note.batches?.some((b: any) => String(b._id) === String(batch._id))
      );

      const usingOtherBatches = matchedNotes.length === 0 && allNotes.length > 0;
      const resolvedNotes = matchedNotes.length > 0 ? matchedNotes : allNotes;

      setBatchNotes(resolvedNotes);
      setNotesDiagnostics({
        ...(data.diagnostics || {}),
        totalStudentNotes: allNotes.length,
        matchedBatchNotes: matchedNotes.length,
        showingOtherBatches: usingOtherBatches
      });

      console.log(
        `✅ Loaded ${resolvedNotes.length} notes for ${batch.batchName} ` +
        `(${matchedNotes.length} assigned to this batch, ${allNotes.length} total)`
      );
    } catch (error) {
      console.error('❌ Fetch batch notes error:', error);
      setBatchNotes([]);
      setNotesDiagnostics(null);
    } finally {
      setLoadingNotes(false);
    }
  };
  // Handle batch selection
  const handleBatchSelect = (batch: StudentBatch) => {
    console.log('=== BATCH SELECTION ===');
    console.log('Selected batch:', batch);
    console.log('Batch ID type:', typeof batch._id);
    console.log('Batch ID value:', batch._id);
    
    setSelectedBatch(batch);
    setBatchClasses([]);
    setBatchRecordings([]);
    setBatchNotes([]);
    setJoinedClasses(new Set()); // Reset joined classes for new batch
    setActiveTab('classes');
    
    // Fetch data for the selected batch
    console.log('Fetching classes for selected batch...');
    fetchBatchClasses(batch);
    fetchBatchRecordings(batch);
    fetchBatchNotes(batch);
    
    toast.success(`Selected batch: ${batch.batchName}`);
  };

  // Handle going back to batch selection
  const handleBackToBatches = () => {
    setSelectedBatch(null);
    setBatchClasses([]);
    setBatchRecordings([]);
    setBatchNotes([]);
    setJoinedClasses(new Set()); // Reset joined classes
    setActiveTab('classes');
  };

  // Check if student has actually successfully joined a specific class (memory only)
  const hasStudentJoinedClass = (classId: string) => {
    // Only return true if the class is explicitly marked as joined in memory
    return joinedClasses.has(classId);
  };

  // Get class status - PURE TIME-BASED LOGIC (ignores database status)
  const getClassStatus = (classItem: ScheduledClass) => {
    // Get current time in IST
    const now = new Date();
    const istNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    
    console.log(`🕒 PURE TIME STATUS CHECK for ${classItem.moduleTitle}`);
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
      
      // Time windows for pure time-based status determination
      const joinWindowStart = new Date(istClassDateTime.getTime() - 15 * 60 * 1000); // 15 minutes before
      const gracePeriodEnd = new Date(classEndTime.getTime() + 30 * 60 * 1000); // 30 minutes after
      
      console.log(`  Join Window Start: ${joinWindowStart.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      console.log(`  Grace Period End: ${gracePeriodEnd.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      
      // PURE TIME-BASED STATUS DETERMINATION
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
        
        console.log(`  📅 UPCOMING: Class will start in ${timeText}`);
        return {
          status: 'upcoming',
          canJoin: false,
          label: 'Upcoming',
          color: 'bg-blue-600',
          message: `Class will start at ${classTimeString} (in ${timeText})`
        };
        
      } else if (istNow >= istClassDateTime && istNow <= classEndTime) {
        // During class time - show as LIVE (regardless of database)
        console.log(`  🔴 LIVE TIME: Current time is during class hours - showing as LIVE`);
        return {
          status: 'live',
          canJoin: true,
          label: 'Live Now',
          color: 'bg-red-600',
          message: 'Class is live now - you can join'
        };
        
      } else if (istNow > joinWindowStart && istNow < istClassDateTime) {
        // In join window before class starts
        const minutesUntilStart = Math.ceil((istClassDateTime.getTime() - istNow.getTime()) / (60 * 1000));
        
        console.log(`  � STARTING SOON: In join window, class starts in ${minutesUntilStart} minutes`);
        return {
          status: 'starting-soon',
          canJoin: true,
          label: 'Starting Soon',
          color: 'bg-yellow-600',
          message: `Class starts in ${minutesUntilStart} minutes - you can join now`
        };
        
      } else if (istNow > classEndTime && istNow <= gracePeriodEnd) {
        // In grace period after class ended
        console.log(`  � GRACE PERIOD: Class time ended but still in grace period`);
        return {
          status: 'recently-ended',
          canJoin: true,
          label: 'Recently Ended',
          color: 'bg-orange-600',
          message: 'Class time ended but you can still try to join if active'
        };
        
      } else {
        // Past grace period - expired
        console.log(`  ⏰ EXPIRED: Past grace period`);
        return {
          status: 'expired',
          canJoin: false,
          label: 'Expired',
          color: 'bg-gray-600',
          message: 'Class time has passed'
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
  
  // Handle joining a class (student version) - Simplified: Always try to join
  const handleJoinClass = async (classItem: ScheduledClass) => {
    if (!studentInfo || joiningClass === classItem._id) {
      console.log('❌ Cannot join class - studentInfo:', studentInfo, 'joiningClass:', joiningClass);
      if (!studentInfo) {
        toast.error('Please log in again. Your session may have expired.');
        router.push('/student/login');
      }
      return;
    }
    
    setJoiningClass(classItem._id);
    
    try {
      const studentName = studentInfo?.name || studentInfo?.studentName || 'Student';
      let actualClassId = classItem._id;
      
      console.log('🎯 Student attempting to join class:', classItem.moduleTitle);
      console.log('🎯 Student info:', { id: studentInfo._id, name: studentName });
      console.log('🎯 Class ID:', actualClassId);
      
      // ENHANCED: For timing-based classes, first check if trainer has already created a real class
      if (classItem.isVirtual) {
        console.log('🎯 Student attempting to join timing-based class - checking for real class first');
        
        // Parse the timing-based class ID to get batch and date info
        const timingMatch = classItem._id.match(/^timing-([a-f0-9]{24})-(.+)$/);
        if (timingMatch) {
          const [, batchId, dateISO] = timingMatch;
          const classDateTime = new Date(dateISO);
          const scheduledDate = classDateTime.toISOString().split('T')[0];
          const scheduledTime = `${classDateTime.getHours().toString().padStart(2, '0')}:${classDateTime.getMinutes().toString().padStart(2, '0')}`;
          
          console.log('🔍 Looking for real class:', { batchId, scheduledDate, scheduledTime });
          
          // Check if trainer has already created a real class for this timing
          try {
            const realClassCheck = await fetch(`/api/module-class?batchId=${batchId}&scheduledDate=${scheduledDate}&scheduledTime=${scheduledTime}`);
            if (realClassCheck.ok) {
              const realClassData = await realClassCheck.json();
              if (realClassData.success && realClassData.data && realClassData.data.length > 0) {
                // Found a real class that matches this timing
                const realClass = realClassData.data.find((cls: any) => 
                  cls.scheduledDate === scheduledDate && cls.scheduledTime === scheduledTime
                );
                
                if (realClass) {
                  console.log('✅ Found real class created by trainer:', realClass._id);
                  actualClassId = realClass._id;
                  
                  // Update the current class item for future reference
                  classItem._id = actualClassId;
                  classItem.isVirtual = false;
                }
              }
            }
          } catch (checkError) {
            console.log('Failed to check for real class:', checkError);
            // Continue with original timing-based ID
          }
        }
      }
      
      console.log('🚀 Student final join attempt with class ID:', actualClassId);
      
      const response = await fetch('/api/join-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: actualClassId,
          userName: `${studentName} (Student)`,
          userType: 'student',
          studentId: studentInfo._id || studentInfo.studentId, // Add student ID for tracking
          batchId: selectedBatch?._id
        })
      });

      console.log('🔍 DEBUGGING - Response received:');
      console.log('  - Response status:', response.status);
      console.log('  - Response ok:', response.ok);
      console.log('  - Response headers:', response.headers);

      let data;
      try {
        data = await response.json();
        console.log('  - JSON parsed successfully:', data);
      } catch (jsonError) {
        console.error('❌ Failed to parse JSON response:', jsonError);
        toast.error('Failed to communicate with server. Please try again.');
        return;
      }

      console.log('🔍 DEBUGGING - Response analysis:');
      console.log('  - data.success:', data.success);
      console.log('  - data.error:', data.error);
      console.log('  - data.trainerLeft:', data.trainerLeft);
      console.log('  - data.meetingEnded:', data.meetingEnded);

      // IMMEDIATE ALERT CHECK - Check for trainer left scenario before any other processing
      if (response.status === 400) {
        console.log('🚨 Got 400 status - checking for trainer left scenarios');
        const errorText = data.error || '';
        console.log('Error message:', errorText);
        console.log('Trainer left flag:', data.trainerLeft);
        console.log('Meeting ended flag:', data.meetingEnded);
        console.log('Trainer not in meeting flag:', data.trainerNotInMeeting);
        
        // Check multiple indicators that trainer is not available
        if (errorText.includes('trainer has left') || 
            errorText.includes('trainer is not in') ||
            errorText.includes('meeting or it has ended') ||
            errorText.includes('trainer to start') ||
            errorText.includes('meeting has not been started') ||
            data.trainerLeft === true ||
            data.meetingEnded === true ||
            data.trainerNotInMeeting === true) {
          
          console.log('✅ DETECTED TRAINER NOT AVAILABLE - SHOWING ALERT');
          
          // Use multiple alert methods to ensure visibility
          const message = '⚠️ Trainer is not in the meeting. Please wait for your trainer to start a new class session.';
          
          // Show browser alert first
          alert(message);
          
          // Also show toast
          toast.error(message, { duration: 8000 });
          
          console.log('✅ TRAINER ALERT SHOWN SUCCESSFULLY');
          setJoiningClass(null);
          return;
        }
      }

      // Check for specific response cases
      if (data.success && data.joinUrl) {
        console.log('✅ SUCCESS: Opening join URL');
        window.open(data.joinUrl, '_blank', 'width=1200,height=800');
        toast.success(`Joined class "${classItem.moduleTitle}" for batch ${classItem.batchName}`);
        
        // Mark this class as joined (in memory only)
        setJoinedClasses(prev => new Set([...prev, classItem._id]));
        
        // Refresh classes for this batch
        if (selectedBatch) {
          fetchBatchClasses(selectedBatch);
        }
      } else if (response.status === 429) {
        // Handle rate limiting - provide clear guidance
        const retryTime = 10; // seconds
        toast.warning(`Please wait ${retryTime} seconds before trying to join again. If you're already in the meeting, check for other browser tabs.`, {
          duration: 8000,
          action: {
            label: 'Check Meeting Status',
            onClick: () => {
              // Refresh the class status
              if (selectedBatch) {
                fetchBatchClasses(selectedBatch);
              }
            }
          }
        });
        
        // Auto-enable join button after rate limit period
        setTimeout(() => {
          setJoiningClass(null);
          toast.info('You can now try joining the class again');
        }, retryTime * 1000);
        
        return;
      } else {
        console.log('🚨 ENTERING ERROR HANDLING SECTION');
        console.log('🚨 About to handle error response...');
        
        // Handle all error cases with friendly messages
        let errorMsg = data.error || 'Failed to join class';
        console.log('❌ Student join failed:', errorMsg);
        console.log('❌ Full error data:', data);
        
        // Provide user-friendly error messages
        if (errorMsg.includes('trainer has left') || 
           errorMsg.includes('trainer is not in') ||
           errorMsg.includes('meeting or it has ended') ||
           errorMsg.includes('trainer has left the meeting') ||
           errorMsg.includes('meeting has ended') ||
           errorMsg.includes('trainer to start') ||
           errorMsg.includes('meeting has not been started') ||
           data.trainerLeft === true ||
           data.meetingEnded === true ||
           data.trainerNotInMeeting === true) {
          
          console.log('🎯 Detected trainer left scenario');
          console.log('🎯 trainerLeft flag:', data.trainerLeft);
          console.log('🎯 meetingEnded flag:', data.meetingEnded);
          
          // Use multiple alert methods to ensure visibility
          const message = '⚠️ Trainer is not in the meeting. Please wait for your trainer to start a new class session.';
          
          console.log('🎯 SHOWING ALERT:', message);
          alert(message); // Browser alert
          toast.error(message, { duration: 8000 }); // Toast notification
          
          // Also try to show a more prominent notification
          if (confirm('⚠️ Trainer is not in the meeting. Would you like to refresh the page to check for updates?')) {
            window.location.reload();
          }
          
        } else if (errorMsg.includes('meeting has not been started') ||
            errorMsg.includes('wait for your instructor') ||
            errorMsg.includes('instructor to start') ||
            errorMsg.includes('wait for your trainer') ||
            errorMsg.includes('trainer to start') ||
            errorMsg.includes('Students can only join meetings')) {
          
          toast.warning('The class meeting has not been started yet. Please wait for your trainer to start the class.');
          
        } else if ((errorMsg.includes('session token') && (errorMsg.includes('already joined') || errorMsg.includes('has already joined'))) ||
                   errorMsg.includes('cannot join multiple times') ||
                   errorMsg.includes('already in this meeting')) {
          
          // Handle duplicate join like trainer does - offer rejoin option
          const confirmMessage = `You appear to have already joined this class. Would you like to rejoin? This will open the meeting in a new tab.`;
          const confirmRejoin = confirm(confirmMessage);
          
          if (confirmRejoin) {
            // Try to rejoin with forceRejoin flag like trainer does
            const rejoinResponse = await fetch('/api/join-class', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                classId: actualClassId,
                userName: `${studentName} (Student)`,
                userType: 'student',
                studentId: studentInfo._id || studentInfo.studentId,
                batchId: selectedBatch?._id,
                forceRejoin: true // Same flag that trainer uses
              })
            });

            const rejoinData = await rejoinResponse.json();
            
            if (rejoinData.success && rejoinData.joinUrl) {
              window.open(rejoinData.joinUrl, '_blank', 'width=1200,height=800');
              toast.success(`Rejoined class "${classItem.moduleTitle}" successfully`);
              
              // Mark as joined and refresh
              setJoinedClasses(prev => new Set([...prev, classItem._id]));
              if (selectedBatch) {
                fetchBatchClasses(selectedBatch);
              }
            } else {
              toast.error('Failed to rejoin class - please try refreshing the page');
            }
          } else {
            toast.info('Join cancelled - you can try again later');
          }
          
        } else if (errorMsg.includes('Class not found') || 
                   errorMsg.includes('not found')) {
          
          toast.info('The class is not ready yet. Please wait for your trainer to start the session.');
          
        } else if (errorMsg.includes('Invalid timing-based class') ||
                   errorMsg.includes('Cast to ObjectId failed')) {
          
          toast.info('The class is being prepared. Please try again in a moment or wait for your trainer to start.');
          
        } else {
          // For other errors, throw as before
          console.log('🚨 Unhandled error, throwing:', errorMsg);
          throw new Error(errorMsg);
        }
        
        // Ensure button is reset after handling all error cases
        setJoiningClass(null);
        return; // Exit the function after handling error
      }
      
    } catch (error: any) {
      console.error('Student join class error:', error);
      
      // Remove from joined classes if join failed
      setJoinedClasses(prev => {
        const newSet = new Set(prev);
        newSet.delete(classItem._id);
        return newSet;
      });
      
      // Show user-friendly error
      toast.error('Unable to join class. Please try again or wait for your trainer to start the session.');
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

  // Handle viewing notes (read-only)
  const handleViewNotes = (note: any) => {
    console.log('Viewing note:', note.title, 'for batch:', selectedBatch?.batchName);
    
    // Open notes in a new tab (or could be a modal)
    const notesUrl = `/student/notes?noteId=${note._id}&batchId=${selectedBatch?._id}`;
    window.open(notesUrl, '_blank');
    toast.success(`Opening note: ${note.title}`);
  };
  if (isLoading) {
    return (
      <StudentLayout>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <p className="text-gray-600">Loading your enrolled batches...</p>
        </div>
      </StudentLayout>
    );
  }

  // Debug info display
  console.log('🔍 RENDER STATE:', {
    availableBatches: availableBatches.length,
    selectedBatch: selectedBatch?._id,
    isLoading,
    studentInfo: studentInfo?.name
  });

  return (
    <StudentLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
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
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Users className="h-8 w-8" />
                {selectedBatch ? `${selectedBatch.batchName} - Learning Hub` : 'My Learning Batches'}
              </h1>
              <p className="text-blue-100 mt-2">
                {selectedBatch 
                  ? `Access classes, recordings, and notes for ${selectedBatch.batchName} - ${selectedBatch.courseTitle}`
                  : 'Select a batch to access classes, recordings, and study materials'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {!selectedBatch ? (
          // Batch Selection View
          <div>
            <StudentBatchSelector 
              batches={availableBatches}
              onBatchSelect={handleBatchSelect}
            />
          </div>
        ) : (
          // Selected Batch Learning Hub
          <div className="space-y-6">
            {/* Batch Info Card */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedBatch.batchName}</h2>
                    <p className="text-gray-600">{selectedBatch.courseTitle}</p>
                    {selectedBatch.timing && (
                      <p className="text-sm text-gray-500 mt-1">Class Timing: {selectedBatch.timing}</p>
                    )}
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{selectedBatch.studentCount}</div>
                      <div className="text-gray-600">Students</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{batchClasses.length > 0 ? '1 Next' : '0'}</div>
                      <div className="text-gray-600">Upcoming Class</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{batchRecordings.length}</div>
                      <div className="text-gray-600">Recordings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{batchNotes.length}</div>
                      <div className="text-gray-600">Notes</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tab Navigation */}
            <Card className="border-indigo-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={() => setActiveTab('classes')}
                      variant={activeTab === 'classes' ? 'default' : 'outline'}
                      className="flex items-center gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      Classes ({batchClasses.length > 0 ? 'Next Class' : 'No Classes'})
                    </Button>
                    <Button
                      onClick={() => setActiveTab('recordings')}
                      variant={activeTab === 'recordings' ? 'default' : 'outline'}
                      className="flex items-center gap-2"
                    >
                      <Video className="h-4 w-4" />
                      Recordings ({batchRecordings.length})
                    </Button>
                    <Button
                      onClick={() => setActiveTab('notes')}
                      variant={activeTab === 'notes' ? 'default' : 'outline'}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Notes ({batchNotes.length})
                    </Button>
                  </div>
                  
                  {/* Manual Refresh Button */}
                  <Button
                    onClick={handleRefreshClasses}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    title="Refresh to check for new classes or status updates"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tab Content */}
            {activeTab === 'classes' ? (
              <StudentClassesTab
                classes={batchClasses}
                loading={loadingClasses}
                joiningClass={joiningClass}
                joinedClasses={joinedClasses}
                hasStudentJoinedClass={hasStudentJoinedClass}
                onJoinClass={handleJoinClass}
                batchName={selectedBatch.batchName}
                getClassStatus={getClassStatus}
              />
            ) : activeTab === 'recordings' ? (
              <StudentRecordingsTab
                recordings={batchRecordings}
                loading={loadingRecordings}
                onPlayRecording={handlePlayRecording}
                batchName={selectedBatch.batchName}
              />
            ) : (
              <StudentNotesTab
                notes={batchNotes}
                loading={loadingNotes}
                diagnostics={notesDiagnostics}
                onViewNote={handleViewNotes}
                batchName={selectedBatch.batchName}
              />
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};
// Student Batch Selector Component
const StudentBatchSelector: React.FC<{ 
  batches: StudentBatch[], 
  onBatchSelect: (batch: StudentBatch) => void 
}> = ({ batches, onBatchSelect }) => {
  if (batches.length === 0) {
    return (
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Enrolled Batches</h3>
          <p className="text-gray-500 text-center">
            You are not enrolled in any batches yet. Contact your administrator to get enrolled.
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
          {batches.length} enrolled batch{batches.length !== 1 ? 'es' : ''}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.map((batch) => (
          <StudentBatchCard key={batch._id} batch={batch} onSelect={() => onBatchSelect(batch)} />
        ))}
      </div>
    </div>
  );
};

// Student Batch Card Component
const StudentBatchCard: React.FC<{ batch: StudentBatch, onSelect: () => void }> = ({ batch, onSelect }) => {
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
                <Circle className="h-3 w-3 mr-1 fill-current" />
                Live
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            
            
            
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
              {hasLiveClasses ? 'Join Live Classes' : 'Enter Learning Hub'}
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
// Student Classes Tab Component (Enhanced with joined classes tracking)
const StudentClassesTab: React.FC<{
  classes: ScheduledClass[],
  loading: boolean,
  joiningClass: string | null,
  joinedClasses: Set<string>,
  hasStudentJoinedClass: (classId: string) => boolean,
  onJoinClass: (classItem: ScheduledClass) => void,
  batchName: string,
  getClassStatus: (classItem: ScheduledClass) => any
}> = ({ classes, loading, joiningClass, joinedClasses, hasStudentJoinedClass, onJoinClass, batchName, getClassStatus }) => {
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Classes</h3>
          <p className="text-gray-500 text-center">
            No upcoming classes found for batch "{batchName}". All classes may be completed or cancelled.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Next Class for {batchName}
        </h3>
        <div className="text-sm text-gray-500">
          {classes.length} class{classes.length !== 1 ? 'es' : ''} scheduled
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
                    {(() => {
                      const hasSuccessfullyJoined = hasStudentJoinedClass(classItem._id);
                      
                      return (
                        <div className="flex flex-col gap-2">
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
                                {hasSuccessfullyJoined 
                                  ? statusInfo.status === 'live' 
                                    ? 'Rejoin Live Class' 
                                    : 'Rejoin Class'
                                  : statusInfo.status === 'live' 
                                    ? 'Join Live Class' 
                                    : 'Join Class'
                                }
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4 mr-2" />
                                {statusInfo.status === 'scheduled' ? 'Not Ready' : statusInfo.label}
                              </>
                            )}
                          </Button>
                          
                          {/* Show status indicators */}
                          {hasSuccessfullyJoined && statusInfo.canJoin && (
                            <div className="text-xs text-green-600 text-center">
                              ✓ Previously joined - click to rejoin
                            </div>
                          )}
                          
                          {statusInfo.status === 'late_join' && (
                            <div className="text-xs text-orange-600 text-center">
                              ⚠ Class has started but you can still join
                            </div>
                          )}
                        </div>
                      );
                    })()}
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
// Student Recordings Tab Component
const StudentRecordingsTab: React.FC<{
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Recordings Available</h3>
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
            <Calendar className="h-5 w-5 text-blue-600" />
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
                    {/* Thumbnail placeholder */}
                    <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                      <Play className="h-12 w-12 text-gray-400" />
                    </div>

                    <div className="flex flex-col gap-2">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">
                        {recording.name || 'Class Recording'}
                      </h3>

                      <div className="space-y-1 text-sm text-gray-600">
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
                        disabled={!recording.videoUrl}
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Watch Recording
                      </Button>
                    </div>
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
// Student Notes Tab Component (Read-only)
const StudentNotesTab: React.FC<{
  notes: any[],
  loading: boolean,
  diagnostics?: any,
  onViewNote: (note: any) => void,
  batchName: string
}> = ({ notes, loading, diagnostics, onViewNote, batchName }) => {
  // Track which notes are expanded to read inline
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const toggleExpanded = (noteId: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <p className="text-gray-600">Loading notes for {batchName}...</p>
        </CardContent>
      </Card>
    );
  }

  if (notes.length === 0) {
    // Distinguish "trainer created nothing" from "trainer created drafts" so the
    // empty state is actionable instead of a dead end.
    const draftCount = diagnostics?.draftNotes ?? 0;
    const hasUnpublished = draftCount > 0;
    const enrollmentIssue = diagnostics && diagnostics.enrollmentMatched === false;

    return (
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {hasUnpublished ? 'Notes Not Published Yet' : 'No Notes Available'}
          </h3>

          {hasUnpublished ? (
            <p className="max-w-md text-center text-gray-500">
              Your instructor has created {draftCount} note{draftCount !== 1 ? 's' : ''} for
              "{batchName}" but {draftCount !== 1 ? 'they are' : 'it is'} still a draft.
              {' '}Ask your trainer to publish {draftCount !== 1 ? 'them' : 'it'} so you can read
              {draftCount !== 1 ? ' them' : ' it'} here.
            </p>
          ) : (
            <p className="max-w-md text-center text-gray-500">
              No study notes are available for the batch "{batchName}" yet. Your instructor will add notes here.
            </p>
          )}

          {enrollmentIssue && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              <span className="text-xs text-amber-800">
                Your enrollment record for this batch looks incomplete. If notes are
                missing, ask an administrator to confirm you are added to "{batchName}".
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Study Notes for {batchName}
        </h3>
        <div className="text-sm text-gray-500">
          {notes.length} note{notes.length !== 1 ? 's' : ''} available
        </div>
      </div>

      <div className="space-y-4">
        {notes.map((note) => {
          const isExpanded = expandedNotes.has(note._id);
          const sections = note.textContent || [];
          const isPdf = note.noteType === 'pdf';

          return (
            <Card key={note._id} className="border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                {/* Note header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {isPdf ? (
                        <FileText className="h-5 w-5 text-red-600 flex-shrink-0" />
                      ) : (
                        <BookOpen className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      )}
                      <h3 className="font-semibold text-gray-900">
                        {note.title || 'Study Note'}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {isPdf ? 'PDF' : 'Text'}
                      </Badge>
                    </div>

                    {note.description && (
                      <p className="text-sm text-gray-600 mb-3">{note.description}</p>
                    )}

                    {/* Metadata - mapped to the fields the API actually returns */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      {note.trainer?.name && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          <span>By {note.trainer.name}</span>
                        </div>
                      )}

                      {note.publishedAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {new Date(note.publishedAt).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}

                      {(note.moduleIndex || note.moduleTitle) && (
                        <div className="flex items-center gap-1 text-purple-600">
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>
                            {note.moduleIndex ? `Module ${note.moduleIndex}` : ''}
                            {note.moduleIndex && note.moduleTitle ? ' - ' : ''}
                            {note.moduleTitle}
                          </span>
                        </div>
                      )}

                      {!isPdf && sections.length > 0 && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          <span>{sections.length} section{sections.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>

                    {/* Tags */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {note.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {isPdf && note.pdfFile?.url ? (
                      <Button
                        onClick={() => window.open(note.pdfFile.url, '_blank')}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Open PDF
                      </Button>
                    ) : (
                      <Button
                        onClick={() => toggleExpanded(note._id)}
                        variant={isExpanded ? 'secondary' : 'outline'}
                        size="sm"
                        disabled={sections.length === 0}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {isExpanded ? 'Hide' : 'Read'}
                      </Button>
                    )}

                    <Button
                      onClick={() => onViewNote(note)}
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                    >
                      Open full page
                    </Button>
                  </div>
                </div>

                {/* PDF details */}
                {isPdf && note.pdfFile && (
                  <div className="mt-4 flex items-center gap-3 rounded-lg border bg-gray-50 p-3">
                    <FileText className="h-8 w-8 text-red-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium text-gray-800">
                        {note.pdfFile.fileName}
                      </div>
                      {note.pdfFile.fileSize > 0 && (
                        <div className="text-xs text-gray-500">
                          {formatFileSize(note.pdfFile.fileSize)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Inline text content - trainer notes are stored as HTML from the rich text editor */}
                {!isPdf && isExpanded && sections.length > 0 && (
                  <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
                    {sections
                      .slice()
                      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
                      .map((section: any, index: number) => (
                        <div key={index} className="rounded-lg border bg-gray-50 p-4">
                          {section.title && (
                            <h4 className="mb-2 font-medium text-gray-900">
                              {section.title}
                            </h4>
                          )}
                          <div
                            className="note-content prose prose-sm max-w-none text-gray-700"
                            dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(section.content) }}
                          />
                        </div>
                      ))}
                  </div>
                )}

                {!isPdf && sections.length === 0 && (
                  <div className="mt-3 text-xs text-gray-400">
                    This note has no content sections yet.
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info message about read-only access */}
      
    </div>
  );
};

export default StudentBatchManagement;