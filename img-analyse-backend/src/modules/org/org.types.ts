/**
 * =============================================================================
 * Organization Types
 * =============================================================================
 */

import type { Organization } from '../../../generated/prisma/client.js';
import { env } from '../../config/env.js';

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

export interface RegisterOrgRequest {
  name: string;
  slug?: string;
}

export interface RegisterOrgResponse {
  organization: Organization;
  apiKey: {
    id: string;
    key: string;
    name: string;
  };
}

export type FaceRecognitionProvider = 'COMPREFACE' | 'INSIGHTFACE';
export type ClusteringProvider = 'QDRANT' | 'HDBSCAN';

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
  // Face Recognition Provider
  faceRecognitionProvider?: FaceRecognitionProvider;
  insightfaceModel?: string;  // e.g., 'buffalo_l', 'buffalo_s', 'antelopev2'

  // Clustering Settings
  clusteringProvider?: ClusteringProvider;
  clusteringMinSamples?: number;
  clusteringMinClusterSize?: number;
  clusteringSimilarityThreshold?: number;
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
  slug: string;
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

  // Face Recognition Provider
  faceRecognitionProvider: FaceRecognitionProvider;
  insightfaceModel: string | null;

  // Clustering Settings
  clusteringProvider: ClusteringProvider;
  clusteringMinSamples: number;
  clusteringMinClusterSize: number;
  clusteringSimilarityThreshold: number;
}

/**
 * Converts a Prisma Organization to OrgSettings.
 */
export function toOrgSettings(org: Organization): OrgSettings {
  return {
    orgId: org.id,
    name: org.name,
    slug: org.slug,
    isActive: org.isActive,
    comprefaceUrl: org.comprefaceUrl || env.comprefaceUrl,
    comprefaceRecognitionApiKey: org.comprefaceRecognitionApiKey || env.comprefaceRecognitionApiKey,
    comprefaceDetectionApiKey: org.comprefaceDetectionApiKey || env.comprefaceDetectionApiKey,
    faceDetectionMode: org.faceDetectionMode,
    imageSourceMode: org.imageSourceMode,
    sharedStoragePath: org.sharedStoragePath,
    minConfidence: org.minConfidence,
    minSizePx: org.minSizePx,
    skipExtremeAngles: org.skipExtremeAngles,
    searchDefaultTopK: org.searchDefaultTopK,
    searchMinSimilarity: org.searchMinSimilarity,
    embeddingCacheTtlSeconds: org.embeddingCacheTtlSeconds,
    pythonSidecarUrl: org.pythonSidecarUrl || env.pythonSidecarUrl,
    enableFallbackDetection: org.enableFallbackDetection,
    enableAlignment: org.enableAlignment,
    faceRecognitionProvider: org.faceRecognitionProvider,
    insightfaceModel: org.insightfaceModel,
    // Clustering settings
    clusteringProvider: org.clusteringProvider,
    clusteringMinSamples: org.clusteringMinSamples,
    clusteringMinClusterSize: org.clusteringMinClusterSize,
    clusteringSimilarityThreshold: org.clusteringSimilarityThreshold,
  };
}

