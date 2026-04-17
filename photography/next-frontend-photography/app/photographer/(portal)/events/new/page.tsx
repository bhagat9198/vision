'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Lock, Globe, Download, MessageSquare, Save, Droplet, Type, LinkIcon, Share2, Copy, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip } from '@/components/ui/tooltip';
import { useQueryTabs } from '@/lib/hooks/use-query-tabs';

// Generate URL-safe slug from text
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

export default function CreateEventPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useQueryTabs('details', 'tab');
  const [username, setUsername] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    accessType: 'PASSWORD',
    password: '',
    watermarkEnabled: true,
    watermarkText: '',
    allowDownloads: true,
    allowComments: true,
    allowLikes: true,
  });

  // Fetch photographer username for slug preview
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('photographerToken');
      try {
        const res = await fetch('http://localhost:4000/api/v1/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setUsername(data.data.username || '');
      } catch { /* ignore */ }
    };
    fetchProfile();
  }, []);

  // Generate slug preview
  const slugPreview = username && formData.name
    ? `${username}/${generateSlug(formData.name)}`
    : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('photographerToken');
      const res = await fetch('http://localhost:4000/api/v1/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          date: new Date(formData.date).toISOString(),
          description: formData.description || undefined,
          settings: {
            accessType: formData.accessType,
            password: formData.accessType === 'PASSWORD' ? formData.password : undefined,
            watermarkEnabled: formData.watermarkEnabled,
            watermarkText: formData.watermarkText || undefined,
            downloadEnabled: formData.allowDownloads,
            commentsEnabled: formData.allowComments,
            likesEnabled: formData.allowLikes,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/photographer/events/${data.data.displayId}`);
      } else {
        setError(data.error || 'Failed to create event');
      }
    } catch {
      setError('Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = formData.name && formData.date;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/photographer/events">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Create New Event</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Set up a new photo gallery for your client</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-t-lg rounded-b-none h-12">
              <TabsTrigger value="details" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
                <Calendar className="h-4 w-4 mr-2" />
                Details
              </TabsTrigger>
              <TabsTrigger value="access" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
                <Lock className="h-4 w-4 mr-2" />
                Access
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900">
                <Droplet className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <CardContent className="pt-6">
              {/* Details Tab */}
              <TabsContent value="details" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label>Event Name *</Label>
                  <Input
                    placeholder="e.g., Sarah & Michael Wedding"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  {/* Slug Preview with Tooltip */}
                  {slugPreview && (
                    <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200/50 dark:border-amber-500/20">
                      <Share2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">Share Link:</span>
                          <Tooltip content="This is the URL that will be shared with your clients to view this gallery" side="top">
                            <Info className="h-3 w-3 text-zinc-400 dark:text-zinc-500 cursor-help" />
                          </Tooltip>
                        </div>
                        <code className="font-mono text-xs text-amber-700 dark:text-amber-300 break-all">
                          yoursite.com/{slugPreview}
                        </code>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Event Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <textarea
                    placeholder="Add a description for this event..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none"
                  />
                </div>
              </TabsContent>

              {/* Access Tab */}
              <TabsContent value="access" className="space-y-4 mt-0">
                <RadioGroup value={formData.accessType} onValueChange={(v) => setFormData({ ...formData, accessType: v })}>
                  <div className={`flex items-center space-x-3 p-3 rounded-lg border ${formData.accessType === 'OPEN' ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'border-zinc-200 dark:border-zinc-700'}`}>
                    <RadioGroupItem value="OPEN" id="open" />
                    <Label htmlFor="open" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-green-500 dark:text-green-400" />
                        <span className="font-medium text-zinc-900 dark:text-white">Open (Public)</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">Anyone with the link can view</p>
                    </Label>
                  </div>
                  <div className={`flex items-center space-x-3 p-3 rounded-lg border ${formData.accessType === 'PASSWORD' ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'border-zinc-200 dark:border-zinc-700'}`}>
                    <RadioGroupItem value="PASSWORD" id="password" />
                    <Label htmlFor="password" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                        <span className="font-medium text-zinc-900 dark:text-white">Password Protected</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">Require password to view</p>
                    </Label>
                  </div>
                </RadioGroup>
                {formData.accessType === 'PASSWORD' && (
                  <div className="space-y-2 pt-2">
                    <Label>Gallery Password</Label>
                    <Input
                      placeholder="Enter password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                )}
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-3 mt-0">
                <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Droplet className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                      <div>
                        <p className="font-medium text-sm text-zinc-900 dark:text-white">Watermark Photos</p>
                        <p className="text-xs text-zinc-500">Add your watermark to photos</p>
                      </div>
                    </div>
                    <Switch checked={formData.watermarkEnabled} onCheckedChange={(v) => setFormData({ ...formData, watermarkEnabled: v })} />
                  </div>
                  {formData.watermarkEnabled && (
                    <div className="pl-8 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Type className="h-3 w-3" />
                        <span>Custom text (optional - uses your profile watermark if empty)</span>
                      </div>
                      <Input
                        placeholder="e.g., © John Doe Photography"
                        value={formData.watermarkText}
                        onChange={(e) => setFormData({ ...formData, watermarkText: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30">
                  <div className="flex items-center gap-3">
                    <Download className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                    <div>
                      <p className="font-medium text-sm text-zinc-900 dark:text-white">Allow Downloads</p>
                      <p className="text-xs text-zinc-500">Clients can download photos</p>
                    </div>
                  </div>
                  <Switch checked={formData.allowDownloads} onCheckedChange={(v) => setFormData({ ...formData, allowDownloads: v })} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                    <div>
                      <p className="font-medium text-sm text-zinc-900 dark:text-white">Allow Comments & Likes</p>
                      <p className="text-xs text-zinc-500">Clients can interact with photos</p>
                    </div>
                  </div>
                  <Switch checked={formData.allowComments} onCheckedChange={(v) => setFormData({ ...formData, allowComments: v, allowLikes: v })} />
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Submit */}
        <div className="flex gap-3 justify-end mt-6">
          <Link href="/photographer/events">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || !canSubmit} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
            <Save className="h-4 w-4" />
            {isSubmitting ? 'Creating...' : 'Create Event'}
          </Button>
        </div>
      </form>
    </div>
  );
}

