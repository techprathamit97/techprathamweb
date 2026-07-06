import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Lock, LogIn, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const StudentLogin = () => {
  const [credentials, setCredentials] = useState({
    studentId: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.studentId || !credentials.password) {
      toast.error('Please enter both Email/Student ID and password');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await res.json();

      if (res.ok) {
        // Store student data in localStorage
        localStorage.setItem('student', JSON.stringify(data.student));
        toast.success('Login successful!');
        router.push('/student/dashboard');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Student Portal</h1>
          <p className="text-gray-400">Sign in to access your dashboard</p>
        </div>

        {/* Login Form */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-center flex items-center justify-center gap-2">
              <LogIn className="h-5 w-5" />
              Student Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-white">Email or Student ID</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    value={credentials.studentId}
                    onChange={(e) => setCredentials(prev => ({ ...prev, studentId: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white pl-10"
                    placeholder="Enter your Email or Student ID"
                    required
                  />
                </div>
                <p className="text-gray-400 text-xs mt-1">You can use either your email address or Student ID (e.g., STU0001)</p>
              </div>

              <div>
                <Label className="text-white">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white pl-10"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Don't have an account? Contact your administrator
              </p>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <Link href="/trainer/login" className="text-blue-400 hover:text-blue-300 text-sm">
                  Are you a trainer? Login here
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentLogin;