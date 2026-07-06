'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/router';
import StudentLayout from '@/src/student/common/StudentLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Play, Pause, Volume2, VolumeX, Maximize, ChevronDown, ChevronRight,
  CheckCircle, Circle, Lock, Clock, BookOpen, Menu, X, RotateCcw,
  SkipForward, SkipBack
} from 'lucide-react';
import { toast } from 'sonner';

interface Topic {
  _id?: string;
  topicId: string;
  title: string;
  description?: string;
  type: string;
  duration: string;
  videoUrl?: string;
  videoDuration?: number;
  isPreview: boolean;
  order: number;
}

interface Module {
  _id?: string;
  moduleId: string;
  title: string;
  description?: string;
  order: number;
  topics: Topic[];
  isPublished: boolean;
}

interface Course {
  _id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  modules: Module[];
  totalModules: number;
  totalTopics: number;
  totalDuration: string;
}

interface TopicProgress {
  topicId: string;
  completed: boolean;
  progress: number;
  watchTime: number;
  videoDuration: number;
}

interface ModuleProgress {
  moduleId: string;
  topicsCompleted: number;
  totalTopics: number;
  progress: number;
  topicProgress: TopicProgress[];
}

interface Progress {
  _id: string;
  studentId: string;
  courseId: string;
  overallProgress: number;
  currentModuleIndex: number;
  currentTopicIndex: number;
  moduleProgress: ModuleProgress[];
}

const StudentCoursePlayer = () => {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [student, setStudent] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('student');
    if (!stored) {
      router.push('/student/login');
      return;
    }

    const studentData = JSON.parse(stored);
    setStudent(studentData);
    fetchCourseAndProgress(studentData.studentId, courseId);
  }, [courseId]);

  const fetchCourseAndProgress = async (studentId: string, cid: string) => {
    setIsLoading(true);
    try {
      // Fetch course details
      const courseRes = await fetch(`/api/lms/courses/${cid}`);
      const courseData = await courseRes.json();

      if (!courseRes.ok) {
        throw new Error(courseData.error || 'Course not found');
      }

      setCourse(courseData);

      // Fetch student progress
      const progressRes = await fetch(`/api/lms/progress?studentId=${studentId}&courseId=${cid}`);
      const progressData = await progressRes.json();

      if (progressRes.ok && progressData._id) {
        setProgress(progressData);
        setCurrentModuleIndex(progressData.currentModuleIndex || 0);
        setCurrentTopicIndex(progressData.currentTopicIndex || 0);
      } else {
        // Create initial progress
        const createRes = await fetch('/api/lms/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, courseId: cid })
        });
        const newProgress = await createRes.json();
        setProgress(newProgress);
      }

      // Expand all modules by default
      if (courseData.modules) {
        setExpandedModules(new Set(courseData.modules.map((_: any, i: number) => i)));
      }
    } catch (error: any) {
      console.error('Error loading course:', error);
      toast.error(error.message || 'Failed to load course');
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentTopic = (): Topic | null => {
    if (!course?.modules?.[currentModuleIndex]) return null;
    return course.modules[currentModuleIndex].topics[currentTopicIndex] || null;
  };

  const getTopicProgress = (moduleIndex: number, topicIndex: number): TopicProgress | null => {
    if (!progress?.moduleProgress?.[moduleIndex]) return null;
    return progress.moduleProgress[moduleIndex].topicProgress[topicIndex] || null;
  };

  const getModuleProgress = (moduleIndex: number): ModuleProgress | null => {
    return progress?.moduleProgress?.[moduleIndex] || null;
  };

  const handleVideoPlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);

      // Save progress every 10 seconds
      if (Math.floor(videoRef.current.currentTime) % 10 === 0) {
        saveProgress(Math.floor(videoRef.current.currentTime), Math.floor(videoRef.current.duration));
      }
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    // Mark as complete
    saveProgress(duration, duration, true);
  };

  const saveProgress = async (watchTime: number, videoDuration: number, completed: boolean = false) => {
    if (!student || !course) return;

    const topicProgress = getTopicProgress(currentModuleIndex, currentTopicIndex);
    const isAlreadyCompleted = topicProgress?.completed;

    // Don't update if already completed
    if (isAlreadyCompleted && !completed) return;

    try {
      const res = await fetch('/api/lms/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.studentId,
          courseId: course._id,
          moduleIndex: currentModuleIndex,
          topicIndex: currentTopicIndex,
          watchTime,
          videoDuration,
          completed: completed || (videoDuration > 0 && watchTime / videoDuration >= 0.9)
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setProgress(updated);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const selectTopic = (moduleIndex: number, topicIndex: number) => {
    // Save current progress before switching
    if (videoRef.current && duration > 0) {
      saveProgress(Math.floor(videoRef.current.currentTime), Math.floor(duration));
    }

    setCurrentModuleIndex(moduleIndex);
    setCurrentTopicIndex(topicIndex);
    setIsPlaying(false);

    // Expand the module if not expanded
    if (!expandedModules.has(moduleIndex)) {
      setExpandedModules(prev => {
        const newSet = new Set(prev);
        newSet.add(moduleIndex);
        return newSet;
      });
    }
  };

  const toggleModule = (index: number) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const goToNextTopic = () => {
    if (!course) return;

    const currentModule = course.modules[currentModuleIndex];
    if (currentTopicIndex < currentModule.topics.length - 1) {
      selectTopic(currentModuleIndex, currentTopicIndex + 1);
    } else if (currentModuleIndex < course.modules.length - 1) {
      setCurrentModuleIndex(currentModuleIndex + 1);
      setCurrentTopicIndex(0);
    }
  };

  const goToPrevTopic = () => {
    if (currentTopicIndex > 0) {
      selectTopic(currentModuleIndex, currentTopicIndex - 1);
    } else if (currentModuleIndex > 0) {
      const prevModule = course?.modules[currentModuleIndex - 1];
      if (prevModule) {
        setCurrentModuleIndex(currentModuleIndex - 1);
        setCurrentTopicIndex(prevModule.topics.length - 1);
      }
    }
  };

  const currentTopic = getCurrentTopic();
  const topicProgress = getTopicProgress(currentModuleIndex, currentTopicIndex);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading course...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Course not found</div>
      </div>
    );
  }

  const overallProgress = progress?.overallProgress || 0;

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Video Player Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/student/dashboard')}
              className="text-white"
            >
              <X className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-white font-semibold">{course.title}</h1>
              <p className="text-gray-400 text-sm">
                Module {currentModuleIndex + 1}: {course.modules[currentModuleIndex]?.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-white text-sm">
              {overallProgress}% Complete
            </div>
            <Progress value={overallProgress} className="w-32 h-2" />
          </div>
        </div>

        {/* Video Player */}
        <div className="flex-1 relative bg-black flex items-center justify-center">
          {currentTopic?.videoUrl ? (
            <>
              <video
                ref={videoRef}
                src={currentTopic.videoUrl}
                className="max-h-full max-w-full"
                onTimeUpdate={handleVideoTimeUpdate}
                onLoadedMetadata={handleVideoLoadedMetadata}
                onEnded={handleVideoEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={handleVideoPlayPause}
              />

              {/* Video Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                {/* Progress Bar */}
                <div className="mb-3">
                  <div
                    className="h-1 bg-gray-600 rounded cursor-pointer relative"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const percent = (e.clientX - rect.left) / rect.width;
                      if (videoRef.current) {
                        videoRef.current.currentTime = percent * duration;
                      }
                    }}
                  >
                    <div
                      className="h-full bg-blue-500 rounded"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={goToPrevTopic}
                      className="text-white hover:bg-white/20"
                    >
                      <SkipBack className="h-5 w-5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleVideoPlayPause}
                      className="text-white hover:bg-white/20"
                    >
                      {isPlaying ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={goToNextTopic}
                      className="text-white hover:bg-white/20"
                    >
                      <SkipForward className="h-5 w-5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsMuted(!isMuted)}
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted ? (
                        <VolumeX className="h-5 w-5" />
                      ) : (
                        <Volume2 className="h-5 w-5" />
                      )}
                    </Button>

                    <span className="text-white text-sm ml-2">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {topicProgress?.completed ? (
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Completed
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => saveProgress(duration, duration, true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400">
              <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>No video available for this topic</p>
              <p className="text-sm mt-2">Type: {currentTopic?.type}</p>
            </div>
          )}
        </div>

        {/* Topic Info */}
        <div className="bg-gray-800 px-6 py-4">
          <h2 className="text-white text-xl font-semibold">{currentTopic?.title}</h2>
          <div className="flex items-center gap-4 mt-2 text-gray-400 text-sm">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {currentTopic?.duration}
            </span>
            <Badge variant="outline" className="text-gray-300">
              {currentTopic?.type}
            </Badge>
            {currentTopic?.isPreview && (
              <Badge className="bg-yellow-500/20 text-yellow-400">Free Preview</Badge>
            )}
          </div>
          {currentTopic?.description && (
            <p className="text-gray-400 mt-3">{currentTopic.description}</p>
          )}
        </div>
      </div>

      {/* Sidebar - Course Content */}
      {sidebarOpen && (
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-white font-semibold">Course Content</h3>
            <p className="text-gray-400 text-sm mt-1">
              {course.modules?.length || 0} modules • {course.totalTopics} lessons
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              {course.modules?.map((module, moduleIndex) => {
                const moduleProgress = getModuleProgress(moduleIndex);
                const isExpanded = expandedModules.has(moduleIndex);

                return (
                  <div key={moduleIndex} className="mb-2">
                    {/* Module Header */}
                    <button
                      onClick={() => toggleModule(moduleIndex)}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-700/50 text-left"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                        <div>
                          <p className="text-white text-sm font-medium">
                            {moduleIndex + 1}. {module.title}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {module.topics.length} topics
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-400 text-xs">
                          {moduleProgress?.topicsCompleted || 0}/{module.topics.length}
                        </span>
                      </div>
                    </button>

                    {/* Topics List */}
                    {isExpanded && (
                      <div className="ml-4 space-y-1">
                        {module.topics.map((topic, topicIndex) => {
                          const tp = getTopicProgress(moduleIndex, topicIndex);
                          const isCurrent = currentModuleIndex === moduleIndex && currentTopicIndex === topicIndex;
                          const isCompleted = tp?.completed;

                          return (
                            <button
                              key={topicIndex}
                              onClick={() => selectTopic(moduleIndex, topicIndex)}
                              className={`w-full flex items-center gap-3 p-2 rounded text-left ${
                                isCurrent
                                  ? 'bg-blue-600/20 border border-blue-500'
                                  : 'hover:bg-gray-700/50'
                              }`}
                            >
                              <div className="flex-shrink-0">
                                {isCompleted ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : isCurrent ? (
                                  <Play className="h-4 w-4 text-blue-400" />
                                ) : (
                                  <Circle className="h-4 w-4 text-gray-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm truncate ${
                                  isCurrent ? 'text-white' : isCompleted ? 'text-gray-300' : 'text-gray-400'
                                }`}>
                                  {topic.title}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  <span>{topic.duration}</span>
                                  {topic.isPreview && (
                                    <Badge variant="outline" className="text-xs px-1 py-0">Preview</Badge>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Overall Progress */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Overall Progress</span>
              <span className="text-white font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </div>
      )}

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gray-700 p-2 rounded-l-lg text-white hover:bg-gray-600"
        style={{ right: sidebarOpen ? 320 : 0 }}
      >
        {sidebarOpen ? <ChevronRight className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
    </div>
  );
};

export default StudentCoursePlayer;