/**
 * =============================================================================
 * Face Search Type Definitions
 * =============================================================================
 * Types for face search operations and results.
 * =============================================================================
 */

import type { BoundingBox } from './face.types.js';

// =============================================================================
// SEARCH REQUEST
// =============================================================================

/**
 * Request to search for matching faces.
 */
export interface SearchRequest {
  /** Event ID to search within */
  eventId: string;
  /** Selfie image buffer for face extraction */
  imageBuffer: Buffer;
  /** Maximum number of results to return */
  topK?: number;
  /** Minimum similarity threshold (0.0 to 1.0) */
  minSimilarity?: number;
}

/**
 * Request to search using a cached embedding.
 */
export interface CachedSearchRequest {
  /** Session ID containing the cached embedding */
  sessionId: string;
  /** Event ID to search within */
  eventId: string;
  /** Event Slug (optional) */
  eventSlug?: string;
  /** Maximum number of results */
  topK?: number;
  /** Minimum similarity threshold */
  minSimilarity?: number;
  /** Offset for pagination */
  offset?: number;
}

// =============================================================================
// SEARCH RESULTS
// =============================================================================

/**
 * A single face match from the search.
 */
export interface FaceMatch {
  /** Photo ID containing this face */
  photoId: string;
  /** Similarity score (0.0 to 1.0, higher is better) */
  similarity: number;
  /** Bounding box of the matched face */
  bbox: BoundingBox;
  /** Detection confidence */
  confidence: number;
}

/**
 * Search results grouped by photo.
 * A photo may contain multiple matching faces.
 */
export interface GroupedPhotoMatch {
  /** Photo ID */
  photoId: string;
  /** Best (highest) similarity score among all matching faces */
  bestSimilarity: number;
  /** Number of matching faces in this photo */
  matchCount: number;
  /** All matching faces in this photo */
  faces: FaceMatch[];
}

/**
 * Complete search response.
 */
export interface SearchResponse {
  /** Whether search was successful */
  success: boolean;
  /** Session ID for subsequent searches (embedding cached) */
  sessionId?: string;
  /** Total number of matching faces */
  totalMatches: number;
  /** Grouped results by photo, sorted by best score */
  matches: GroupedPhotoMatch[];
  /** Search time in milliseconds */
  searchTimeMs: number;
  /** Optional message */
  message?: string;
}

// =============================================================================
// VECTOR DATABASE TYPES
// =============================================================================

/**
 * Payload stored with each face vector in Qdrant.
 * Index signature added for Qdrant compatibility.
 */
export interface QdrantFacePayload {
  [key: string]: unknown;
  /** Photo ID from the main database */
  photoId: string;
  /** Event ID */
  eventId: string;
  /** Face index within the photo */
  faceIndex: number;
  /** Bounding box */
  bbox: BoundingBox;
  /** Detection confidence */
  confidence: number;
  /** Which detector found this face */
  detectorSource: 'compreface' | 'yunet' | 'scrfd' | 'insightface';
  /** Whether face was aligned */
  wasAligned?: boolean;
  /** Estimated age range */
  age?: {
    low: number;
    high: number;
  };
  /** Estimated gender */
  gender?: string; // 'male' or 'female'
  /** Head pose */
  pose?: {
    pitch: number;
    roll: number;
    yaw: number;
  };
  /** Timestamp when indexed */
  indexedAt: string;
}

/**
 * Point structure for Qdrant upsert.
 */
export interface QdrantFacePoint {
  /** Unique face ID (UUID) */
  id: string;
  /** 512-dimensional embedding vector */
  vector: number[];
  /** Metadata payload */
  payload: QdrantFacePayload;
}

// =============================================================================
// EMBEDDING CACHE
// =============================================================================

/**
 * Cached embedding data stored in Redis.
 */
export interface CachedEmbedding {
  /** The embedding vector */
  embedding: number[];
  /** When the embedding was created */
  createdAt: string;
  /** When the embedding expires */
  expiresAt: string;
  /** Bounding box of the face */
  bbox?: BoundingBox;
  /** Detection confidence */
  confidence?: number;
}

