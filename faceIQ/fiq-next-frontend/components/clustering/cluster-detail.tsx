"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Edit2,
  Check,
  X,
  Loader2,
  User,
  Split,
  MousePointerClick,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useApi } from "@/lib/hooks/use-api";
import type { PersonCluster, ClusterFace } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ClusterDetailProps {
  cluster: PersonCluster;
  eventId: string;
  eventSlug: string;
  onBack: () => void;
  onClusterUpdated: () => void;
}

export function ClusterDetail({
  cluster,
  eventId,
  eventSlug,
  onBack,
  onClusterUpdated,
}: ClusterDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(cluster.name);
  const [selectedFaces, setSelectedFaces] = useState<Set<string>>(new Set());
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [splitName, setSplitName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Selection mode for splitting faces
  const [selectionMode, setSelectionMode] = useState(false);

  // Lightbox state for viewing full images
  const [lightboxFace, setLightboxFace] = useState<ClusterFace | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Fetch cluster faces
  const {
    data: facesData,
    loading: facesLoading,
    refetch: refetchFaces,
  } = useApi(
    useCallback(() => api.getClusterFaces(cluster.id, 1, 100), [cluster.id]),
    { dependencies: [cluster.id] }
  );

  const faces = facesData?.data?.faces || [];

  // Handle rename
  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    try {
      const response = await api.renameCluster(cluster.id, newName.trim());
      if (response.success) {
        toast.success("Person renamed");
        setIsEditing(false);
        onClusterUpdated();
      } else {
        toast.error(response.error || "Failed to rename");
      }
    } catch (error) {
      toast.error("Failed to rename");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle split
  const handleSplit = async () => {
    if (selectedFaces.size === 0) return;
    setIsSaving(true);
    try {
      const response = await api.splitCluster(
        Array.from(selectedFaces),
        eventId,
        eventSlug,
        splitName.trim() || undefined
      );
      if (response.success && response.data) {
        toast.success(`Created ${response.data.newClusterName}`);
        setSelectedFaces(new Set());
        setShowSplitDialog(false);
        setSplitName("");
        setSelectionMode(false);
        refetchFaces();
        onClusterUpdated();
      } else {
        toast.error(response.error || "Failed to split");
      }
    } catch (error) {
      toast.error("Failed to split");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle face selection (only in selection mode)
  const toggleFace = (faceId: string) => {
    const newSet = new Set(selectedFaces);
    if (newSet.has(faceId)) {
      newSet.delete(faceId);
    } else {
      newSet.add(faceId);
    }
    setSelectedFaces(newSet);
  };

  // Update URL with debug info when lightbox changes
  const updateDebugUrl = useCallback((face: ClusterFace | null) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (face) {
      url.searchParams.set('cluster', cluster.id);
      url.searchParams.set('face', face.qdrantPointId);
      url.searchParams.set('photo', face.photoId);
    } else {
      url.searchParams.delete('cluster');
      url.searchParams.delete('face');
      url.searchParams.delete('photo');
    }
    window.history.replaceState({}, '', url.toString());
  }, [cluster.id]);

  // Handle face click - either select or open lightbox
  const handleFaceClick = (face: ClusterFace, index: number) => {
    if (selectionMode) {
      toggleFace(face.qdrantPointId);
    } else {
      setLightboxFace(face);
      setLightboxIndex(index);
      updateDebugUrl(face);
    }
  };

  // Navigate lightbox
  const navigateLightbox = (direction: "prev" | "next") => {
    const newIndex = direction === "prev"
      ? (lightboxIndex - 1 + faces.length) % faces.length
      : (lightboxIndex + 1) % faces.length;
    setLightboxIndex(newIndex);
    const newFace = faces[newIndex];
    setLightboxFace(newFace);
    updateDebugUrl(newFace);
  };

  // Clear URL params when lightbox closes
  const closeLightbox = () => {
    setLightboxFace(null);
    updateDebugUrl(null);
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    if (selectionMode) {
      // Exiting selection mode - clear selections
      setSelectedFaces(new Set());
    }
    setSelectionMode(!selectionMode);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-8 w-48"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                />
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={handleSaveName}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setNewName(cluster.name);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CardTitle>{cluster.name}</CardTitle>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Selection mode toggle */}
            <Button
              variant={selectionMode ? "default" : "outline"}
              size="sm"
              onClick={toggleSelectionMode}
            >
              <MousePointerClick className="h-4 w-4 mr-2" />
              {selectionMode ? "Cancel Selection" : "Select to Split"}
            </Button>
            {/* Split button - only show when faces are selected */}
            {selectedFaces.size > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowSplitDialog(true)}
              >
                <Split className="h-4 w-4 mr-2" />
                Split ({selectedFaces.size})
              </Button>
            )}
            <Badge variant="secondary">
              {cluster.faceCount} faces
            </Badge>
          </div>
        </div>
        {/* Selection mode hint */}
        {selectionMode && (
          <div className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            Click on faces to select them for splitting into a new person. Selected faces will be moved to a new cluster.
          </div>
        )}
      </CardHeader>
      <CardContent>
        {facesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <FaceGrid
            faces={faces}
            selectedFaces={selectedFaces}
            selectionMode={selectionMode}
            onFaceClick={handleFaceClick}
          />
        )}
      </CardContent>

      {/* Split Dialog */}
      <Dialog open={showSplitDialog} onOpenChange={setShowSplitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Split into new person</DialogTitle>
            <DialogDescription>
              Move {selectedFaces.size} selected face(s) to a new person.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="New person name (optional)"
              value={splitName}
              onChange={(e) => setSplitName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSplitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSplit} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Split className="h-4 w-4 mr-2" />
              )}
              Split
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox Dialog */}
      <Dialog open={!!lightboxFace} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="relative">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={closeLightbox}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Navigation buttons */}
            {faces.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => navigateLightbox("prev")}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => navigateLightbox("next")}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Main image */}
            {lightboxFace?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightboxFace.imageUrl}
                alt="Full photo"
                className="w-full h-auto max-h-[80vh] object-contain bg-black"
              />
            ) : (
              <div className="w-full h-64 flex flex-col items-center justify-center bg-muted">
                <ZoomIn className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Full image not available</p>
              </div>
            )}

            {/* Image info footer */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-black/50">
                    {Math.round((lightboxFace?.confidence || 0) * 100)}% confidence
                  </Badge>
                  {/* Debug info - show face ID */}
                  <span className="text-xs text-white/50 font-mono">
                    {lightboxFace?.qdrantPointId.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-white/70">
                    {lightboxIndex + 1} / {faces.length}
                  </div>
                  {/* Open original in new tab */}
                  {lightboxFace?.imageUrl && (
                    <a
                      href={lightboxFace.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/70 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// =============================================================================
// Face Grid Sub-component
// =============================================================================

interface FaceGridProps {
  faces: ClusterFace[];
  selectedFaces: Set<string>;
  selectionMode: boolean;
  onFaceClick: (face: ClusterFace, index: number) => void;
}

function FaceGrid({ faces, selectedFaces, selectionMode, onFaceClick }: FaceGridProps) {
  if (faces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">No faces in this cluster</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
      {faces.map((face, index) => (
        <FaceCard
          key={face.qdrantPointId}
          face={face}
          isSelected={selectedFaces.has(face.qdrantPointId)}
          selectionMode={selectionMode}
          onClick={() => onFaceClick(face, index)}
        />
      ))}
    </div>
  );
}

interface FaceCardProps {
  face: ClusterFace;
  isSelected: boolean;
  selectionMode: boolean;
  onClick: () => void;
}

function FaceCard({ face, isSelected, selectionMode, onClick }: FaceCardProps) {
  const [imageError, setImageError] = useState(false);
  const thumbnailUrl = api.getFaceThumbnailUrl(face.qdrantPointId, 100, "jpeg");

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all group",
        isSelected
          ? "border-primary ring-2 ring-primary/50"
          : "border-transparent hover:border-muted-foreground/50"
      )}
    >
      {!imageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt="Face"
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-muted">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      {/* Selection overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
          <Check className="h-6 w-6 text-primary" />
        </div>
      )}

      {/* Hover overlay - show zoom icon when not in selection mode */}
      {!selectionMode && !isSelected && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ZoomIn className="h-6 w-6 text-white" />
        </div>
      )}

      {/* Confidence badge */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
        <span className="text-[10px] text-white">
          {Math.round(face.confidence * 100)}%
        </span>
      </div>
    </div>
  );
}

