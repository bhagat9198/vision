/**
 * =============================================================================
 * Qdrant Client Configuration
 * =============================================================================
 * Initializes and exports the Qdrant client for vector database operations.
 * =============================================================================
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

// =============================================================================
// CLIENT INITIALIZATION
// =============================================================================

/**
 * Qdrant client instance.
 * Used for all vector database operations.
 */
export const qdrantClient = new QdrantClient({
  url: env.qdrantUrl,
  apiKey: env.qdrantApiKey || undefined,
});

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Vector dimension for face embeddings.
 * Must match the CompreFace model output dimension.
 */
export const VECTOR_DIMENSION = env.faceEmbeddingDimension;

/**
 * Distance metric for similarity search.
 * Cosine is standard for face embeddings.
 */
export const DISTANCE_METRIC = 'Cosine' as const;

/**
 * HNSW index parameters for optimal face search.
 */
export const HNSW_CONFIG = {
  m: 16,              // Number of edges per node
  efConstruction: 100, // Size of dynamic candidate list during construction
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate collection name for an event.
 * Format: org_{orgId}_event_{eventId}_faces
 *
 * @param orgId - The organization's UUID
 * @param eventId - The event's UUID
 * @returns Collection name string
 */
export function getCollectionName(orgId: string, eventId: string): string {
  // Sanitize IDs to ensure valid collection name
  const sanitizedOrgId = orgId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedEventId = eventId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `org_${sanitizedOrgId}_event_${sanitizedEventId}_faces`;
}

/**
 * Check if Qdrant is reachable.
 *
 * @returns Promise resolving to health status
 */
export async function checkQdrantHealth(): Promise<{
  status: 'up' | 'down';
  responseTimeMs: number;
}> {
  const startTime = Date.now();

  try {
    await qdrantClient.getCollections();
    return {
      status: 'up',
      responseTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('Qdrant health check failed:', error);
    return {
      status: 'down',
      responseTimeMs: Date.now() - startTime,
    };
  }
}

