import React, { useEffect, useState } from 'react';

import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  User,
  Users, 
  Plus, 
  Star, 
  Mail,
  Phone,
  Calendar,
  Award,
  Edit,
  Trash2,
  ExternalLink,
  Briefcase,
  Eye,
  EyeOff,
  Key,
  RefreshCw
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface Trainer {
  _id: string;
  trainerId: string;
  name: string;
  email: string;
  phone: string;
  profile: string;
  experience: string;
  expertise: string[];
  rating: number;
  bio: string;
  linkedIn: string;
  github: string;
  portfolio: string;
  assignedBatches: string[];
  totalStudents: number;
  isActive: boolean;
  joinedAt: string;
  salary: number;
  paymentMode: string;
}

interface NewTrainerForm {
  name: string;
  email: string;
  phone: string;
  experience: string;
  expertise: string[];
  bio: string;
  linkedIn: string;
  github: string;
  portfolio: string;
  salary: number;
  paymentMode: string;
  loginPassword: string;
}

const TrainersManagement = () => {
  
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [editTrainer, setEditTrainer] = useState<any>(null);
  
  const [newTrainer, setNewTrainer] = useState<NewTrainerForm>({
    name: '',
    email: '',
    phone: '',
    experience: '',
    expertise: [],
    bio: '',
    linkedIn: '',
    github: '',
    portfolio: '',
    salary: 0,
    paymentMode: 'Monthly',
    loginPassword: ''
  });

  const [emailCheckStatus, setEmailCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [showPassword, setShowPassword] = useState(false);

  // Removed email/loginId availability checks - validation happens on submit
  
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setNewTrainer(prev => ({ ...prev, loginPassword: newPassword }));
    toast.success('Password generated!');
  };

  const handleGenerateEditPassword = () => {
    const newPassword = generatePassword();
    setEditTrainer((prev: any) => ({ ...prev, loginPassword: newPassword }));
    toast.success('Password generated!');
  };

  const handleEditClick = async (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    
    // Fetch the login ID from TrainerAuth
    try {
      const res = await fetch(`/api/lms/trainers/get-login-id?email=${encodeURIComponent(trainer.email)}`);
      const data = await res.json();
      
      setEditTrainer({
        _id: trainer._id,
        name: trainer.name,
        email: trainer.email,
        phone: trainer.phone,
        experience: trainer.experience,
        expertise: trainer.expertise,
        bio: trainer.bio,
        linkedIn: trainer.linkedIn,
        github: trainer.github,
        portfolio: trainer.portfolio,
        salary: trainer.salary,
        paymentMode: trainer.paymentMode,
        loginPassword: '' // Don't show existing password
      });
    } catch (error) {
      console.error('Failed to fetch login ID:', error);
      setEditTrainer({
        _id: trainer._id,
        name: trainer.name,
        email: trainer.email,
        phone: trainer.phone,
        experience: trainer.experience,
        expertise: trainer.expertise,
        bio: trainer.bio,
        linkedIn: trainer.linkedIn,
        github: trainer.github,
        portfolio: trainer.portfolio,
        salary: trainer.salary,
        paymentMode: trainer.paymentMode,
        loginPassword: ''
      });
    }
    
    setIsEditDialogOpen(true);
  };

  const handleUpdateTrainer = async () => {
    if (!editTrainer || !selectedTrainer) return;

    // Validate required fields
    if (!editTrainer.name || !editTrainer.email || !editTrainer.phone || !editTrainer.experience) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editTrainer.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      const res = await fetch(`/api/lms/trainers/${selectedTrainer._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editTrainer)
      });

      const responseData = await res.json();

      if (res.ok) {
        toast.success('Trainer updated successfully!');
        setIsEditDialogOpen(false);
        setSelectedTrainer(null);
        setEditTrainer(null);
        fetchTrainers();
      } else {
        toast.error(responseData.error || 'Failed to update trainer');
      }
    } catch (error: any) {
      console.error('Failed to update trainer:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const handleDeleteClick = (trainer: Trainer) => {
    setSelectedTrainer(trainer);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteTrainer = async () => {
    if (!selectedTrainer) return;

    try {
      const res = await fetch(`/api/lms/trainers/${selectedTrainer._id}`, {
        method: 'DELETE'
      });

      const responseData = await res.json();

      if (res.ok) {
        toast.success('Trainer deleted successfully!');
        setIsDeleteDialogOpen(false);
        setSelectedTrainer(null);
        fetchTrainers();
      } else {
        toast.error(responseData.error || 'Failed to delete trainer');
      }
    } catch (error: any) {
      console.error('Failed to delete trainer:', error);
      toast.error('Network error. Please try again.');
    }
  };

  // Simplified handlers - no real-time availability checks
  const handleEmailChange = (email: string) => {
    setNewTrainer(prev => ({ ...prev, email }));
  };

  const fetchTrainers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/lms/trainers');
      const data = await res.json();
      
      if (res.ok) {
        setTrainers(Array.isArray(data) ? data : []);
      } else {
        throw new Error(data.message || 'Failed to fetch trainers');
      }
    } catch (error) {
      console.error('Failed to fetch trainers:', error);
      toast.error('Failed to fetch trainers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTrainer = async () => {
    // Validate required fields
    if (!newTrainer.name || !newTrainer.email || !newTrainer.phone || !newTrainer.experience || !newTrainer.loginPassword) {
      toast.error('Please fill in all required fields including Password');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newTrainer.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Validate password length
    if (newTrainer.loginPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      const res = await fetch('/api/lms/trainers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTrainer)
      });

      const responseData = await res.json();

      if (res.ok) {
        toast.success(`Trainer added successfully! Trainer ID: ${responseData.trainer.trainerId}`);
        setIsCreateDialogOpen(false);
        fetchTrainers();
        // Reset form
        setNewTrainer({
          name: '',
          email: '',
          phone: '',
          experience: '',
          expertise: [],
          bio: '',
          linkedIn: '',
          github: '',
          portfolio: '',
          salary: 0,
          paymentMode: 'Monthly',
          loginPassword: ''
        });
        setEmailCheckStatus('idle');
      } else {
        // Handle specific error cases
        if (responseData.error && responseData.error.includes('email already exists')) {
          toast.error('This email is already registered. Please use a different email address.');
        } else if (responseData.error && responseData.error.includes('trainerId already exists')) {
          toast.error('Trainer ID conflict. Please try again.');
        } else if (responseData.error && responseData.error.includes('Login ID already exists')) {
          toast.error('This Login ID is already taken. Please choose a different one.');
        } else {
          toast.error(responseData.error || responseData.message || 'Failed to create trainer');
        }
      }
    } catch (error: any) {
      console.error('Failed to create trainer:', error);
      toast.error('Network error. Please check your connection and try again.');
    }
  };

  const addExpertise = (skill: string) => {
    if (skill && !newTrainer.expertise.includes(skill)) {
      setNewTrainer(prev => ({
        ...prev,
        expertise: [...prev.expertise, skill]
      }));
    }
  };

  const removeExpertise = (skill: string) => {
    setNewTrainer(prev => ({
      ...prev,
      expertise: prev.expertise.filter(s => s !== skill)
    }));
  };

  const stats = {
    totalTrainers: trainers.length,
    activeTrainers: trainers.filter(t => t.isActive).length,
    totalStudents: trainers.reduce((sum, t) => sum + t.totalStudents, 0),
    avgRating: trainers.length > 0 ? 
      (trainers.reduce((sum, t) => sum + t.rating, 0) / trainers.length).toFixed(1) : '0'
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  return (
    <LMSLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Trainers Management</h1>
            <p className="text-gray-400 mt-2">Manage trainer profiles and assignments</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="manual" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Trainer
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Trainer</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Login Credentials Section */}
                <div className="bg-gradient-to-r from-green-900/30 to-teal-900/30 border border-green-700/50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="h-5 w-5 text-green-400" />
                    <h3 className="text-white font-semibold">Login Credentials</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label className="text-white">Auto-Generated Trainer ID</Label>
                      <Input
                        value="Will be auto-generated (e.g., TRN0001)"
                        readOnly
                        className="bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed"
                      />
                      <p className="text-gray-400 text-xs mt-1">Trainer ID will be automatically generated for login</p>
                    </div>

                    <div>
                      <Label className="text-white">Password *</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={newTrainer.loginPassword}
                            onChange={(e) => setNewTrainer(prev => ({ ...prev, loginPassword: e.target.value }))}
                            className="bg-gray-700 border-gray-600 text-white pr-10"
                            placeholder="Enter password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleGeneratePassword}
                          className="px-3"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-gray-400 text-xs mt-1">Min 6 characters. Click refresh to auto-generate.</p>
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Full Name</Label>
                    <Input
                      value={newTrainer.name}
                      onChange={(e) => setNewTrainer(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Enter trainer name"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-white">Email</Label>
                    <div className="relative">
                      <Input
                        type="email"
                        value={newTrainer.email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white pr-10"
                        placeholder="trainer@example.com"
                      />
                      {emailCheckStatus === 'checking' && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                      )}
                      {emailCheckStatus === 'available' && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                          ✓
                        </div>
                      )}
                      {emailCheckStatus === 'taken' && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
                          ✗
                        </div>
                      )}
                    </div>
                    {emailCheckStatus === 'taken' && (
                      <p className="text-red-400 text-xs mt-1">This email is already registered</p>
                    )}
                    {emailCheckStatus === 'available' && (
                      <p className="text-green-400 text-xs mt-1">Email is available</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Phone</Label>
                    <Input
                      value={newTrainer.phone}
                      onChange={(e) => setNewTrainer(prev => ({ ...prev, phone: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="+91 9876543210"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-white">Experience</Label>
                    <Input
                      value={newTrainer.experience}
                      onChange={(e) => setNewTrainer(prev => ({ ...prev, experience: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="e.g., 5+ years"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-white">Bio</Label>
                  <Textarea
                    value={newTrainer.bio}
                    onChange={(e) => setNewTrainer(prev => ({ ...prev, bio: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Brief description about the trainer"
                    rows={3}
                  />
                </div>

                <div>
                  <Label className="text-white">Expertise/Skills</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add a skill and press Enter"
                      className="bg-gray-700 border-gray-600 text-white"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addExpertise(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newTrainer.expertise.map((skill, index) => (
                      <Badge 
                        key={index} 
                        className="bg-blue-600 cursor-pointer"
                        onClick={() => removeExpertise(skill)}
                      >
                        {skill} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">LinkedIn</Label>
                    <Input
                      value={newTrainer.linkedIn}
                      onChange={(e) => setNewTrainer(prev => ({ ...prev, linkedIn: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="LinkedIn profile URL"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-white">GitHub</Label>
                    <Input
                      value={newTrainer.github}
                      onChange={(e) => setNewTrainer(prev => ({ ...prev, github: e.target.value }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="GitHub profile URL"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Salary</Label>
                    <Input
                      type="number"
                      value={newTrainer.salary}
                      onChange={(e) => setNewTrainer(prev => ({ ...prev, salary: parseInt(e.target.value) || 0 }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Monthly salary"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-white">Payment Mode</Label>
                    <Select 
                      value={newTrainer.paymentMode} 
                      onValueChange={(value) => setNewTrainer(prev => ({ ...prev, paymentMode: value }))}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Per Batch">Per Batch</SelectItem>
                        <SelectItem value="Per Student">Per Student</SelectItem>
                        <SelectItem value="Hourly">Hourly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="manual" 
                  onClick={handleCreateTrainer}
                  disabled={!newTrainer.name || !newTrainer.email || !newTrainer.loginPassword}
                >
                  Add Trainer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Trainers</p>
                  <p className="text-2xl font-bold text-white">{stats.totalTrainers}</p>
                </div>
                <User className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Trainers</p>
                  <p className="text-2xl font-bold text-white">{stats.activeTrainers}</p>
                </div>
                <Users className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Students Taught</p>
                  <p className="text-2xl font-bold text-white">{stats.totalStudents}</p>
                </div>
                <Award className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Average Rating</p>
                  <p className="text-2xl font-bold text-white">{stats.avgRating}</p>
                </div>
                <Star className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trainers Grid */}
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Loading trainers...</p>
          </div>
        ) : trainers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No trainers added yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainers.map((trainer) => (
              <Card key={trainer._id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={trainer.profile} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg">
                        {trainer.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg">{trainer.name}</CardTitle>
                      <p className="text-gray-400 text-sm">{trainer.trainerId}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-white text-sm">{trainer.rating}</span>
                      </div>
                    </div>
                    <Badge className={trainer.isActive ? 'bg-green-600' : 'bg-gray-600'}>
                      {trainer.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Experience & Contact */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Experience</p>
                      <p className="text-white font-medium">{trainer.experience}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Students</p>
                      <p className="text-white font-medium">{trainer.totalStudents}</p>
                    </div>
                  </div>

                  {/* Expertise */}
                  <div>
                    <p className="text-gray-400 text-sm mb-2">Expertise</p>
                    <div className="flex flex-wrap gap-1">
                      {trainer.expertise.slice(0, 3).map((skill, index) => (
                        <Badge key={index} className="bg-blue-600 text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {trainer.expertise.length > 3 && (
                        <Badge className="bg-gray-600 text-xs">
                          +{trainer.expertise.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {trainer.bio && (
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Bio</p>
                      <p className="text-gray-300 text-sm line-clamp-2">{trainer.bio}</p>
                    </div>
                  )}

                  {/* Contact & Links */}
                  <div className="flex gap-2 text-sm">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Mail className="h-3 w-3 mr-1" />
                      Email
                    </Button>
                    {trainer.linkedIn && (
                      <Button size="sm" variant="outline" className="px-2">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="manual" 
                      className="flex-1"
                      onClick={() => handleEditClick(trainer)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 hover:bg-red-600 hover:text-white hover:border-red-600"
                      onClick={() => handleDeleteClick(trainer)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Trainer</DialogTitle>
          </DialogHeader>
          
          {editTrainer && (
            <div className="space-y-4">
              {/* Login Credentials Section */}
              <div className="bg-gradient-to-r from-green-900/30 to-teal-900/30 border border-green-700/50 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="h-5 w-5 text-green-400" />
                  <h3 className="text-white font-semibold">Login Credentials</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label className="text-white">Trainer ID (Auto-generated)</Label>
                    <Input
                      value={selectedTrainer?.trainerId || 'Auto-generated'}
                      disabled
                      className="bg-gray-600 border-gray-500 text-gray-300 cursor-not-allowed"
                    />
                    <p className="text-gray-400 text-xs mt-1">Trainer ID is auto-generated and cannot be changed</p>
                  </div>

                  <div>
                    <Label className="text-white">Update Password (Optional)</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={editTrainer.loginPassword || ''}
                          onChange={(e) => setEditTrainer((prev: any) => ({ ...prev, loginPassword: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white pr-10"
                          placeholder="Leave empty to keep current"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateEditPassword}
                        className="px-3"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-gray-400 text-xs mt-1">Leave empty to keep current password</p>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Full Name</Label>
                  <Input
                    value={editTrainer.name}
                    onChange={(e) => setEditTrainer((prev: any) => ({ ...prev, name: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Enter trainer name"
                  />
                </div>
                
                <div>
                  <Label className="text-white">Email</Label>
                  <Input
                    type="email"
                    value={editTrainer.email}
                    onChange={(e) => setEditTrainer((prev: any) => ({ ...prev, email: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="trainer@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Phone</Label>
                  <Input
                    value={editTrainer.phone}
                    onChange={(e) => setEditTrainer((prev: any) => ({ ...prev, phone: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="+91 9876543210"
                  />
                </div>
                
                <div>
                  <Label className="text-white">Experience</Label>
                  <Input
                    value={editTrainer.experience}
                    onChange={(e) => setEditTrainer((prev: any) => ({ ...prev, experience: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="e.g., 5+ years"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white">Bio</Label>
                <Textarea
                  value={editTrainer.bio}
                  onChange={(e) => setEditTrainer((prev: any) => ({ ...prev, bio: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Brief description about the trainer"
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-white">Expertise/Skills</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Add a skill and press Enter"
                    className="bg-gray-700 border-gray-600 text-white"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const skill = e.currentTarget.value;
                        if (skill && !editTrainer.expertise.includes(skill)) {
                          setEditTrainer((prev: any) => ({
                            ...prev,
                            expertise: [...prev.expertise, skill]
                          }));
                        }
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {editTrainer.expertise.map((skill: string, index: number) => (
                    <Badge 
                      key={index} 
                      className="bg-blue-600 cursor-pointer"
                      onClick={() => {
                        setEditTrainer((prev: any) => ({
                          ...prev,
                          expertise: prev.expertise.filter((s: string) => s !== skill)
                        }));
                      }}
                    >
                      {skill} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">LinkedIn</Label>
                  <Input
                    value={editTrainer.linkedIn}
                    onChange={(e) => setEditTrainer((prev: any) => ({ ...prev, linkedIn: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="LinkedIn profile URL"
                  />
                </div>
                
                <div>
                  <Label className="text-white">GitHub</Label>
                  <Input
                    value={editTrainer.github}
                    onChange={(e) => setEditTrainer((prev: any) => ({ ...prev, github: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="GitHub profile URL"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Salary</Label>
                  <Input
                    type="number"
                    value={editTrainer.salary}
                    onChange={(e) => setEditTrainer((prev: any) => ({ ...prev, salary: parseInt(e.target.value) || 0 }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Monthly salary"
                  />
                </div>
                
                <div>
                  <Label className="text-white">Payment Mode</Label>
                  <Select 
                    value={editTrainer.paymentMode} 
                    onValueChange={(value) => setEditTrainer((prev: any) => ({ ...prev, paymentMode: value }))}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Per Batch">Per Batch</SelectItem>
                      <SelectItem value="Per Student">Per Student</SelectItem>
                      <SelectItem value="Hourly">Hourly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedTrainer(null);
                setEditTrainer(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="manual" 
              onClick={handleUpdateTrainer}
            >
              Update Trainer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Trainer</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete <span className="text-white font-semibold">{selectedTrainer?.name}</span>?
              <br />
              This will permanently delete the trainer and their login credentials.
              <br />
              <span className="text-red-400 font-semibold">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedTrainer(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteTrainer}
            >
              Delete Trainer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LMSLayout>
  );
};

export default TrainersManagement;












