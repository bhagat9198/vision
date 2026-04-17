'use client';

import { GalleryTemplate } from '@/lib/types';
import Image from 'next/image';

interface TemplatePreviewProps {
  template: GalleryTemplate;
  className?: string;
}

// Mini preview images for demo
const previewImages = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=200&q=60',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=200&q=60',
  'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=200&q=60',
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=200&q=60',
];

export function TemplatePreview({ template, className }: TemplatePreviewProps) {
  if (template === 'modern') {
    return (
      <div className={`bg-white ${className}`}>
        {/* Modern: Full-width hero, clean white */}
        <div className="relative h-2/3 bg-gray-100">
          <Image src={previewImages[0]} alt="" fill className="object-cover" />
        </div>
        <div className="p-2 flex flex-col items-center">
          <div className="w-12 h-1 bg-black mb-1" />
          <div className="w-20 h-0.5 bg-gray-300" />
          <div className="flex gap-1 mt-2">
            <div className="w-4 h-4 bg-black" />
            <div className="w-4 h-4 border border-black" />
          </div>
        </div>
      </div>
    );
  }

  if (template === 'classic') {
    return (
      <div className={`bg-[#f5f5f0] ${className}`}>
        {/* Classic: Cream bg, framed photo, gold accents */}
        <div className="p-3">
          <div className="border-4 border-[#1a1a2e] p-1 bg-white">
            <div className="relative aspect-[4/3]">
              <Image src={previewImages[1]} alt="" fill className="object-cover" />
            </div>
          </div>
          <div className="flex justify-center mt-2">
            <div className="w-8 h-0.5 bg-[#d4af37]" />
            <div className="w-1 h-1 rounded-full bg-[#d4af37] mx-1" />
            <div className="w-8 h-0.5 bg-[#d4af37]" />
          </div>
          <div className="text-center mt-1">
            <div className="w-16 h-1 bg-[#1a1a2e] mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (template === 'minimal') {
    return (
      <div className={`bg-white ${className}`}>
        {/* Minimal: Split layout, lots of white space */}
        <div className="flex h-full">
          <div className="w-1/2 p-3 flex flex-col justify-center">
            <div className="w-full h-1 bg-gray-900 mb-1" />
            <div className="w-3/4 h-0.5 bg-gray-300 mb-2" />
            <div className="w-1/2 h-0.5 bg-gray-200" />
            <div className="mt-3 w-8 h-3 border border-gray-900 rounded-full" />
          </div>
          <div className="w-1/2 relative">
            <Image src={previewImages[2]} alt="" fill className="object-cover" />
          </div>
        </div>
      </div>
    );
  }

  if (template === 'elegant') {
    return (
      <div className={`bg-[#0d0d0d] ${className}`}>
        {/* Elegant: Dark theme, gold accents, centered */}
        <div className="h-full flex flex-col items-center justify-center p-3">
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mb-2" />
          <div className="relative w-4/5 aspect-[4/3] rounded overflow-hidden">
            <Image src={previewImages[3]} alt="" fill className="object-cover opacity-80" />
          </div>
          <div className="w-12 h-0.5 bg-[#d4af37] mt-2" />
          <div className="flex gap-1 mt-2">
            <div className="w-4 h-4 bg-[#d4af37]" />
            <div className="w-4 h-4 border border-[#d4af37]" />
          </div>
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mt-2" />
        </div>
      </div>
    );
  }

  if (template === 'fashion') {
    return (
      <div className={`bg-black ${className}`}>
        {/* Fashion: Bold, editorial, magazine-like */}
        <div className="h-full relative">
          <Image src={previewImages[0]} alt="" fill className="object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-3 left-3">
            <div className="w-16 h-2 bg-white mb-1" />
            <div className="w-12 h-1 bg-white/50 mb-1" />
            <div className="flex gap-1 mt-2">
              <div className="w-6 h-3 bg-white" />
              <div className="w-6 h-3 border border-white/50" />
            </div>
          </div>
          <div className="absolute bottom-3 right-3 flex gap-1">
            <div className="text-white text-xs font-bold">01</div>
            <div className="text-white/40 text-xs">/03</div>
          </div>
          {/* Social sidebar indicator */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/20 p-1 flex flex-col gap-0.5">
            <div className="w-2 h-2 bg-white rounded-full" />
            <div className="w-2 h-2 bg-white/50 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (template === 'sidebar') {
    return (
      <div className={`bg-white ${className}`}>
        {/* Sidebar: Fixed left nav, alternating layouts */}
        <div className="h-full flex">
          {/* Left sidebar */}
          <div className="w-1/4 bg-[#1a1a1a] p-2 flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-white/30 mb-2" />
            <div className="w-3 h-0.5 bg-white/50 mb-1" />
            <div className="space-y-1 mt-2">
              <div className="w-6 h-1 bg-white/30" />
              <div className="w-6 h-1 bg-white/20" />
              <div className="w-6 h-1 bg-white/20" />
            </div>
          </div>
          {/* Main content - split layout */}
          <div className="flex-1 flex">
            <div className="w-1/2 relative">
              <Image src={previewImages[2]} alt="" fill className="object-cover" />
            </div>
            <div className="w-1/2 p-2 flex flex-col justify-center">
              <div className="w-1 h-4 bg-black mb-1" />
              <div className="w-full h-1 bg-gray-900 mb-1" />
              <div className="w-2/3 h-0.5 bg-gray-300" />
              <div className="w-6 h-2 bg-black mt-2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Full template preview card with live-like preview
export function TemplatePreviewCard({ template }: { template: GalleryTemplate }) {
  return (
    <div className="aspect-[4/3] rounded-lg overflow-hidden border shadow-sm">
      <TemplatePreview template={template} className="w-full h-full" />
    </div>
  );
}

