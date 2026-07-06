import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Users, Database, Plus, Eye } from 'lucide-react';
import { toast } from 'sonner';

const DebugPage = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [collections, setCollections] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createTestStudent = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/debug/create-test-student', {
        method: 'POST'
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        console.log('Test Student Credentials:', data.student.loginCredentials);
        alert(`Test Student Created!\nStudent ID: ${data.student.loginCredentials?.studentId}\nPassword: ${data.student.loginCredentials?.password}`);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to create test student');
    } finally {
      setIsLoading(false);
    }
  };

  const createTestTrainer = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/debug/create-test-trainer', {
        method: 'POST'
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message);
        console.log('Test Trainer Credentials:', data.trainer.loginCredentials);
        alert(`Test Trainer Created!\nLogin ID: ${data.trainer.loginCredentials?.loginId}\nPassword: ${data.trainer.loginCredentials?.password}`);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to create test trainer');
    } finally {
      setIsLoading(false);
    }
  };

  const checkStudents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/debug/students');
      const data = await res.json();
      
      if (data.success) {
        setStudents(data.students);
        toast.success(`Found ${data.count} students`);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to fetch students');
    } finally {
      setIsLoading(false);
    }
  };

  const checkTrainers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/debug/trainers');
      const data = await res.json();
      
      if (data.success) {
        console.log('Trainers found:', data.trainers);
        toast.success(`Found ${data.count} trainers`);
        alert(`Found ${data.count} trainers. Check console for details.`);
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to fetch trainers');
    } finally {
      setIsLoading(false);
    }
  };

  const checkCollections = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/debug/collections');
      const data = await res.json();

      if (data.success) {
        setCollections(data.results);
        toast.success('Collections data fetched');
      } else {
        toast.error(data.error);
      }
    } catch (error) {
      toast.error('Failed to fetch collections');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Debug Dashboard</h1>
          <p className="text-gray-400">Debug and test your database and login functionality</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <Button 
                onClick={createTestStudent}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Test Student
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <Button 
                onClick={createTestTrainer}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Test Trainer
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <Button 
                onClick={checkStudents}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                Check Students
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <Button 
                onClick={checkCollections}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                Check Collections
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Test Credentials */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Test Login Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Student Login
                </h3>
                <p className="text-gray-300 text-sm mb-2">Use these credentials to test student login:</p>
                <div className="space-y-1">
                  <p className="text-white"><strong>Student ID:</strong> STU0001</p>
                  <p className="text-white"><strong>Password:</strong> test123</p>
                </div>
                <a href="/student/login" className="text-blue-400 hover:text-blue-300 text-sm">
                  → Go to Student Login
                </a>
              </div>

              <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Trainer Login
                </h3>
                <p className="text-gray-300 text-sm mb-2">Use these credentials to test trainer login:</p>
                <div className="space-y-1">
                  <p className="text-white"><strong>Login ID:</strong> TRN0001</p>
                  <p className="text-white"><strong>Password:</strong> test123</p>
                </div>
                <a href="/trainer/login" className="text-green-400 hover:text-green-300 text-sm">
                  → Go to Trainer Login
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Data */}
        {students.length > 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Students in Database</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {students.map((student, index) => (
                  <div key={index} className="bg-gray-700 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{student.name}</p>
                        <p className="text-gray-400 text-sm">{student.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-blue-600 mb-1">{student.studentId}</Badge>
                        <p className="text-xs text-gray-400">
                          Password: {student.hasPassword ? '✓' : '✗'} 
                          {student.passwordLength && ` (${student.passwordLength} chars)`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Collections Data */}
        {collections && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Database Collections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-white font-medium mb-2">Available Collections:</h4>
                  <div className="flex flex-wrap gap-2">
                    {collections.collections.map((collection: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-gray-300">
                        {collection}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <pre className="bg-gray-900 p-4 rounded-lg text-gray-300 text-sm overflow-auto">
                  {JSON.stringify(collections.data, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DebugPage;