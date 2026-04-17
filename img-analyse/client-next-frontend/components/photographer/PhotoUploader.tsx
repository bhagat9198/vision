'use client';

import { useState, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Image as ImageIcon, Sparkles, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error' | 'duplicate';
  aiTags?: string[];
  folder?: string;
}

interface PhotoUploaderProps {
  eventId: string;
  onUploadComplete?: (files: UploadFile[]) => void;
}

export function PhotoUploader({ eventId, onUploadComplete }: PhotoUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [autoTag, setAutoTag] = useState(true);
  const [autoFolder, setAutoFolder] = useState(true);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const uploadFiles: UploadFile[] = Array.from(newFiles)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: 'pending' as const,
      }));
    setFiles((prev) => [...prev, ...uploadFiles]);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const simulateUpload = async () => {
    setIsUploading(true);
    const aiTags = ['Wedding', 'Bride', 'Groom', 'Ceremony', 'Reception', 'Family', 'Candid'];
    const folders = ['Getting Ready', 'Ceremony', 'Reception', 'Portraits', 'Family', 'Guests'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise((r) => setTimeout(r, 100));
        setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, progress, status: 'uploading' } : f)));
      }
      // Simulate AI processing
      setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: 'processing' } : f)));
      await new Promise((r) => setTimeout(r, 500));

      // Check for duplicate (simulate 10% chance)
      const isDuplicate = Math.random() < 0.1;
      
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id
            ? {
                ...f,
                status: isDuplicate ? 'duplicate' : 'complete',
                aiTags: autoTag ? aiTags.slice(0, Math.floor(Math.random() * 3) + 2) : undefined,
                folder: autoFolder ? folders[Math.floor(Math.random() * folders.length)] : undefined,
              }
            : f
        )
      );
    }
    setIsUploading(false);
    onUploadComplete?.(files);
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const completeCount = files.filter((f) => f.status === 'complete').length;
  const duplicateCount = files.filter((f) => f.status === 'duplicate').length;

  return (
    <div className="space-y-6">
      {/* Upload Settings */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-6">
          <div className="flex items-center gap-3">
            <Switch id="autoTag" checked={autoTag} onCheckedChange={setAutoTag} />
            <Label htmlFor="autoTag" className="flex items-center gap-2 cursor-pointer">
              <Sparkles className="h-4 w-4 text-amber-500" /> Auto AI Tagging
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="autoFolder" checked={autoFolder} onCheckedChange={setAutoFolder} />
            <Label htmlFor="autoFolder" className="flex items-center gap-2 cursor-pointer">
              <FolderOpen className="h-4 w-4 text-blue-500" /> Auto Foldering
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-12 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        )}
      >
        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">Drag & Drop Photos Here</h3>
        <p className="text-muted-foreground mb-4">or click to browse</p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id="file-input"
        />
        <Button asChild>
          <label htmlFor="file-input" className="cursor-pointer">Select Photos</label>
        </Button>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">{files.length} photos</span>
                {completeCount > 0 && <span className="text-green-600 ml-2">• {completeCount} uploaded</span>}
                {duplicateCount > 0 && <span className="text-amber-600 ml-2">• {duplicateCount} duplicates</span>}
              </div>
              {!isUploading && pendingCount > 0 && (
                <Button onClick={simulateUpload}>Upload {pendingCount} Photos</Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

