'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, LogOut, User, Save, Mail, Phone, Loader2, Shield, Star, Heart, Trash2 } from 'lucide-react';
import { usePhotoInteractions } from '@/lib/hooks/use-photo-interactions';
import { useQueryTabs } from '@/lib/hooks/use-query-tabs';

export function ProfileContent() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<{ email?: string; phone?: string; name?: string; role?: string } | null>(null);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [activeTab, setActiveTab] = useQueryTabs('profile', 'tab') as ['profile' | 'favorites' | 'likes', (v: string) => void];

    const { getFavorites, getLikes, toggleFavorite, toggleLike, isLoaded } = usePhotoInteractions();

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            router.push('/');
            return;
        }

        try {
            const storedUser = localStorage.getItem('authUser');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                setName(parsed.name || '');
            }
        } catch (e) {
            console.error('Failed to load user', e);
        } finally {
            setLoading(false);
        }
    }, [router]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        setMessage({ type: '', text: '' });

        setTimeout(() => {
            if (user) {
                const updatedUser = { ...user, name };
                localStorage.setItem('authUser', JSON.stringify(updatedUser));
                setUser(updatedUser);
                setMessage({ type: 'success', text: 'Profile updated successfully' });
            }
            setSaving(false);
        }, 600);
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        localStorage.removeItem('photographerToken');
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        );
    }

    if (!user) return null;

    const initials = (name || user.email || user.phone || 'U').slice(0, 2).toUpperCase();
    const role = user.role === 'CLIENT' ? 'Viewer' : 'Photographer';

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
                {/* Page Title */}
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Profile</h1>
                    <p className="text-zinc-500 dark:text-zinc-400">Manage your account settings</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'profile'
                            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                    >
                        <User className="h-4 w-4 inline mr-2" />
                        Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('favorites')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'favorites'
                            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                    >
                        <Star className="h-4 w-4 inline mr-2" />
                        Favorites ({isLoaded ? getFavorites().length : 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('likes')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'likes'
                            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                    >
                        <Heart className="h-4 w-4 inline mr-2" />
                        Likes ({isLoaded ? getLikes().length : 0})
                    </button>
                </div>

                {/* Message */}
                {message.text && (
                    <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                        {message.text}
                    </div>
                )}

                {/* Profile Tab Content */}
                {activeTab === 'profile' && (
                    <>
                        {/* Profile Card */}
                        <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-zinc-900 dark:text-white flex items-center gap-2">
                                    <User className="h-5 w-5" /> Profile Information
                                </CardTitle>
                                <CardDescription>Update your display name and view account details</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSave} className="space-y-4">
                                    {/* Avatar Preview */}
                                    <div className="flex items-center gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold text-xl">
                                            {initials}
                                        </div>
                                        <div>
                                            <p className="font-medium text-zinc-900 dark:text-white">{name || 'Guest User'}</p>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                                {role}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Name Field */}
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Display Name</Label>
                                        <Input
                                            id="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Enter your name"
                                        />
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">This name will appear on your likes and comments.</p>
                                    </div>

                                    {/* Account Info (Read-only) */}
                                    <div className="space-y-2">
                                        <Label>{user.email ? 'Email' : 'Phone'}</Label>
                                        <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                                            {user.email ? (
                                                <Mail className="h-4 w-4 text-zinc-400" />
                                            ) : (
                                                <Phone className="h-4 w-4 text-zinc-400" />
                                            )}
                                            <span className="text-zinc-900 dark:text-white">{user.email || user.phone}</span>
                                            <span className="ml-auto inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                                <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                                Verified
                                            </span>
                                        </div>
                                    </div>

                                    <Button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
                                        <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Session Card */}
                        <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-zinc-900 dark:text-white flex items-center gap-2">
                                    <Shield className="h-5 w-5" /> Session
                                </CardTitle>
                                <CardDescription>Manage your current session</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-zinc-900 dark:text-white font-medium">Active Session</p>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Signed in via {user.email ? 'Email' : 'Phone'}</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={handleLogout}
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 border-red-200 dark:border-red-500/30"
                                    >
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Sign Out
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Favorites Tab Content */}
                {activeTab === 'favorites' && (
                    <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-zinc-900 dark:text-white flex items-center gap-2">
                                <Star className="h-5 w-5 text-amber-500" /> Your Favorites
                            </CardTitle>
                            <CardDescription>Photos you&apos;ve saved to your collection</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!isLoaded ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                                </div>
                            ) : getFavorites().length === 0 ? (
                                <div className="text-center py-12">
                                    <Star className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                                    <p className="text-zinc-500 dark:text-zinc-400">No favorites yet</p>
                                    <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
                                        Click the star icon on photos to add them here
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {getFavorites().map((fav) => (
                                        <div
                                            key={fav.photoId}
                                            className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer bg-zinc-100 dark:bg-zinc-800"
                                            onClick={() => router.push(`/event/${fav.eventId}/photo/${fav.photoId}`)}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={fav.thumbnail || fav.url || '/placeholder.jpg'}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-white hover:bg-white/20"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleFavorite(fav.photoId, fav.eventId, fav.thumbnail, fav.url);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                    Remove
                                                </Button>
                                            </div>
                                            <div className="absolute top-2 right-2">
                                                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Likes Tab Content */}
                {activeTab === 'likes' && (
                    <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-zinc-900 dark:text-white flex items-center gap-2">
                                <Heart className="h-5 w-5 text-rose-500" /> Your Likes
                            </CardTitle>
                            <CardDescription>Photos you&apos;ve liked</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!isLoaded ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                                </div>
                            ) : getLikes().length === 0 ? (
                                <div className="text-center py-12">
                                    <Heart className="h-12 w-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                                    <p className="text-zinc-500 dark:text-zinc-400">No likes yet</p>
                                    <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
                                        Click the heart icon on photos to like them
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {getLikes().map((like) => (
                                        <div
                                            key={like.photoId}
                                            className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer bg-zinc-100 dark:bg-zinc-800"
                                            onClick={() => router.push(`/event/${like.eventId}/photo/${like.photoId}`)}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={like.thumbnail || like.url || '/placeholder.jpg'}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-white hover:bg-white/20"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleLike(like.photoId, like.eventId, like.thumbnail, like.url);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                    Unlike
                                                </Button>
                                            </div>
                                            <div className="absolute top-2 right-2">
                                                <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
