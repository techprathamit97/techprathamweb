import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Lock, LogIn, BookOpen, Users, Shield, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const RoleBasedLogin = () => {
  const [selectedRole, setSelectedRole] = useState<'student' | 'trainer' | 'admin' | null>(null);
  const [credentials, setCredentials] = useState({
    loginId: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<{
    type: 'invalid-credentials' | 'wrong-password' | 'not-found' | 'deactivated' | 'restricted' | 'not-enrolled' | 'server' | null;
    message: string;
    suggestion?: string;
  }>({ type: null, message: '' });
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
    setLoginError({ type: null, message: '' });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError({ type: null, message: '' });

    if (!credentials.loginId || !credentials.password) {
      setLoginError({ type: 'invalid-credentials', message: 'Please enter both your ID/Email and password.' });
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
          apiEndpoint = '/api/auth/login';
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
        setLoginError({ type: null, message: '' });
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
        // Map API error codes to structured inline errors
        if (data.isRestricted) {
          setLoginError({
            type: 'restricted',
            message: data.error || 'Your account has been restricted.',
            suggestion: 'Please contact your administrator to resolve this.'
          });
        } else if (data.notEnrolled) {
          setLoginError({
            type: 'not-enrolled',
            message: 'You are not enrolled in any batch yet.',
            suggestion: 'Contact your administrator to get enrolled in a batch before logging in.'
          });
        } else if (res.status === 401) {
          // Could be wrong password or user not found — API returns same message for security
          setLoginError({
            type: 'invalid-credentials',
            message: 'Invalid ID/Email or password.',
            suggestion: selectedRole === 'student'
              ? 'Make sure you\'re using your Student ID (e.g. STU001) or registered email, and the correct password. Contact admin if you forgot your password.'
              : selectedRole === 'trainer'
              ? 'Make sure you\'re using your Trainer ID (e.g. TRN001) or registered email, and the correct password. Contact admin if you forgot your password.'
              : 'Make sure you\'re using your Admin ID or registered email and the correct password.'
          });
        } else if (res.status === 403) {
          setLoginError({
            type: 'deactivated',
            message: data.error || 'Access denied.',
            suggestion: 'Contact your administrator to reactivate your account.'
          });
        } else if (res.status === 500) {
          setLoginError({
            type: 'server',
            message: 'A server error occurred. Please try again in a moment.',
            suggestion: 'If the problem persists, contact support at support@techpratham.com.'
          });
        } else {
          setLoginError({
            type: 'invalid-credentials',
            message: data.error || 'Login failed.',
            suggestion: 'Please check your credentials and try again.'
          });
        }

        // Also show toast for immediate visibility
        toast.error(loginError.message || data.error || 'Login failed');
        setIsLoading(false);
        return;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError({
        type: 'server',
        message: error.message || 'An unexpected error occurred.',
        suggestion: 'Please check your connection and try again.'
      });
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
                    onChange={(e) => {
                      setCredentials(prev => ({ ...prev, loginId: e.target.value }));
                      setLoginError({ type: null, message: '' });
                    }}
                    className={`bg-gray-700 border-gray-600 text-white pl-10 focus:ring-blue-500 focus:border-blue-500 ${loginError.type ? 'border-red-500' : ''}`}
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
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.password}
                    onChange={(e) => {
                      setCredentials(prev => ({ ...prev, password: e.target.value }));
                      setLoginError({ type: null, message: '' });
                    }}
                    className={`bg-gray-700 border-gray-600 text-white pl-10 pr-10 focus:ring-blue-500 focus:border-blue-500 ${loginError.type ? 'border-red-500' : ''}`}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Inline error message with suggestion */}
              {loginError.type && (
                <div className={`rounded-lg p-3 text-sm border ${
                  loginError.type === 'restricted' || loginError.type === 'deactivated'
                    ? 'bg-red-900/40 border-red-700 text-red-300'
                    : loginError.type === 'not-enrolled'
                    ? 'bg-yellow-900/40 border-yellow-700 text-yellow-300'
                    : loginError.type === 'server'
                    ? 'bg-gray-700 border-gray-600 text-gray-300'
                    : 'bg-red-900/40 border-red-700 text-red-300'
                }`}>
                  <p className="font-semibold mb-1">
                    {loginError.type === 'not-enrolled' ? '⚠️' : '❌'} {loginError.message}
                  </p>
                  {loginError.suggestion && (
                    <p className="text-xs opacity-90 leading-relaxed">{loginError.suggestion}</p>
                  )}
                </div>
              )}

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
                onClick={() => {
                  setSelectedRole(null);
                  setLoginError({ type: null, message: '' });
                }}
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
            <div className="mt-4 text-center space-y-2">
              {(selectedRole === 'student' || selectedRole === 'trainer') && (
                <p className="text-gray-400 text-xs">
                  Forgot your password?{' '}
                  <a
                    href="/forgot-password"
                    className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                  >
                    Reset it here
                  </a>
                </p>
              )}
              <p className="text-gray-500 text-xs">
                Don't have an account? Contact your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoleBasedLogin;