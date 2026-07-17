import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  User, 
  Mail, 
  Key, 
  Plus, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/router';

const SetupAdmin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [showPasswords, setShowPasswords] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const fetchAdminUsers = async () => {
    try {
      const response = await fetch('/api/create-admin-user', {
        method: 'GET'
      });
      const data = await response.json();
      
      if (data.success) {
        setAdminUsers(data.admins);
      }
    } catch (error) {
      console.error('Error fetching admin users:', error);
    }
  };

  const createAdminUser = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/create-admin-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Admin user(s) created successfully!');
        await fetchAdminUsers(); // Refresh the list
        
        // Show success info
        if (data.admins) {
          const adminInfo = data.admins.map((admin: any) => 
            `${admin.userId} (${admin.email})`
          ).join('\n');
          
          setTimeout(() => {
            alert(`✅ Admin Users Created:\n\n${adminInfo}\n\nPassword for both: admin123\n\nYou can now login at /login`);
          }, 500);
        }
      } else {
        if (data.message?.includes('already exists')) {
          toast.info('Admin user already exists!');
          // Still refresh to show existing admin
          await fetchAdminUsers();
        } else {
          throw new Error(data.error || 'Failed to create admin user');
        }
      }
    } catch (error: any) {
      toast.error(`Failed to create admin: ${error.message}`);
      console.error('Admin creation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testLogin = (userId: string) => {
    // Store test credentials for easy access
    const testData = {
      loginId: userId,
      password: 'admin123'
    };
    
    // Store in sessionStorage for the login page to auto-fill
    sessionStorage.setItem('testLogin', JSON.stringify(testData));
    
    // Navigate to login page
    router.push('/login');
    
    toast.info(`Opening login page with ${userId} credentials`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-full">
              <Shield className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Admin Setup</h1>
          <p className="text-blue-200">Create LMS administrator accounts</p>
        </div>

        {/* Create Admin Section */}
        <Card className="mb-6 bg-white/10 backdrop-blur border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Admin User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50/10 p-4 rounded-lg border border-blue-200/20">
                <h4 className="text-white font-medium mb-2">What will be created:</h4>
                <div className="space-y-2 text-blue-200 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span><strong>ADMIN001</strong> - System Administrator (Super Admin)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span><strong>admin@techpratham.com</strong> - Primary admin email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span><strong>ADMIN002</strong> - Backup Administrator</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span><strong>backup@techpratham.com</strong> - Backup admin email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    <span><strong>admin123</strong> - Default password for both</span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={createAdminUser}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating Admin Users...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Create Admin Users
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Existing Admin Users */}
        {adminUsers.length > 0 && (
          <Card className="mb-6 bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                Existing Admin Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {adminUsers.map((admin: any, index) => (
                  <div key={admin._id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge 
                            className={`${
                              admin.accessLevel === 'super_admin' 
                                ? 'bg-red-600 text-white' 
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {admin.accessLevel === 'super_admin' ? 'Super Admin' : 'Admin'}
                          </Badge>
                          <span className="text-white font-medium">{admin.name}</span>
                          {admin.isActive && (
                            <Badge className="bg-green-600 text-white">Active</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-blue-200">
                            <User className="h-4 w-4" />
                            <span>ID: <code className="bg-white/10 px-2 py-1 rounded">{admin.userId}</code></span>
                          </div>
                          <div className="flex items-center gap-2 text-blue-200">
                            <Mail className="h-4 w-4" />
                            <span>{admin.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-blue-200">
                            <Key className="h-4 w-4" />
                            <span>Password: {showPasswords ? 'admin123' : '••••••••'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-blue-200">
                            <Shield className="h-4 w-4" />
                            <span>{admin.permissions?.length || 0} permissions</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => testLogin(admin.userId)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Test Login
                        </Button>
                        <Button
                          onClick={() => testLogin(admin.email)}
                          size="sm"
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          Login with Email
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <Button
                    onClick={() => setShowPasswords(!showPasswords)}
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                    {showPasswords ? 'Hide' : 'Show'} Passwords
                  </Button>
                  
                  <Button
                    onClick={() => router.push('/login')}
                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Go to Login Page
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-white/5 backdrop-blur border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              Important Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-blue-200 text-sm">
              <div className="flex items-start gap-2">
                <div className="bg-yellow-500 rounded-full p-1 mt-0.5">
                  <span className="block w-1 h-1"></span>
                </div>
                <span>Change the default password <strong>admin123</strong> after first login for security</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-yellow-500 rounded-full p-1 mt-0.5">
                  <span className="block w-1 h-1"></span>
                </div>
                <span>Super Admin (ADMIN001) has full system permissions</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-yellow-500 rounded-full p-1 mt-0.5">
                  <span className="block w-1 h-1"></span>
                </div>
                <span>Regular Admin (ADMIN002) has limited permissions for daily operations</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-yellow-500 rounded-full p-1 mt-0.5">
                  <span className="block w-1 h-1"></span>
                </div>
                <span>You can login using either User ID or email address</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-yellow-500 rounded-full p-1 mt-0.5">
                  <span className="block w-1 h-1"></span>
                </div>
                <span>After login, you'll be redirected to the LMS dashboard at <strong>/lms</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SetupAdmin;