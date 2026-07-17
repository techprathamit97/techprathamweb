import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Users, 
  GraduationCap, 
  Shield, 
  Play, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

const MigrationTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [migrationResults, setMigrationResults] = useState<any>(null);

  const runMigration = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/migrate-to-unified-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (response.ok) {
        setMigrationResults(data);
        toast.success('Migration completed successfully!');
      } else {
        throw new Error(data.error || 'Migration failed');
      }
    } catch (error: any) {
      toast.error(`Migration failed: ${error.message}`);
      console.error('Migration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testLogin = async (loginId: string, password: string, expectedRole: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`✅ Login test passed for ${expectedRole}: ${loginId}`);
        return data;
      } else {
        throw new Error(data.error || 'Login test failed');
      }
    } catch (error: any) {
      toast.error(`❌ Login test failed for ${loginId}: ${error.message}`);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Unified Authentication Migration</h1>
          <p className="text-gray-600">Migrate existing students and trainers to the unified user system</p>
        </div>

        {/* Migration Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Migration Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-full">
                    <GraduationCap className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Students Collection</p>
                    <p className="text-blue-700 text-sm">Will be migrated to Users collection with role=&apos;student&apos;</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  Ready
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-green-600 p-2 rounded-full">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900">Trainers Collection</p>
                    <p className="text-green-700 text-sm">Will be migrated to Users collection with role=&apos;trainer&apos;</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  Ready
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-600 p-2 rounded-full">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-purple-900">Default Admin</p>
                    <p className="text-purple-700 text-sm">Creates default admin user (ADMIN001 / admin@techpratham.com)</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-purple-100 text-purple-800">
                  New
                </Badge>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button 
                onClick={runMigration}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Migration
                  </>
                )}
              </Button>

              <Button 
                variant="outline"
                onClick={() => window.open('/login', '_blank')}
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Test Unified Login
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Migration Results */}
        {migrationResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Migration Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Students</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Processed:</span>
                      <span className="font-medium">{migrationResults.results.studentsProcessed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span className="font-medium text-green-600">{migrationResults.results.studentsCreated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Skipped:</span>
                      <span className="font-medium text-orange-600">{migrationResults.results.studentsSkipped}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">Trainers</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Processed:</span>
                      <span className="font-medium">{migrationResults.results.trainersProcessed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span className="font-medium text-green-600">{migrationResults.results.trainersCreated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Skipped:</span>
                      <span className="font-medium text-orange-600">{migrationResults.results.trainersSkipped}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-100 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-700">{migrationResults.summary.totalCreated}</div>
                    <div className="text-green-600">Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-700">{migrationResults.summary.totalSkipped}</div>
                    <div className="text-orange-600">Skipped</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-700">{migrationResults.summary.totalProcessed}</div>
                    <div className="text-blue-600">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-700">{migrationResults.summary.totalErrors}</div>
                    <div className="text-red-600">Errors</div>
                  </div>
                </div>
              </div>

              {migrationResults.results.errors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Errors
                  </h4>
                  <div className="space-y-1 text-sm text-red-700">
                    {migrationResults.results.errors.map((error: string, index: number) => (
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Default Admin Credentials */}
              <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-2">Default Admin Credentials</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">User ID:</span>
                    <code className="bg-purple-100 px-2 py-1 rounded">ADMIN001</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Email:</span>
                    <code className="bg-purple-100 px-2 py-1 rounded">admin@techpratham.com</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Password:</span>
                    <code className="bg-purple-100 px-2 py-1 rounded">admin123</code>
                  </div>
                </div>
                <p className="text-purple-700 text-xs mt-2">
                  ⚠️ Remember to change the default password after first login!
                </p>
              </div>

              {/* Test Login Buttons */}
              <div className="mt-6 space-y-3">
                <h4 className="font-semibold text-gray-900">Test Logins</h4>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => testLogin('ADMIN001', 'admin123', 'admin')}
                  >
                    Test Admin Login
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => testLogin('admin@techpratham.com', 'admin123', 'admin')}
                  >
                    Test Admin Email Login
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MigrationTest;