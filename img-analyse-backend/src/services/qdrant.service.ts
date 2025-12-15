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

// ... (imports remain the same)

/**
 * Get collection name for an org and event.
 * Format: org_{orgSlug}_event_{eventSlug}_faces
 * Fallback to UUIDs if slugs not provided (for backward compatibility if needed, though plan implies requirement)
 * Current Plan: REQUIRE slugs.
 */
function getOrgCollectionName(orgSlug: string, eventSlug: string): string {
  // sanitize slugs just in case
  const safeOrgSlug = orgSlug.replace(/[^a-zA-Z0-9-_]/g, '_');
  const safeEventSlug = eventSlug.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `org_${safeOrgSlug}_event_${safeEventSlug}_faces`;
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
   * @param orgSlug - Organization Slug
   * @param eventSlug - Event Slug
   */
  async ensureCollection(orgSlug: string, eventSlug: string): Promise<void> {
    const collectionName = getOrgCollectionName(orgSlug, eventSlug);

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
   * @param orgSlug - Organization Slug
   * @param eventSlug - Event Slug
   * @param photoId - Photo UUID
   * @param faces - Array of faces with embeddings
   * @returns Array of indexed point IDs
   */
  async indexFaces(
    orgSlug: string,
    eventSlug: string,
    photoId: string,
    faces: FaceWithEmbedding[],
    // Metadata for payload (optional but useful)
    meta: { eventId: string }
  ): Promise<string[]> {
    logger.info(`[Qdrant] indexFaces called: orgSlug=${orgSlug}, eventSlug=${eventSlug}, photoId=${photoId}, faces=${faces.length}`);

    if (faces.length === 0) {
      logger.warn(`[Qdrant] No faces to index for photo ${photoId}`);
      return [];
    }

    const collectionName = getOrgCollectionName(orgSlug, eventSlug);
    logger.info(`[Qdrant] Collection name: ${collectionName}`);
    await this.ensureCollection(orgSlug, eventSlug);

    // Validate embeddings before creating points
    const validFaces = faces.filter((face, index) => {
      if (!face.embedding || face.embedding.length === 0) {
        logger.warn(`[Qdrant] Face ${index} has no embedding, skipping`);
        return false;
      }
      if (face.embedding.length !== 512) {
        logger.warn(`[Qdrant] Face ${index} has unexpected embedding dimension: ${face.embedding.length}`);
      }
      return true;
    });

    if (validFaces.length === 0) {
      logger.warn(`[Qdrant] No valid faces with embeddings for photo ${photoId}`);
      return [];
    }

    const points: QdrantFacePoint[] = validFaces.map((face, index) => ({
      id: uuidv4(),
      vector: face.embedding,
      payload: {
        photoId,
        eventId: meta.eventId, // Store actual UUID in payload still
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

    logger.info(`[Qdrant] Prepared ${points.length} points for upsert`);

    try {
      await qdrantClient.upsert(collectionName, {
        wait: true,
        points,
      });

      const pointIds = points.map((p) => p.id as string);
      logger.info(`[Qdrant] Successfully indexed ${validFaces.length} faces for photo ${photoId} in ${collectionName}`);

      return pointIds;
    } catch (error) {
      logger.error(`[Qdrant] Failed to index faces for photo ${photoId}:`, error);
      throw error;
    }
  }

  /**
   * Search for similar faces in an org's event collection.
   *
   * @param orgSlug - Organization Slug
   * @param eventSlug - Event Slug
   * @param embedding - Query embedding vector
   * @param topK - Number of results to return
   * @param minScore - Minimum similarity score (0-1)
   * @returns Array of matching faces with scores
   */
  async searchFaces(
    orgSlug: string,
    eventSlug: string,
    embedding: number[],
    topK: number,
    minScore: number
  ): Promise<Array<{ payload: QdrantFacePayload; score: number }>> {
    const collectionName = getOrgCollectionName(orgSlug, eventSlug);

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
   * Get all faces for a specific photo.
   * Used to display face bounding boxes and detector info on the frontend.
   *
   * @param orgSlug - Organization Slug
   * @param eventSlug - Event Slug
   * @param photoId - Photo UUID
   * @returns Array of face payloads with bbox, confidence, detectorSource
   */
  async getFacesForPhoto(
    orgSlug: string,
    eventSlug: string,
    photoId: string
  ): Promise<QdrantFacePayload[]> {
    const collectionName = getOrgCollectionName(orgSlug, eventSlug);
    logger.info(`[GET_FACES] Getting faces for photo ${photoId} in collection ${collectionName}`);

    try {
      // Check if collection exists
      const collections = await qdrantClient.getCollections();
      const exists = collections.collections.some((c) => c.name === collectionName);

      if (!exists) {
        logger.warn(`[GET_FACES] Collection ${collectionName} does not exist`);
        return [];
      }

      // Use scroll to get all faces for this photoId (no limit)
      const result = await qdrantClient.scroll(collectionName, {
        filter: {
          must: [
            {
              key: 'photoId',
              match: { value: photoId },
            },
          ],
        },
        with_payload: true,
        with_vector: false, // Don't need embeddings
        limit: 100, // Max faces per photo (should be more than enough)
      });

      const faces = result.points.map((point) => point.payload as QdrantFacePayload);
      logger.info(`[GET_FACES] Found ${faces.length} faces for photo ${photoId}`);
      return faces;
    } catch (error: any) {
      if (error?.status === 404 || error?.response?.status === 404) {
        logger.warn(`[GET_FACES] Collection ${collectionName} does not exist`);
        return [];
      }
      logger.error(`[GET_FACES] Failed to get faces for photo ${photoId}:`, error);
      throw error;
    }
  }

  /**
   * Delete all faces for a specific photo.
   *
   * @param orgSlug - Organization Slug
   * @param eventSlug - Event Slug
   * @param photoId - Photo UUID
   */
  async deleteFacesForPhoto(orgSlug: string, eventSlug: string, photoId: string): Promise<void> {
    const collectionName = getOrgCollectionName(orgSlug, eventSlug);
    logger.info(`[DELETE_PHOTO] Request to delete faces for photo ${photoId} in collection ${collectionName}`);

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
   * Delete faces for multiple photos (batch).
   * Useful when deleting a video which has multiple frames.
   */
  async deleteFacesForPhotos(orgSlug: string, eventSlug: string, photoIds: string[]): Promise<void> {
    if (photoIds.length === 0) return;

    const collectionName = getOrgCollectionName(orgSlug, eventSlug);
    logger.info(`[DELETE_PHOTOS] Request to delete faces for ${photoIds.length} photos in collection ${collectionName}`);

    try {
      // Build filter: photoId IN [id1, id2, ...]
      // Qdrant allows 'match' with 'any' for checking if value is in array
      await qdrantClient.delete(collectionName, {
        wait: true,
        filter: {
          must: [
            {
              key: 'photoId',
              match: { any: photoIds },
            },
          ],
        },
      });

      logger.info(`[DELETE_PHOTOS] Successfully deleted faces for ${photoIds.length} photos from ${collectionName}`);
    } catch (error: any) {
      if (error?.status === 404 || error?.response?.status === 404) {
        logger.warn(`[DELETE_PHOTOS] Collection ${collectionName} does not exist, skipping deletion.`);
        return;
      }
      logger.error(`[DELETE_PHOTOS] Failed to delete faces for photos:`, error);
      throw error;
    }
  }

  /**
   * Delete an entire org's event collection.
   *
   * @param orgSlug - Organization Slug
   * @param eventSlug - Event Slug
   */
  async deleteCollection(orgSlug: string, eventSlug: string): Promise<void> {
    const collectionName = getOrgCollectionName(orgSlug, eventSlug);
    logger.info(`[DELETE_COLLECTION] Request to delete collection ${collectionName}`);

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
   * @param orgSlug - Organization Slug
   * @param eventSlug - Event Slug
   * @returns Collection info or null if not exists
   */
  async getCollectionInfo(orgSlug: string, eventSlug: string): Promise<{
    vectorCount: number;
    indexedVectorCount: number;
    status: string;
    collectionName: string;
  } | null> {
    const collectionName = getOrgCollectionName(orgSlug, eventSlug);

    try {
      const info = await qdrantClient.getCollection(collectionName);

      return {
        vectorCount: info.points_count ?? 0,
        indexedVectorCount: info.indexed_vectors_count ?? 0,
        status: info.status,
        collectionName,
      };
    } catch (error) {
      // Collection doesn't exist
      return null;
    }
  }

  /**
   * List all event collections for an org.
   * NOTE: This logic needs to be updated to parse slugs instead of IDs if we want to return IDs/Slugs back.
   * However, since slugs can be arbitrary, we might just return the raw slugs found in collection names.
   *
   * @param orgSlug - Organization Slug
   * @returns Array of event slugs found in collections
   */
  async listEventCollections(orgSlug: string): Promise<string[]> {
    const safeOrgSlug = orgSlug.replace(/[^a-zA-Z0-9-_]/g, '_');
    const prefix = `org_${safeOrgSlug}_event_`;
    try {
      const collections = await qdrantClient.getCollections();

      return collections.collections
        .filter((c) => c.name.startsWith(prefix) && c.name.endsWith('_faces'))
        .map((c) => {
          // Extract eventSlug from collection name: org_{orgSlug}_event_{eventSlug}_faces
          // Regex needs to match the dynamic slug part
          const match = c.name.match(new RegExp(`^org_${safeOrgSlug}_event_(.+)_faces$`));
          return match?.[1];
        })
        .filter((slug): slug is string => Boolean(slug));
    } catch (error) {
      logger.error('Failed to list event collections:', error);
      throw error;
    }
  }

  /**
   * List all collections with detailed info (admin only).
   * Returns all collections across all organizations.
   */
  async listAllCollections(): Promise<Array<{
    collectionName: string;
    orgSlug: string;
    eventSlug: string;
    vectorCount: number;
    indexedVectorCount: number;
    status: string;
  }>> {
    try {
      const collections = await qdrantClient.getCollections();
      const faceCollections = collections.collections.filter(
        (c) => c.name.startsWith('org_') && c.name.endsWith('_faces')
      );

      const results = await Promise.all(
        faceCollections.map(async (c) => {
          // Parse collection name: org_{orgSlug}_event_{eventSlug}_faces
          const match = c.name.match(/^org_(.+)_event_(.+)_faces$/);
          if (!match || !match[1] || !match[2]) return null;

          const orgSlug = match[1];
          const eventSlug = match[2];

          try {
            const info = await qdrantClient.getCollection(c.name);
            return {
              collectionName: c.name,
              orgSlug,
              eventSlug,
              vectorCount: info.points_count ?? 0,
              indexedVectorCount: info.indexed_vectors_count ?? 0,
              status: info.status as string,
            };
          } catch {
            return null;
          }
        })
      );

      return results.filter((r) => r !== null) as Array<{
        collectionName: string;
        orgSlug: string;
        eventSlug: string;
        vectorCount: number;
        indexedVectorCount: number;
        status: string;
      }>;
    } catch (error) {
      logger.error('Failed to list all collections:', error);
      throw error;
    }
  }

  /**
   * Get detailed info for collections of a specific org.
   */
  async getOrgCollectionsWithInfo(orgSlug: string): Promise<Array<{
    collectionName: string;
    eventSlug: string;
    vectorCount: number;
    indexedVectorCount: number;
    status: string;
  }>> {
    try {
      const eventSlugs = await this.listEventCollections(orgSlug);

      const results = await Promise.all(
        eventSlugs.map(async (eventSlug) => {
          const info = await this.getCollectionInfo(orgSlug, eventSlug);
          if (!info) return null;

          return {
            collectionName: getOrgCollectionName(orgSlug, eventSlug),
            eventSlug,
            vectorCount: info.vectorCount,
            indexedVectorCount: info.indexedVectorCount,
            status: info.status,
          };
        })
      );

      return results.filter((r): r is NonNullable<typeof r> => r !== null);
    } catch (error) {
      logger.error(`Failed to get collections for org ${orgSlug}:`, error);
      throw error;
    }
  }

  // =============================================================================
  // CLUSTERING SUPPORT METHODS
  // =============================================================================

  /**
   * Scroll through all faces in a collection and return their embeddings.
   * Used for clustering - retrieves all face vectors for an event.
   *
   * @param orgSlug - Organization Slug
   * @param eventSlug - Event Slug
   * @param batchSize - Number of points to fetch per scroll (default 100)
   * @returns Array of points with embeddings and payloads
   */
  async scrollAllFacesWithEmbeddings(
    orgSlug: string,
    eventSlug: string,
    batchSize: number = 100
  ): Promise<Array<{
    id: string;
    embedding: number[];
    payload: QdrantFacePayload;
  }>> {
    const collectionName = getOrgCollectionName(orgSlug, eventSlug);
    logger.info(`[CLUSTERING] Scrolling all faces from ${collectionName}`);

    const allPoints: Array<{
      id: string;
      embedding: number[];
      payload: QdrantFacePayload;
    }> = [];

    try {
      // Check if collection exists
      const collections = await qdrantClient.getCollections();
      const exists = collections.collections.some((c) => c.name === collectionName);

      if (!exists) {
        logger.warn(`[CLUSTERING] Collection ${collectionName} does not exist`);
        return [];
      }

      let offset: string | number | undefined = undefined;
      let hasMore = true;

      while (hasMore) {
        const result = await qdrantClient.scroll(collectionName, {
          limit: batchSize,
          offset,
          with_payload: true,
          with_vector: true, // Need vectors for clustering
        });

        for (const point of result.points) {
          // Handle both string and number IDs
          const pointId = typeof point.id === 'string' ? point.id : String(point.id);

          // Get vector (handle both dense and named vectors)
          let embedding: number[] = [];
          if (Array.isArray(point.vector)) {
            embedding = point.vector as number[];
          } else if (point.vector && typeof point.vector === 'object') {
            // Named vectors - get the first/default one
            const vectors = point.vector as Record<string, number[]>;
            embedding = Object.values(vectors)[0] || [];
          }

          if (embedding.length > 0) {
            allPoints.push({
              id: pointId,
              embedding,
              payload: point.payload as QdrantFacePayload,
            });
          }
        }

        // Check if there are more results
        const nextOffset = result.next_page_offset;
        if (nextOffset !== null && nextOffset !== undefined && typeof nextOffset !== 'object') {
          offset = nextOffset as string | number;
          hasMore = true;
        } else {
          hasMore = false;
        }
      }

      logger.info(`[CLUSTERING] Retrieved ${allPoints.length} faces with embeddings from ${collectionName}`);
      return allPoints;
    } catch (error) {
      logger.error(`[CLUSTERING] Failed to scroll faces from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get points by their IDs with payloads (for thumbnail generation after clustering).
   *
   * @param orgSlug - Organization Slug
   * @param eventSlug - Event Slug
   * @param pointIds - Array of Qdrant point IDs
   * @returns Array of points with payloads
   */
  async getPointsByIds(
    orgSlug: string,
    eventSlug: string,
    pointIds: string[]
  ): Promise<Array<{
    id: string;
    payload: QdrantFacePayload;
  }>> {
    if (pointIds.length === 0) return [];

    const collectionName = getOrgCollectionName(orgSlug, eventSlug);

    try {
      const result = await qdrantClient.retrieve(collectionName, {
        ids: pointIds,
        with_payload: true,
        with_vector: false,
      });

      return result.map((point) => ({
        id: typeof point.id === 'string' ? point.id : String(point.id),
        payload: point.payload as QdrantFacePayload,
      }));
    } catch (error) {
      logger.error(`[CLUSTERING] Failed to get points by IDs from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get the total count of faces in a collection.
   * Used to estimate clustering job size.
   *
   * @param orgSlug - Organization Slug
   * @param eventSlug - Event Slug
   * @returns Number of face vectors in the collection
   */
  async getFaceCount(orgSlug: string, eventSlug: string): Promise<number> {
    const info = await this.getCollectionInfo(orgSlug, eventSlug);
    return info?.vectorCount ?? 0;
  }
}

// Export singleton instance
export const qdrantService = new QdrantService();

