"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useApi, usePollingApi } from "@/lib/hooks/use-api";
import { api, API_BASE_URL } from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { formatDistanceToNow } from "date-fns";
import { VideoList } from "@/components/events/video-list";

import Link from "next/link";
import { EventDetailSkeleton } from "@/components/events/event-detail-skeleton";

import { EventStats, ImageStatus, VideoWithFrames } from "@/lib/types";

export default function EventDetailPage() {
    const params = useParams();
    const eventId = params.id as string;
    const [activeTab, setActiveTab] = useState("images");
    const [viewStatus, setViewStatus] = useState<'active' | 'inactive'>('active');

    // New States (Moved up to avoid conditional hook call error)
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imageFilter, setImageFilter] = useState("all");

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

                                    <div className="rounded-md border">
                                        <div className="grid grid-cols-12 border-b bg-muted/50 p-3 text-xs font-medium text-muted-foreground">
                                            <div className="col-span-1">Preview</div>
                                            <div className="col-span-3">Photo ID</div>
                                            <div className="col-span-1">Faces</div>
                                            <div className="col-span-2">Status</div>
                                            <div className="col-span-3">Error / Details</div>
                                            <div className="col-span-2 text-right">Updated</div>
                                        </div>
                                        <div className="max-h-[600px] overflow-auto">
                                            {filteredImages.length === 0 ? (
                                                <div className="p-8 text-center text-sm text-muted-foreground">
                                                    No images found for this filter.
                                                </div>
                                            ) : (
                                                filteredImages.map((img: ImageStatus) => (
                                                    <div key={img.id} className="grid grid-cols-12 items-center border-b p-3 text-sm last:border-0 hover:bg-muted/5">
                                                        <div className="col-span-1">
                                                            {img.imageUrl ? (
                                                                <div
                                                                    className="h-8 w-8 overflow-hidden rounded-md border bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                                                    onClick={() => setSelectedImage(`${img.imageUrl!.startsWith('http') ? '' : API_BASE_URL}${img.imageUrl}`)}
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
                                                        <div className="col-span-3 font-mono text-xs truncate pr-2" title={img.photoId}>
                                                            {img.photoId}
                                                        </div>
                                                        <div className="col-span-1">
                                                            {img.facesDetected > 0 ? (
                                                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                                                    {img.facesDetected}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs text-center block w-6">-</span>
                                                            )}
                                                        </div>
                                                        <div className="col-span-2">
                                                            <StatusBadge status={!img.isActive ? 'DELETED' : img.status} />
                                                        </div>
                                                        <div className="col-span-3 text-xs truncate" title={img.error || ''}>
                                                            {img.status === 'COMPLETED' && img.facesIndexed === 0 ? (
                                                                <span className="text-warning flex items-center gap-1">
                                                                    <AlertCircle className="h-3 w-3" />
                                                                    No faces found
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground">{img.error || '-'}</span>
                                                            )}
                                                        </div>
                                                        <div className="col-span-2 text-right text-xs text-muted-foreground">
                                                            {formatDistanceToNow(new Date(img.updatedAt), { addSuffix: true })}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
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
                </Tabs>
            </div>

            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
                <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
                    <div className="relative overflow-hidden rounded-lg bg-black/80 backdrop-blur-sm">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2 z-50 text-white/70 hover:bg-white/20 hover:text-white"
                            onClick={() => setSelectedImage(null)}
                        >
                            <XCircle className="h-6 w-6" />
                        </Button>
                        {selectedImage && (
                            <img
                                src={selectedImage}
                                alt="Enlarged preview"
                                className="max-h-[85vh] w-full object-contain"
                            />
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
