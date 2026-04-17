'use client';

import { useState } from 'react';
import { Palette, Shirt, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ColorOption, OutfitType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ColorClothingSearchProps {
  colors: ColorOption[];
  outfits: OutfitType[];
  onSearch: (colorId: string | null, outfitId: string | null) => void;
  isSearching?: boolean;
}

export function ColorClothingSearch({ colors, outfits, onSearch, isSearching }: ColorClothingSearchProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<string | null>(null);

  const handleColorClick = (colorId: string) => {
    const newColor = selectedColor === colorId ? null : colorId;
    setSelectedColor(newColor);
  };

  const handleOutfitClick = (outfitId: string) => {
    const newOutfit = selectedOutfit === outfitId ? null : outfitId;
    setSelectedOutfit(newOutfit);
  };

  const handleSearch = () => {
    onSearch(selectedColor, selectedOutfit);
  };

  const hasSelection = selectedColor || selectedOutfit;

  return (
    <div className="space-y-6">
      {/* Colors Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Select Color</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => (
            <button
              key={color.id}
              onClick={() => handleColorClick(color.id)}
              className={cn(
                'group flex flex-col items-center gap-1 p-2 rounded-lg transition-all',
                'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary',
                selectedColor === color.id && 'bg-primary/10 ring-2 ring-primary'
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-full border-2 transition-transform',
                  selectedColor === color.id ? 'scale-110 border-primary' : 'border-transparent group-hover:scale-105'
                )}
                style={{ backgroundColor: color.hex }}
              />
              <span className="text-xs font-medium">{color.name}</span>
              <span className="text-xs text-muted-foreground">{color.photoCount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Outfits Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shirt className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Select Outfit Type</h3>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {outfits.map((outfit) => (
            <button
              key={outfit.id}
              onClick={() => handleOutfitClick(outfit.id)}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-lg transition-all',
                'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary',
                selectedOutfit === outfit.id && 'bg-primary/10 ring-2 ring-primary'
              )}
            >
              <span className="text-2xl">{outfit.icon}</span>
              <span className="text-xs font-medium text-center">{outfit.name}</span>
              <span className="text-xs text-muted-foreground">{outfit.photoCount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Button */}
      <div className="flex justify-center pt-4">
        <Button
          size="lg"
          onClick={handleSearch}
          disabled={!hasSelection || isSearching}
          className="min-w-[200px]"
        >
          {isSearching ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              Search
              {selectedColor && selectedOutfit && ' (Color + Outfit)'}
              {selectedColor && !selectedOutfit && ' by Color'}
              {!selectedColor && selectedOutfit && ' by Outfit'}
            </>
          )}
        </Button>
      </div>

      {/* Selection Summary */}
      {hasSelection && (
        <div className="text-center text-sm text-muted-foreground">
          Selected: {selectedColor && colors.find(c => c.id === selectedColor)?.name}
          {selectedColor && selectedOutfit && ' + '}
          {selectedOutfit && outfits.find(o => o.id === selectedOutfit)?.name}
        </div>
      )}
    </div>
  );
}

