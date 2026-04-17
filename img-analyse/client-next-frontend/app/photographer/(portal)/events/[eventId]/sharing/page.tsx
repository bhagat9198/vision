'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, QrCode, MessageCircle, Phone, Mail, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ElegantQRCode from '@/components/ui/elegant-qr-code';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function SharingPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const [eventName, setEventName] = useState('');
  const [eventSlug, setEventSlug] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      const token = localStorage.getItem('photographerToken');
      const res = await fetch(`http://localhost:4000/api/v1/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setEventName(data.data.name);
        // data.data.slug is likely the full "username/slug" or just "slug". 
        // Based on event.service.ts: create() sets slug = username/generated-slug
        // So we might just need data.data.slug if the route handles it, but let's see.
        // Wait, the new route is /p/[username]/e/[slug].
        // The event slug in DB is "username/event-name". 
        // Let's check VariableEventPage: it takes [photographerSlug] and [slug].
        // fullSlug = `${photographerSlug}/${eventSlugParts.join('/')}`
        // So if DB slug is "user/event", then photographerSlug="user", slug="event".

        // We can extract username from photographer object.
        setUsername(data.data.photographer.username);

        // And we need the event portion of the slug.
        // If DB slug is "username/event-part", we strip the username.
        const dbSlug = data.data.slug;
        const slugPart = dbSlug.split('/').slice(1).join('/');
        setEventSlug(slugPart || dbSlug); // Fallback if no slash
      }
      setLoading(false);
    };
    fetchEvent();
  }, [eventId]);



  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/p/${username}/e/${eventSlug}`
    : `/p/${username}/e/${eventSlug}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`View your photos from ${eventName}: ${shareUrl}`)}`;
  const smsUrl = `sms:?body=${encodeURIComponent(`View your photos from ${eventName}: ${shareUrl}`)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(`Your photos from ${eventName}`)}&body=${encodeURIComponent(`View your photos here: ${shareUrl}`)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/photographer/events/${eventId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Share Gallery</h1>
          <p className="text-zinc-500 dark:text-zinc-400">{eventName}</p>
        </div>
      </div>

      {/* Share Link */}
      <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-900 dark:text-white">Event Share Link</CardTitle>
          <CardDescription>Share this link with your clients</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={shareUrl} readOnly className="font-mono text-sm" />
            <Button onClick={handleCopy} variant="outline" className="gap-2 shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <Button asChild variant="outline" className="w-full gap-2">
            <a href={shareUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> Preview Gallery
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Share Options */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-green-500 transition-colors cursor-pointer" onClick={() => window.open(whatsappUrl, '_blank')}>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-medium text-zinc-900 dark:text-white">WhatsApp</p>
            <p className="text-xs text-zinc-500 mt-1">Share via WhatsApp</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-blue-500 transition-colors cursor-pointer" onClick={() => window.open(smsUrl)}>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
              <Phone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="font-medium text-zinc-900 dark:text-white">SMS</p>
            <p className="text-xs text-zinc-500 mt-1">Share via text</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-purple-500 transition-colors cursor-pointer" onClick={() => window.open(emailUrl)}>
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
              <Mail className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="font-medium text-zinc-900 dark:text-white">Email</p>
            <p className="text-xs text-zinc-500 mt-1">Share via email</p>
          </CardContent>
        </Card>
      </div>

      {/* QR Code */}
      <Card className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-900 dark:text-white">QR Code</CardTitle>
          <CardDescription>Clients can scan this to access the gallery</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <div className="flex items-center justify-center p-4">
            <ElegantQRCode
              data={shareUrl}
              size={220}
              logo="/next.svg"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
