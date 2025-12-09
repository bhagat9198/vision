/**
 * =============================================================================
 * Qdrant Service
 * =============================================================================
 * Manages face embeddings in Qdrant vector database.
 *
 * Collection Strategy: One collection per event
 * - Collection name format: event_{eventId}_faces
 * - Enables fast event-scoped searches without filtering
 * - Easy cleanup when event is deleted
 *
 * @see https://qdrant.tech/documentation/
 * =============================================================================
 */

import { v4 as uuidv4 } from 'uuid';
import {
  qdrantClient,
  VECTOR_DIMENSION,
  DISTANCE_METRIC,
  HNSW_CONFIG,
} from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { QdrantFacePayload, QdrantFacePoint, FaceWithEmbedding } from '../types/index.js';

/**
 * Get collection name for an org and event.
 * Format: org_{orgId}_event_{eventId}_faces
 */
function getOrgCollectionName(orgId: string, eventId: string): string {
  return `org_${orgId}_event_${eventId}_faces`;
}

// =============================================================================
// QDRANT SERVICE
// =============================================================================

/**
 * Service for managing face embeddings in Qdrant.
 * Now uses org-scoped collection names for multi-tenancy.
 */
class QdrantService {
  /**
   * Ensure a collection exists for an org and event.
   * Creates the collection if it doesn't exist.
   *
   * @param orgId - Organization UUID
   * @param eventId - Event UUID
   */
  async ensureCollection(orgId: string, eventId: string): Promise<void> {
    const collectionName = getOrgCollectionName(orgId, eventId);

    try {
      // Check if collection exists
      const collections = await qdrantClient.getCollections();
      const exists = collections.collections.some((c) => c.name === collectionName);

      if (exists) {
        logger.debug(`Collection ${collectionName} already exists`);
        return;
      }

      // Create collection with optimized settings
      await qdrantClient.createCollection(collectionName, {
        vectors: {
          size: VECTOR_DIMENSION,
          distance: DISTANCE_METRIC,
        },
        hnsw_config: HNSW_CONFIG,
        optimizers_config: {
          indexing_threshold: 1000, // Start indexing after 1000 vectors
        },
      });

      logger.info(`Created collection ${collectionName}`);
    } catch (error) {
      logger.error(`Failed to ensure collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Index faces from a photo into the org's event collection.
   *
   * @param orgId - Organization UUID
   * @param eventId - Event UUID
   * @param photoId - Photo UUID
   * @param faces - Array of faces with embeddings
   * @returns Array of indexed point IDs
   */
  async indexFaces(
    orgId: string,
    eventId: string,
    photoId: string,
    faces: FaceWithEmbedding[]
  ): Promise<string[]> {
    if (faces.length === 0) {
      return [];
    }

    const collectionName = getOrgCollectionName(orgId, eventId);
    await this.ensureCollection(orgId, eventId);

    const points: QdrantFacePoint[] = faces.map((face, index) => ({
      id: uuidv4(),
      vector: face.embedding,
      payload: {
        photoId,
        eventId,
        faceIndex: index,
        bbox: face.bbox,
        confidence: face.confidence,
        detectorSource: face.detectorSource,
        wasAligned: face.wasAligned,
        age: face.age,
        gender: face.gender?.value,
        pose: face.pose,
        indexedAt: new Date().toISOString(),
      },
    }));

    try {
      await qdrantClient.upsert(collectionName, {
        wait: true,
        points,
      });

      const pointIds = points.map((p) => p.id as string);
      logger.info(`Indexed ${faces.length} faces for photo ${photoId} in ${collectionName}`);

      return pointIds;
    } catch (error) {
      logger.error(`Failed to index faces for photo ${photoId}:`, error);
      throw error;
    }
  }

  /**
   * Search for similar faces in an org's event collection.
   *
   * @param orgId - Organization UUID
   * @param eventId - Event UUID
   * @param embedding - Query embedding vector
   * @param topK - Number of results to return
   * @param minScore - Minimum similarity score (0-1)
   * @returns Array of matching faces with scores
   */
  async searchFaces(
    orgId: string,
    eventId: string,
    embedding: number[],
    topK: number,
    minScore: number
  ): Promise<Array<{ payload: QdrantFacePayload; score: number }>> {
    const collectionName = getOrgCollectionName(orgId, eventId);

    try {
      // Check if collection exists
      const collections = await qdrantClient.getCollections();
      const exists = collections.collections.some((c) => c.name === collectionName);

      if (!exists) {
        logger.warn(`Collection ${collectionName} does not exist`);
        return [];
      }

      const results = await qdrantClient.search(collectionName, {
        vector: embedding,
        limit: topK,
        score_threshold: minScore,
        with_payload: true,
      });

      return results.map((result) => ({
        payload: result.payload as QdrantFacePayload,
        score: result.score,
      }));
    } catch (error) {
      logger.error(`Failed to search faces in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete all faces for a specific photo.
   *
   * @param orgId - Organization UUID
   * @param eventId - Event UUID
   * @param photoId - Photo UUID
   */
  async deleteFacesForPhoto(orgId: string, eventId: string, photoId: string): Promise<void> {
    const collectionName = getOrgCollectionName(orgId, eventId);
    logger.info(`[DELETE_PHOTO] Request to delete faces for photo ${photoId} in collection ${collectionName} (Org: ${orgId}, Event: ${eventId})`);

    try {
      await qdrantClient.delete(collectionName, {
        wait: true,
        filter: {
          must: [
            {
              key: 'photoId',
              match: { value: photoId },
            },
          ],
        },
      });

      logger.info(`[DELETE_PHOTO] Successfully deleted faces for photo ${photoId} from ${collectionName}`);
    } catch (error: any) {
      // Ignore if collection doesn't exist (idempotent)
      if (error?.status === 404 || error?.response?.status === 404) {
        logger.warn(`[DELETE_PHOTO] Collection ${collectionName} does not exist, skipping photo deletion.`);
        return;
      }
      logger.error(`[DELETE_PHOTO] Failed to delete faces for photo ${photoId}:`, error);
      throw error;
    }
  }

  /**
   * Delete an entire org's event collection.
   *
   * @param orgId - Organization UUID
   * @param eventId - Event UUID
   */
  async deleteCollection(orgId: string, eventId: string): Promise<void> {
    const collectionName = getOrgCollectionName(orgId, eventId);
    logger.info(`[DELETE_COLLECTION] Request to delete collection ${collectionName} (Org: ${orgId}, Event: ${eventId})`);

    try {
      await qdrantClient.deleteCollection(collectionName);
      logger.info(`[DELETE_COLLECTION] Successfully deleted collection ${collectionName}`);
    } catch (error: any) {
      // Ignore if collection doesn't exist (idempotent)
      if (error?.status === 404 || error?.response?.status === 404) {
        logger.warn(`[DELETE_COLLECTION] Collection ${collectionName} does not exist, skipping deletion.`);
        return;
      }
      logger.error(`[DELETE_COLLECTION] Failed to delete collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get collection statistics.
   *
   * @param orgId - Organization UUID
   * @param eventId - Event UUID
   * @returns Collection info or null if not exists
   */
  async getCollectionInfo(orgId: string, eventId: string): Promise<{
    vectorCount: number;
    indexedVectorCount: number;
    status: string;
  } | null> {
    const collectionName = getOrgCollectionName(orgId, eventId);

    try {
      const info = await qdrantClient.getCollection(collectionName);

      return {
        vectorCount: info.points_count ?? 0,
        indexedVectorCount: info.indexed_vectors_count ?? 0,
        status: info.status,
      };
    } catch (error) {
      // Collection doesn't exist
      return null;
    }
  }

  /**
   * List all event collections for an org.
   *
   * @param orgId - Organization UUID
   * @returns Array of event IDs with collections
   */
  async listEventCollections(orgId: string): Promise<string[]> {
    const prefix = `org_${orgId}_event_`;
    try {
      const collections = await qdrantClient.getCollections();

      return collections.collections
        .filter((c) => c.name.startsWith(prefix) && c.name.endsWith('_faces'))
        .map((c) => {
          // Extract eventId from collection name: org_{orgId}_event_{eventId}_faces
          const match = c.name.match(new RegExp(`^org_${orgId}_event_(.+)_faces$`));
          return match?.[1];
        })
        .filter((id): id is string => Boolean(id));
    } catch (error) {
      logger.error('Failed to list event collections:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const qdrantService = new QdrantService();

