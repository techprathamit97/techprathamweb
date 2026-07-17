import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';

const StudentLoginDeprecated = () => {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      router.push('/login');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader>
            <CardTitle className="text-orange-800 text-center flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Login Moved
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-orange-100 p-4 rounded-lg">
              <p className="text-orange-800 font-medium mb-2">
                Student login has been moved to the unified login page
              </p>
              <p className="text-orange-700 text-sm">
                You can now use the same login page for students, trainers, and administrators
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Go to Unified Login <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <p className="text-gray-600 text-sm">
                Redirecting automatically in 5 seconds...
              </p>
            </div>

            <div className="mt-6 p-3 bg-blue-50 rounded-lg text-left">
              <p className="text-blue-800 font-medium text-sm mb-1">What's new:</p>
              <ul className="text-blue-700 text-xs space-y-1">
                <li>• Single login page for all users</li>
                <li>• Use your Student ID or email</li>
                <li>• Same password as before</li>
                <li>• Automatic role detection</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentLoginDeprecated;