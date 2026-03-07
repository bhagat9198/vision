/**
 * =============================================================================
 * Type Definitions - Barrel Export
 * =============================================================================
 * Centralized export of all type definitions.
 * Import from '@/types' for clean imports.
 * =============================================================================
 */

export interface IndexPhotoRequest {
    photoId: string;
    eventId: string;
    eventSlug?: string;
    imageUrl?: string;
    imagePath?: string;
}

export interface IndexPhotoResult {
    photoId: string;
    eventId: string;
    facesDetected: number;
    facesIndexed: number;
    facesRejected: number;
    processingTimeMs: number;
    detectorsUsed: string[];
}

export interface SearchRequest {
    eventId: string;
    eventSlug?: string;
    imageBuffer: Buffer;
    topK?: number;
    minSimilarity?: number;
}


// Face detection and processing types
export * from './face.types.js';

// Search and vector database types
export * from './search.types.js';

// Configuration and API types
export * from './config.types.js';
