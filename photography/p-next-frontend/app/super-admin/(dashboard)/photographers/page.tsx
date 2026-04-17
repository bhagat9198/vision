'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, MoreVertical, UserCheck, UserX, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Photographer {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  subscription: string;
  isActive: boolean;
  storageUsed: number;
  storageLimit: number;
  eventsCount: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function PhotographersPage() {
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPhotographers = useCallback(async (page = 1, searchQuery = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('superAdminToken');
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`http://localhost:4000/api/v1/super-admin/photographers?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setPhotographers(result.data.photographers);
        setPagination(result.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch photographers', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotographers();
  }, [fetchPhotographers]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchPhotographers(1, search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, fetchPhotographers]);

  const toggleStatus = async (id: string) => {
    setActionLoading(id);
    try {
      const token = localStorage.getItem('superAdminToken');
      const res = await fetch(`http://localhost:4000/api/v1/super-admin/photographers/${id}/toggle-status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) {
        setPhotographers((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isActive: result.data.isActive } : p))
        );
      }
    } catch (err) {
      console.error('Failed to toggle status', err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatStorage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Manage Photographers</h2>
          <p className="text-sm text-slate-400">View and manage all registered photographers</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search photographers..."
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
                  <th className="text-left text-xs font-medium text-slate-400 uppercase px-6 py-4">Photographer</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase px-6 py-4">Plan</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase px-6 py-4">Events</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase px-6 py-4">Storage</th>
                  <th className="text-left text-xs font-medium text-slate-400 uppercase px-6 py-4">Status</th>
                  <th className="text-right text-xs font-medium text-slate-400 uppercase px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading...</td></tr>
                ) : photographers.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">No photographers found</td></tr>
                ) : (
                  photographers.map((p) => (
                    <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{p.name}</p>
                            <p className="text-xs text-slate-500">{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${p.subscription === 'PRO' ? 'bg-purple-500/20 text-purple-400' : p.subscription === 'BUSINESS' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'}`}>
                          {p.subscription}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">{p.eventsCount}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">{formatStorage(p.storageUsed)} / {formatStorage(p.storageLimit)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => toggleStatus(p.id)} disabled={actionLoading === p.id} className="text-slate-400 hover:text-white mr-2">
                          {p.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.location.href = `/super-admin/photographers/${p.id}`} className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
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
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} photographers
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPhotographers(pagination.page - 1, search)}
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
              onClick={() => fetchPhotographers(pagination.page + 1, search)}
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

