'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpiryCountdownProps {
  expiresAt: string;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeLeft(expiresAt: string): TimeLeft {
  const difference = new Date(expiresAt).getTime() - new Date().getTime();
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  };
}

export function ExpiryCountdown({ expiresAt, className }: ExpiryCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(expiresAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(expiresAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const isExpired = timeLeft.total <= 0;
  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 24;

  if (isExpired) {
    return (
      <div className={cn('flex items-center gap-2 text-destructive', className)}>
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-medium">Expired</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', isUrgent ? 'text-amber-600' : 'text-muted-foreground', className)}>
      <Clock className="h-4 w-4" />
      <div className="text-sm">
        {timeLeft.days > 0 && (
          <span className="font-medium">{timeLeft.days}d </span>
        )}
        <span className="font-medium">{String(timeLeft.hours).padStart(2, '0')}:</span>
        <span className="font-medium">{String(timeLeft.minutes).padStart(2, '0')}:</span>
        <span className="font-medium">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="ml-1 text-xs">left</span>
      </div>
    </div>
  );
}

