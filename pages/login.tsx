import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Lock, LogIn, BookOpen, Users, Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const RoleBasedLogin = () => {
  const [selectedRole, setSelectedRole] = useState<'student' | 'trainer' | 'admin' | null>(null);
  const [credentials, setCredentials] = useState({
    loginId: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const roles = [
    {
      id: 'student',
      title: 'Student',
      description: 'Access courses, assignments & recordings',
      icon: BookOpen,
      color: 'blue',
      bgGradient: 'from-blue-600 to-blue-700',
      borderColor: 'border-blue-600',
      hoverColor: 'hover:bg-blue-50',
      textColor: 'text-blue-900'
    },
    {
      id: 'trainer',
      title: 'Trainer',
      description: 'Manage classes, students & content',
      icon: Users,
      color: 'green',
      bgGradient: 'from-green-600 to-green-700',
      borderColor: 'border-green-600',
      hoverColor: 'hover:bg-green-50',
      textColor: 'text-green-900'
    },
    {
      id: 'admin',
      title: 'LMS Admin',
      description: 'Full system administration',
      icon: Shield,
      color: 'purple',
      bgGradient: 'from-purple-600 to-purple-700',
      borderColor: 'border-purple-600',
      hoverColor: 'hover:bg-purple-50',
      textColor: 'text-purple-900'
    }
  ];

  const currentRole = roles.find(role => role.id === selectedRole);

  const handleRoleSelect = (role: 'student' | 'trainer' | 'admin') => {
    setSelectedRole(role);
    setCredentials({ loginId: '', password: '' });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.loginId || !credentials.password) {
      toast.error('Please enter both ID/Email and password');
      return;
    }

    setIsLoading(true);
    try {
      let apiEndpoint = '';
      let requestBody = {};

      // Route to appropriate API based on selected role
      switch (selectedRole) {
        case 'student':
          apiEndpoint = '/api/auth/student-login';
          requestBody = {
            studentId: credentials.loginId,
            password: credentials.password
          };
          break;
        case 'trainer':
          apiEndpoint = '/api/auth/trainer-login';
          requestBody = {
            loginId: credentials.loginId,
            password: credentials.password
          };
          break;
        case 'admin':
          apiEndpoint = '/api/auth/login'; // Use unified auth for admin
          requestBody = {
            loginId: credentials.loginId,
            password: credentials.password
          };
          break;
        default:
          throw new Error('Please select a role first');
      }

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();

      if (res.ok) {
        // Store user data in localStorage based on role
        if (selectedRole === 'student' && data.student) {
          localStorage.setItem('student', JSON.stringify(data.student));
          localStorage.setItem('userSession', JSON.stringify({
            role: 'student',
            userId: data.student._id,
            name: data.student.name,
            email: data.student.email,
            loginTime: new Date().toISOString()
          }));
          toast.success(`Welcome ${data.student.name}!`);
          setTimeout(() => router.push('/student/dashboard'), 1000);
        } else if (selectedRole === 'trainer' && data.trainer) {
          localStorage.setItem('trainer', JSON.stringify(data.trainer));
          localStorage.setItem('userSession', JSON.stringify({
            role: 'trainer',
            userId: data.trainer._id,
            name: data.trainer.name,
            email: data.trainer.email,
            loginTime: new Date().toISOString()
          }));
          toast.success(`Welcome ${data.trainer.name}!`);
          setTimeout(() => router.push('/trainer/dashboard'), 1000);
        } else if (selectedRole === 'admin' && data.role === 'admin') {
          localStorage.setItem('admin', JSON.stringify(data.user));
          localStorage.setItem('userSession', JSON.stringify({
            role: 'admin',
            userId: data.user._id,
            name: data.user.name,
            email: data.user.email,
            loginTime: new Date().toISOString()
          }));
          toast.success(`Welcome ${data.user.name}!`);
          setTimeout(() => router.push('/lms'), 1000);
        } else {
          throw new Error('Invalid role or authentication response');
        }
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedRole) {
    // Role Selection Screen
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-full">
                <BookOpen className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">TechPratham LMS</h1>
            <p className="text-gray-400 text-lg">Choose your role to continue</p>
          </div>

          {/* Role Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <Card 
                  key={role.id}
                  className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-200 cursor-pointer transform hover:scale-105"
                  onClick={() => handleRoleSelect(role.id as 'student' | 'trainer' | 'admin')}
                >
                  <CardContent className="p-8 text-center">
                    <div className={`bg-gradient-to-r ${role.bgGradient} p-4 rounded-full inline-block mb-4`}>
                      <Icon className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">{role.title}</h3>
                    <p className="text-gray-400 text-sm mb-6">{role.description}</p>
                    <Button className={`w-full bg-gradient-to-r ${role.bgGradient} hover:opacity-90`}>
                      Continue as {role.title}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Setup Links */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-gray-400 text-sm">Need admin access?</p>
            <Button 
              variant="outline" 
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={() => router.push('/setup-admin')}
            >
              Setup Admin User
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Login Form Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className={`bg-gradient-to-r ${currentRole?.bgGradient} p-4 rounded-full`}>
              {currentRole && <currentRole.icon className="h-10 w-10 text-white" />}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{currentRole?.title} Portal</h1>
          <p className="text-gray-400">{currentRole?.description}</p>
        </div>

        {/* Login Form */}
        <Card className="bg-gray-800 border-gray-700 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white text-center flex items-center justify-center gap-2">
              <LogIn className="h-5 w-5" />
              Sign In as {currentRole?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label className="text-white">
                  {selectedRole === 'student' ? 'Student ID or Email' : 
                   selectedRole === 'trainer' ? 'Trainer ID or Email' : 
                   'Admin ID or Email'}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={credentials.loginId}
                    onChange={(e) => setCredentials(prev => ({ ...prev, loginId: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white pl-10 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={
                      selectedRole === 'student' ? 'Enter Student ID (STU001) or email' :
                      selectedRole === 'trainer' ? 'Enter Trainer ID (TRN001) or email' :
                      'Enter Admin ID (ADMIN001) or email'
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <Label className="text-white">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white pl-10 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className={`w-full bg-gradient-to-r ${currentRole?.bgGradient} hover:opacity-90 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200`}
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : `Sign In as ${currentRole?.title}`}
              </Button>
            </form>

            {/* Back to Role Selection */}
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => setSelectedRole(null)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Choose Different Role
              </Button>
            </div>

            {/* Authentication Info */}
            <div className="mt-6 p-3 bg-gray-700/50 rounded-lg">
              <p className="text-gray-300 text-sm text-center">
                <strong>Authentication:</strong> 
                {selectedRole === 'student' && ' Students Table'}
                {selectedRole === 'trainer' && ' Trainers Table'}
                {selectedRole === 'admin' && ' Unified Users Table (Admin Role)'}
              </p>
            </div>

            {/* Help Text */}
            <div className="mt-4 text-center">
              <p className="text-gray-400 text-xs">
                Don't have an account? Contact your administrator
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoleBasedLogin;