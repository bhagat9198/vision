"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePollingApi } from "@/lib/hooks/use-api";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { formatDistanceToNow } from "date-fns";

export default function EventDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.id as string;
    const [activeTab, setActiveTab] = useState("all");
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const fetcher = useCallback(async () => {
        const status = activeTab === "all" ? undefined : activeTab.toUpperCase();
        const response = await api.getEventImages(eventId, status);
        return response.data;
    }, [eventId, activeTab]);

    const { data, loading, error, refetch } = usePollingApi<any>(fetcher, 10000);

    const stats = data?.stats || { total: 0, completed: 0, failed: 0, processing: 0 };
    const images = data?.images || [];

    return (
        <AppLayout>
            <div className="flex flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Event Details</h1>
                        <p className="text-muted-foreground font-mono text-sm">{eventId}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card
                        className={`cursor-pointer transition-all hover:bg-muted/50 ${activeTab === "all" ? "ring-2 ring-primary" : ""}`}
                        onClick={() => setActiveTab("all")}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Images</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>
                    <Card
                        className={`cursor-pointer transition-all hover:bg-muted/50 ${activeTab === "completed" ? "ring-2 ring-success" : ""}`}
                        onClick={() => setActiveTab("completed")}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-success">Indexed</CardTitle>
                            <CheckCircle className="h-4 w-4 text-success" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-success">{stats.completed}</div>
                        </CardContent>
                    </Card>
                    <Card
                        className={`cursor-pointer transition-all hover:bg-muted/50 ${activeTab === "failed" ? "ring-2 ring-destructive" : ""}`}
                        onClick={() => setActiveTab("failed")}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-destructive">Failed</CardTitle>
                            <AlertCircle className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
                        </CardContent>
                    </Card>
                    <Card
                        className={`cursor-pointer transition-all hover:bg-muted/50 ${activeTab === "processing" ? "ring-2 ring-warning" : ""}`}
                        onClick={() => setActiveTab("processing")}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-warning">Processing</CardTitle>
                            <Clock className="h-4 w-4 text-warning" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-warning">{stats.processing}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Image List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Image Status</CardTitle>
                        <CardDescription>Real-time status of image indexing</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                            <TabsList>
                                <TabsTrigger value="all">All</TabsTrigger>
                                <TabsTrigger value="completed">Indexed</TabsTrigger>
                                <TabsTrigger value="failed">Failed</TabsTrigger>
                                <TabsTrigger value="deleted">Deleted</TabsTrigger>
                                <TabsTrigger value="processing">Processing</TabsTrigger>
                            </TabsList>

                            <div className="rounded-md border">
                                <div className="grid grid-cols-12 border-b bg-muted/50 p-3 text-xs font-medium text-muted-foreground">
                                    <div className="col-span-1">Preview</div>
                                    <div className="col-span-3">Photo ID</div>
                                    <div className="col-span-2">Status</div>
                                    <div className="col-span-4">Error / Details</div>
                                    <div className="col-span-2 text-right">Updated</div>
                                </div>
                                <div className="max-h-[600px] overflow-auto">
                                    {images.length === 0 ? (
                                        <div className="p-8 text-center text-sm text-muted-foreground">
                                            No images found for this filter.
                                        </div>
                                    ) : (
                                        images.map((img: any) => (
                                            <div key={img.id} className="grid grid-cols-12 items-center border-b p-3 text-sm last:border-0 hover:bg-muted/5">
                                                <div className="col-span-1">
                                                    {img.imageUrl ? (
                                                        <div
                                                            className="h-8 w-8 overflow-hidden rounded-md border bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                                            onClick={() => setSelectedImage(img.imageUrl)}
                                                        >
                                                            <img
                                                                src={img.imageUrl}
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
                                                <div className="col-span-2">
                                                    <StatusBadge status={!img.isActive ? 'DELETED' : img.status} />
                                                </div>
                                                <div className="col-span-4 text-xs truncate" title={img.error || ''}>
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
