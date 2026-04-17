'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Camera, Image as ImageIcon, HardDrive, Eye, Download, Heart, MessageSquare, Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Stats {
  totalEvents: number;
  totalPhotos: number;
  totalAlbums: number;
  storageUsed: number;
  storageLimit: number;
  totalViews: number;
  totalDownloads: number;
  totalLikes: number;
  totalComments: number;
}

interface RecentEvent {
  id: string;
  displayId: number;
  name: string;
  date: string;
  status: string;
  coverPhoto: string | null;
  _count: { photos: number };
}

export default function PhotographerDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('photographerToken');
    try {
      const [statsRes, eventsRes] = await Promise.all([
        fetch('http://localhost:4000/api/v1/photographers/me/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:4000/api/v1/events?limit=5', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const statsData = await statsRes.json();
      const eventsData = await eventsRes.json();

      if (statsData.success) setStats(statsData.data);
      if (eventsData.success) setRecentEvents(eventsData.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const formatStorage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  if (loading) {
    return <div className="text-zinc-500 dark:text-zinc-400">Loading dashboard...</div>;
  }

  const statCards = [
    { name: 'Total Events', value: stats?.totalEvents || 0, icon: Camera, color: 'from-amber-500 to-orange-500' },
    { name: 'Total Photos', value: stats?.totalPhotos || 0, icon: ImageIcon, color: 'from-blue-500 to-cyan-500' },
    { name: 'Total Views', value: stats?.totalViews || 0, icon: Eye, color: 'from-purple-500 to-pink-500' },
    { name: 'Total Downloads', value: stats?.totalDownloads || 0, icon: Download, color: 'from-green-500 to-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Overview of your photography business</p>
        </div>
        <Link href="/photographer/events/new">
          <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.name} className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{stat.name}</p>
                  <p className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">{stat.value.toLocaleString()}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Storage & Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <HardDrive className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
              <span className="text-zinc-500 dark:text-zinc-400">Storage Usage</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">
              {formatStorage(stats?.storageUsed || 0)}
              <span className="text-sm text-zinc-500 font-normal"> / {formatStorage(stats?.storageLimit || 0)}</span>
            </p>
            <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${Math.min(((stats?.storageUsed || 0) / (stats?.storageLimit || 1)) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
              <Heart className="h-6 w-6 text-rose-500 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{(stats?.totalLikes || 0).toLocaleString()}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Likes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{(stats?.totalComments || 0).toLocaleString()}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Comments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-zinc-900 dark:text-white">Recent Events</CardTitle>
          <Link href="/photographer/events" className="text-sm text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300">View all</Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentEvents.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No events yet. Create your first event!</p>
            ) : (
              recentEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/photographer/events/${event.displayId}`}
                  className="flex items-center gap-4 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden">
                    {event.coverPhoto ? (
                      <img src={event.coverPhoto} alt={event.name} className="w-full h-full object-cover" />
                    ) : (
                      <Calendar className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-white truncate">{event.name}</p>
                    <p className="text-xs text-zinc-500">{event._count?.photos || 0} photos</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    event.status === 'PUBLISHED' ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' :
                    event.status === 'DRAFT' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                    'bg-zinc-200 dark:bg-zinc-500/20 text-zinc-600 dark:text-zinc-400'
                  }`}>
                    {event.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

