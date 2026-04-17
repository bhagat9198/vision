'use client';

import Image from 'next/image';
import { useState, useRef } from 'react';
import { Upload, Camera, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DetectedFace } from '@/lib/types';
import { cn } from '@/lib/utils';

interface FaceSearchProps {
  detectedFaces: DetectedFace[];
  onFaceSelect: (faceId: string) => void;
  onSelfieUpload: (file: File) => void;
  isSearching?: boolean;
}

export function FaceSearch({ detectedFaces, onFaceSelect, onSelfieUpload, isSearching }: FaceSearchProps) {
  const [selectedFace, setSelectedFace] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(URL.createObjectURL(file));
      setSelectedFace(null);
      onSelfieUpload(file);
    }
  };

  const handleFaceClick = (faceId: string) => {
    setSelectedFace(faceId);
    setUploadedImage(null);
    onFaceSelect(faceId);
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {uploadedImage ? (
                <Image src={uploadedImage} alt="Uploaded selfie" fill className="object-cover" />
              ) : (
                <Camera className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">Upload Your Selfie</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Find all photos with your face using AI
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex gap-2 justify-center">
              <Button onClick={() => fileInputRef.current?.click()} disabled={isSearching}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isSearching ? 'Searching...' : 'Upload Photo'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or choose from detected faces</span>
        </div>
      </div>

      {/* Detected Faces Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Detected People ({detectedFaces.length})</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {detectedFaces.map((face) => (
            <button
              key={face.id}
              onClick={() => handleFaceClick(face.id)}
              disabled={isSearching}
              className={cn(
                'group text-center space-y-2 p-2 rounded-lg transition-all',
                'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary',
                selectedFace === face.id && 'bg-primary/10 ring-2 ring-primary'
              )}
            >
              <div className="relative mx-auto w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-muted">
                <Image
                  src={face.thumbnail}
                  alt={face.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
                {selectedFace === face.id && isSearching && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium truncate">{face.name}</p>
                <p className="text-xs text-muted-foreground">{face.photoCount} photos</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

