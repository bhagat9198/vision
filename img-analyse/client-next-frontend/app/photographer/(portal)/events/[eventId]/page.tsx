'use client';

import { use, useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Settings, Calendar, Image as ImageIcon, Share2, Eye, FolderPlus, Folder, ChevronRight, MoreVertical, Trash2, Edit2, Loader2, Grid, List, Check, X, CloudUpload, FileImage, Minimize2, Maximize2, Play, Download, Info, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import Lightbox from 'yet-another-react-lightbox';
import Video from 'yet-another-react-lightbox/plugins/video';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import JSZip from 'jszip';

const API_URL = 'http://localhost:4000/api/v1';
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const CONCURRENT_UPLOADS = 4;

interface Event {
  id: string;
  displayId: number;
  name: string;
  slug: string;
  date: string;
  status: string;
  coverPhoto?: string;
  description?: string;
  _count?: { photos: number; albums: number };
}

interface Album {
  id: string;
  displayId: number;
  name: string;
  coverPhoto?: string;
  parentId?: string | null;
  _count?: { photos: number; children: number };
}

interface Photo {
  id: string;
  displayId: number;
  url: string;
  thumbnail: string;
  originalName: string;
  albumId?: string | null;
  fileSize?: number | string;
  width?: number;
  height?: number;
  metadata?: { isVideo?: boolean; mimeType?: string } | null;
}

// Helper to format file size
function formatFileSize(bytes: number | string | undefined): string {
  if (!bytes) return '0 B';
  const numBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (isNaN(numBytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = numBytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

interface UploadFile {
  file: File;
  localId: string;
  serverId?: string;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
  totalChunks: number;
  uploadedChunks: number;
}

export default function EventFileBrowserPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Pagination state for infinite scroll
  const [photosPage, setPhotosPage] = useState(1);
  const [hasMorePhotos, setHasMorePhotos] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const PHOTOS_PER_PAGE = 50;
  const [currentAlbum, setCurrentAlbum] = useState<Album | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop + Upload states
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadPanelMinimized, setUploadPanelMinimized] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const dragCounter = useRef(0);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Info slide-over state
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; photoId: string } | null>(null);

  // Drag select (marquee) state
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const photoRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Download progress state
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchData = useCallback(async (albumId?: string, page = 1, append = false) => {
    const token = localStorage.getItem('photographerToken');
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setPhotosPage(1);
        setHasMorePhotos(true);
      }

      // Build photos query params with pagination
      const photosParams = new URLSearchParams();
      photosParams.set('page', String(page));
      photosParams.set('limit', String(PHOTOS_PER_PAGE));
      if (albumId) {
        photosParams.set('albumId', albumId);
      } else {
        photosParams.set('rootOnly', 'true');
      }

      // When inside an album, fetch only its children; at root level fetch root albums
      const albumsParentParam = albumId ? `?parentId=${albumId}` : '?parentId=null';
      const [eventRes, albumsRes, photosRes] = await Promise.all([
        fetch(`http://localhost:4000/api/v1/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`http://localhost:4000/api/v1/albums/event/${eventId}${albumsParentParam}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`http://localhost:4000/api/v1/photos/event/${eventId}?${photosParams}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const eventData = await eventRes.json();
      const albumsData = await albumsRes.json();
      const photosData = await photosRes.json();

      if (eventData.success) setEvent(eventData.data);
      if (albumsData.success) setAlbums(albumsData.data || []);
      if (photosData.success) {
        const newPhotos = photosData.data || [];
        const meta = photosData.meta || {};
        const total = meta.total || 0;

        if (append) {
          setPhotos(prev => {
            const combined = [...prev, ...newPhotos];
            setHasMorePhotos(combined.length < total);
            return combined;
          });
        } else {
          setPhotos(newPhotos);
          setHasMorePhotos(newPhotos.length < total);
        }

        setTotalPhotos(total);
        setPhotosPage(page);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [eventId, PHOTOS_PER_PAGE]);

  // Load more photos for infinite scroll
  const loadMorePhotos = useCallback(() => {
    if (loadingMore || !hasMorePhotos) return;
    fetchData(currentAlbum?.id, photosPage + 1, true);
  }, [fetchData, currentAlbum?.id, photosPage, loadingMore, hasMorePhotos]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMorePhotos && !loadingMore && !loading) {
          loadMorePhotos();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMorePhotos, loadingMore, loading, loadMorePhotos]);

  useEffect(() => {
    fetchData(currentAlbum?.id);
  }, [fetchData, currentAlbum?.id]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !event) return;
    const token = localStorage.getItem('photographerToken');
    try {
      const res = await fetch(`http://localhost:4000/api/v1/albums/event/${event.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newFolderName,
          parentId: currentAlbum?.id || null, // Support nested folders
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Refetch to get the updated list (handles nested folder filtering)
        fetchData(currentAlbum?.id);
        setNewFolderName('');
        setCreatingFolder(false);
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    if (!confirm('Delete this folder and all its photos?')) return;
    const token = localStorage.getItem('photographerToken');
    try {
      await fetch(`${API_URL}/albums/${albumId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlbums(albums.filter(a => a.id !== albumId));
    } catch (err) {
      console.error('Failed to delete album:', err);
    }
  };

  const navigateToAlbum = (album: Album | null) => {
    setCurrentAlbum(album);
    setSelectedItems(new Set());
  };

  // ============ DRAG AND DROP + UPLOAD FUNCTIONS ============
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      addFilesToUpload(Array.from(files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFilesToUpload(Array.from(files));
    }
    e.target.value = '';
  };

  const addFilesToUpload = (files: File[]) => {
    // Accept both images and videos
    const mediaFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    const newUploadFiles: UploadFile[] = mediaFiles.map(file => ({
      file,
      localId: Math.random().toString(36).substr(2, 9),
      status: 'pending' as const,
      progress: 0,
      totalChunks: Math.ceil(file.size / CHUNK_SIZE),
      uploadedChunks: 0,
    }));
    setUploadFiles(prev => [...prev, ...newUploadFiles]);
  };

  const removeUploadFile = (localId: string) => {
    setUploadFiles(prev => prev.filter(f => f.localId !== localId));
  };

  const clearCompletedUploads = () => {
    setUploadFiles(prev => prev.filter(f => f.status !== 'success'));
    if (uploadFiles.every(f => f.status === 'success')) {
      setSessionId(null);
    }
  };

  // Upload a single chunk
  const uploadChunk = async (sid: string, fileId: string, chunkIndex: number, chunk: Blob) => {
    const token = localStorage.getItem('photographerToken');
    const formData = new FormData();
    formData.append('chunk', chunk);
    const res = await fetch(`${API_URL}/uploads/${sid}/files/${fileId}/chunks/${chunkIndex}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return res.ok;
  };

  // Upload a single file in chunks
  const uploadSingleFile = async (sid: string, fileId: string, file: File, localId: string) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const success = await uploadChunk(sid, fileId, i, chunk);
      if (!success) throw new Error(`Chunk ${i} failed`);
      const progress = Math.round(((i + 1) / totalChunks) * 80);
      setUploadFiles(prev => prev.map(f => f.localId === localId ? { ...f, progress, uploadedChunks: i + 1 } : f));
    }
  };

  // Poll session status
  const pollStatus = async (sid: string) => {
    const token = localStorage.getItem('photographerToken');
    const res = await fetch(`${API_URL}/uploads/${sid}/status?includeFiles=true`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      const serverFiles = data.data.files || [];
      setUploadFiles(prev => prev.map(f => {
        const serverFile = serverFiles.find((sf: { originalName: string }) => sf.originalName === f.file.name);
        if (serverFile) {
          if (serverFile.status === 'COMPLETED') return { ...f, status: 'success', progress: 100 };
          if (serverFile.status === 'FAILED') return { ...f, status: 'error', error: serverFile.errorMessage };
          if (serverFile.status === 'PROCESSING' || serverFile.status === 'UPLOADED') {
            return { ...f, status: 'processing', progress: 90 };
          }
        }
        return f;
      }));
      // If all done, stop polling and refresh photos
      const allDone = serverFiles.every((sf: { status: string }) => sf.status === 'COMPLETED' || sf.status === 'FAILED');
      if (allDone && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setIsUploading(false);
        fetchData(currentAlbum?.id);
      }
    }
  };

  // Start upload
  const startUpload = async () => {
    console.log('[Upload] Starting upload, uploadFiles:', uploadFiles.length);
    if (uploadFiles.length === 0) return;
    setIsUploading(true);
    const token = localStorage.getItem('photographerToken');
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
    console.log('[Upload] Pending files:', pendingFiles.length, pendingFiles.map(f => f.file.name));

    if (pendingFiles.length === 0) {
      console.log('[Upload] No pending files to upload');
      setIsUploading(false);
      return;
    }

    // 1. Initialize upload session
    console.log('[Upload] Initializing session...');
    const initRes = await fetch(`${API_URL}/uploads/init`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        albumId: currentAlbum?.id || null,
        files: pendingFiles.map(f => ({ name: f.file.name, size: f.file.size, type: f.file.type })),
      }),
    });
    const initData = await initRes.json();
    console.log('[Upload] Init response:', initData);
    if (!initData.success) {
      console.error('[Upload] Init failed:', initData);
      setIsUploading(false);
      return;
    }
    const sid = initData.data.sessionId;
    const serverFiles = initData.data.files;
    console.log('[Upload] Session ID:', sid, 'Server files:', serverFiles);
    setSessionId(sid);

    // Map server file IDs (backend returns fileId, not id)
    setUploadFiles(prev => prev.map(f => {
      const sf = serverFiles.find((s: { originalName: string }) => s.originalName === f.file.name);
      return sf ? { ...f, serverId: sf.fileId, status: 'uploading' } : f;
    }));

    // 2. Upload files in parallel (limited concurrency)
    // Match by originalName to ensure correct fileId mapping
    const uploadQueue = pendingFiles.map((f) => {
      const sf = serverFiles.find((s: { originalName: string }) => s.originalName === f.file.name);
      return { ...f, serverId: sf?.fileId };
    });

    const chunks = [];
    for (let i = 0; i < uploadQueue.length; i += CONCURRENT_UPLOADS) {
      chunks.push(uploadQueue.slice(i, i + CONCURRENT_UPLOADS));
    }
    for (const chunk of chunks) {
      await Promise.all(chunk.map(async (f) => {
        if (!f.serverId) {
          console.error('No serverId for file:', f.file.name);
          return;
        }
        try {
          await uploadSingleFile(sid, f.serverId, f.file, f.localId);
          // Complete file upload
          await fetch(`${API_URL}/uploads/${sid}/files/${f.serverId}/complete`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          setUploadFiles(prev => prev.map(uf => uf.localId === f.localId ? { ...uf, status: 'processing', progress: 90 } : uf));
        } catch (err) {
          console.error('Upload error for', f.file.name, err);
          setUploadFiles(prev => prev.map(uf => uf.localId === f.localId ? { ...uf, status: 'error', error: 'Upload failed' } : uf));
        }
      }));
    }

    // 3. Start polling for processing status
    pollingRef.current = setInterval(() => pollStatus(sid), 2000);
  };

  // Auto-start upload when files are added
  useEffect(() => {
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length > 0 && !isUploading) {
      startUpload();
    }
  }, [uploadFiles.length]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  if (loading && !event) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500 dark:text-zinc-400">
        <p>Event not found</p>
        <Link href="/photographer/events" className="text-amber-500 mt-2">Back to Events</Link>
      </div>
    );
  }

  // Calculate upload stats
  const uploadStats = {
    total: uploadFiles.length,
    pending: uploadFiles.filter(f => f.status === 'pending').length,
    uploading: uploadFiles.filter(f => f.status === 'uploading').length,
    processing: uploadFiles.filter(f => f.status === 'processing').length,
    success: uploadFiles.filter(f => f.status === 'success').length,
    error: uploadFiles.filter(f => f.status === 'error').length,
  };
  const overallProgress = uploadStats.total > 0
    ? Math.round((uploadStats.success / uploadStats.total) * 100)
    : 0;

  // ============ SELECTION FUNCTIONS ============
  const toggleSelection = (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedItems(new Set(photos.map(p => p.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  // Zip download for multiple files, single file direct download
  const handleDownloadSelected = async () => {
    const token = localStorage.getItem('photographerToken');
    const selectedPhotos = photos.filter(p => selectedItems.has(p.id));

    if (selectedPhotos.length === 0) return;

    setIsDownloading(true);
    try {
      if (selectedPhotos.length === 1) {
        // Single file: direct download
        const photo = selectedPhotos[0];
        const response = await fetch(photo.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = photo.originalName || `photo-${photo.displayId}`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Multiple files: create zip
        const zip = new JSZip();
        for (const photo of selectedPhotos) {
          try {
            const response = await fetch(photo.url);
            const blob = await response.blob();
            const fileName = photo.originalName || `photo-${photo.displayId}`;
            zip.file(fileName, blob);
          } catch (err) {
            console.error(`Failed to add ${photo.originalName}:`, err);
          }
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = window.URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `media-${new Date().toISOString().slice(0, 10)}.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selectedItems.size} item(s)?`)) return;
    const token = localStorage.getItem('photographerToken');
    for (const photoId of selectedItems) {
      try {
        await fetch(`${API_URL}/photos/${photoId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
    clearSelection();
    setInfoPanelOpen(false);
    fetchData(currentAlbum?.id);
  };

  const handleShowInfo = () => {
    setInfoPanelOpen(true);
  };

  // ============ CONTEXT MENU ============
  const handleContextMenu = (e: React.MouseEvent, photoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    // If right-clicking on an unselected item, select only that item
    if (!selectedItems.has(photoId)) {
      setSelectedItems(new Set([photoId]));
    }
    setContextMenu({ x: e.clientX, y: e.clientY, photoId });
  };

  const closeContextMenu = () => setContextMenu(null);

  // ============ DRAG SELECT (MARQUEE) ============
  const handleDragSelectStart = (e: React.MouseEvent) => {
    // Only start drag select on empty area (not on photos)
    if ((e.target as HTMLElement).closest('[data-photo-id]')) return;
    if (e.button !== 0) return; // Only left click

    const rect = contentAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsDragSelecting(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragCurrent({ x: e.clientX, y: e.clientY });

    // Clear selection unless shift is held
    if (!e.shiftKey) {
      setSelectedItems(new Set());
    }
  };

  const handleDragSelectMove = (e: React.MouseEvent) => {
    if (!isDragSelecting || !dragStart) return;
    setDragCurrent({ x: e.clientX, y: e.clientY });

    // Calculate selection box
    const minX = Math.min(dragStart.x, e.clientX);
    const maxX = Math.max(dragStart.x, e.clientX);
    const minY = Math.min(dragStart.y, e.clientY);
    const maxY = Math.max(dragStart.y, e.clientY);

    // Find photos within the selection box
    const newSelection = new Set<string>();
    photoRefs.current.forEach((el, id) => {
      const rect = el.getBoundingClientRect();
      const photoMidX = rect.left + rect.width / 2;
      const photoMidY = rect.top + rect.height / 2;

      if (photoMidX >= minX && photoMidX <= maxX && photoMidY >= minY && photoMidY <= maxY) {
        newSelection.add(id);
      }
    });
    setSelectedItems(newSelection);
  };

  const handleDragSelectEnd = () => {
    setIsDragSelecting(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  // Get selection box style for marquee
  const getSelectionBoxStyle = () => {
    if (!isDragSelecting || !dragStart || !dragCurrent) return {};
    return {
      left: Math.min(dragStart.x, dragCurrent.x),
      top: Math.min(dragStart.y, dragCurrent.y),
      width: Math.abs(dragCurrent.x - dragStart.x),
      height: Math.abs(dragCurrent.y - dragStart.y),
    };
  };

  // Get selected photos for info panel
  const selectedPhotos = photos.filter(p => selectedItems.has(p.id));

  return (
    <div
      className="h-screen flex flex-col select-none"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => { closeContextMenu(); }}
      onMouseUp={handleDragSelectEnd}
    >
      {/* Marquee Selection Box */}
      {isDragSelecting && dragStart && dragCurrent && (
        <div
          className="fixed border-2 border-amber-500 bg-amber-500/10 pointer-events-none z-50"
          style={getSelectionBoxStyle()}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2"
            onClick={() => { handleShowInfo(); closeContextMenu(); }}
          >
            <Info className="h-4 w-4" /> Info
          </button>
          <button
            className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2"
            onClick={() => { handleDownloadSelected(); closeContextMenu(); }}
          >
            <Download className="h-4 w-4" /> Download
          </button>
          <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1" />
          <button
            className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2"
            onClick={() => { handleDeleteSelected(); closeContextMenu(); }}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header Bar with Event Name */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <Link href="/photographer/events">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-lg font-semibold text-zinc-900 dark:text-white">
              <span>{event.name}</span>
              {currentAlbum && (
                <>
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                  <span>{currentAlbum.name}</span>
                </>
              )}
            </div>
            <span className={`px-2 py-0.5 rounded text-xs ${event.status === 'ACTIVE' ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'}`}>
              {event.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Calendar className="h-4 w-4" />
            {new Date(event.date).toLocaleDateString()}
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
        <div className="flex items-center gap-2">
          <Button onClick={() => fileInputRef.current?.click()} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
            <Upload className="h-4 w-4" /> Upload
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCreatingFolder(true)} className="gap-2">
            <FolderPlus className="h-4 w-4" /> New Folder
          </Button>
          <div className="h-5 w-px bg-zinc-300 dark:bg-zinc-700 mx-1" />
          <Link href={event?.slug ? `/event/${event.slug}` : `/event/${eventId}`} target="_blank">
            <Button variant="ghost" size="sm" className="gap-1">
              <Eye className="h-4 w-4" /> Preview
            </Button>
          </Link>
          <Link href={`/photographer/events/${eventId}/sharing`}>
            <Button variant="ghost" size="sm" className="gap-1">
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </Link>
          <Link href={`/photographer/events/${eventId}/settings`}>
            <Button variant="ghost" size="sm" className="gap-1">
              <Settings className="h-4 w-4" /> Settings
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400 mr-4">
            <button onClick={() => navigateToAlbum(null)} className={`hover:text-amber-500 ${!currentAlbum ? 'text-zinc-900 dark:text-white font-medium' : ''}`}>
              Root
            </button>
            {currentAlbum && (
              <>
                <ChevronRight className="h-4 w-4" />
                <span className="text-zinc-900 dark:text-white font-medium">{currentAlbum.name}</span>
              </>
            )}
          </div>
          <div className="h-5 w-px bg-zinc-300 dark:bg-zinc-700" />
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}>
            <Grid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selection Action Bar */}
      {selectedItems.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-amber-50 dark:bg-amber-500/10">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8 gap-1">
              <X className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              {selectedItems.size} selected
            </span>
          </div>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={selectAll} className="h-8 gap-1 text-zinc-600 dark:text-zinc-400">
            <CheckSquare className="h-4 w-4" /> Select All
          </Button>
          <div className="h-5 w-px bg-zinc-300 dark:bg-zinc-700" />
          <Button variant="ghost" size="sm" onClick={handleDownloadSelected} disabled={isDownloading} className="h-8 gap-1 text-zinc-600 dark:text-zinc-400">
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isDownloading ? 'Downloading...' : selectedItems.size > 1 ? 'Download Zip' : 'Download'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleShowInfo} className="h-8 gap-1 text-zinc-600 dark:text-zinc-400">
            <Info className="h-4 w-4" /> Info
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDeleteSelected} className="h-8 gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      )}

      {/* New Folder Input */}
      {creatingFolder && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-amber-50 dark:bg-amber-500/10">
          <Folder className="h-5 w-5 text-amber-500" />
          <Input
            autoFocus
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateFolder();
              } else if (e.key === 'Escape') {
                setCreatingFolder(false);
                setNewFolderName('');
              }
            }}
            className="flex-1 h-8"
          />
          <Button size="icon-sm" variant="ghost" onClick={handleCreateFolder} className="shrink-0">
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => { setCreatingFolder(false); setNewFolderName(''); }} className="shrink-0">
            <X className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      )}

      {/* Main Content Area - Dropzone with drag-select support */}
      <div
        ref={contentAreaRef}
        className={`flex-1 overflow-auto p-4 relative transition-colors ${isDragging ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-white dark:bg-zinc-950'}`}
        onMouseDown={handleDragSelectStart}
        onMouseMove={handleDragSelectMove}
        onMouseUp={handleDragSelectEnd}
        onMouseLeave={handleDragSelectEnd}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-amber-50/90 dark:bg-amber-900/30 border-2 border-dashed border-amber-500 rounded-lg z-10 pointer-events-none">
            <div className="text-center">
              <CloudUpload className="h-16 w-16 mx-auto text-amber-500 mb-4" />
              <p className="text-lg font-medium text-amber-600 dark:text-amber-400">Drop files here to upload</p>
              <p className="text-sm text-amber-500 dark:text-amber-400/70">Files will be uploaded to {currentAlbum ? currentAlbum.name : 'root folder'}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Folders (show in root and inside albums for nested folders) */}
            {albums.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                  {currentAlbum ? 'Subfolders' : 'Folders'}
                </h3>
                <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3' : 'space-y-1'}>
                  {albums.map((album) => (
                    <div
                      key={album.id}
                      className={viewMode === 'grid'
                        ? 'group relative p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 cursor-pointer transition-all'
                        : 'group flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer'
                      }
                      onClick={() => navigateToAlbum(album)}
                    >
                      <Folder className={`${viewMode === 'grid' ? 'h-10 w-10 mx-auto mb-2' : 'h-5 w-5'} text-amber-500`} />
                      <div className={viewMode === 'grid' ? 'text-center' : 'flex-1'}>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{album.name}</p>
                        <p className="text-xs text-zinc-500">{album._count?.photos || 0} media</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className={`${viewMode === 'grid' ? 'absolute top-1 right-1' : ''} opacity-0 group-hover:opacity-100 h-7 w-7`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); /* TODO: rename */ }}>
                            <Edit2 className="h-4 w-4 mr-2" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-500" onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album.id); }}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Media */}
            {photos.length > 0 ? (
              <div>
                <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                  Media ({photos.length}{totalPhotos > photos.length ? ` of ${totalPhotos}` : ''})
                </h3>
                <div className={viewMode === 'grid' ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2' : 'space-y-1'}>
                  {photos.map((photo, index) => {
                    const isVideo = photo.metadata?.isVideo;
                    const isSelected = selectedItems.has(photo.id);
                    return (
                      <div
                        key={photo.id}
                        data-photo-id={photo.id}
                        ref={(el) => {
                          if (el) photoRefs.current.set(photo.id, el);
                          else photoRefs.current.delete(photo.id);
                        }}
                        className={`${viewMode === 'grid'
                          ? 'group relative aspect-square rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 cursor-pointer'
                          : 'group flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer'
                          } ${isSelected ? 'ring-2 ring-amber-500' : 'hover:ring-2 hover:ring-amber-500/50'}`}
                        onClick={() => { setLightboxIndex(index); setLightboxOpen(true); }}
                        onContextMenu={(e) => handleContextMenu(e, photo.id)}
                      >
                        {viewMode === 'grid' ? (
                          <>
                            <img src={photo.thumbnail || photo.url} alt="" className={`w-full h-full object-cover transition-transform ${isSelected ? 'scale-95' : ''}`} />
                            {isVideo && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Play className="h-8 w-8 text-white fill-white" />
                              </div>
                            )}
                            {/* Selection checkbox - appears on hover or when selected */}
                            <div
                              className={`absolute top-1 left-1 z-10 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                              onClick={(e) => toggleSelection(photo.id, e)}
                            >
                              <div className={`h-6 w-6 rounded flex items-center justify-center ${isSelected ? 'bg-amber-500 text-white' : 'bg-black/50 text-white hover:bg-amber-500'}`}>
                                {isSelected ? <Check className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Selection checkbox for list view */}
                            <div
                              className="cursor-pointer"
                              onClick={(e) => toggleSelection(photo.id, e)}
                            >
                              <div className={`h-5 w-5 rounded flex items-center justify-center ${isSelected ? 'bg-amber-500 text-white' : 'border border-zinc-300 dark:border-zinc-600 hover:border-amber-500'}`}>
                                {isSelected && <Check className="h-3 w-3" />}
                              </div>
                            </div>
                            <div className="h-10 w-10 rounded overflow-hidden bg-zinc-200 dark:bg-zinc-700 shrink-0 relative">
                              <img src={photo.thumbnail || photo.url} alt="" className="w-full h-full object-cover" />
                              {isVideo && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <Play className="h-4 w-4 text-white fill-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-zinc-900 dark:text-white truncate">{photo.originalName || `Photo ${photo.displayId}`}</p>
                            </div>
                            {isVideo ? <Play className="h-4 w-4 text-zinc-400" /> : <ImageIcon className="h-4 w-4 text-zinc-400" />}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Infinite scroll sentinel and loading indicator */}
                {hasMorePhotos && (
                  <div
                    ref={loadMoreRef}
                    className="flex justify-center items-center py-8"
                  >
                    {loadingMore ? (
                      <div className="flex items-center gap-2 text-zinc-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Loading more photos...</span>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400">Scroll for more</span>
                    )}
                  </div>
                )}

                {!hasMorePhotos && photos.length > PHOTOS_PER_PAGE && (
                  <div className="flex justify-center py-4">
                    <span className="text-sm text-zinc-400">All {totalPhotos} photos loaded</span>
                  </div>
                )}
              </div>
            ) : !currentAlbum && albums.length === 0 && photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-500">
                <CloudUpload className="h-20 w-20 mb-4 opacity-20" />
                <p className="text-lg font-medium mb-2">Drop files here or click to upload</p>
                <p className="text-sm mb-6 text-zinc-400">Drag and drop photos or videos anywhere on this page</p>
                <div className="flex gap-2">
                  <Button onClick={() => fileInputRef.current?.click()} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
                    <Upload className="h-4 w-4" /> Upload Media
                  </Button>
                  <Button variant="outline" onClick={() => setCreatingFolder(true)} className="gap-2">
                    <FolderPlus className="h-4 w-4" /> New Folder
                  </Button>
                </div>
              </div>
            ) : currentAlbum && photos.length === 0 && albums.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-500">
                <Folder className="h-20 w-20 mb-4 opacity-20" />
                <p className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{currentAlbum.name}</p>
                <p className="text-sm text-zinc-400 mb-4">/{event.name}/{currentAlbum.name}</p>
                <p className="text-sm mb-6 text-zinc-400">Drag and drop photos or videos to upload to this folder</p>
                <div className="flex gap-2">
                  <Button onClick={() => fileInputRef.current?.click()} className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
                    <Upload className="h-4 w-4" /> Upload Media
                  </Button>
                  <Button variant="outline" onClick={() => setCreatingFolder(true)} className="gap-2">
                    <FolderPlus className="h-4 w-4" /> New Subfolder
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Upload Progress Panel - Bottom Right (Google Drive style) */}
      {uploadFiles.length > 0 && (
        <div className="fixed bottom-4 right-4 w-80 bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden z-50">
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer"
            onClick={() => setUploadPanelMinimized(!uploadPanelMinimized)}
          >
            <div className="flex items-center gap-3">
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
              ) : uploadStats.error > 0 ? (
                <X className="h-5 w-5 text-red-500" />
              ) : uploadStats.success === uploadStats.total ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <Upload className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  {uploadStats.processing > 0 ? 'Processing...' : isUploading ? 'Uploading...' : uploadStats.success === uploadStats.total ? 'Upload complete' : 'Uploads'}
                </p>
                <p className="text-xs text-zinc-500">
                  {uploadStats.success} of {uploadStats.total} complete{uploadStats.processing > 0 ? ` (${uploadStats.processing} processing)` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setUploadPanelMinimized(!uploadPanelMinimized); }}>
                {uploadPanelMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              {!isUploading && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setUploadFiles([]); setSessionId(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <Progress value={overallProgress} className="h-1" />

          {/* File list (collapsible) */}
          {!uploadPanelMinimized && (
            <div className="max-h-64 overflow-y-auto">
              {uploadFiles.map((f) => (
                <div key={f.localId} className="flex items-center gap-3 px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <FileImage className="h-4 w-4 text-zinc-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 truncate">{f.file.name}</p>
                    {f.status === 'uploading' || f.status === 'processing' ? (
                      <Progress value={f.progress} className="h-1 mt-1" />
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    {f.status === 'pending' && <span className="text-xs text-zinc-400">Waiting</span>}
                    {f.status === 'uploading' && <span className="text-xs text-amber-500">{f.progress}%</span>}
                    {f.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-amber-500" />}
                    {f.status === 'success' && <Check className="h-4 w-4 text-green-500" />}
                    {f.status === 'error' && <X className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer actions */}
          {!uploadPanelMinimized && uploadStats.success > 0 && !isUploading && (
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-700">
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={clearCompletedUploads}>
                Clear completed
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Info Slide-over Panel */}
      <div className={`fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-zinc-900 shadow-2xl transform transition-transform duration-300 ${infoPanelOpen && selectedPhotos.length > 0 ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
            <h3 className="font-medium text-zinc-900 dark:text-white">
              {selectedPhotos.length === 1 ? 'Details' : `${selectedPhotos.length} items selected`}
            </h3>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setInfoPanelOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {selectedPhotos.length === 1 ? (
              <>
                {/* Single item preview */}
                <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden">
                  <img src={selectedPhotos[0].thumbnail || selectedPhotos[0].url} alt="" className="w-full h-full object-contain" />
                </div>
                {/* Single item details */}
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-zinc-500 text-xs uppercase tracking-wider">File name</span>
                    <p className="text-zinc-900 dark:text-white truncate">{selectedPhotos[0].originalName}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs uppercase tracking-wider">Type</span>
                    <p className="text-zinc-900 dark:text-white">{selectedPhotos[0].metadata?.isVideo ? 'Video' : 'Image'}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs uppercase tracking-wider">Size</span>
                    <p className="text-zinc-900 dark:text-white">{formatFileSize(selectedPhotos[0].fileSize)}</p>
                  </div>
                  {selectedPhotos[0].width && selectedPhotos[0].height && (
                    <div>
                      <span className="text-zinc-500 text-xs uppercase tracking-wider">Dimensions</span>
                      <p className="text-zinc-900 dark:text-white">{selectedPhotos[0].width} × {selectedPhotos[0].height}</p>
                    </div>
                  )}
                  {selectedPhotos[0].metadata?.mimeType && (
                    <div>
                      <span className="text-zinc-500 text-xs uppercase tracking-wider">MIME Type</span>
                      <p className="text-zinc-900 dark:text-white">{selectedPhotos[0].metadata.mimeType}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-zinc-500 text-xs uppercase tracking-wider">ID</span>
                    <p className="text-zinc-900 dark:text-white font-mono text-xs">{selectedPhotos[0].id}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Multiple items grid preview */}
                <div className="grid grid-cols-3 gap-1">
                  {selectedPhotos.slice(0, 9).map((photo, i) => (
                    <div key={photo.id} className="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden relative">
                      <img src={photo.thumbnail || photo.url} alt="" className="w-full h-full object-cover" />
                      {i === 8 && selectedPhotos.length > 9 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-medium">
                          +{selectedPhotos.length - 9}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Multiple items summary */}
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-zinc-500 text-xs uppercase tracking-wider">Selection</span>
                    <p className="text-zinc-900 dark:text-white">{selectedPhotos.length} items</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs uppercase tracking-wider">Types</span>
                    <p className="text-zinc-900 dark:text-white">
                      {selectedPhotos.filter(p => !p.metadata?.isVideo).length} images, {selectedPhotos.filter(p => p.metadata?.isVideo).length} videos
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-xs uppercase tracking-wider">Total Size</span>
                    <p className="text-zinc-900 dark:text-white">
                      {formatFileSize(selectedPhotos.reduce((sum, p) => sum + (typeof p.fileSize === 'string' ? parseInt(p.fileSize, 10) : (p.fileSize || 0)), 0))}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleDownloadSelected}
              disabled={isDownloading}
            >
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isDownloading ? 'Downloading...' : selectedPhotos.length > 1 ? 'Download as Zip' : 'Download'}
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 text-red-500 border-red-200 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="h-4 w-4" /> Delete {selectedPhotos.length > 1 ? `${selectedPhotos.length} items` : ''}
            </Button>
          </div>
        </div>
      </div>
      {/* Backdrop for slide-over */}
      {infoPanelOpen && selectedPhotos.length > 0 && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setInfoPanelOpen(false)} />
      )}

      {/* Lightbox for image/video preview */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={photos.map(photo => {
          const isVideo = photo.metadata?.isVideo;
          if (isVideo) {
            // Map mimeType to browser-compatible format
            const mimeType = photo.metadata?.mimeType || 'video/mp4';
            // QuickTime/MOV may not play in all browsers
            const videoType = mimeType === 'video/quicktime' ? 'video/mp4' : mimeType;
            return {
              type: 'video' as const,
              sources: [{ src: photo.url, type: videoType }],
              poster: photo.thumbnail,
              width: 1920,
              height: 1080,
            };
          }
          return { src: photo.url, alt: photo.originalName };
        })}
        plugins={[Video, Zoom]}
        video={{ autoPlay: false, controls: true, playsInline: true }}
        carousel={{ finite: true }}
        controller={{ closeOnBackdropClick: true }}
        styles={{
          container: { backgroundColor: 'rgba(0, 0, 0, 0.9)' },
        }}
      />
    </div>
  );
}

