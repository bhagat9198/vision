'use client';

import { Heart, MessageCircle, Clock, Sun, Sunset, Moon, Play } from 'lucide-react';
import { Photo } from '@/lib/types';
import { cn } from '@/lib/utils';

// Check if URL is a video
const isVideoUrl = (url: string) => {
  return url?.match(/\.(mp4|mov|webm|avi|mkv)$/i) || url?.includes('/videos/');
};

interface TimelineViewProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
}

// Group photos by time of day based on timestamp
function groupByTimeOfDay(photos: Photo[]) {
  const groups: { [key: string]: { photos: Photo[]; icon: React.ReactNode; label: string } } = {
    morning: { photos: [], icon: <Sun className="h-5 w-5 text-amber-500" />, label: 'Morning' },
    afternoon: { photos: [], icon: <Sunset className="h-5 w-5 text-orange-500" />, label: 'Afternoon' },
    evening: { photos: [], icon: <Moon className="h-5 w-5 text-indigo-400" />, label: 'Evening' },
  };

  photos.forEach((photo, idx) => {
    // Simulate time distribution based on index for demo
    const hour = photo.timestamp ? new Date(photo.timestamp).getHours() : (idx % 3) * 8 + 8;
    if (hour >= 5 && hour < 12) groups.morning.photos.push(photo);
    else if (hour >= 12 && hour < 18) groups.afternoon.photos.push(photo);
    else groups.evening.photos.push(photo);
  });

  return Object.entries(groups).filter(([_, g]) => g.photos.length > 0);
}

export function TimelineView({ photos, onPhotoClick }: TimelineViewProps) {
  const timeGroups = groupByTimeOfDay(photos);

  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-400 via-orange-400 to-indigo-500" />

      <div className="space-y-12">
        {timeGroups.map(([key, group], groupIndex) => {
          const globalOffset = timeGroups.slice(0, groupIndex).reduce((sum, [_, g]) => sum + g.photos.length, 0);

          return (
            <div key={key} className="relative">
              {/* Time Marker */}
              <div className={cn(
                'flex items-center gap-3 mb-6',
                'md:justify-center'
              )}>
                <div className="relative z-10 flex items-center gap-2 bg-background px-4 py-2 rounded-full border-2 border-current shadow-lg">
                  {group.icon}
                  <span className="font-semibold">{group.label}</span>
                  <span className="text-muted-foreground text-sm">({group.photos.length})</span>
                </div>
              </div>

              {/* Photos Grid - Alternating sides on desktop */}
              <div className="space-y-6 ml-16 md:ml-0">
                {group.photos.map((photo, index) => {
                  const globalIndex = globalOffset + index;
                  const isLeft = index % 2 === 0;

                  return (
                    <div
                      key={photo.id}
                      className={cn(
                        'md:flex md:items-center md:gap-8',
                        isLeft ? 'md:flex-row' : 'md:flex-row-reverse'
                      )}
                    >
                      {/* Connector dot */}
                      <div className="hidden md:flex items-center justify-center flex-shrink-0">
                        <div className="w-4 h-4 rounded-full bg-primary border-4 border-background shadow" />
                      </div>

                      {/* Photo Card */}
                      <div
                        className={cn(
                          'relative group cursor-pointer',
                          'md:w-[calc(50%-2rem)]',
                          isLeft ? 'md:ml-auto' : 'md:mr-auto'
                        )}
                        onClick={() => onPhotoClick(photo, globalIndex)}
                      >
                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted shadow-lg hover:shadow-xl transition-shadow">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.thumbnail}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          {/* Video indicator */}
                          {isVideoUrl(photo.url) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                                <Play className="h-5 w-5 text-black fill-black ml-0.5" />
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-3 text-white text-sm">
                              <span className="flex items-center gap-1">
                                <Heart className="h-4 w-4" /> {photo.likes}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="h-4 w-4" /> {photo.comments}
                              </span>
                            </div>
                            {photo.timestamp && (
                              <span className="flex items-center gap-1 text-white/80 text-xs">
                                <Clock className="h-3 w-3" />
                                {new Date(photo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Spacer for alternating layout */}
                      <div className="hidden md:block md:w-[calc(50%-2rem)]" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

