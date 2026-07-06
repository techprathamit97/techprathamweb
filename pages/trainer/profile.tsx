import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TrainerLayout from '@/src/trainer/common/TrainerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Calendar, 
  Star, 
  TrendingUp, 
  Users, 
  BookOpen, 
  DollarSign, 
  Award, 
  ExternalLink,
  CheckCircle,
  Clock,
  Target
} from 'lucide-react';
import { toast } from 'sonner';

interface TrainerProfileData {
  trainer: {
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
    salary: number;
    paymentMode: string;
    isActive: boolean;
    joinedAt: string;
    totalStudents: number;
  };
  stats: {
    totalBatches: number;
    activeBatches: number;
    upcomingBatches: number;
    completedBatches: number;
    totalStudents: number;
    completedStudents: number;
    inProgressStudents: number;
    totalRevenue: number;
    collectedRevenue: number;
    pendingRevenue: number;
    avgProgress: number;
    completionRate: number;
    collectionRate: number;
    recentEnrollments: number;
    recentCompletions: number;
  };
  performance: {
    courseCategories: string[];
    courseTitles: string[];
    batchPerformance: Array<{
      batchId: string;
      course_title: string;
      status: string;
      totalStudents: number;
      enrolledStudents: number;
      completedStudents: number;
      avgProgress: number;
      schedule: any;
      meetingLink: string;
    }>;
  };
  batches: any[];
}

const TrainerProfile = () => {
  const router = useRouter();
  const [trainerData, setTrainerData] = useState<any>(null);
  const [profileData, setProfileData] = useState<TrainerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedData = localStorage.getItem('trainer');
    if (!storedData) {
      router.push('/trainer/login');
      return;
    }
    
    const trainer = JSON.parse(storedData);
    setTrainerData(trainer);
    fetchProfileData(trainer.trainerId);
  }, []);

  const fetchProfileData = async (trainerId: string) => {
    setIsLoading(true);
    try {
      console.log('Fetching profile for trainer:', trainerId);
      const res = await fetch(`/api/trainer/profile?trainerId=${trainerId}`);
      const data = await res.json();

      console.log('Profile API response:', data);

      if (res.ok) {
        setProfileData(data.data);
      } else {
        console.error('Profile API error:', data);
        toast.error(data.error || 'Failed to fetch profile data');
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      toast.error('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !trainerData || !profileData) {
    return (
      <TrainerLayout>
        <div className="p-6 flex items-center justify-center">
          <div className="text-gray-900">Loading profile...</div>
        </div>
      </TrainerLayout>
    );
  }

  return (
    <TrainerLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-green-100 mt-2">Complete overview of your teaching journey</p>
        </div>

        {/* Stats Cards - Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Batches</p>
                  <p className="text-3xl font-bold text-gray-900">{profileData.stats.totalBatches}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Students</p>
                  <p className="text-3xl font-bold text-gray-900">{profileData.stats.totalStudents}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Completion Rate</p>
                  <p className="text-3xl font-bold text-gray-900">{profileData.stats.completionRate}%</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Rating</p>
                  <p className="text-3xl font-bold text-gray-900">{profileData.trainer.rating}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards - Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{profileData.stats.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">From all courses</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Collection Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{profileData.stats.collectionRate}%</p>
                  <p className="text-xs text-gray-500 mt-1">Payment collection</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Avg Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{profileData.stats.avgProgress}%</p>
                  <p className="text-xs text-gray-500 mt-1">Student progress</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Personal Information and Professional Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-green-600" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700">Trainer ID</Label>
                  <Input value={profileData.trainer.trainerId} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label className="text-gray-700">Full Name</Label>
                  <Input value={profileData.trainer.name} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label className="text-gray-700">Email Address</Label>
                  <Input value={profileData.trainer.email} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label className="text-gray-700">Phone Number</Label>
                  <Input value={profileData.trainer.phone} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label className="text-gray-700">Experience</Label>
                  <Input value={profileData.trainer.experience} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label className="text-gray-700">Rating</Label>
                  <div className="flex items-center gap-2">
                    <Input value={`${profileData.trainer.rating} / 5.0`} disabled className="bg-gray-50" />
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-4 w-4 ${star <= profileData.trainer.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Details */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Professional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700">Salary</Label>
                  <Input value={`₹${profileData.trainer.salary.toLocaleString()}`} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label className="text-gray-700">Payment Mode</Label>
                  <Input value={profileData.trainer.paymentMode} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label className="text-gray-700">Status</Label>
                  <div className="flex items-center gap-2">
                    <Badge className={profileData.trainer.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>
                      {profileData.trainer.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-700">Joined Date</Label>
                  <Input 
                    value={new Date(profileData.trainer.joinedAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} 
                    disabled 
                    className="bg-gray-50" 
                  />
                </div>
                <div>
                  <Label className="text-gray-700">Expertise</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profileData.trainer.expertise.map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-sm">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bio and Links */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              Bio & Social Links
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {profileData.trainer.bio && (
                <div>
                  <Label className="text-gray-700">Bio</Label>
                  <div className="bg-gray-50 p-3 rounded-md text-gray-900">
                    {profileData.trainer.bio}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {profileData.trainer.linkedIn && (
                  <div>
                    <Label className="text-gray-700">LinkedIn</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => window.open(profileData.trainer.linkedIn, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                  </div>
                )}
                
                {profileData.trainer.github && (
                  <div>
                    <Label className="text-gray-700">GitHub</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => window.open(profileData.trainer.github, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                  </div>
                )}
                
                {profileData.trainer.portfolio && (
                  <div>
                    <Label className="text-gray-700">Portfolio</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => window.open(profileData.trainer.portfolio, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Portfolio
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Overview */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Course Categories</h3>
                <div className="space-y-2">
                  {profileData.performance.courseCategories.map((category, index) => (
                    <Badge key={index} variant="outline" className="mr-2 mb-2">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Recent Activity (30 days)</h3>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>{profileData.stats.recentEnrollments} new enrollments</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>{profileData.stats.recentCompletions} completions</span>
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Batch Status</h3>
                <div className="space-y-2 text-sm">
                  <p className="flex justify-between">
                    <span>Active:</span>
                    <Badge className="bg-green-100 text-green-700 border-green-200">
                      {profileData.stats.activeBatches}
                    </Badge>
                  </p>
                  <p className="flex justify-between">
                    <span>Upcoming:</span>
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      {profileData.stats.upcomingBatches}
                    </Badge>
                  </p>
                  <p className="flex justify-between">
                    <span>Completed:</span>
                    <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                      {profileData.stats.completedBatches}
                    </Badge>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Batch Performance */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Batch Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {profileData.performance.batchPerformance.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No batch performance data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left text-gray-600 font-medium p-3">Batch</th>
                      <th className="text-left text-gray-600 font-medium p-3">Course</th>
                      <th className="text-left text-gray-600 font-medium p-3">Status</th>
                      <th className="text-left text-gray-600 font-medium p-3">Students</th>
                      <th className="text-left text-gray-600 font-medium p-3">Completed</th>
                      <th className="text-left text-gray-600 font-medium p-3">Avg Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profileData.performance.batchPerformance.map((batch) => (
                      <tr key={batch.batchId} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="p-3 text-gray-900 font-medium">{batch.batchId}</td>
                        <td className="p-3 text-gray-900">{batch.course_title}</td>
                        <td className="p-3">
                          <Badge className={
                            batch.status === 'ongoing' ? 'bg-green-100 text-green-700 border-green-200' :
                            batch.status === 'upcoming' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                          }>
                            {batch.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-gray-900">{batch.enrolledStudents}/{batch.totalStudents}</td>
                        <td className="p-3 text-gray-900">{batch.completedStudents}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${batch.avgProgress}%` }}
                              />
                            </div>
                            <span className="text-sm">{batch.avgProgress}%</span>
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
      </div>
    </TrainerLayout>
  );
};

export default TrainerProfile;
