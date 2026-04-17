'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Calendar, Image, Trash2, Edit, Eye, ChevronLeft, ChevronRight, Link2, Folder, ImageIcon, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Event {
  id: string;
  displayId: number;
  slug: string;
  name: string;
  date: string;
  status: string;
  coverPhoto: string | null;
  _count: { photos: number; albums: number };
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
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; eventId: string | null; eventName: string }>({
    open: false,
    eventId: null,
    eventName: '',
  });
  const [deleting, setDeleting] = useState(false);

  const fetchEvents = useCallback(async (page = 1, searchQuery = '', status = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('photographerToken');
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (searchQuery) params.append('search', searchQuery);
      if (status) params.append('status', status);

      const res = await fetch(`http://localhost:4000/api/v1/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setEvents(result.data);
        if (result.meta) {
          setPagination(result.meta);
        }
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
      fetchEvents(1, search, statusFilter);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, statusFilter, fetchEvents]);

  const openDeleteConfirm = (id: string, name: string) => {
    setDeleteConfirm({ open: true, eventId: id, eventName: name });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ open: false, eventId: null, eventName: '' });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.eventId) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('photographerToken');
      await fetch(`http://localhost:4000/api/v1/events/${deleteConfirm.eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchEvents(pagination.page, search, statusFilter);
      closeDeleteConfirm();
    } catch (err) {
      console.error('Failed to delete event', err);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Events</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Manage your photography events</p>
        </div>
        <Link href="/photographer/events/new">
          <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="text-zinc-500 dark:text-zinc-400 text-center py-12">Loading events...</div>
      ) : events.length === 0 ? (
        <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Calendar className="h-12 w-12 text-zinc-400 dark:text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">No events yet</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-center mb-4">Create your first event to start uploading photos</p>
            <Link href="/photographer/events/new">
              <Button className="bg-amber-500 hover:bg-amber-600 text-white">Create Event</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {events.map((event) => (
            <Card key={event.id} className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 overflow-hidden group hover:border-amber-500/50 transition-colors">
              <Link href={`/photographer/events/${event.displayId}`}>
                <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-800">
                  {event.coverPhoto ? (
                    <img src={event.coverPhoto} alt={event.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                    </div>
                  )}
                  {/* Status badge */}
                  <span className={`absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded font-medium ${event.status === 'PUBLISHED' ? 'bg-green-500 text-white' :
                    event.status === 'DRAFT' ? 'bg-yellow-500 text-white' :
                      'bg-zinc-500 text-white'
                    }`}>
                    {event.status}
                  </span>
                </div>
              </Link>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link href={`/photographer/events/${event.displayId}`}>
                      <h3 className="font-medium text-zinc-900 dark:text-white truncate hover:text-amber-500 transition-colors">{event.name}</h3>
                    </Link>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">{formatDate(event.date)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Link href={`/photographer/events/${event.displayId}/settings`}>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Edit className="h-3.5 w-3.5" /></Button>
                    </Link>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" onClick={(e) => { e.preventDefault(); openDeleteConfirm(String(event.displayId), event.name); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {/* Slug */}
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                  <Link2 className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">/{event.slug}</span>
                </div>
                {/* Stats */}
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" />{event._count?.photos || 0}</span>
                  <span className="flex items-center gap-1"><Folder className="h-3 w-3" />{event._count?.albums || 0}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} events
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEvents(pagination.page - 1, search, statusFilter)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEvents(pagination.page + 1, search, statusFilter)}
              disabled={pagination.page >= pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm.open} onOpenChange={(open) => !open && closeDeleteConfirm()}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 mb-2">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-center">Delete Event</DialogTitle>
            <DialogDescription className="text-center">
              Are you sure you want to delete <span className="font-semibold text-zinc-900 dark:text-white">&quot;{deleteConfirm.eventName}&quot;</span>? This action cannot be undone and all photos and albums within this event will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2 mt-4">
            <Button variant="outline" onClick={closeDeleteConfirm} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

