'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Camera, LayoutDashboard, Calendar, Settings, LogOut, Menu, X, ChevronRight, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const navigation = [
  { name: 'Dashboard', href: '/photographer/dashboard', icon: LayoutDashboard },
  { name: 'Events', href: '/photographer/events', icon: Calendar },
  { name: 'Settings', href: '/photographer/settings', icon: Settings },
];

interface PhotographerProfile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  subscription: string;
  storageUsed: number;
  storageLimit: number;
}

export default function PhotographerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<PhotographerProfile | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('photographerToken');
    if (!token) {
      router.push('/photographer/login');
      return;
    }
    // Fetch profile
    fetch('http://localhost:4000/api/v1/photographers/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProfile(data.data);
        } else {
          localStorage.removeItem('photographerToken');
          router.push('/photographer/login');
        }
      })
      .catch(() => {
        localStorage.removeItem('photographerToken');
        router.push('/photographer/login');
      });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('photographerToken');
    router.push('/photographer/login');
  };

  const formatStorage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  const storagePercent = profile ? (profile.storageUsed / profile.storageLimit) * 100 : 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-zinc-900 dark:text-white block">PICS</span>
              <span className="text-xs text-zinc-500">Photographer Portal</span>
            </div>
            <button className="lg:hidden ml-auto text-zinc-400" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* Storage usage */}
          {profile && (
            <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="h-4 w-4 text-zinc-500" />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Storage</span>
              </div>
              <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(storagePercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {formatStorage(profile.storageUsed)} / {formatStorage(profile.storageLimit)}
              </p>
            </div>
          )}

          {/* User section */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-medium text-sm">
                {profile?.name?.charAt(0).toUpperCase() || 'P'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{profile?.name || 'Loading...'}</p>
                <p className="text-xs text-zinc-500">{profile?.subscription || ''} Plan</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar - hidden on event detail pages which have their own header */}
        {!pathname.match(/\/photographer\/events\/[^/]+$/) && (
          <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between px-4 py-3">
              <button className="lg:hidden text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-6 w-6" />
              </button>
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </div>
          </header>
        )}

        {/* Page content - no padding for event detail pages */}
        <main className={pathname.match(/\/photographer\/events\/[^/]+$/) ? '' : 'p-6'}>{children}</main>
      </div>
    </div>
  );
}

