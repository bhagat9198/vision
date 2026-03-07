'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Camera, Sparkles, Shield, Zap, ArrowRight, Search, Users, Download, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  const router = useRouter();
  const [eventId, setEventId] = useState('');
  const [error, setError] = useState('');

  const handleAccessGallery = (e: React.FormEvent) => {
    e.preventDefault();
    const input = eventId.trim();
    if (!input) {
      setError('Please enter an event ID');
      return;
    }

    // Check if input is likely a "photographer/event" path
    if (input.includes('/')) {
      const parts = input.split('/').filter(p => p.length > 0);
      if (parts.length >= 2) {
        const [photographer, event, ...rest] = parts;
        const restPath = rest.length > 0 ? `/${rest.join('/')}` : '';
        router.push(`/p/${photographer}/e/${event}${restPath}`);
        return;
      }
    }

    // Fallback for simple IDs or slugs (preserves existing behavior)
    router.push(`/event/${input}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold">PhotoShare</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/photographer/login">
              <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
                Login
              </Button>
            </Link>
            <Link href="/photographer/signup">
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-purple-500/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px]" />

        <div className="relative max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-sm">AI-Powered Photo Discovery</span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
              Share Your
              <span className="block bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
                Precious Moments
              </span>
            </h1>

            <p className="text-xl text-white/60 max-w-lg">
              The modern way for photographers to deliver stunning galleries.
              Let clients find themselves with AI-powered face search.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Link href="/photographer/signup">
                <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 h-14 px-8 text-lg gap-2">
                  Start Free Trial <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/photographer/login">
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 h-14 px-8 text-lg">
                  Photographer Login
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 border-2 border-[#0a0a0a]" />
                ))}
              </div>
              <p className="text-sm text-white/50">
                Trusted by <span className="text-white font-semibold">2,500+</span> photographers
              </p>
            </div>
          </div>

          {/* Right - Event Access Card */}
          <div className="relative">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent" />
              <CardContent className="relative p-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white">Access Your Gallery</h2>
                  <p className="text-white/60">Enter the event ID shared by your photographer</p>
                </div>

                <form onSubmit={handleAccessGallery} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Enter Event ID (e.g., 1, 2, 3...)"
                      value={eventId}
                      onChange={(e) => {
                        setEventId(e.target.value);
                        setError('');
                      }}
                      className="h-14 bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center text-lg"
                    />
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-14 bg-white text-black hover:bg-white/90 text-lg font-semibold gap-2"
                  >
                    View Gallery <ArrowRight className="h-5 w-5" />
                  </Button>
                </form>

                <p className="text-center text-white/40 text-sm">
                  Don&apos;t have an event ID? Ask your photographer!
                </p>
              </CardContent>
            </Card>

            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 opacity-50 blur-xl" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 opacity-30 blur-xl" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-32 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold">
              Why Photographers Love
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent"> PhotoShare</span>
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Everything you need to deliver beautiful galleries and delight your clients
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Sparkles,
                title: 'AI Face Search',
                description: 'Clients find their photos instantly with facial recognition',
                gradient: 'from-purple-500 to-pink-500'
              },
              {
                icon: Shield,
                title: 'Secure Delivery',
                description: 'Password protection & watermarking keep your work safe',
                gradient: 'from-blue-500 to-cyan-500'
              },
              {
                icon: Zap,
                title: 'Lightning Fast',
                description: 'Optimized delivery ensures instant loading worldwide',
                gradient: 'from-amber-500 to-orange-500'
              },
              {
                icon: Heart,
                title: 'Client Favorites',
                description: 'Let clients mark & download their favorite shots',
                gradient: 'from-rose-500 to-red-500'
              }
            ].map((feature, i) => (
              <Card key={i} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors group">
                <CardContent className="p-6 space-y-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                  <p className="text-white/60">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - For Clients */}
      <section className="relative py-32 bg-gradient-to-b from-transparent via-white/5 to-transparent">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <p className="text-amber-400 font-medium">FOR GUESTS & CLIENTS</p>
            <h2 className="text-4xl lg:text-5xl font-bold">Find Your Photos in Seconds</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Get Your Event ID',
                description: 'Your photographer will share a unique event ID with you',
                icon: Users
              },
              {
                step: '02',
                title: 'Search with AI',
                description: 'Use face search, color search, or browse the full gallery',
                icon: Search
              },
              {
                step: '03',
                title: 'Download & Share',
                description: 'Save your favorites and share memories with loved ones',
                icon: Download
              }
            ].map((item, i) => (
              <div key={i} className="relative text-center space-y-4">
                <div className="text-6xl font-bold text-white/10">{item.step}</div>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto -mt-10 relative">
                  <item.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white pt-4">{item.title}</h3>
                <p className="text-white/60">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Preview */}
      <section className="relative py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <p className="text-amber-400 font-medium">STUNNING TEMPLATES</p>
              <h2 className="text-4xl lg:text-5xl font-bold">
                Beautiful Galleries That Match Your Style
              </h2>
              <p className="text-xl text-white/60">
                Choose from elegant templates designed to showcase your work.
                From modern minimalism to classic elegance.
              </p>
              <Link href="/photographer/signup">
                <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 h-12 px-6 gap-2">
                  Create Your Gallery <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                {[
                  'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80',
                  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80',
                  'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&q=80',
                  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=80'
                ].map((src, i) => (
                  <div key={i} className={`relative aspect-[4/3] rounded-2xl overflow-hidden ${i % 2 === 1 ? 'mt-8' : ''}`}>
                    <Image src={src} alt="" fill className="object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                ))}
              </div>
              <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 to-purple-500/20 rounded-3xl blur-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <h2 className="text-4xl lg:text-6xl font-bold">
            Ready to Transform Your
            <span className="block bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Photo Delivery?
            </span>
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto">
            Join thousands of photographers who trust PhotoShare to deliver
            stunning galleries to their clients.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/photographer/signup">
              <Button size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 h-14 px-8 text-lg gap-2">
                Start Free Trial <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/event/1">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 h-14 px-8 text-lg">
                View Demo Gallery
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Camera className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold">PhotoShare</span>
            </div>
            <p className="text-white/40 text-sm">
              © 2024 PhotoShare. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
