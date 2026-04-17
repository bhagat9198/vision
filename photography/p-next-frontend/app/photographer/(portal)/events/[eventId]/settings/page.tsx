'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Lock, Globe, Download, MessageSquare, Droplet, Trash2, Eye, EyeOff, Link2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRouter } from 'next/navigation';

interface EventSettings {
  accessType: string;
  password?: string;
  watermarkEnabled: boolean;
  downloadEnabled: boolean;
  commentsEnabled: boolean;
  likesEnabled: boolean;
}

export default function EventSettingsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventSlug, setEventSlug] = useState('');
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    status: 'DRAFT',
  });
  const [settings, setSettings] = useState<EventSettings>({
    accessType: 'PASSWORD',
    password: '',
    watermarkEnabled: true,
    downloadEnabled: true,
    commentsEnabled: true,
    likesEnabled: true,
  });

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/event/${eventSlug}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const fetchEvent = async () => {
      const token = localStorage.getItem('photographerToken');
      const res = await fetch(`http://localhost:4000/api/v1/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const event = data.data;
        setEventName(event.name);
        setEventSlug(event.slug || '');
        setFormData({
          name: event.name,
          date: event.date.split('T')[0],
          description: event.description || '',
          status: event.status,
        });
        // Map backend fields to settings object
        setSettings({
          accessType: event.isPasswordProtected ? 'PASSWORD' : 'OPEN',
          password: event.password || '',
          watermarkEnabled: event.watermarkEnabled ?? true,
          downloadEnabled: event.allowDownloads ?? true,
          commentsEnabled: event.allowComments ?? true,
          likesEnabled: event.allowLikes ?? true,
        });
      }
      setLoading(false);
    };
    fetchEvent();
  }, [eventId]);

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem('photographerToken');
    
    await fetch(`http://localhost:4000/api/v1/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: formData.name,
        date: new Date(formData.date).toISOString(),
        description: formData.description || undefined,
        status: formData.status,
        settings,
      }),
    });
    
    setSaving(false);
    router.push(`/photographer/events/${eventId}`);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event? This cannot be undone.')) return;
    
    const token = localStorage.getItem('photographerToken');
    await fetch(`http://localhost:4000/api/v1/events/${eventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    
    router.push('/photographer/events');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/photographer/events/${eventId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Event Settings</h1>
          <p className="text-zinc-500 dark:text-zinc-400">{eventName}</p>
        </div>
      </div>

      {/* Publish Status */}
      <Card className={`border-2 ${formData.status === 'PUBLISHED' ? 'border-green-500 bg-green-50 dark:bg-green-500/10' : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10'}`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {formData.status === 'PUBLISHED' ? (
                <Eye className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <EyeOff className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              )}
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {formData.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {formData.status === 'PUBLISHED' ? 'This gallery is visible to clients' : 'This gallery is not visible to clients'}
                </p>
              </div>
            </div>
            <Button
              variant={formData.status === 'PUBLISHED' ? 'outline' : 'default'}
              onClick={() => setFormData({ ...formData, status: formData.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' })}
              className={formData.status === 'PUBLISHED' ? '' : 'bg-green-600 hover:bg-green-700 text-white'}
            >
              {formData.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Share Link */}
      {eventSlug && (
        <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Link2 className="h-5 w-5 text-zinc-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white mb-1">Share Link</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{shareUrl}</p>
              </div>
              <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-2">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Info */}
      <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-900 dark:text-white">Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Event Name</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Event Date</Label>
            <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white resize-none" />
          </div>
        </CardContent>
      </Card>

      {/* Access Settings */}
      <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-900 dark:text-white">Access Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={settings.accessType} onValueChange={(v) => setSettings({ ...settings, accessType: v })}>
            <div className={`flex items-center space-x-3 p-3 rounded-lg border ${settings.accessType === 'OPEN' ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'border-zinc-200 dark:border-zinc-700'}`}>
              <RadioGroupItem value="OPEN" id="open" />
              <Label htmlFor="open" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-green-500 dark:text-green-400" /><span className="text-zinc-900 dark:text-white">Open (Public)</span></div>
              </Label>
            </div>
            <div className={`flex items-center space-x-3 p-3 rounded-lg border ${settings.accessType === 'PASSWORD' ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'border-zinc-200 dark:border-zinc-700'}`}>
              <RadioGroupItem value="PASSWORD" id="password" />
              <Label htmlFor="password" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-amber-500 dark:text-amber-400" /><span className="text-zinc-900 dark:text-white">Password Protected</span></div>
              </Label>
            </div>
          </RadioGroup>
          {settings.accessType === 'PASSWORD' && (
            <Input placeholder="Gallery Password" value={settings.password || ''} onChange={(e) => setSettings({ ...settings, password: e.target.value })} />
          )}
        </CardContent>
      </Card>
      {/* Gallery Settings */}
      <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-900 dark:text-white">Gallery Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30">
            <div className="flex items-center gap-3">
              <Droplet className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
              <span className="text-zinc-900 dark:text-white">Watermark Photos</span>
            </div>
            <Switch checked={settings.watermarkEnabled} onCheckedChange={(v) => setSettings({ ...settings, watermarkEnabled: v })} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
              <span className="text-zinc-900 dark:text-white">Allow Downloads</span>
            </div>
            <Switch checked={settings.downloadEnabled} onCheckedChange={(v) => setSettings({ ...settings, downloadEnabled: v })} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
              <span className="text-zinc-900 dark:text-white">Allow Comments & Likes</span>
            </div>
            <Switch checked={settings.commentsEnabled} onCheckedChange={(v) => setSettings({ ...settings, commentsEnabled: v, likesEnabled: v })} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="destructive" onClick={handleDelete} className="gap-2">
          <Trash2 className="h-4 w-4" /> Delete Event
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}

