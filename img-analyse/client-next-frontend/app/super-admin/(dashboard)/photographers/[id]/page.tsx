'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    User, Mail, Phone, Calendar, HardDrive,
    ChevronLeft, Award, Image as ImageIcon, Layout
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface PhotographerDetail {
    id: string;
    name: string;
    email: string;
    username: string;
    phone: string | null;
    avatar: string | null;
    bio: string | null;
    website: string | null;
    instagram: string | null;
    subscription: string;
    isActive: boolean;
    storageUsed: number;
    storageLimit: number;
    createdAt: string;
    watermarkEnabled: boolean;
    watermarkText: string | null;
    eventsCount: number;
}

export default function PhotographerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [photographer, setPhotographer] = useState<PhotographerDetail | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchPhotographer = useCallback(async () => {
        try {
            const token = localStorage.getItem('superAdminToken');
            const res = await fetch(`http://localhost:4000/api/v1/super-admin/photographers/${params.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await res.json();
            if (result.success) {
                setPhotographer(result.data);
            }
        } catch (err) {
            console.error('Failed to fetch photographer details', err);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        fetchPhotographer();
    }, [fetchPhotographer]);

    const formatStorage = (bytes: number) => {
        const gb = bytes / (1024 * 1024 * 1024);
        return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    };

    if (loading) {
        return <div className="text-slate-400 text-center py-20">Loading details...</div>;
    }

    if (!photographer) {
        return <div className="text-slate-400 text-center py-20">Photographer not found</div>;
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
                    <h2 className="text-xl font-semibold text-white">{photographer.name}</h2>
                    <p className="text-sm text-slate-400">Photographer Details</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <Card className="bg-slate-900/50 border-slate-800 md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                            <User className="h-5 w-5 text-indigo-400" />
                            Profile
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-center py-4">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                                {photographer.name.charAt(0)}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-slate-300">
                                <Mail className="h-4 w-4 text-slate-500" />
                                <span className="text-sm">{photographer.email}</span>
                            </div>
                            {photographer.phone && (
                                <div className="flex items-center gap-3 text-slate-300">
                                    <Phone className="h-4 w-4 text-slate-500" />
                                    <span className="text-sm">{photographer.phone}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 text-slate-300">
                                <Calendar className="h-4 w-4 text-slate-500" />
                                <span className="text-sm">Joined {new Date(photographer.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <Separator className="bg-slate-800" />

                        <div className="space-y-2">
                            <p className="text-xs font-medium text-slate-500 uppercase">Status</p>
                            <div className="flex gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${photographer.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {photographer.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300">
                                    {photographer.username}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats & Subscription */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Award className="h-5 w-5 text-indigo-400" />
                                Subscription & Usage
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Current Plan</p>
                                    <p className="text-2xl font-semibold text-white">{photographer.subscription}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-slate-500">Events Created</p>
                                    <p className="text-2xl font-semibold text-white">{photographer.eventsCount}</p>
                                </div>

                                <div className="sm:col-span-2 space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400 flex items-center gap-2">
                                            <HardDrive className="h-4 w-4" /> Storage Usage
                                        </span>
                                        <span className="text-white font-medium">
                                            {formatStorage(photographer.storageUsed)} / {formatStorage(photographer.storageLimit)}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 rounded-full"
                                            style={{ width: `${Math.min((photographer.storageUsed / photographer.storageLimit) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 text-right">
                                        {Math.round((photographer.storageUsed / photographer.storageLimit) * 100)}% used
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Layout className="h-5 w-5 text-indigo-400" />
                                Additional Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-sm text-slate-500">Bio</p>
                                <p className="text-sm text-slate-300">{photographer.bio || 'No bio provided'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-slate-500">Website</p>
                                <p className="text-sm text-indigo-400">
                                    {photographer.website ? (
                                        <a href={photographer.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                            {photographer.website}
                                        </a>
                                    ) : 'Not linked'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-slate-500">Instagram</p>
                                <p className="text-sm text-pink-400">
                                    {photographer.instagram ? (
                                        <a href={`https://instagram.com/${photographer.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                            {photographer.instagram}
                                        </a>
                                    ) : 'Not linked'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-slate-500">Watermark</p>
                                <p className="text-sm text-slate-300">
                                    {photographer.watermarkEnabled ? (
                                        <span className="text-green-400">Enabled ({photographer.watermarkText || 'Image'})</span>
                                    ) : (
                                        <span className="text-slate-500">Disabled</span>
                                    )}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
