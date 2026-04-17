import { GalleryTemplate } from '@/lib/types';

export interface Event {
    id: string;
    displayId: number;
    slug: string;
    name: string;
    date: string;
    status: string;
    location?: string;
    coverPhoto?: string;
    template?: GalleryTemplate | string;
    isPasswordProtected: boolean;
    requiresPassword: boolean;
    instructions?: string;
    photographer: { id: string; name: string; avatar?: string };
    photographerId?: string;
    _count?: { photos: number; albums: number };
}
