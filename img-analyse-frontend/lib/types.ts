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
  eventId: string;
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

