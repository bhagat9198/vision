'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Upload, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Photo {
  id: string;
  displayId: number;
  url: string;
  thumbnail: string;
  originalName?: string;
}

export default function PhotosPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const [eventName, setEventName] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('photographerToken');
      try {
        const [eventRes, photosRes] = await Promise.all([
          fetch(`http://localhost:4000/api/v1/events/${eventId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`http://localhost:4000/api/v1/photos/event/${eventId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        
        const eventData = await eventRes.json();
        const photosData = await photosRes.json();
        
        if (eventData.success) setEventName(eventData.data.name);
        if (photosData.success) setPhotos(photosData.data || []);
      } catch (err) {
        console.error('Failed to fetch photos:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedIds.length === photos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(photos.map(p => p.id));
    }
  };

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selectedIds.length} photo(s)?`)) return;
    setDeleting(true);
    const token = localStorage.getItem('photographerToken');
    
    for (const id of selectedIds) {
      await fetch(`http://localhost:4000/api/v1/photos/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    
    setPhotos(prev => prev.filter(p => !selectedIds.includes(p.id)));
    setSelectedIds([]);
    setDeleting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/photographer/events/${eventId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Photos</h1>
            <p className="text-zinc-500 dark:text-zinc-400">{eventName} • {photos.length} photos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button variant="destructive" onClick={deleteSelected} disabled={deleting} className="gap-2">
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting...' : `Delete (${selectedIds.length})`}
            </Button>
          )}
          <Link href={`/photographer/events/${eventId}/upload`}>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
              <Upload className="h-4 w-4" /> Upload
            </Button>
          </Link>
        </div>
      </div>

      {/* Selection Bar */}
      {photos.length > 0 && (
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={selectAll}>
            {selectedIds.length === photos.length ? 'Deselect All' : 'Select All'}
          </Button>
          {selectedIds.length > 0 && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{selectedIds.length} selected</span>
          )}
        </div>
      )}

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-16 w-16 mx-auto text-zinc-400 dark:text-zinc-600 mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400 mb-4">No photos uploaded yet</p>
            <Link href={`/photographer/events/${eventId}/upload`}>
              <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                <Upload className="h-4 w-4 mr-2" /> Upload Photos
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => toggleSelect(photo.id)}
              className={`aspect-square rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 cursor-pointer relative group ${selectedIds.includes(photo.id) ? 'ring-2 ring-amber-500' : ''}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.thumbnail || photo.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className={`absolute inset-0 transition-colors ${selectedIds.includes(photo.id) ? 'bg-amber-500/30' : 'group-hover:bg-black/30'}`} />
              <div className={`absolute top-2 left-2 w-5 h-5 rounded border-2 ${selectedIds.includes(photo.id) ? 'bg-amber-500 border-amber-500' : 'border-white/50'}`}>
                {selectedIds.includes(photo.id) && <span className="text-white text-xs flex items-center justify-center h-full">✓</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

