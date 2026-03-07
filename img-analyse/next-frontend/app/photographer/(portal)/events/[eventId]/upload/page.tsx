'use client';

import { use, useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Upload, X, CheckCircle, AlertCircle, Loader2, RefreshCw, FolderPlus, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const API_URL = 'http://localhost:4000/api/v1';
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const CONCURRENT_UPLOADS = 4;
const ROOT_FOLDER_VALUE = '__ROOT__';

interface Album { id: string; displayId: number; name: string; }
interface UploadFile {
  file: File;
  localId: string;
  serverId?: string;
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
  progress: number;
  error?: string;
  totalChunks: number;
  uploadedChunks: number;
  previewUrl?: string;
}
interface SessionStatus {
  status: string;
  totalFiles: number;
  uploadedFiles: number;
  processedFiles: number;
  failedFiles: number;
  files: Array<{ id: string; status: string; originalName: string; errorMessage?: string }>;
}

export default function UploadPhotosPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const searchParams = useSearchParams();
  const preselectedAlbumId = searchParams.get('albumId');
  const [eventName, setEventName] = useState('');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>(preselectedAlbumId || ROOT_FOLDER_VALUE);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [creatingAlbum, setCreatingAlbum] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const getToken = () => localStorage.getItem('photographerToken');

  // Fetch event and albums
  useEffect(() => {
    const fetchData = async () => {
      const token = getToken();
      const [eventRes, albumsRes] = await Promise.all([
        fetch(`${API_URL}/events/${eventId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/albums/event/${eventId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const eventData = await eventRes.json();
      const albumsData = await albumsRes.json();
      if (eventData.success) setEventName(eventData.data.name);
      if (albumsData.success) {
        setAlbums(albumsData.data || []);
        // Only auto-select first album if no preselection and not root
        if (!preselectedAlbumId && albumsData.data?.length > 0) {
          // Keep ROOT_FOLDER_VALUE as default if no preselection
        }
      }
    };
    fetchData();
  }, [eventId, preselectedAlbumId]);

  // Create new album
  const createAlbum = async () => {
    if (!newAlbumName.trim()) return;
    setCreatingAlbum(true);
    const token = getToken();
    const res = await fetch(`${API_URL}/albums/event/${eventId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newAlbumName.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      setAlbums(prev => [...prev, data.data]);
      setSelectedAlbumId(data.data.id);
      setNewAlbumName('');
    }
    setCreatingAlbum(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map(file => {
      // Only create preview for non-HEIC images (browsers can't render HEIC)
      const canPreview = !file.name.toLowerCase().endsWith('.heic') && !file.name.toLowerCase().endsWith('.heif');
      return {
        file,
        localId: Math.random().toString(36).substr(2, 9),
        status: 'pending' as const,
        progress: 0,
        totalChunks: Math.ceil(file.size / CHUNK_SIZE),
        uploadedChunks: 0,
        previewUrl: canPreview ? URL.createObjectURL(file) : undefined,
      };
    });
    setFiles(prev => [...prev, ...uploadFiles]);
  };

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach(f => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
    };
  }, []);

  const removeFile = (localId: string) => {
    setFiles(prev => prev.filter(f => f.localId !== localId));
  };

  // Upload a single chunk
  const uploadChunk = async (sessionId: string, fileId: string, chunkIndex: number, chunk: Blob) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('chunk', chunk);
    const res = await fetch(`${API_URL}/uploads/${sessionId}/files/${fileId}/chunks/${chunkIndex}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return res.ok;
  };

  // Upload a single file in chunks
  const uploadSingleFile = async (sessionId: string, fileId: string, file: File, localId: string) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const success = await uploadChunk(sessionId, fileId, i, chunk);
      if (!success) throw new Error(`Chunk ${i} failed`);
      const progress = Math.round(((i + 1) / totalChunks) * 80); // 80% for upload, 20% for processing
      setFiles(prev => prev.map(f => f.localId === localId ? { ...f, progress, uploadedChunks: i + 1 } : f));
    }
    // Mark file complete
    const token = getToken();
    await fetch(`${API_URL}/uploads/${sessionId}/files/${fileId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  // Poll session status
  const pollStatus = async (sid: string) => {
    const token = getToken();
    const res = await fetch(`${API_URL}/uploads/${sid}/status?includeFiles=true`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      setSessionStatus(data.data);
      // Update file statuses based on server response
      const serverFiles = data.data.files || [];
      setFiles(prev => prev.map(f => {
        const serverFile = serverFiles.find((sf: { originalName: string }) => sf.originalName === f.file.name);
        if (serverFile) {
          if (serverFile.status === 'COMPLETED') return { ...f, status: 'success', progress: 100 };
          if (serverFile.status === 'FAILED') return { ...f, status: 'error', error: serverFile.errorMessage };
          if (serverFile.status === 'PROCESSING') return { ...f, status: 'processing', progress: 90 };
        }
        return f;
      }));
      if (data.data.status === 'COMPLETED') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setUploading(false);
      }
    }
  };

  // Main upload function
  const startUpload = async () => {
    setUploading(true);
    const token = getToken();
    const pendingFiles = files.filter(f => f.status === 'pending');

    // 1. Initialize upload session (albumId is null for root uploads)
    const albumIdToSend = selectedAlbumId === ROOT_FOLDER_VALUE ? null : selectedAlbumId;
    const initRes = await fetch(`${API_URL}/uploads/init`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        albumId: albumIdToSend,
        files: pendingFiles.map(f => ({ name: f.file.name, size: f.file.size, type: f.file.type })),
      }),
    });
    const initData = await initRes.json();
    if (!initData.success) { alert('Failed to init upload: ' + initData.error); setUploading(false); return; }

    const sid = initData.data.sessionId;
    setSessionId(sid);

    // Map local files to server file IDs
    const fileMap = new Map<string, string>();
    initData.data.files.forEach((sf: { originalName: string; fileId: string }) => {
      const local = pendingFiles.find(f => f.file.name === sf.originalName);
      if (local) fileMap.set(local.localId, sf.fileId);
    });
    setFiles(prev => prev.map(f => ({ ...f, serverId: fileMap.get(f.localId), status: f.status === 'pending' ? 'uploading' : f.status })));

    // 2. Upload files concurrently (4 at a time)
    const queue = [...pendingFiles];
    const uploadNext = async () => {
      while (queue.length > 0) {
        const file = queue.shift()!;
        const serverId = fileMap.get(file.localId);
        if (!serverId) continue;
        try {
          await uploadSingleFile(sid, serverId, file.file, file.localId);
        } catch (err) {
          setFiles(prev => prev.map(f => f.localId === file.localId ? { ...f, status: 'error', error: String(err) } : f));
        }
      }
    };
    await Promise.all(Array(CONCURRENT_UPLOADS).fill(null).map(() => uploadNext()));

    // 3. Start polling for processing status
    pollingRef.current = setInterval(() => pollStatus(sid), 2000);
    pollStatus(sid);
  };

  // Retry failed files
  const retryFailed = async () => {
    if (!sessionId) return;
    const token = getToken();
    const failedIds = files.filter(f => f.status === 'error' && f.serverId).map(f => f.serverId!);
    if (failedIds.length === 0) return;
    await fetch(`${API_URL}/uploads/${sessionId}/retry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileIds: failedIds }),
    });
    setFiles(prev => prev.map(f => f.status === 'error' ? { ...f, status: 'processing', progress: 85 } : f));
    if (!pollingRef.current) pollingRef.current = setInterval(() => pollStatus(sessionId), 2000);
  };

  useEffect(() => { return () => { if (pollingRef.current) clearInterval(pollingRef.current); }; }, []);

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const processingCount = files.filter(f => f.status === 'processing' || f.status === 'uploading').length;


  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/photographer/events/${eventId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Upload Photos</h1>
          <p className="text-zinc-500 dark:text-zinc-400">{eventName}</p>
        </div>
      </div>

      {/* Folder Selection */}
      <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-900 dark:text-white">Upload Location</CardTitle>
          <CardDescription>Choose where to upload photos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedAlbumId} onValueChange={setSelectedAlbumId}>
            <SelectTrigger>
              <SelectValue placeholder="Select location">
                {selectedAlbumId === ROOT_FOLDER_VALUE ? (
                  <span className="flex items-center gap-2"><Folder className="h-4 w-4 text-amber-500" /> {eventName} (Root)</span>
                ) : (
                  albums.find(a => a.id === selectedAlbumId)?.name || 'Select location'
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ROOT_FOLDER_VALUE}>
                <span className="flex items-center gap-2"><Folder className="h-4 w-4 text-amber-500" /> {eventName} (Root)</span>
              </SelectItem>
              {albums.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  <span className="flex items-center gap-2"><Folder className="h-4 w-4" /> {a.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input placeholder="New folder name" value={newAlbumName} onChange={e => setNewAlbumName(e.target.value)} />
            <Button onClick={createAlbum} disabled={creatingAlbum || !newAlbumName.trim()} variant="outline">
              {creatingAlbum ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Drop Zone */}
      <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-6">
          <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center hover:border-amber-500/50 transition-colors">
            <Upload className="h-12 w-12 mx-auto text-zinc-400 dark:text-zinc-600 mb-4" />
            <p className="text-zinc-900 dark:text-white mb-2">Drag and drop photos here</p>
            <p className="text-zinc-500 text-sm mb-4">Supports HEIC, JPEG, PNG • 5MB chunks • Resumable</p>
            <label>
              <input type="file" multiple accept="image/*,.heic,.heif" onChange={handleFileSelect} className="hidden" />
              <Button type="button" variant="outline" asChild><span>Browse Files</span></Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Session Status */}
      {sessionStatus && (
        <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4">
            <div className="flex justify-between text-sm">
              <span>Total: {sessionStatus.totalFiles}</span>
              <span className="text-amber-500">Processing: {processingCount}</span>
              <span className="text-green-500">Done: {sessionStatus.processedFiles}</span>
              <span className="text-red-500">Failed: {sessionStatus.failedFiles}</span>
            </div>
            <Progress value={(sessionStatus.processedFiles / sessionStatus.totalFiles) * 100} className="mt-2" />
          </CardContent>
        </Card>
      )}

      {/* File Grid */}
      {files.length > 0 && (
        <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white dark:bg-zinc-900/95 z-10 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <CardTitle className="text-zinc-900 dark:text-white">Photos ({files.length})</CardTitle>
              <CardDescription>{successCount} done, {processingCount} uploading, {pendingCount} pending, {errorCount} failed</CardDescription>
            </div>
            <div className="flex gap-2">
              {errorCount > 0 && <Button onClick={retryFailed} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-1" /> Retry</Button>}
              <Button onClick={startUpload} disabled={uploading || pendingCount === 0 || !selectedAlbumId} className="bg-amber-500 hover:bg-amber-600 text-white">
                {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4 mr-2" /> Upload All</>}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto p-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {files.map(f => (
                <div key={f.localId} className="relative group aspect-square rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                  {/* Preview or placeholder */}
                  {f.previewUrl ? (
                    <img src={f.previewUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      <span className="text-xs font-medium">HEIC</span>
                    </div>
                  )}

                  {/* Overlay for status/progress */}
                  {f.status !== 'pending' && f.status !== 'success' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      {f.status === 'uploading' && (
                        <div className="text-center">
                          <Loader2 className="h-6 w-6 animate-spin text-amber-400 mx-auto" />
                          <span className="text-xs text-white mt-1 block">{f.progress}%</span>
                        </div>
                      )}
                      {f.status === 'processing' && <Loader2 className="h-6 w-6 animate-spin text-blue-400" />}
                      {f.status === 'error' && <AlertCircle className="h-6 w-6 text-red-500" />}
                    </div>
                  )}

                  {/* Success checkmark */}
                  {f.status === 'success' && (
                    <div className="absolute top-1 right-1">
                      <CheckCircle className="h-5 w-5 text-green-500 drop-shadow-md" />
                    </div>
                  )}

                  {/* Remove button (hover) */}
                  {f.status === 'pending' && (
                    <button
                      onClick={() => removeFile(f.localId)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  )}

                  {/* File name tooltip on hover */}
                  <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white truncate">{f.file.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}