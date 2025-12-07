/**
 * =============================================================================
 * Organization Types
 * =============================================================================
 */

import type { Organization } from '../../../generated/prisma/client.js';

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

export interface RegisterOrgRequest {
  name: string;
}

export interface RegisterOrgResponse {
  organization: Organization;
  apiKey: {
    id: string;
    key: string;
    name: string;
  };
}

export interface UpdateOrgSettingsRequest {
  name?: string;
  comprefaceUrl?: string;
  comprefaceRecognitionApiKey?: string;
  comprefaceDetectionApiKey?: string;
  faceDetectionMode?: 'RECOGNITION_ONLY' | 'DETECTION_THEN_RECOGNITION';
  imageSourceMode?: 'URL' | 'MULTIPART' | 'SHARED_STORAGE';
  sharedStoragePath?: string;
  minConfidence?: number;
  minSizePx?: number;
  skipExtremeAngles?: boolean;
  searchDefaultTopK?: number;
  searchMinSimilarity?: number;
  embeddingCacheTtlSeconds?: number;
  pythonSidecarUrl?: string;
  enableFallbackDetection?: boolean;
  enableAlignment?: boolean;
}

// =============================================================================
// ORG SETTINGS FOR SERVICES
// =============================================================================

/**
 * Organization settings injected into request context.
 * Used by all services instead of remote config.
 */
export interface OrgSettings {
  orgId: string;
  name: string;
  isActive: boolean;

  // CompreFace
  comprefaceUrl: string | null;
  comprefaceRecognitionApiKey: string | null;
  comprefaceDetectionApiKey: string | null;

  // Detection
  faceDetectionMode: 'RECOGNITION_ONLY' | 'DETECTION_THEN_RECOGNITION';
  imageSourceMode: 'URL' | 'MULTIPART' | 'SHARED_STORAGE';
  sharedStoragePath: string | null;

  // Quality
  minConfidence: number;
  minSizePx: number;
  skipExtremeAngles: boolean;

  // Search
  searchDefaultTopK: number;
  searchMinSimilarity: number;

  // Cache
  embeddingCacheTtlSeconds: number;

  // Python Sidecar
  pythonSidecarUrl: string | null;
  enableFallbackDetection: boolean;
  enableAlignment: boolean;
}

/**
 * Converts a Prisma Organization to OrgSettings.
 */
export function toOrgSettings(org: Organization): OrgSettings {
  return {
    orgId: org.id,
    name: org.name,
    isActive: org.isActive,
    comprefaceUrl: org.comprefaceUrl,
    comprefaceRecognitionApiKey: org.comprefaceRecognitionApiKey,
    comprefaceDetectionApiKey: org.comprefaceDetectionApiKey,
    faceDetectionMode: org.faceDetectionMode,
    imageSourceMode: org.imageSourceMode,
    sharedStoragePath: org.sharedStoragePath,
    minConfidence: org.minConfidence,
    minSizePx: org.minSizePx,
    skipExtremeAngles: org.skipExtremeAngles,
    searchDefaultTopK: org.searchDefaultTopK,
    searchMinSimilarity: org.searchMinSimilarity,
    embeddingCacheTtlSeconds: org.embeddingCacheTtlSeconds,
    pythonSidecarUrl: org.pythonSidecarUrl,
    enableFallbackDetection: org.enableFallbackDetection,
    enableAlignment: org.enableAlignment,
  };
}

