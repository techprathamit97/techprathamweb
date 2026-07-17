import React, { useEffect, useState } from 'react';
import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  BookOpen,
  Search,
  Plus,
  Users,
  Clock,
  Edit,
  Trash2,
  DollarSign,
  Tag,
  ChevronDown,
  ChevronRight,
  Video,
  FileText,
  ListOrdered,
  GripVertical
} from 'lucide-react';
import { toast } from 'sonner';

interface Topic {
  _id?: string;
  topicId?: string;
  title: string;
  description?: string;
  type: string;
  duration: string;
  videoUrl?: string;
  isPreview: boolean;
  order: number;
}

interface Module {
  _id?: string;
  moduleId?: string;
  title: string;
  description?: string;
  order: number;
  topics: Topic[];
  isPublished: boolean;
}

interface Course {
  _id: string;
  courseId: string;
  title: string;
  slug: string;
  category: string;
  description: string;
  duration: string;
  price: number;
  isActive: boolean;
  status?: string;
  modules?: Module[];
  totalModules?: number;
  totalTopics?: number;
  createdAt?: string;
}

const CoursesManagement = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Module management state
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [courseModules, setCourseModules] = useState<Module[]>([]);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number | null>(null);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number | null>(null);
  const [newModule, setNewModule] = useState({ title: '', description: '' });
  const [newTopic, setNewTopic] = useState({
    title: '',
    description: '',
    type: 'video',
    duration: '10min',
    videoUrl: '',
    isPreview: false
  });

  const [newCourse, setNewCourse] = useState({
    courseId: '',
    title: '',
    slug: '',
    category: '',
    description: '',
    duration: '',
    price: 0,
    isActive: true
  });

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/lms/courses');
      const data = await res.json();
      
      if (res.ok) {
        setCourses(data);
      } else {
        throw new Error(data.error || 'Failed to fetch courses');
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      toast.error('Failed to fetch courses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourse.title || !newCourse.category || !newCourse.courseId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const res = await fetch('/api/lms/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCourse)
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Course created successfully');
        setIsCreateDialogOpen(false);
        setNewCourse({
          courseId: '',
          title: '',
          slug: '',
          category: '',
          description: '',
          duration: '',
          price: 0,
          isActive: true
        });
        fetchCourses();
      } else {
        toast.error(data.error || 'Failed to create course');
      }
    } catch (error) {
      console.error('Failed to create course:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse) return;

    try {
      const res = await fetch(`/api/lms/courses/${editingCourse._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCourse)
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Course updated successfully');
        setIsEditDialogOpen(false);
        setEditingCourse(null);
        fetchCourses();
      } else {
        toast.error(data.error || 'Failed to update course');
      }
    } catch (error) {
      console.error('Failed to update course:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      const res = await fetch(`/api/lms/courses/${courseId}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Course deleted successfully');
        fetchCourses();
      } else {
        toast.error(data.error || 'Failed to delete course');
      }
    } catch (error) {
      console.error('Failed to delete course:', error);
      toast.error('Network error. Please try again.');
    }
  };

  // Open module management dialog
  const openModuleDialog = async (course: Course) => {
    setEditingCourse(course);
    setCourseModules(course.modules || []);
    setIsModuleDialogOpen(true);
  };

  // Add new module
  const handleAddModule = () => {
    if (!newModule.title.trim()) {
      toast.error('Module title is required');
      return;
    }
    const module: Module = {
      title: newModule.title,
      description: newModule.description,
      order: courseModules.length,
      topics: [],
      isPublished: false
    };
    setCourseModules([...courseModules, module]);
    setNewModule({ title: '', description: '' });
  };

  // Delete module
  const handleDeleteModule = (index: number) => {
    if (!confirm('Delete this module and all its topics?')) return;
    const updated = [...courseModules];
    updated.splice(index, 1);
    // Reorder
    updated.forEach((m, i) => m.order = i);
    setCourseModules(updated);
  };

  // Add topic to module
  const handleAddTopic = (moduleIndex: number) => {
    if (!newTopic.title.trim()) {
      toast.error('Topic title is required');
      return;
    }
    const updatedModules = [...courseModules];
    const topic: Topic = {
      title: newTopic.title,
      description: newTopic.description,
      type: newTopic.type,
      duration: newTopic.duration,
      videoUrl: newTopic.videoUrl,
      isPreview: newTopic.isPreview,
      order: updatedModules[moduleIndex].topics.length
    };
    updatedModules[moduleIndex].topics.push(topic);
    setCourseModules(updatedModules);
    setNewTopic({
      title: '',
      description: '',
      type: 'video',
      duration: '10min',
      videoUrl: '',
      isPreview: false
    });
    setIsTopicDialogOpen(false);
  };

  // Delete topic
  const handleDeleteTopic = (moduleIndex: number, topicIndex: number) => {
    const updatedModules = [...courseModules];
    updatedModules[moduleIndex].topics.splice(topicIndex, 1);
    // Reorder
    updatedModules[moduleIndex].topics.forEach((t, i) => t.order = i);
    setCourseModules(updatedModules);
  };

  // Save modules to course
  const handleSaveModules = async () => {
    if (!editingCourse) return;

    try {
      const res = await fetch(`/api/lms/courses/${editingCourse._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleOperation: 'reorder',
          modules: courseModules
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Course modules saved successfully');
        setIsModuleDialogOpen(false);
        fetchCourses();
      } else {
        toast.error(data.error || 'Failed to save modules');
      }
    } catch (error) {
      console.error('Failed to save modules:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.courseId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || course.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(courses.map(c => c.category)));

  return (
    <LMSLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Courses Management</h1>
            <p className="text-gray-400 mt-2">Manage all courses and programs</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700">
                <Plus className="mr-2 h-4 w-4" />
                Add New Course
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Course</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Course ID *</Label>
                    <Input
                      placeholder="e.g., COURSE001"
                      value={newCourse.courseId}
                      onChange={(e) => setNewCourse({...newCourse, courseId: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div>
                    <Label>Category *</Label>
                    <Input
                      placeholder="e.g., IT, Business"
                      value={newCourse.category}
                      onChange={(e) => setNewCourse({...newCourse, category: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Course Title *</Label>
                  <Input
                    placeholder="Enter course title"
                    value={newCourse.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setNewCourse({
                        ...newCourse, 
                        title,
                        slug: generateSlug(title)
                      });
                    }}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                <div>
                  <Label>Slug (Auto-generated)</Label>
                  <Input
                    value={newCourse.slug}
                    onChange={(e) => setNewCourse({...newCourse, slug: e.target.value})}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Enter course description"
                    value={newCourse.description}
                    onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                    className="bg-gray-800 border-gray-700"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Duration</Label>
                    <Input
                      placeholder="e.g., 40 hours"
                      value={newCourse.duration}
                      onChange={(e) => setNewCourse({...newCourse, duration: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div>
                    <Label>Price (₹)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newCourse.price}
                      onChange={(e) => setNewCourse({...newCourse, price: Number(e.target.value)})}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateCourse}
                  className="bg-gradient-to-r from-orange-600 to-red-600"
                >
                  Create Course
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-100">Total Courses</p>
                  <p className="text-2xl font-bold text-white">{courses.length}</p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-100">Active Courses</p>
                  <p className="text-2xl font-bold text-white">
                    {courses.filter(c => c.isActive).length}
                  </p>
                </div>
                <Tag className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-100">Categories</p>
                  <p className="text-2xl font-bold text-white">{categories.length}</p>
                </div>
                <Users className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-600 to-red-600 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-100">Avg. Price</p>
                  <p className="text-2xl font-bold text-white">
                    ₹{courses.length > 0 ? Math.round(courses.reduce((sum, c) => sum + c.price, 0) / courses.length) : 0}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Courses Table */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">All Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Loading courses...</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                <p className="text-gray-400">No courses found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Course ID</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Title</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Category</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Duration</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Price</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((course) => (
                      <tr key={course._id} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-3 px-4 text-white font-mono text-sm">{course.courseId}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-white font-medium">{course.title}</p>
                            <p className="text-gray-400 text-sm">{course.slug}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-blue-400 border-blue-400">
                            {course.category}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {course.duration || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-white font-semibold">₹{course.price}</td>
                        <td className="py-3 px-4">
                          <Badge className={course.isActive ? 'bg-green-600' : 'bg-gray-600'}>
                            {course.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingCourse(course);
                                setIsEditDialogOpen(true);
                              }}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteCourse(course._id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-gray-900 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Course</DialogTitle>
            </DialogHeader>
            {editingCourse && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Course ID</Label>
                    <Input
                      value={editingCourse.courseId}
                      onChange={(e) => setEditingCourse({...editingCourse, courseId: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input
                      value={editingCourse.category}
                      onChange={(e) => setEditingCourse({...editingCourse, category: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Course Title</Label>
                  <Input
                    value={editingCourse.title}
                    onChange={(e) => setEditingCourse({...editingCourse, title: e.target.value})}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                <div>
                  <Label>Slug</Label>
                  <Input
                    value={editingCourse.slug}
                    onChange={(e) => setEditingCourse({...editingCourse, slug: e.target.value})}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={editingCourse.description}
                    onChange={(e) => setEditingCourse({...editingCourse, description: e.target.value})}
                    className="bg-gray-800 border-gray-700"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Duration</Label>
                    <Input
                      value={editingCourse.duration}
                      onChange={(e) => setEditingCourse({...editingCourse, duration: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <div>
                    <Label>Price (₹)</Label>
                    <Input
                      type="number"
                      value={editingCourse.price}
                      onChange={(e) => setEditingCourse({...editingCourse, price: Number(e.target.value)})}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingCourse.isActive}
                    onChange={(e) => setEditingCourse({...editingCourse, isActive: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <Label>Active</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    if (editingCourse) {
                      openModuleDialog(editingCourse);
                    }
                  }}
                  className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                >
                  <ListOrdered className="h-4 w-4 mr-2" />
                  Manage Modules
                </Button>
                <Button
                  onClick={handleUpdateCourse}
                  className="bg-gradient-to-r from-orange-600 to-red-600"
                >
                  Update Course
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Module Management Dialog */}
        <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
          <DialogContent className="bg-gray-900 text-white max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Manage Course Modules - {editingCourse?.title}</DialogTitle>
            </DialogHeader>

            <div className="flex-1 flex gap-4 overflow-hidden">
              {/* Modules List */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="bg-gray-800 p-4 rounded-lg mb-4">
                  <h4 className="text-white font-medium mb-3">Add New Module</h4>
                  <div className="space-y-3">
                    <Input
                      placeholder="Module Title"
                      value={newModule.title}
                      onChange={(e) => setNewModule({...newModule, title: e.target.value})}
                      className="bg-gray-700 border-gray-600"
                    />
                    <Textarea
                      placeholder="Module Description (optional)"
                      value={newModule.description}
                      onChange={(e) => setNewModule({...newModule, description: e.target.value})}
                      className="bg-gray-700 border-gray-600"
                      rows={2}
                    />
                    <Button onClick={handleAddModule} className="w-full bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Module
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-3">
                    {courseModules.map((module, moduleIndex) => (
                      <div key={moduleIndex} className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-600 text-white text-sm px-2 py-1 rounded">
                              Module {moduleIndex + 1}
                            </span>
                            <h4 className="text-white font-medium">{module.title}</h4>
                            <Badge variant="outline" className="text-gray-400">
                              {module.topics.length} topics
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedModuleIndex(moduleIndex);
                                setIsTopicDialogOpen(true);
                              }}
                              className="text-green-400 hover:text-green-300"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteModule(moduleIndex)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {module.description && (
                          <p className="text-gray-400 text-sm mb-3">{module.description}</p>
                        )}
                        {/* Topics in this module */}
                        <div className="space-y-2 ml-4">
                          {module.topics.map((topic, topicIndex) => (
                            <div key={topicIndex} className="flex items-center justify-between bg-gray-700/50 p-2 rounded">
                              <div className="flex items-center gap-2">
                                {topic.type === 'video' ? (
                                  <Video className="h-4 w-4 text-blue-400" />
                                ) : (
                                  <FileText className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="text-gray-300 text-sm">{topic.title}</span>
                                <span className="text-gray-500 text-xs">({topic.duration})</span>
                                {topic.isPreview && (
                                  <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Preview</Badge>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteTopic(moduleIndex, topicIndex)}
                                className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          {module.topics.length === 0 && (
                            <p className="text-gray-500 text-sm italic">No topics yet. Click + to add.</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {courseModules.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <ListOrdered className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No modules yet. Add your first module above.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModuleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveModules} className="bg-blue-600 hover:bg-blue-700">
                Save Modules
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Topic Dialog */}
        <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
          <DialogContent className="bg-gray-900 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>
                Add Topic to {courseModules[selectedModuleIndex || 0]?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Topic Title *</Label>
                <Input
                  value={newTopic.title}
                  onChange={(e) => setNewTopic({...newTopic, title: e.target.value})}
                  className="bg-gray-800 border-gray-700"
                  placeholder="e.g., Introduction to the Topic"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newTopic.description}
                  onChange={(e) => setNewTopic({...newTopic, description: e.target.value})}
                  className="bg-gray-800 border-gray-700"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={newTopic.type} onValueChange={(v) => setNewTopic({...newTopic, type: v})}>
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="text">Text/Reading</SelectItem>
                      <SelectItem value="quiz">Quiz</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration</Label>
                  <Input
                    value={newTopic.duration}
                    onChange={(e) => setNewTopic({...newTopic, duration: e.target.value})}
                    className="bg-gray-800 border-gray-700"
                    placeholder="e.g., 10min"
                  />
                </div>
              </div>
              <div>
                <Label>Video URL</Label>
                <Input
                  value={newTopic.videoUrl}
                  onChange={(e) => setNewTopic({...newTopic, videoUrl: e.target.value})}
                  className="bg-gray-800 border-gray-700"
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newTopic.isPreview}
                  onChange={(e) => setNewTopic({...newTopic, isPreview: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label>Free Preview (available without enrollment)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTopicDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => selectedModuleIndex !== null && handleAddTopic(selectedModuleIndex)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Topic
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LMSLayout>
  );
};

export default CoursesManagement;
