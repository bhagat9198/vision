/**
 * =============================================================================
 * Configuration Type Definitions
 * =============================================================================
 * Types for application configuration and admin settings.
 * =============================================================================
 */

// =============================================================================
// DETECTION MODE
// =============================================================================

/**
 * Face detection mode - configurable by admin.
 *
 * - 'recognition_only': Single call to CompreFace /recognize endpoint
 *   Gets bounding boxes + embeddings in one call. Fastest option.
 *
 * - 'detection_then_recognition': Two-step process
 *   First detects faces, crops/aligns them, then extracts embeddings.
 *   More control but slower.
 */
export type FaceDetectionMode = 'recognition_only' | 'detection_then_recognition';

/**
 * Image source mode for face indexing - configurable by admin.
 *
 * - 'url': img-analyse-backend fetches image from provided URL
 * - 'shared_storage': Both services access same filesystem/volume
 */
export type ImageSourceMode = 'url' | 'shared_storage';

// =============================================================================
// ADMIN SETTINGS
// =============================================================================

/**
 * Face analysis settings from api-node-backend admin config.
 */
export interface FaceAnalysisSettings {
  // Feature toggle
  enabled: boolean;

  // CompreFace
  comprefaceUrl: string;
  comprefaceRecognitionApiKey: string;
  comprefaceDetectionApiKey: string;

  // Detection mode
  detectionMode: FaceDetectionMode;

  // Image source
  imageSourceMode: ImageSourceMode;
  sharedStoragePath: string;

  // Quality filters
  minConfidence: number;
  minSizePx: number;
  skipExtremeAngles: boolean;

  // Search defaults
  defaultTopK: number;
  minSimilarity: number;

  // Cache
  embeddingCacheTtlSeconds: number;

  // Python sidecar
  pythonSidecarUrl: string;
  enableFallbackDetection: boolean;
  enableAlignment: boolean;
}

// =============================================================================
// ENVIRONMENT CONFIG
// =============================================================================

/**
 * Environment configuration (from .env file).
 */
export interface EnvConfig {
  // Server
  nodeEnv: 'development' | 'production' | 'test';
  port: number;

  // Database
  databaseUrl: string;

  // Master API Key (for org registration)
  masterApiKey: string;

  // Qdrant
  qdrantUrl: string;
  qdrantApiKey: string;

  // Redis
  redisHost: string;
  redisPort: number;
  redisPassword: string;

  // Python sidecar
  pythonSidecarUrl: string;

  // Logging
  logLevel: string;
}

// =============================================================================
// API RESPONSES
// =============================================================================

/**
 * Standard API response wrapper.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    processingTimeMs?: number;
    [key: string]: unknown;
  };
}

/**
 * Health check response.
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    qdrant: { status: 'up' | 'down'; responseTimeMs?: number };
    compreface: { status: 'up' | 'down'; responseTimeMs?: number };
    pythonSidecar: { status: 'up' | 'down'; responseTimeMs?: number };
    redis: { status: 'up' | 'down'; responseTimeMs?: number };
    database: { status: 'up' | 'down'; responseTimeMs?: number };
  };
}

