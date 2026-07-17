import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { GraduationCap, Briefcase, Key, Copy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Credentials {
  studentId?: string;
  trainerId?: string;
  password: string;
  loginUrl: string;
}

const AccountsManagement = () => {
  const router = useRouter();
  
  
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [isTrainerDialogOpen, setIsTrainerDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<Credentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [studentForm, setStudentForm] = useState({
    studentId: '',
    email: '',
    password: '',
    name: '',
    phone: ''
  });

  const [trainerForm, setTrainerForm] = useState({
    trainerId: '',
    email: '',
    password: '',
    name: '',
    phone: ''
  });

  useEffect(() => {
    // Intentionally left blank; the LMS layout does not require a tab state here.
  }, []);

  

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleCreateStudentAccount = async () => {
    if (!studentForm.studentId || !studentForm.email || !studentForm.name || !studentForm.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Generate password if not provided
    const password = studentForm.password || generatePassword();

    setIsCreating(true);
    try {
      const res = await fetch('/api/lms/create-student-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...studentForm,
          password
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Student account created successfully!');
        setGeneratedCredentials(data.credentials);
        setStudentForm({
          studentId: '',
          email: '',
          password: '',
          name: '',
          phone: ''
        });
      } else {
        toast.error(data.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Create account error:', error);
      toast.error('An error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateTrainerAccount = async () => {
    if (!trainerForm.trainerId || !trainerForm.email || !trainerForm.name || !trainerForm.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Generate password if not provided
    const password = trainerForm.password || generatePassword();

    setIsCreating(true);
    try {
      const res = await fetch('/api/lms/create-trainer-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...trainerForm,
          password
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Trainer account created successfully!');
        setGeneratedCredentials(data.credentials);
        setTrainerForm({
          trainerId: '',
          email: '',
          password: '',
          name: '',
          phone: ''
        });
      } else {
        toast.error(data.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Create account error:', error);
      toast.error('An error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  

  return (
    <LMSLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Account Management</h1>
          <p className="text-gray-400 mt-2">Create and manage student and trainer login accounts</p>
        </div>

        <Tabs defaultValue="students" className="w-full">
          <TabsList className="bg-gray-800">
            <TabsTrigger value="students" className="data-[state=active]:bg-blue-600">
              <GraduationCap className="h-4 w-4 mr-2" />
              Student Accounts
            </TabsTrigger>
            <TabsTrigger value="trainers" className="data-[state=active]:bg-green-600">
              <Briefcase className="h-4 w-4 mr-2" />
              Trainer Accounts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Create Student Account</CardTitle>
                  <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="manual" className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Create Account
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-white">Create Student Account</DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <Label className="text-white">Student ID</Label>
                          <Input
                            value={studentForm.studentId}
                            onChange={(e) => setStudentForm(prev => ({ ...prev, studentId: e.target.value }))}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="e.g., TP000001"
                          />
                        </div>

                        <div>
                          <Label className="text-white">Full Name</Label>
                          <Input
                            value={studentForm.name}
                            onChange={(e) => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="Enter student name"
                          />
                        </div>

                        <div>
                          <Label className="text-white">Email</Label>
                          <Input
                            type="email"
                            value={studentForm.email}
                            onChange={(e) => setStudentForm(prev => ({ ...prev, email: e.target.value }))}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="student@example.com"
                          />
                        </div>

                        <div>
                          <Label className="text-white">Phone</Label>
                          <Input
                            value={studentForm.phone}
                            onChange={(e) => setStudentForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="+91 9876543210"
                          />
                        </div>

                        <div>
                          <Label className="text-white">Password (Optional - Auto-generated if empty)</Label>
                          <Input
                            type="text"
                            value={studentForm.password}
                            onChange={(e) => setStudentForm(prev => ({ ...prev, password: e.target.value }))}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="Leave empty for auto-generation"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsStudentDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="manual" 
                          onClick={handleCreateStudentAccount}
                          disabled={isCreating}
                        >
                          {isCreating ? 'Creating...' : 'Create Account'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">
                  Create login accounts for enrolled students. Students can use their Student ID and password to access their dashboard.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trainers" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Create Trainer Account</CardTitle>
                  <Dialog open={isTrainerDialogOpen} onOpenChange={setIsTrainerDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="manual" className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                        <Briefcase className="h-4 w-4" />
                        Create Account
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-white">Create Trainer Account</DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <Label className="text-white">Trainer ID</Label>
                          <Input
                            value={trainerForm.trainerId}
                            onChange={(e) => setTrainerForm(prev => ({ ...prev, trainerId: e.target.value }))}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="e.g., TR0001"
                          />
                        </div>

                        <div>
                          <Label className="text-white">Full Name</Label>
                          <Input
                            value={trainerForm.name}
                            onChange={(e) => setTrainerForm(prev => ({ ...prev, name: e.target.value }))}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="Enter trainer name"
                          />
                        </div>

                        <div>
                          <Label className="text-white">Email</Label>
                          <Input
                            type="email"
                            value={trainerForm.email}
                            onChange={(e) => setTrainerForm(prev => ({ ...prev, email: e.target.value }))}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="trainer@example.com"
                          />
                        </div>

                        <div>
                          <Label className="text-white">Phone</Label>
                          <Input
                            value={trainerForm.phone}
                            onChange={(e) => setTrainerForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="+91 9876543210"
                          />
                        </div>

                        <div>
                          <Label className="text-white">Password (Optional - Auto-generated if empty)</Label>
                          <Input
                            type="text"
                            value={trainerForm.password}
                            onChange={(e) => setTrainerForm(prev => ({ ...prev, password: e.target.value }))}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="Leave empty for auto-generation"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsTrainerDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="manual" 
                          onClick={handleCreateTrainerAccount}
                          disabled={isCreating}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isCreating ? 'Creating...' : 'Create Account'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">
                  Create login accounts for trainers. Trainers can use their Trainer ID and password to access their dashboard.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Credentials Display */}
        {generatedCredentials && (
          <Card className="bg-gradient-to-br from-green-900 to-green-800 border-green-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Key className="h-5 w-5" />
                Account Created Successfully!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-green-100">
                Please share these credentials with the user. They will need these to login.
              </p>

              <div className="bg-black/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-200 text-sm">
                      {generatedCredentials.studentId ? 'Student ID' : 'Trainer ID'}
                    </p>
                    <p className="text-white font-mono text-lg">
                      {generatedCredentials.studentId || generatedCredentials.trainerId}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(
                      generatedCredentials.studentId || generatedCredentials.trainerId || '',
                      'id'
                    )}
                  >
                    {copiedField === 'id' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-200 text-sm">Password</p>
                    <p className="text-white font-mono text-lg">{generatedCredentials.password}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedCredentials.password, 'password')}
                  >
                    {copiedField === 'password' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-200 text-sm">Login URL</p>
                    <p className="text-white font-mono text-sm">{generatedCredentials.loginUrl}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedCredentials.loginUrl, 'url')}
                  >
                    {copiedField === 'url' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setGeneratedCredentials(null)}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </LMSLayout>
  );
};

export default AccountsManagement;












