"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle, RotateCcw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useApi, usePollingApi } from "@/lib/hooks/use-api";
import { useQueryTabs } from "@/lib/hooks/use-query-tabs";
import { api, API_BASE_URL } from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { formatDistanceToNow } from "date-fns";
import { VideoList } from "@/components/events/video-list";
import { PersonGallery } from "@/components/clustering";

import Link from "next/link";
import { EventDetailSkeleton } from "@/components/events/event-detail-skeleton";

import { EventStats, ImageStatus, VideoWithFrames, FaceDetail } from "@/lib/types";

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const eventId = params.id as string;
    const [activeTab, setActiveTab] = useQueryTabs("images", "tab");
    // Cast to any to bypass type check for now, or we can improve the hook to be generic. 
    // But simplest is treating as string and casting on usage if needed, or just casting the hook return.
    const [viewStatus, setViewStatus] = useQueryTabs("active", "status") as ['active' | 'inactive', (v: string) => void];

    // New States (Moved up to avoid conditional hook call error)
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
    const [imageFilter, setImageFilter] = useQueryTabs("all", "filter");
    const [facesForPhoto, setFacesForPhoto] = useState<FaceDetail[]>([]);
    const [facesLoading, setFacesLoading] = useState(false);
    const [reindexingPhotoId, setReindexingPhotoId] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Fetch event details
    const { data: event, loading: eventLoading, error: eventError } = useApi<EventStats | undefined>(
        useCallback(async () => {
            const response = await api.getEventStats(eventId);
            return response.data;
        }, [eventId])
    );

    // Fetch images with status and active filter
    const { data: images, loading: imagesLoading, refetch: refetchImages } = useApi<ImageStatus[] | undefined>(
        useCallback(async () => {
            const response = await api.getEventImages(eventId, undefined, viewStatus === 'active');
            return response.data;
        }, [eventId, viewStatus])
    );

    // Fetch videos with active filter
    const { data: videos, loading: videosLoading, refetch: refetchVideos } = useApi<VideoWithFrames[] | undefined>(
        useCallback(async () => {
            const response = await api.getEventVideos(eventId, true, viewStatus === 'active');
            if (!response.data) return undefined;
            return response.data.map(v => ({
                ...v,
                videoUrl: v.videoUrl || undefined
            }));
        }, [eventId, viewStatus])
    );

    // Fetch faces when an image is selected
    const fetchFacesForPhoto = useCallback(async (photoId: string) => {
        setFacesLoading(true);
        try {
            const response = await api.getPhotoFaces(photoId, eventId, eventId);
            if (response.data?.faces) {
                setFacesForPhoto(response.data.faces);
            }
        } catch (error) {
            console.error('Failed to fetch faces:', error);
            setFacesForPhoto([]);
        } finally {
            setFacesLoading(false);
        }
    }, [eventId]);

    // Handle image selection with face fetching
    const handleImageSelect = useCallback((imageUrl: string, photoId: string) => {
        setSelectedImage(imageUrl);
        setSelectedPhotoId(photoId);
        fetchFacesForPhoto(photoId);

        // Update URL with photo query parameter
        const params = new URLSearchParams(window.location.search);
        params.set('photo', photoId);
        router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    }, [fetchFacesForPhoto, router]);

    // Handle re-indexing with high accuracy
    const handleReindex = useCallback(async (photoId: string) => {
        setReindexingPhotoId(photoId);
        try {
            await api.reindexPhoto(photoId, eventId, { highAccuracy: true, eventSlug: eventId });
            // Refetch images after a short delay to allow processing to start
            setTimeout(() => {
                refetchImages();
            }, 1000);
        } catch (error) {
            console.error('Failed to reindex photo:', error);
        } finally {
            setReindexingPhotoId(null);
        }
    }, [refetchImages, eventId]);

    // Draw bounding boxes on canvas when image loads
    const drawBoundingBoxes = useCallback(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image || facesForPhoto.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to match displayed image container
        canvas.width = image.clientWidth;
        canvas.height = image.clientHeight;

        // Calculate the actual rendered image dimensions within object-contain
        const containerWidth = image.clientWidth;
        const containerHeight = image.clientHeight;
        const naturalWidth = image.naturalWidth;
        const naturalHeight = image.naturalHeight;

        // Calculate scale to fit (object-contain behavior)
        const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
        const renderedWidth = naturalWidth * scale;
        const renderedHeight = naturalHeight * scale;

        // Calculate offset (letterboxing)
        const offsetX = (containerWidth - renderedWidth) / 2;
        const offsetY = (containerHeight - renderedHeight) / 2;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw bounding boxes
        facesForPhoto.forEach((face, index) => {
            const { x, y, width, height } = face.bbox;
            // Scale and offset bbox coordinates
            const scaledX = offsetX + x * scale;
            const scaledY = offsetY + y * scale;
            const scaledWidth = width * scale;
            const scaledHeight = height * scale;

            // Draw box
            ctx.strokeStyle = '#22c55e'; // green-500
            ctx.lineWidth = 2;
            ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

            // Draw label background
            const label = `#${index + 1} ${face.detectorSource} (${(face.confidence * 100).toFixed(0)}%)`;
            ctx.font = '12px sans-serif';
            const textWidth = ctx.measureText(label).width;
            ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
            ctx.fillRect(scaledX, scaledY - 18, textWidth + 8, 18);

            // Draw label text
            ctx.fillStyle = 'white';
            ctx.fillText(label, scaledX + 4, scaledY - 5);
        });
    }, [facesForPhoto]);

    // Redraw boxes when faces change or image loads
    useEffect(() => {
        if (selectedImage && facesForPhoto.length > 0) {
            // Small delay to ensure image is rendered
            const timer = setTimeout(drawBoundingBoxes, 100);
            return () => clearTimeout(timer);
        }
    }, [selectedImage, facesForPhoto, drawBoundingBoxes]);

    // Open photo from URL query parameter on page load
    useEffect(() => {
        const photoId = searchParams.get('photo');
        if (photoId && images && !selectedImage) {
            const image = images.find(img => img.photoId === photoId);
            if (image && image.imageUrl) {
                handleImageSelect(
                    `${image.imageUrl.startsWith('http') ? '' : API_BASE_URL}${image.imageUrl}`,
                    image.photoId
                );
            }
        }
    }, [searchParams, images, selectedImage, handleImageSelect]);

    if (eventLoading && !event) {
        return (
            <AppLayout>
                <EventDetailSkeleton />
            </AppLayout>
        );
    }

    if (eventError || !event) {
        return (
            <AppLayout>
                <div className="space-y-4">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Link>
                    <Card className="border-destructive">
                        <CardContent className="pt-6">
                            <p className="text-destructive">
                                {eventError?.message || "Event not found"}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    const filteredImages = images || [];
    const filteredVideos = videos || [];

    // Calculate stats
    const totalImages = event.totalImages;
    const processedImages = event.totalIndexed;
    const processingImages = filteredImages.filter(img => img.status === 'PROCESSING').length;
    const failedImages = filteredImages.filter(img => img.status === 'FAILED').length;

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Dashboard
                        </Link>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">{event.eventSlug}</h1>
                            <Badge variant={event.status === "green" ? "success" : "warning"}>
                                {event.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">
                            Collection: {event.collectionName}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-muted rounded-lg p-1">
                            <Button
                                variant={viewStatus === 'active' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewStatus('active')}
                                className="h-7 text-xs"
                            >
                                Active
                            </Button>
                            <Button
                                variant={viewStatus === 'inactive' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewStatus('inactive')}
                                className="h-7 text-xs"
                            >
                                Inactive
                            </Button>
                        </div>
                        <Button variant="outline" size="icon-sm" onClick={() => {
                            refetchImages();
                            refetchVideos();
                        }}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Images</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalImages}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-success">Indexed</CardTitle>
                            <CheckCircle className="h-4 w-4 text-success" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-success">{processedImages}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-destructive">Failed</CardTitle>
                            <AlertCircle className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">{failedImages}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-warning">Processing</CardTitle>
                            <Clock className="h-4 w-4 text-warning" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-warning">{processingImages}</div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="images">Images</TabsTrigger>
                        <TabsTrigger value="videos">Videos</TabsTrigger>
                        <TabsTrigger value="people">People</TabsTrigger>
                    </TabsList>

                    <TabsContent value="images" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Image Status</CardTitle>
                                <CardDescription>Real-time status of image indexing</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs value={imageFilter} onValueChange={setImageFilter} className="space-y-4">
                                    <TabsList>
                                        <TabsTrigger value="all">All</TabsTrigger>
                                        <TabsTrigger value="completed">Indexed ({filteredImages.filter(i => i.status === 'COMPLETED').length})</TabsTrigger>
                                        <TabsTrigger value="failed">Failed ({filteredImages.filter(i => i.status === 'FAILED').length})</TabsTrigger>
                                        <TabsTrigger value="deleted">Deleted ({filteredImages.filter(i => i.status === 'DELETED').length})</TabsTrigger>
                                        <TabsTrigger value="processing">Processing ({filteredImages.filter(i => i.status === 'PROCESSING').length})</TabsTrigger>
                                    </TabsList>

                                    <div className="rounded-md border overflow-x-auto">
                                        <div className="min-w-[900px]">
                                            <div className="grid grid-cols-[50px_1fr_60px_90px_1fr_100px_80px] border-b bg-muted/50 p-3 text-xs font-medium text-muted-foreground">
                                                <div>Preview</div>
                                                <div>Photo ID</div>
                                                <div>Faces</div>
                                                <div>Status</div>
                                                <div>Error / Details</div>
                                                <div>Updated</div>
                                                <div className="text-center">Actions</div>
                                            </div>
                                            <div className="max-h-[600px] overflow-auto">
                                                {filteredImages.length === 0 ? (
                                                    <div className="p-8 text-center text-sm text-muted-foreground">
                                                        No images found for this filter.
                                                    </div>
                                                ) : (
                                                    filteredImages.map((img: ImageStatus) => (
                                                        <div key={img.id} className="grid grid-cols-[50px_1fr_60px_90px_1fr_100px_80px] items-center border-b p-3 text-sm last:border-0 hover:bg-muted/5">
                                                            <div>
                                                                {img.imageUrl ? (
                                                                    <div
                                                                        className="h-8 w-8 overflow-hidden rounded-md border bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                                                        onClick={() => handleImageSelect(
                                                                            `${img.imageUrl!.startsWith('http') ? '' : API_BASE_URL}${img.imageUrl}`,
                                                                            img.photoId
                                                                        )}
                                                                    >
                                                                        <img
                                                                            src={`${img.imageUrl!.startsWith('http') ? '' : API_BASE_URL}${img.imageUrl}`}
                                                                            alt={img.photoId}
                                                                            className="h-full w-full object-cover"
                                                                            onError={(e) => {
                                                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted">
                                                                        <span className="text-[10px] text-muted-foreground">IMG</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="font-mono text-xs truncate pr-2" title={img.photoId}>
                                                                {img.photoId}
                                                            </div>
                                                            <div>
                                                                {img.facesDetected > 0 ? (
                                                                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                                                        {img.facesDetected}
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-muted-foreground text-xs text-center block w-6">-</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <StatusBadge status={!img.isActive ? 'DELETED' : img.status} />
                                                            </div>
                                                            <div className="text-xs truncate" title={img.error || ''}>
                                                                {img.status === 'COMPLETED' && img.facesIndexed === 0 ? (
                                                                    <span className="text-warning flex items-center gap-1">
                                                                        <AlertCircle className="h-3 w-3" />
                                                                        No faces found
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground">{img.error || '-'}</span>
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {formatDistanceToNow(new Date(img.updatedAt), { addSuffix: true })}
                                                            </div>
                                                            <div className="text-center">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 px-2 text-xs"
                                                                    onClick={() => handleReindex(img.photoId)}
                                                                    disabled={reindexingPhotoId === img.photoId || img.status === 'PROCESSING'}
                                                                    title="Re-detect with high accuracy (800x800)"
                                                                >
                                                                    {reindexingPhotoId === img.photoId ? (
                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                    ) : (
                                                                        <RotateCcw className="h-3 w-3" />
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="videos" className="space-y-4">
                        <VideoList
                            eventId={eventId}
                            videos={filteredVideos}
                            loading={videosLoading}
                            onRefresh={refetchVideos}
                        />
                    </TabsContent>

                    <TabsContent value="people" className="space-y-4">
                        <PersonGallery
                            eventId={eventId}
                            eventSlug={event.eventSlug || eventId}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog open={!!selectedImage} onOpenChange={(open) => {
                if (!open) {
                    setSelectedImage(null);
                    setSelectedPhotoId(null);
                    setFacesForPhoto([]);

                    // Remove photo query parameter from URL
                    const params = new URLSearchParams(window.location.search);
                    params.delete('photo');
                    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
                    router.push(newUrl, { scroll: false });
                }
            }}>
                <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
                    <div className="relative overflow-hidden rounded-lg bg-black/80 backdrop-blur-sm">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2 z-50 text-white/70 hover:bg-white/20 hover:text-white"
                            onClick={() => {
                                setSelectedImage(null);
                                setSelectedPhotoId(null);
                                setFacesForPhoto([]);
                            }}
                        >
                            <XCircle className="h-6 w-6" />
                        </Button>
                        {/* Face count badge */}
                        {facesForPhoto.length > 0 && (
                            <div className="absolute left-2 top-2 z-50 bg-green-500/80 text-white px-2 py-1 rounded text-xs font-medium">
                                {facesForPhoto.length} face{facesForPhoto.length !== 1 ? 's' : ''} detected
                            </div>
                        )}
                        {facesLoading && (
                            <div className="absolute left-2 top-2 z-50 bg-blue-500/80 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Loading faces...
                            </div>
                        )}
                        {selectedImage && (
                            <div className="relative">
                                <img
                                    ref={imageRef}
                                    src={selectedImage}
                                    alt="Enlarged preview"
                                    className="max-h-[85vh] w-full object-contain"
                                    onLoad={drawBoundingBoxes}
                                />
                                <canvas
                                    ref={canvasRef}
                                    className="absolute top-0 left-0 pointer-events-none"
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </div>
                        )}
                        {/* Face details panel */}
                        {facesForPhoto.length > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-3 max-h-32 overflow-auto">
                                <div className="flex flex-wrap gap-2">
                                    {facesForPhoto.map((face, idx) => (
                                        <div key={idx} className="bg-white/10 rounded px-2 py-1 text-xs text-white">
                                            <span className="font-medium">Face {idx + 1}:</span>{' '}
                                            <span className="text-green-400">{face.detectorSource}</span>{' '}
                                            <span className="text-gray-400">({(face.confidence * 100).toFixed(0)}%)</span>
                                            {face.age && <span className="text-blue-400 ml-1">~{face.age.low}-{face.age.high}y</span>}
                                            {face.gender && <span className="text-purple-400 ml-1">{face.gender}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'COMPLETED':
            return <Badge variant="success" className="bg-green-500/15 text-green-600 hover:bg-green-500/25 border-0">Indexed</Badge>;
        case 'FAILED':
            return <Badge variant="destructive" className="bg-red-500/15 text-red-600 hover:bg-red-500/25 border-0">Failed</Badge>;
        case 'PROCESSING':
            return <Badge variant="warning" className="bg-yellow-500/15 text-yellow-600 hover:bg-yellow-500/25 border-0">Processing</Badge>;
        case 'DELETED':
            return <Badge variant="secondary" className="bg-gray-500/15 text-gray-600 hover:bg-gray-500/25 border-0">Deleted</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
}
