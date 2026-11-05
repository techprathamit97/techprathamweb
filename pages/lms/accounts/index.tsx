import React, { useEffect, useState } from 'react';

import LMSLayout from '@/src/lms/common/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Key, Copy, CheckCircle, Shield, Lock, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { authGet, authPost, authDelete } from '@/lib/clientAuth';

interface Credentials {
  adminId?: string;
  password: string;
  loginUrl: string;
}

interface AdminAccount {
  _id: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  accessLevel?: string;
  createdAt?: string;
  isSelf?: boolean;
}

const AccountsManagement = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<Credentials | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // --- Admin management state ---
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  // Change-password dialog (own password, or reset another admin's)
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<AdminAccount | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const res = await authGet('/api/lms/admins');
      const data = await res.json();
      if (res.ok) {
        setAdmins(data.admins || []);
      } else {
        toast.error(data.error || 'Failed to load admins');
      }
    } catch (error: any) {
      console.error('Fetch admins error:', error);
      toast.error(error.message || 'Failed to load admins');
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdminAccount = async () => {
    if (!adminForm.name || !adminForm.email) {
      toast.error('Please fill in name and email');
      return;
    }

    const password = adminForm.password || generatePassword();

    setIsCreating(true);
    try {
      const res = await authPost('/api/lms/admins', { ...adminForm, password });
      const data = await res.json();

      if (res.ok) {
        toast.success('Admin account created successfully!');
        setGeneratedCredentials({
          adminId: data.admin?.userId,
          password,
          loginUrl: `${window.location.origin}/login`
        });
        setAdminForm({ name: '', email: '', phone: '', password: '' });
        setIsAdminDialogOpen(false);
        fetchAdmins();
      } else {
        toast.error(data.error || 'Failed to create admin account');
      }
    } catch (error: any) {
      console.error('Create admin error:', error);
      toast.error(error.message || 'An error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAdmin = async (admin: AdminAccount) => {
    if (admin.isSelf) {
      toast.error('You cannot delete your own admin account');
      return;
    }
    if (!window.confirm(`Delete admin "${admin.name}" (${admin.email})? This cannot be undone.`)) {
      return;
    }

    setDeletingId(admin._id);
    try {
      const res = await authDelete(`/api/lms/admins/${admin._id}`);
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Admin deleted');
        fetchAdmins();
      } else {
        toast.error(data.error || 'Failed to delete admin');
      }
    } catch (error: any) {
      console.error('Delete admin error:', error);
      toast.error(error.message || 'An error occurred');
    } finally {
      setDeletingId(null);
    }
  };

  const openPasswordDialog = (target: AdminAccount | null) => {
    setPasswordTarget(target);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setIsPasswordDialogOpen(true);
  };

  const handleChangePassword = async () => {
    const isSelf = !passwordTarget || passwordTarget.isSelf;

    if (isSelf && !passwordForm.currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      const payload: any = { newPassword: passwordForm.newPassword };
      if (isSelf) {
        payload.currentPassword = passwordForm.currentPassword;
      } else {
        payload.targetAdminId = passwordTarget!._id;
      }

      const res = await authPost('/api/lms/admins/change-password', payload);
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || 'Password changed successfully');
        setIsPasswordDialogOpen(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.error || 'Failed to change password');
      }
    } catch (error: any) {
      console.error('Change password error:', error);
      toast.error(error.message || 'An error occurred');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <LMSLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Account Management</h1>
          <p className="text-gray-400 mt-2">Create and manage LMS admin accounts</p>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-400" />
                  Admin Accounts
                </CardTitle>
                <p className="text-gray-400 text-sm mt-1">
                  Only logged-in admins can create admins or change passwords.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => openPasswordDialog(null)}
                  className="flex items-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Change My Password
                </Button>
                <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="manual" className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700">
                      <Shield className="h-4 w-4" />
                      Add Admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-white">Create Admin Account</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div>
                        <Label className="text-white">Full Name</Label>
                        <Input
                          value={adminForm.name}
                          onChange={(e) => setAdminForm(prev => ({ ...prev, name: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="Enter admin name"
                        />
                      </div>

                      <div>
                        <Label className="text-white">Email</Label>
                        <Input
                          type="email"
                          value={adminForm.email}
                          onChange={(e) => setAdminForm(prev => ({ ...prev, email: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="admin@example.com"
                        />
                      </div>

                      <div>
                        <Label className="text-white">Phone</Label>
                        <Input
                          value={adminForm.phone}
                          onChange={(e) => setAdminForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="+91 9876543210"
                        />
                      </div>

                      <div>
                        <Label className="text-white">Password (Optional - Auto-generated if empty)</Label>
                        <Input
                          type="text"
                          value={adminForm.password}
                          onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="Leave empty for auto-generation"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline" onClick={() => setIsAdminDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="manual"
                        onClick={handleCreateAdminAccount}
                        disabled={isCreating}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {isCreating ? 'Creating...' : 'Create Admin'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAdmins ? (
              <p className="text-gray-400">Loading admins…</p>
            ) : admins.length === 0 ? (
              <p className="text-gray-400">No admin accounts found.</p>
            ) : (
              <div className="space-y-2">
                {admins.map((admin) => (
                  <div
                    key={admin._id}
                    className="flex items-center justify-between bg-gray-900/50 rounded-lg p-4 border border-gray-700"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-medium truncate">{admin.name}</p>
                        {admin.userId && (
                          <span className="text-xs font-mono text-purple-300 bg-purple-900/40 px-2 py-0.5 rounded">
                            {admin.userId}
                          </span>
                        )}
                        {admin.isSelf && (
                          <span className="text-xs text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded">
                            You
                          </span>
                        )}
                        {!admin.isActive && (
                          <span className="text-xs text-red-300 bg-red-900/40 px-2 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm truncate">{admin.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPasswordDialog(admin)}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        {admin.isSelf ? 'Change Password' : 'Reset Password'}
                      </Button>
                      {!admin.isSelf && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteAdmin(admin)}
                          disabled={deletingId === admin._id}
                          className="flex items-center gap-2 text-red-400 border-red-500/40 hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 className="h-4 w-4" />
                          {deletingId === admin._id ? 'Deleting...' : 'Delete'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change / Reset Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="bg-gray-800 border-gray-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">
                {!passwordTarget || passwordTarget.isSelf
                  ? 'Change My Password'
                  : `Reset Password: ${passwordTarget.name}`}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {(!passwordTarget || passwordTarget.isSelf) && (
                <div>
                  <Label className="text-white">Current Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Enter your current password"
                  />
                </div>
              )}

              <div>
                <Label className="text-white">New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <Label className="text-white">Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Re-enter new password"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="manual"
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isChangingPassword ? 'Saving...' : 'Save Password'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Credentials Display */}
        {generatedCredentials && (
          <Card className="bg-gradient-to-br from-green-900 to-green-800 border-green-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Key className="h-5 w-5" />
                Admin Account Created Successfully!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-green-100">
                Please share these credentials with the new admin. They will need these to login.
              </p>

              <div className="bg-black/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-200 text-sm">Admin ID</p>
                    <p className="text-white font-mono text-lg">{generatedCredentials.adminId}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedCredentials.adminId || '', 'id')}
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
