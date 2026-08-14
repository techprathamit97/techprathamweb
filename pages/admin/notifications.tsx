import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Send,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface NotificationStatus {
  success: boolean;
  currentTime: string;
  batchesWithTiming: number;
  nextNotifications: Array<{
    batchName: string;
    courseTitle: string;
    timing: string;
    classTime: string;
    notificationTime: string;
    isNotificationTime: boolean;
    timeDiffMinutes: number;
  }>;
  cacheSize: number;
}

const NotificationManager = () => {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-email-notifications');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.status);
        setLastRefresh(new Date());
      } else {
        toast.error('Failed to fetch notification status');
      }
    } catch (error) {
      console.error('Error fetching status:', error);
      toast.error('Error fetching notification status');
    } finally {
      setIsLoading(false);
    }
  };

  const testNotifications = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/test-email-notifications', {
        method: 'POST'
      });
      const data = await response.json();
      
      setTestResult(data);
      
      if (data.success) {
        const result = data.notificationResult?.results;
        if (result?.emailsSent > 0) {
          toast.success(`Test completed! Sent ${result.emailsSent} emails to ${result.notificationsSent} batches`);
        } else {
          toast.info('Test completed - no emails sent (not notification time for any batch)');
        }
      } else {
        toast.error('Test failed: ' + data.error);
      }
      
      // Refresh status after test
      fetchStatus();
    } catch (error) {
      console.error('Error testing notifications:', error);
      toast.error('Test failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Mail className="h-8 w-8" />
              Class Notification Manager
            </h1>
            <p className="text-blue-100 mt-2">
              Monitor and test automatic class reminder emails
            </p>
          </div>
          <div className="text-right">
            <div className="text-blue-100">Last Updated</div>
            <div className="font-mono text-lg">
              {lastRefresh.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Control Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={fetchStatus} 
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
            
            <Button 
              onClick={testNotifications} 
              disabled={isTesting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Send className={`h-4 w-4 mr-2 ${isTesting ? 'animate-pulse' : ''}`} />
              {isTesting ? 'Testing...' : 'Test Notifications Now'}
            </Button>
          </div>
          
          {testResult && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-2">Latest Test Result:</h4>
              <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Overview */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Clock className="h-6 w-6 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {status.currentTime}
                  </div>
                  <div className="text-sm text-gray-600">Current Time (IST)</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {status.batchesWithTiming}
                  </div>
                  <div className="text-sm text-gray-600">Active Batches</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Mail className="h-6 w-6 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {status.nextNotifications.length}
                  </div>
                  <div className="text-sm text-gray-600">Scheduled Today</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {status.cacheSize}
                  </div>
                  <div className="text-sm text-gray-600">Sent Today</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Batch Schedule */}
      {status && status.nextNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Class Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {status.nextNotifications.map((notification, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {notification.batchName}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {notification.courseTitle}
                    </p>
                    <p className="text-sm text-gray-500">
                      Full timing: {notification.timing}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-mono text-lg text-gray-900">
                      {notification.classTime}
                    </div>
                    <div className="text-sm text-gray-600">
                      Notification: {notification.notificationTime}
                    </div>
                    <div className="mt-2">
                      {notification.isNotificationTime ? (
                        <Badge className="bg-red-600 text-white">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          NOTIFICATION TIME!
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {notification.timeDiffMinutes > 0 
                            ? `${notification.timeDiffMinutes} min to notify`
                            : `${Math.abs(notification.timeDiffMinutes)} min ago`
                          }
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>
            📧 <strong>Automatic Notifications:</strong> The system runs every minute via cron job and checks if it's 5 minutes before any batch's class time.
          </p>
          <p>
            🕐 <strong>Timing-Based:</strong> Uses batch timing settings (e.g., "11:45 AM to 12:45 PM") to calculate notification times.
          </p>
          <p>
            🎯 <strong>Smart Sending:</strong> Each batch gets only one notification per day to avoid spam.
          </p>
          <p>
            👥 <strong>Recipients:</strong> Sends emails to all students in the batch AND the assigned trainer.
          </p>
          <p>
            🏖️ <strong>Weekend Skip:</strong> No notifications are sent on Saturdays and Sundays.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationManager;