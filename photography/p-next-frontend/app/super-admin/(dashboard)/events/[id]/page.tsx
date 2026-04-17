'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    Calendar, Camera, Image as ImageIcon, Download,
    ChevronLeft, MapPin, User, Folder
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface EventDetail {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    date: string;
    location: string | null;
    status: string;
    template: string;
    coverPhoto: string | null;
    password: string | null;
    isPasswordProtected: boolean;
    photographerName: string;
    createdAt: string;
    photosCount: number;
    albumsCount: number;
    downloadsCount: number;
    photographer: {
        id: string;
        name: string;
        email: string;
    };
}

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [event, setEvent] = useState<EventDetail | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchEvent = useCallback(async () => {
        try {
            const token = localStorage.getItem('superAdminToken');
            const res = await fetch(`http://localhost:4000/api/v1/super-admin/events/${params.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await res.json();
            if (result.success) {
                setEvent(result.data);
            }
        } catch (err) {
            console.error('Failed to fetch event details', err);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        fetchEvent();
    }, [fetchEvent]);

    if (loading) {
        return <div className="text-slate-400 text-center py-20">Loading details...</div>;
    }

    if (!event) {
        return <div className="text-slate-400 text-center py-20">Event not found</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="text-slate-400 hover:text-white hover:bg-slate-800"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-xl font-semibold text-white">{event.name}</h2>
                    <p className="text-sm text-slate-400">Event Details</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Info Card */}
                <Card className="bg-slate-900/50 border-slate-800 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                            <Camera className="h-5 w-5 text-indigo-400" />
                            Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 text-slate-300">
                                <Calendar className="h-5 w-5 text-slate-500" />
                                <div>
                                    <p className="text-xs text-slate-500">Date</p>
                                    <p className="text-sm font-medium">{new Date(event.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-300">
                                <MapPin className="h-5 w-5 text-slate-500" />
                                <div>
                                    <p className="text-xs text-slate-500">Location</p>
                                    <p className="text-sm font-medium">{event.location || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-300">
                                <User className="h-5 w-5 text-slate-500" />
                                <div>
                                    <p className="text-xs text-slate-500">Photographer</p>
                                    <p
                                        className="text-sm font-medium text-indigo-400 cursor-pointer hover:underline"
                                        onClick={() => router.push(`/super-admin/photographers/${event.photographer.id}`)}
                                    >
                                        {event.photographerName}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-300">
                                <div className={`w-2 h-2 rounded-full ${event.status === 'PUBLISHED' ? 'bg-green-500' :
                                        event.status === 'ARCHIVED' ? 'bg-slate-500' : 'bg-amber-500'
                                    }`} />
                                <div>
                                    <p className="text-xs text-slate-500">Status</p>
                                    <p className="text-sm font-medium">{event.status}</p>
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-slate-800" />

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-400">Description</p>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                {event.description || 'No description provided.'}
                            </p>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h4 className="text-sm font-medium text-slate-400 uppercase">Configuration</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                    <p className="text-xs text-slate-500">Template</p>
                                    <p className="text-sm text-white">{event.template}</p>
                                </div>
                                <div className="p-3 bg-slate-800/50 rounded-lg">
                                    <p className="text-xs text-slate-500">Access</p>
                                    <p className="text-sm text-white">{event.isPasswordProtected ? 'Password Protected' : 'Public'}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Card */}
                <Card className="bg-slate-900/50 border-slate-800 md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-indigo-400" />
                            Stats
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <ImageIcon className="h-5 w-5 text-blue-400" />
                                </div>
                                <span className="text-sm text-slate-300">Photos</span>
                            </div>
                            <span className="text-lg font-semibold text-white">{event.photosCount}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                    <Folder className="h-5 w-5 text-amber-400" />
                                </div>
                                <span className="text-sm text-slate-300">Albums</span>
                            </div>
                            <span className="text-lg font-semibold text-white">{event.albumsCount}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <Download className="h-5 w-5 text-green-400" />
                                </div>
                                <span className="text-sm text-slate-300">Downloads</span>
                            </div>
                            <span className="text-lg font-semibold text-white">{event.downloadsCount}</span>
                        </div>

                        <Separator className="bg-slate-800 my-4" />

                        <div className="text-xs text-center text-slate-500">
                            Created on {new Date(event.createdAt).toLocaleDateString()}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
