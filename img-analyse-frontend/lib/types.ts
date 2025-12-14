// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// =============================================================================
// Health Types
// =============================================================================

export interface ServiceHealth {
  status: "up" | "down";
  message?: string;
  latency?: number;
}

export interface HealthCheckResponse {
  status: "healthy" | "degraded";
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    qdrant: ServiceHealth;
    redis: ServiceHealth;
    database: ServiceHealth;
    compreface: ServiceHealth;
    pythonSidecar: ServiceHealth;
  };
}

// =============================================================================
// Organization Types
// =============================================================================

export type FaceDetectionMode = "RECOGNITION_ONLY" | "DETECTION_THEN_RECOGNITION";
export type ImageSourceMode = "URL" | "MULTIPART" | "SHARED_STORAGE";
export type FaceRecognitionProvider = "COMPREFACE" | "INSIGHTFACE";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // CompreFace Settings
  comprefaceUrl?: string | null;
  comprefaceRecognitionApiKey?: string | null;
  comprefaceDetectionApiKey?: string | null;

  // Detection Settings
  faceDetectionMode: FaceDetectionMode;
  imageSourceMode: ImageSourceMode;
  sharedStoragePath?: string | null;

  // Quality Filters
  minConfidence: number;
  minSizePx: number;
  skipExtremeAngles: boolean;

  // Search Settings
  searchDefaultTopK: number;
  searchMinSimilarity: number;

  // Cache Settings
  embeddingCacheTtlSeconds: number;

  // Python Sidecar
  pythonSidecarUrl?: string | null;
  enableFallbackDetection: boolean;
  enableAlignment: boolean;

  // Face Recognition Provider
  faceRecognitionProvider: FaceRecognitionProvider;
  insightfaceModel?: string | null;
}

export interface OrganizationListItem {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateOrgRequest {
  name: string;
  slug?: string;
}

export interface CreateOrgResponse {
  org: Organization;
  apiKey: string;
}

// =============================================================================
// API Key Types
// =============================================================================

export interface ApiKey {
  id: string;
  orgId: string;
  key: string;
  name: string;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

export interface ApiKeyListItem {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string | null;
  keyPreview: string;
}

// =============================================================================
// Collection/Event Types
// =============================================================================

export interface CollectionInfo {
  collectionName: string;
  eventId?: string; // Optional because sometimes we only get slug
  eventSlug?: string;
  vectorCount: number;
  indexedVectorCount: number;
  status: string;
  pendingCount?: number;
  isIndexing?: boolean;
}

export interface OrgCollectionInfo extends CollectionInfo {
  orgId: string;
}

export interface OrgCollectionsResponse {
  orgId: string;
  orgName: string;
  totalCollections: number;
  totalVectors: number;
  totalIndexed: number;
  collections: CollectionInfo[];
}

export interface AllCollectionsResponse {
  totalCollections: number;
  totalVectors: number;
  totalIndexed: number;
  collections: OrgCollectionInfo[];
}

export interface EventStats {
  eventId: string;
  indexed: boolean;
  vectorCount: number;
  indexedVectorCount?: number;
  status?: string;
  eventSlug?: string;
  collectionName?: string;
  totalImages?: number;
  totalIndexed?: number;
}

// =============================================================================
// Indexing Types
// =============================================================================

export interface IndexPhotoResult {
  photoId: string;
  eventId: string;
  facesDetected: number;
  facesIndexed: number;
  facesRejected: number;
  processingTimeMs: number;
  detectorsUsed: string[];
}

export interface ImageStatus {
  id: string;
  photoId: string;
  imageUrl?: string | null;
  facesDetected: number;
  facesIndexed: number;
  status: IndexingStatus;
  error?: string | null;
  updatedAt: string;
  isActive: boolean;
}

// =============================================================================
// Face Detail Types (from Qdrant)
// =============================================================================

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceDetail {
  faceIndex: number;
  bbox: BoundingBox;
  confidence: number;
  detectorSource: 'compreface' | 'yunet' | 'scrfd' | 'insightface';
  age?: { low: number; high: number };
  gender?: string;
  pose?: { pitch: number; roll: number; yaw: number };
}

export interface PhotoFacesResponse {
  photoId: string;
  faces: FaceDetail[];
}

// =============================================================================
// Video Types
// =============================================================================

export type IndexingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DELETED';

export interface VideoFrame {
  id: string;
  photoId: string;
  status: IndexingStatus;
  imageUrl?: string | null;
  facesDetected: number;
  facesIndexed: number;
  videoTimestamp?: number | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VideoFrameStats {
  total: number;
  completed?: number;
  failed?: number;
  processing?: number;
  pending?: number;
}

export interface VideoWithFrames {
  id: string;
  eventId: string;
  videoId: string;
  eventSlug?: string | null;
  orgId: string;
  status: IndexingStatus;
  isActive: boolean;
  error?: string | null;
  videoUrl?: string | null | undefined;
  durationSec: number;
  framesExtracted: number;
  facesFound: number;
  createdAt: string;
  updatedAt: string;
  frames?: VideoFrame[];
  frameStats: VideoFrameStats;
  _count?: { frames: number };
}

