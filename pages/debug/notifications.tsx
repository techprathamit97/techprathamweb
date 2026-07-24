import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Users, 
  Database, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';

interface NotificationStatus {
  firebaseConfig: {
    projectId: string;
    configured: boolean;
    vapidKey: string;
  };
  batches: Array<{
    batchId: string;
    batchName: string;
    totalStudents: number;
    studentsWithTokens: number;
    totalActiveTokens: number;
  }>;
  testInstructions: {
    message: string;
    example: string;
  };
}

const NotificationDebug = () => {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<any>(null);
  const [testingBatch, setTestingBatch] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/test-notifications');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data);
      } else {
        console.error('Failed to fetch notification status:', data.error);
      }
    } catch (error) {
      console.error('Error fetching notification status:', error);
    } finally {
      setLoading(false);
    }
  };

  const testNotifications = async (batchId: string) => {
    try {
      setTestingBatch(batchId);
      setTestResult(null);
      
      const response = await fetch(`/api/test-notifications?testNotification=true&batchId=${batchId}`);
      const data = await response.json();
      
      setTestResult(data);
      
      if (data.success) {
        alert(`Test notification sent! Result: ${JSON.stringify(data.notificationResult, null, 2)}`);
      } else {
        alert(`Test failed: ${data.error}`);
      }
    } catch (error: unknown) {
      console.error('Test notification error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Test error: ${message}`);
    } finally {
      setTestingBatch(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading notification system status...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Bell className="h-8 w-8" />
          Push Notification Debug
        </h1>
        <p className="text-purple-100 mt-2">
          Debug and test the Firebase Cloud Messaging (FCM) system
        </p>
      </div>

      {/* Firebase Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Firebase Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">Project ID:</span>
                <Badge variant="outline">{status.firebaseConfig.projectId}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Admin SDK Configured:</span>
                {status.firebaseConfig.configured ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Yes
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3 mr-1" />
                    No (Simulation Mode)
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">VAPID Key:</span>
                <Badge variant="outline" className="text-xs">
                  {status.firebaseConfig.vapidKey.substring(0, 20)}...
                </Badge>
              </div>
              
              {!status.firebaseConfig.configured && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Firebase Setup Required</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        To enable push notifications, you need to:
                      </p>
                      <ol className="text-sm text-yellow-700 mt-2 ml-4 list-decimal">
                        <li>Go to <a href="https://console.firebase.google.com/project/techpratham-lms/settings/cloudmessaging/web" className="underline" target="_blank">Firebase Console → Cloud Messaging</a></li>
                        <li>Generate a VAPID key in "Web configuration"</li>
                        <li>Download service account JSON from "Service accounts"</li>
                        <li>Add credentials to .env.local file</li>
                      </ol>
                      <div className="mt-2 p-2 bg-yellow-100 rounded text-xs font-mono">
                        <div>FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"</div>
                        <div>FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@techpratham-lms.iam.gserviceaccount.com</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Failed to load configuration</p>
          )}
        </CardContent>
      </Card>

      {/* Batch Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Student Batches & FCM Tokens
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status && status.batches.length > 0 ? (
            <div className="space-y-4">
              {status.batches.map((batch) => (
                <div key={batch.batchId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">{batch.batchName}</h3>
                    <Button
                      size="sm"
                      onClick={() => testNotifications(batch.batchId)}
                      disabled={testingBatch === batch.batchId}
                    >
                      {testingBatch === batch.batchId ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Smartphone className="h-3 w-3 mr-1" />
                      )}
                      Test Notification
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Students</p>
                      <p className="font-medium text-lg">{batch.totalStudents}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">With FCM Tokens</p>
                      <p className="font-medium text-lg text-green-600">{batch.studentsWithTokens}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Active Tokens</p>
                      <p className="font-medium text-lg text-blue-600">{batch.totalActiveTokens}</p>
                    </div>
                  </div>
                  
                  {batch.totalActiveTokens === 0 && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                      <AlertCircle className="h-4 w-4 text-yellow-600 inline mr-1" />
                      No active FCM tokens found. Students need to visit the classes page to register for notifications.
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No batches found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Test Notification Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Success:</span>
                {testResult.success ? (
                  <Badge className="bg-green-100 text-green-800">Yes</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">No</Badge>
                )}
              </div>
              
              {testResult.notificationResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Notification Details:</h4>
                  <pre className="text-xs text-gray-600 overflow-x-auto">
                    {JSON.stringify(testResult.notificationResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">1. Check Student Registration</h4>
            <p className="text-sm text-gray-600">
              Students must visit /student/classes to register their FCM tokens for notifications.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium">2. Test Notifications</h4>
            <p className="text-sm text-gray-600">
              Use the "Test Notification" buttons above to send test notifications to specific batches.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium">3. Check Browser Console</h4>
            <p className="text-sm text-gray-600">
              Open browser developer tools and check console logs when trainers create meetings.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium">4. Firebase Configuration</h4>
            <p className="text-sm text-gray-600">
              For production notifications, configure Firebase Admin SDK service account credentials.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationDebug;