'use client';

import Link from 'next/link';
import { Plus, Upload, Share2, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function QuickActions() {
  const actions = [
    {
      label: 'Create Event',
      description: 'Start a new photo event',
      icon: Plus,
      href: '/photographer/events/new',
      variant: 'default' as const,
    },
    {
      label: 'Upload Photos',
      description: 'Add to existing event',
      icon: Upload,
      href: '/photographer/events',
      variant: 'outline' as const,
    },
    {
      label: 'Share Link',
      description: 'Get client gallery link',
      icon: Share2,
      href: '/photographer/events',
      variant: 'outline' as const,
    },
    {
      label: 'View Engagement',
      description: 'See analytics & stats',
      icon: BarChart3,
      href: '/photographer/analytics',
      variant: 'outline' as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link key={action.label} href={action.href}>
            <Button
              variant={action.variant}
              className="w-full h-auto flex-col gap-2 py-4"
            >
              <action.icon className="h-5 w-5" />
              <div className="text-center">
                <p className="font-medium">{action.label}</p>
                <p className="text-xs opacity-70 font-normal">{action.description}</p>
              </div>
            </Button>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

