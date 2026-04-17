import { GalleryTemplate } from './types';

export interface TemplateStyles {
  // Page backgrounds
  pageBg: string;
  headerBg: string;
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // Buttons
  buttonPrimary: string;
  buttonOutline: string;
  buttonGhost: string;
  // Cards/containers
  cardBg: string;
  borderColor: string;
  // Accents
  accentColor: string;
  // Photo viewer
  viewerBg: string;
}

export const templateStyles: Record<GalleryTemplate, TemplateStyles> = {
  modern: {
    pageBg: 'bg-white',
    headerBg: 'bg-white border-b border-gray-200',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-700',
    textMuted: 'text-gray-500',
    buttonPrimary: 'bg-black text-white hover:bg-gray-800 rounded-none',
    buttonOutline: 'border-gray-300 text-gray-900 hover:bg-gray-100 rounded-none',
    buttonGhost: 'text-gray-700 hover:bg-gray-100',
    cardBg: 'bg-white',
    borderColor: 'border-gray-200',
    accentColor: 'text-blue-600',
    viewerBg: 'bg-black',
  },
  classic: {
    pageBg: 'bg-[#f5f5f0]',
    headerBg: 'bg-[#1a1a2e] border-b border-[#d4af37]/30',
    textPrimary: 'text-white',
    textSecondary: 'text-white/80',
    textMuted: 'text-white/60',
    buttonPrimary: 'bg-[#d4af37] text-[#1a1a2e] hover:bg-[#b8962f]',
    buttonOutline: 'border-[#d4af37]/50 text-white hover:bg-[#d4af37]/10',
    buttonGhost: 'text-white hover:bg-white/10',
    cardBg: 'bg-white',
    borderColor: 'border-[#d4af37]/30',
    accentColor: 'text-[#d4af37]',
    viewerBg: 'bg-[#1a1a2e]',
  },
  minimal: {
    pageBg: 'bg-white',
    headerBg: 'bg-white/90 backdrop-blur-sm',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    textMuted: 'text-gray-400',
    buttonPrimary: 'bg-gray-900 text-white hover:bg-gray-800',
    buttonOutline: 'border-gray-200 text-gray-900 hover:border-gray-900',
    buttonGhost: 'text-gray-600 hover:text-gray-900',
    cardBg: 'bg-white',
    borderColor: 'border-gray-100',
    accentColor: 'text-gray-900',
    viewerBg: 'bg-white',
  },
  elegant: {
    pageBg: 'bg-[#0d0d0d]',
    headerBg: 'bg-[#0d0d0d]/95 backdrop-blur border-b border-[#d4af37]/20',
    textPrimary: 'text-white',
    textSecondary: 'text-white/80',
    textMuted: 'text-[#d4af37]/70',
    buttonPrimary: 'bg-[#d4af37] text-[#0d0d0d] hover:bg-[#b8962f] rounded-none',
    buttonOutline: 'border-[#d4af37]/50 text-[#d4af37] hover:bg-[#d4af37]/10 rounded-none',
    buttonGhost: 'text-[#d4af37] hover:bg-[#d4af37]/10',
    cardBg: 'bg-[#1a1a1a]',
    borderColor: 'border-[#d4af37]/20',
    accentColor: 'text-[#d4af37]',
    viewerBg: 'bg-[#0d0d0d]',
  },
  fashion: {
    pageBg: 'bg-black',
    headerBg: 'bg-black/95 backdrop-blur border-b border-white/10',
    textPrimary: 'text-white',
    textSecondary: 'text-white/80',
    textMuted: 'text-white/50',
    buttonPrimary: 'bg-white text-black hover:bg-white/90 rounded-none font-bold',
    buttonOutline: 'border-white/30 text-white hover:bg-white/10 rounded-none',
    buttonGhost: 'text-white hover:bg-white/10',
    cardBg: 'bg-white/5',
    borderColor: 'border-white/10',
    accentColor: 'text-white',
    viewerBg: 'bg-black',
  },
  sidebar: {
    pageBg: 'bg-white',
    headerBg: 'bg-white/95 backdrop-blur border-b border-gray-100',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    textMuted: 'text-gray-400',
    buttonPrimary: 'bg-black text-white hover:bg-gray-800 rounded-none',
    buttonOutline: 'border-gray-200 text-gray-900 hover:bg-gray-100 rounded-none',
    buttonGhost: 'text-gray-600 hover:text-gray-900',
    cardBg: 'bg-white',
    borderColor: 'border-gray-100',
    accentColor: 'text-black',
    viewerBg: 'bg-[#1a1a1a]',
  },
};

export function getTemplateStyles(template: GalleryTemplate = 'modern'): TemplateStyles {
  return templateStyles[template] || templateStyles.modern;
}

