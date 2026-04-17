'use client';

import { useState, useEffect } from 'react';
import { Users, Calendar, Image, FolderOpen, TrendingUp, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardStats {
  stats: {
    photographers: { total: number; active: number };
    events: { total: number; published: number };
    photos: number;
    albums: number;
  };
  recentPhotographers: Array<{
    id: string;
    name: string;
    email: string;
    subscription: string;
    isActive: boolean;
    createdAt: string;
    eventsCount: number;
  }>;
  recentEvents: Array<{
    id: string;
    name: string;
    status: string;
    date: string;
    photographerName: string;
    photosCount: number;
    albumsCount: number;
  }>;
}

export default function SuperAdminDashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('superAdminToken');
      const res = await fetch('http://localhost:4000/api/v1/super-admin/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-slate-500 dark:text-slate-400">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-red-500 dark:text-red-400">{error}</div>;
  }

  const stats = [
    { name: 'Total Photographers', value: data?.stats.photographers.total || 0, icon: Users, color: 'from-blue-500 to-cyan-500' },
    { name: 'Active Photographers', value: data?.stats.photographers.active || 0, icon: UserCheck, color: 'from-green-500 to-emerald-500' },
    { name: 'Total Events', value: data?.stats.events.total || 0, icon: Calendar, color: 'from-purple-500 to-pink-500' },
    { name: 'Published Events', value: data?.stats.events.published || 0, icon: TrendingUp, color: 'from-orange-500 to-amber-500' },
    { name: 'Total Photos', value: data?.stats.photos || 0, icon: Image, color: 'from-indigo-500 to-violet-500' },
    { name: 'Total Albums', value: data?.stats.albums || 0, icon: FolderOpen, color: 'from-rose-500 to-red-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{stat.name}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stat.value.toLocaleString()}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Photographers */}
        <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">Recent Photographers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.recentPhotographers.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${p.isActive ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">{p.eventsCount} events</p>
                  </div>
                </div>
              ))}
              {(!data?.recentPhotographers || data.recentPhotographers.length === 0) && (
                <p className="text-slate-500 text-sm text-center py-4">No photographers yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">Recent Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.recentEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{e.name}</p>
                    <p className="text-xs text-slate-500">by {e.photographerName}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${e.status === 'PUBLISHED' ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'}`}>
                      {e.status}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">{e.photosCount} photos</p>
                  </div>
                </div>
              ))}
              {(!data?.recentEvents || data.recentEvents.length === 0) && (
                <p className="text-slate-500 text-sm text-center py-4">No events yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

