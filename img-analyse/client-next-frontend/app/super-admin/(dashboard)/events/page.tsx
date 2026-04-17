'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface Event {
  id: string;
  name: string;
  status: string;
  date: string;
  createdAt: string;
  photographerName: string;
  photosCount: number;
  albumsCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async (page = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('superAdminToken');
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`http://localhost:4000/api/v1/super-admin/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setEvents(result.data.events);
        setPagination(result.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch events', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchEvents(1, search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, fetchEvents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">All Events</h2>
          <p className="text-sm text-slate-400">View and manage all events across photographers</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-xs font-medium text-slate-400 uppercase px-6 py-4">Event Name</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase px-6 py-4">Photographer</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase px-6 py-4">Date</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase px-6 py-4">Status</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase px-6 py-4">Stats</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">Loading...</td></tr>
                ) : events.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">No events found</td></tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{event.name}</p>
                            <p className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">{event.photographerName}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">{new Date(event.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${event.status === 'PUBLISHED' ? 'bg-green-500/20 text-green-400' :
                          event.status === 'ARCHIVED' ? 'bg-slate-500/20 text-slate-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {event.photosCount} photos · {event.albumsCount} albums
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="outline" size="sm" onClick={() => window.location.href = `/super-admin/events/${event.id}`} className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} events
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEvents(pagination.page - 1, search)}
              disabled={pagination.page <= 1}
              className="border-slate-700 text-slate-400"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEvents(pagination.page + 1, search)}
              disabled={pagination.page >= pagination.totalPages}
              className="border-slate-700 text-slate-400"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

