"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { FileVideo, Plus, Video as VideoIcon, RefreshCw, AlertCircle, CheckCircle, Clock, ChevronDown, ChevronRight, Image as ImageIcon, User, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { api, API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import { usePollingApi } from "@/lib/hooks/use-api";
import { formatDistanceToNow } from "date-fns";
import type { VideoWithFrames, VideoFrame, FaceDetail } from "@/lib/types";

interface VideoListProps {
    eventId: string;
    videos: VideoWithFrames[] | undefined;
    loading: boolean;
    onRefresh: () => void;
}

export function VideoList({ eventId, videos, loading, onRefresh }: VideoListProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [videoPath, setVideoPath] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);

    // Frame preview state
    const [selectedFrame, setSelectedFrame] = useState<{ imageUrl: string; photoId: string } | null>(null);
    const [facesForFrame, setFacesForFrame] = useState<FaceDetail[]>([]);
    const [facesLoading, setFacesLoading] = useState(false);
    const [reindexingPhotoId, setReindexingPhotoId] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // Fetch faces for a frame
    const fetchFacesForFrame = useCallback(async (photoId: string) => {
        setFacesLoading(true);
        try {
            const response = await api.getPhotoFaces(photoId, eventId, eventId);
            if (response.data?.faces) {
                setFacesForFrame(response.data.faces);
            }
        } catch (error) {
            console.error('Failed to fetch faces:', error);
            setFacesForFrame([]);
        } finally {
            setFacesLoading(false);
        }
    }, [eventId]);

    // Handle frame preview click
    const handleFrameSelect = useCallback((imageUrl: string, photoId: string) => {
        setSelectedFrame({ imageUrl, photoId });
        fetchFacesForFrame(photoId);
    }, [fetchFacesForFrame]);

    // Handle re-detect button click
    const handleReindexFrame = useCallback(async (photoId: string) => {
        setReindexingPhotoId(photoId);
        try {
            await api.reindexPhoto(photoId, eventId, { highAccuracy: true, eventSlug: eventId });
            toast.success('Frame queued for re-detection with high accuracy');
            setTimeout(() => {
                onRefresh();
            }, 1000);
        } catch (error) {
            console.error('Failed to reindex frame:', error);
            toast.error('Failed to queue frame for re-detection');
        } finally {
            setReindexingPhotoId(null);
        }
    }, [eventId, onRefresh]);

    // Draw bounding boxes on canvas
    const drawBoundingBoxes = useCallback(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image || facesForFrame.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = image.clientWidth;
        canvas.height = image.clientHeight;

        const containerWidth = image.clientWidth;
        const containerHeight = image.clientHeight;
        const naturalWidth = image.naturalWidth;
        const naturalHeight = image.naturalHeight;

        const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
        const renderedWidth = naturalWidth * scale;
        const renderedHeight = naturalHeight * scale;
        const offsetX = (containerWidth - renderedWidth) / 2;
        const offsetY = (containerHeight - renderedHeight) / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        facesForFrame.forEach((face, index) => {
            const { x, y, width, height } = face.bbox;
            const scaledX = offsetX + x * scale;
            const scaledY = offsetY + y * scale;
            const scaledWidth = width * scale;
            const scaledHeight = height * scale;

            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

            const label = `#${index + 1} ${face.detectorSource} (${(face.confidence * 100).toFixed(0)}%)`;
            ctx.font = '12px sans-serif';
            const textWidth = ctx.measureText(label).width;
            ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
            ctx.fillRect(scaledX, scaledY - 18, textWidth + 8, 18);

            ctx.fillStyle = 'white';
            ctx.fillText(label, scaledX + 4, scaledY - 5);
        });
    }, [facesForFrame]);

    // Redraw boxes when faces change
    useEffect(() => {
        if (selectedFrame && facesForFrame.length > 0) {
            const timer = setTimeout(drawBoundingBoxes, 100);
            return () => clearTimeout(timer);
        }
    }, [selectedFrame, facesForFrame, drawBoundingBoxes]);

    const toggleExpand = (videoId: string) => {
        setExpandedVideoId(expandedVideoId === videoId ? null : videoId);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await api.indexVideo({
                videoId: uuidv4(),
                eventId,
                videoPath,
            });
            toast.success("Video queued for processing");
            setIsOpen(false);
            setVideoPath("");
            onRefresh();
        } catch (error) {
            toast.error("Failed to queue video");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Videos</CardTitle>
                    <CardDescription>
                        Process videos to automatically detect and index faces.
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add Video
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <form onSubmit={handleSubmit}>
                                <DialogHeader>
                                    <DialogTitle>Add Video Source</DialogTitle>
                                    <DialogDescription>
                                        Enter the direct URL or file path of the video to process.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="path">Video URL / Path</Label>
                                        <Input
                                            id="path"
                                            placeholder="https://example.com/video.mp4"
                                            value={videoPath}
                                            onChange={(e) => setVideoPath(e.target.value)}
                                            required
                                        />
                                        <p className="text-xs text-muted-foreground">Provide a direct link to the video file for processing.</p>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? "Queueing..." : "Process Video"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {!videos || videos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-muted/20 rounded-lg">
                        <FileVideo className="h-12 w-12 opacity-20 mb-4" />
                        <p className="font-medium mb-1">No videos tracked</p>
                        <p className="text-sm opacity-80">Add a video source to begin analysis.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {videos.map((video) => {
                            const isExpanded = expandedVideoId === video.videoId;
                            const frameStats = video.frameStats;
                            const hasFrames = video.frames && video.frames.length > 0;

                            return (
                                <div key={video.videoId} className="rounded-lg border bg-card overflow-hidden">
                                    {/* Video Header Row */}
                                    <div
                                        className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${hasFrames ? 'cursor-pointer' : ''}`}
                                        onClick={() => hasFrames && toggleExpand(video.videoId)}
                                    >
                                        <div className="flex items-center gap-4">
                                            {hasFrames && (
                                                <div className="text-muted-foreground">
                                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </div>
                                            )}
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <VideoIcon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="font-medium truncate max-w-[200px] sm:max-w-[300px]" title={video.videoUrl || video.videoId}>
                                                    {video.videoUrl ? video.videoUrl.split('/').pop() : `Video ${video.videoId.substring(0, 8)}...`}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Added {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8">
                                            <div className="text-sm flex flex-col items-end">
                                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Duration</span>
                                                <span>{video.durationSec ? `${Math.round(video.durationSec)}s` : '-'}</span>
                                            </div>
                                            <div className="text-sm flex flex-col items-end">
                                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Snapshots</span>
                                                <span>{video.framesExtracted || 0}</span>
                                            </div>
                                            <div className="text-sm flex flex-col items-end">
                                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Faces</span>
                                                <span>{video.facesFound || 0}</span>
                                            </div>
                                            <div className="pl-2">
                                                <StatusBadge status={video.status} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Frame Stats Progress Bar */}
                                    {frameStats && frameStats.total > 0 && (
                                        <div className="px-4 pb-2">
                                            <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
                                                {(frameStats.completed || 0) > 0 && (
                                                    <div
                                                        className="bg-green-500 h-full"
                                                        style={{ width: `${((frameStats.completed || 0) / frameStats.total) * 100}%` }}
                                                        title={`${frameStats.completed} completed`}
                                                    />
                                                )}
                                                {(frameStats.processing || 0) > 0 && (
                                                    <div
                                                        className="bg-yellow-500 h-full animate-pulse"
                                                        style={{ width: `${((frameStats.processing || 0) / frameStats.total) * 100}%` }}
                                                        title={`${frameStats.processing} processing`}
                                                    />
                                                )}
                                                {(frameStats.failed || 0) > 0 && (
                                                    <div
                                                        className="bg-red-500 h-full"
                                                        style={{ width: `${((frameStats.failed || 0) / frameStats.total) * 100}%` }}
                                                        title={`${frameStats.failed} failed`}
                                                    />
                                                )}
                                                {(frameStats.pending || 0) > 0 && (
                                                    <div
                                                        className="bg-gray-400 h-full"
                                                        style={{ width: `${((frameStats.pending || 0) / frameStats.total) * 100}%` }}
                                                        title={`${frameStats.pending} pending`}
                                                    />
                                                )}
                                            </div>
                                            <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                                {(frameStats.completed || 0) > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{frameStats.completed} completed</span>}
                                                {(frameStats.processing || 0) > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />{frameStats.processing} processing</span>}
                                                {(frameStats.failed || 0) > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{frameStats.failed} failed</span>}
                                                {(frameStats.pending || 0) > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" />{frameStats.pending} pending</span>}
                                            </div>
                                        </div>
                                    )}

                                    {/* Expanded Frame Table */}
                                    {isExpanded && hasFrames && video.frames && (
                                        <div className="border-t">
                                            <div className="grid grid-cols-12 border-b bg-muted/50 p-3 text-xs font-medium text-muted-foreground">
                                                <div className="col-span-1">Preview</div>
                                                <div className="col-span-1">Timestamp</div>
                                                <div className="col-span-1">Faces</div>
                                                <div className="col-span-1">Indexed</div>
                                                <div className="col-span-2">Status</div>
                                                <div className="col-span-3">Photo ID</div>
                                                <div className="col-span-2">Updated</div>
                                                <div className="col-span-1 text-right">Actions</div>
                                            </div>

                                            <div className="max-h-[400px] overflow-auto">
                                                {video.frames.sort((a, b) => a.videoTimestamp - b.videoTimestamp).map((frame) => (
                                                    <div key={frame.photoId} className="grid grid-cols-12 items-center border-b p-3 text-sm last:border-0 hover:bg-muted/5">
                                                        <div className="col-span-1">
                                                            {frame.imageUrl ? (
                                                                <div
                                                                    className="h-10 w-16 overflow-hidden rounded-md border bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all group relative"
                                                                    onClick={() => handleFrameSelect(
                                                                        `${(frame.imageUrl as string).startsWith('http') ? '' : API_BASE_URL}${frame.imageUrl}`,
                                                                        frame.photoId
                                                                    )}
                                                                >
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img
                                                                        src={`${(frame.imageUrl as string).startsWith('http') ? '' : API_BASE_URL}${frame.imageUrl}`}
                                                                        alt={`Frame at ${frame.videoTimestamp}s`}
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="flex h-10 w-16 items-center justify-center rounded-md border bg-muted">
                                                                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="col-span-1 font-mono text-xs">
                                                            +{frame.videoTimestamp.toFixed(2)}s
                                                        </div>
                                                        <div className="col-span-1">
                                                            {frame.facesDetected > 0 ? (
                                                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                                                                    {frame.facesDetected}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs text-center block w-6">-</span>
                                                            )}
                                                        </div>
                                                        <div className="col-span-1">
                                                            {frame.facesIndexed > 0 ? (
                                                                <Badge variant="success" className="h-5 px-1.5 text-[10px] bg-green-500/15 text-green-600 border-0">
                                                                    {frame.facesIndexed}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs text-center block w-6">-</span>
                                                            )}
                                                        </div>
                                                        <div className="col-span-2">
                                                            <StatusBadge status={frame.status} />
                                                            {frame.error && (
                                                                <p className="text-[10px] text-destructive truncate mt-1 max-w-[120px]" title={frame.error}>
                                                                    {frame.error}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="col-span-3 font-mono text-[10px] text-muted-foreground truncate pr-2" title={frame.photoId}>
                                                            {frame.photoId}
                                                        </div>
                                                        <div className="col-span-2 text-xs text-muted-foreground">
                                                            {formatVideoTime(frame.updatedAt)}
                                                        </div>
                                                        <div className="col-span-1 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => handleReindexFrame(frame.photoId)}
                                                                disabled={reindexingPhotoId === frame.photoId}
                                                                title="Re-detect faces with high accuracy"
                                                            >
                                                                {reindexingPhotoId === frame.photoId ? (
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>

            {/* Frame Preview Dialog with Bounding Boxes */}
            <Dialog open={!!selectedFrame} onOpenChange={(open) => {
                if (!open) {
                    setSelectedFrame(null);
                    setFacesForFrame([]);
                }
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Frame Preview
                            {facesLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {!facesLoading && facesForFrame.length > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {facesForFrame.length} face{facesForFrame.length !== 1 ? 's' : ''} detected
                                </Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedFrame && (
                        <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                ref={imageRef}
                                src={selectedFrame.imageUrl}
                                alt="Frame preview"
                                className="w-full h-auto object-contain max-h-[60vh]"
                                onLoad={drawBoundingBoxes}
                            />
                            <canvas
                                ref={canvasRef}
                                className="absolute top-0 left-0 pointer-events-none"
                            />
                            {facesForFrame.length > 0 && (
                                <div className="mt-4 p-3 bg-muted rounded-lg">
                                    <p className="text-sm font-medium mb-2">Detected Faces:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {facesForFrame.map((face, idx) => (
                                            <Badge key={idx} variant="outline" className="text-xs">
                                                #{idx + 1}: {face.detectorSource} ({(face.confidence * 100).toFixed(0)}%)
                                                {face.age && ` · Age ${face.age.low}-${face.age.high}`}
                                                {face.gender && ` · ${face.gender}`}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'COMPLETED':
        case 'Indexed': // Handle both casing if needed
            return <Badge variant="success" className="bg-green-500/15 text-green-600 hover:bg-green-500/25 border-0">Indexed</Badge>;
        case 'FAILED':
            return <Badge variant="destructive" className="bg-red-500/15 text-red-600 hover:bg-red-500/25 border-0">Failed</Badge>;
        case 'PROCESSING':
            return <Badge variant="warning" className="bg-yellow-500/15 text-yellow-600 hover:bg-yellow-500/25 border-0">Processing</Badge>;
        case 'PENDING':
            return <Badge variant="secondary" className="bg-gray-500/15 text-gray-600 hover:bg-gray-500/25 border-0">Pending</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
}

function formatVideoTime(dateString: string) {
    if (!dateString) return '-';
    // Handle specific date string formats if needed, or rely on Date constructor
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // If less than 24 hours, show relative time
    if (diff < 24 * 60 * 60 * 1000) {
        // Simple relative time
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ago`;
    }

    return date.toLocaleDateString();
}
