'use client';

import { Check, Image as ImageIcon, Lock } from 'lucide-react';
import { DownloadSize } from '@/lib/types';
import { cn } from '@/lib/utils';

interface DownloadSizeSelectorProps {
  sizes: DownloadSize[];
  allowedSizes: string[];
  selectedSize: string;
  onSizeSelect: (sizeId: string) => void;
  photoCount: number;
}

export function DownloadSizeSelector({
  sizes,
  allowedSizes,
  selectedSize,
  onSizeSelect,
  photoCount,
}: DownloadSizeSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Select Quality
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sizes.map((size) => {
          const isAllowed = allowedSizes.includes(size.id);
          const isSelected = selectedSize === size.id;
          
          return (
            <button
              key={size.id}
              onClick={() => isAllowed && onSizeSelect(size.id)}
              disabled={!isAllowed}
              className={cn(
                'relative p-4 rounded-xl border-2 text-left transition-all',
                isAllowed ? 'hover:border-primary cursor-pointer' : 'opacity-50 cursor-not-allowed',
                isSelected ? 'border-primary bg-primary/5' : 'border-muted'
              )}
            >
              {/* Selected Check */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
              
              {/* Lock for unavailable */}
              {!isAllowed && (
                <div className="absolute top-2 right-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">{size.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{size.dimensions}</p>
                <p className="text-sm font-medium">{size.estimatedSize}/photo</p>
                {size.pricePerPhoto && (
                  <p className="text-xs text-amber-600 font-medium">
                    +${size.pricePerPhoto}/photo
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Estimated Total */}
      <div className="text-sm text-muted-foreground">
        Estimated download: <span className="font-medium">{photoCount} photos</span>
      </div>
    </div>
  );
}

