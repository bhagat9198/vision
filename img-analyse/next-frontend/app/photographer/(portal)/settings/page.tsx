'use client';

import { useState, useEffect } from 'react';
import { User, Lock, Camera, Save, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PasswordInput } from '@/components/ui/password-input';

interface Profile {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string | null;
  website: string | null;
  bio: string | null;
  instagram: string | null;
  avatar: string | null;
  subscription: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    phone: '',
    website: '',
    instagram: '',
    bio: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const token = localStorage.getItem('photographerToken');
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        setFormData({
          username: data.data.username || '',
          name: data.data.name || '',
          phone: data.data.phone || '',
          website: data.data.website || '',
          instagram: data.data.instagram || '',
          bio: data.data.bio || '',
        });
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('photographerToken');
      const res = await fetch('http://localhost:4000/api/v1/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully' });
        setProfile({ ...profile, ...data.data });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const token = localStorage.getItem('photographerToken');
      const res = await fetch('http://localhost:4000/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Password changed successfully' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-zinc-500 dark:text-zinc-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Settings</h1>
        <p className="text-zinc-500 dark:text-zinc-400">Manage your account settings</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Profile Settings */}
      <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-900 dark:text-white flex items-center gap-2">
            <User className="h-5 w-5" /> Profile Information
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AtSign className="h-4 w-4" /> Username
              </Label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                placeholder="your_username"
                maxLength={30}
              />
              <p className="text-xs text-zinc-500">Lowercase letters, numbers, and underscores only. Used in your gallery URLs.</p>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email || ''} disabled className="opacity-60" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://yourwebsite.com" />
            </div>
            <div className="space-y-2">
              <Label>Instagram</Label>
              <Input value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} placeholder="@yourusername" />
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                placeholder="Tell clients about yourself..."
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none"
              />
            </div>
            <Button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
              <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-900 dark:text-white flex items-center gap-2">
            <Lock className="h-5 w-5" /> Change Password
          </CardTitle>
          <CardDescription>Update your password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <PasswordInput
              id="currentPassword"
              label="Current Password"
              value={passwordData.currentPassword}
              onChange={(value) => setPasswordData({ ...passwordData, currentPassword: value })}
              showIcon={false}
              theme="auto"
              inputClassName="h-10"
            />
            <PasswordInput
              id="newPassword"
              label="New Password"
              value={passwordData.newPassword}
              onChange={(value) => setPasswordData({ ...passwordData, newPassword: value })}
              showIcon={false}
              theme="auto"
              inputClassName="h-10"
            />
            <PasswordInput
              id="confirmPassword"
              label="Confirm New Password"
              value={passwordData.confirmPassword}
              onChange={(value) => setPasswordData({ ...passwordData, confirmPassword: value })}
              showIcon={false}
              theme="auto"
              inputClassName="h-10"
            />
            <Button type="submit" disabled={saving} variant="outline">
              <Lock className="h-4 w-4 mr-2" /> {saving ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Subscription Info */}
      <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-900 dark:text-white flex items-center gap-2">
            <Camera className="h-5 w-5" /> Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-900 dark:text-white font-medium">{profile?.subscription || 'FREE'} Plan</p>
              <p className="text-sm text-zinc-500">Manage your subscription and billing</p>
            </div>
            <Button variant="outline">
              Upgrade Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

