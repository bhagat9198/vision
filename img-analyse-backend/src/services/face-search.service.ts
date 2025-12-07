/**
 * =============================================================================
 * Face Search Service
 * =============================================================================
 * Main service for searching faces across event photos.
 *
 * Search Flow:
 * 1. Check if embedding is cached (for repeat searches)
 * 2. If not cached, extract embedding from selfie
 * 3. Search Qdrant for similar faces
 * 4. Group results by photo
 * 5. Return photo IDs (api-node-backend hydrates with full data)
 *
 * @see embedding-cache.service.ts - Caching layer
 * @see qdrant.service.ts - Vector search
 * =============================================================================
 */

import { v4 as uuidv4 } from 'uuid';
import { faceDetectionService } from './face-detection.service.js';
import { qdrantService } from './qdrant.service.js';
import { embeddingCacheService } from './embedding-cache.service.js';
import { logger } from '../utils/logger.js';
import type {
  SearchRequest,
  CachedSearchRequest,
  SearchResponse,
  FaceMatch,
  GroupedPhotoMatch,
} from '../types/index.js';
import type { OrgSettings } from '../modules/org/org.types.js';

// =============================================================================
// FACE SEARCH SERVICE
// =============================================================================

/**
 * Service for searching faces in event photos.
 * Now accepts org settings per-request for multi-tenancy.
 */
class FaceSearchService {
  /**
   * Search for matching faces using a selfie image.
   * Extracts embedding from selfie and searches the event's collection.
   *
   * @param settings - Organization settings
   * @param request - Search request with image and event ID
   * @returns Search response with matching photo IDs
   */
  async searchWithImage(settings: OrgSettings, request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();

    const { eventId, imageBuffer, topK, minSimilarity } = request;
    const effectiveTopK = topK ?? settings.searchDefaultTopK;
    const effectiveMinSimilarity = minSimilarity ?? settings.searchMinSimilarity;

    try {
      // Extract embedding from selfie
      const { faces } = await faceDetectionService.detectAndEmbed(settings, imageBuffer);

      if (faces.length === 0) {
        return {
          success: true,
          matches: [],
          totalMatches: 0,
          searchTimeMs: Date.now() - startTime,
          message: 'No face detected in the provided image',
        };
      }

      // Use the first (largest/most confident) face
      const primaryFace = faces[0]!;
      const embedding = primaryFace.embedding;

      // Generate session ID for caching
      const sessionId = uuidv4();

      // Cache the embedding for potential repeat searches
      await embeddingCacheService.cacheEmbedding(settings, sessionId, embedding, {
        bbox: primaryFace.bbox,
        confidence: primaryFace.confidence,
      });

      // Search for matches
      const searchResults = await qdrantService.searchFaces(
        settings.orgId,
        eventId,
        embedding,
        effectiveTopK,
        effectiveMinSimilarity
      );

      // Group by photo
      const groupedMatches = this.groupByPhoto(searchResults);

      return {
        success: true,
        matches: groupedMatches,
        totalMatches: searchResults.length,
        searchTimeMs: Date.now() - startTime,
        sessionId, // Return for cached searches
      };
    } catch (error) {
      logger.error('Face search failed:', error);
      throw error;
    }
  }

  /**
   * Search using a cached embedding.
   * Faster than searchWithImage for repeat searches.
   *
   * @param settings - Organization settings
   * @param request - Cached search request with session ID
   * @returns Search response with matching photo IDs
   */
  async searchWithCachedEmbedding(settings: OrgSettings, request: CachedSearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();

    const { eventId, sessionId, topK, minSimilarity } = request;
    const effectiveTopK = topK ?? settings.searchDefaultTopK;
    const effectiveMinSimilarity = minSimilarity ?? settings.searchMinSimilarity;

    try {
      // Get cached embedding
      const cached = await embeddingCacheService.getEmbedding(sessionId);

      if (!cached) {
        return {
          success: false,
          matches: [],
          totalMatches: 0,
          searchTimeMs: Date.now() - startTime,
          message: 'Session expired or not found. Please upload your photo again.',
        };
      }

      // Refresh TTL for active session
      await embeddingCacheService.refreshTtl(settings, sessionId);

      // Search for matches
      const searchResults = await qdrantService.searchFaces(
        settings.orgId,
        eventId,
        cached.embedding,
        effectiveTopK,
        effectiveMinSimilarity
      );

      // Group by photo
      const groupedMatches = this.groupByPhoto(searchResults);

      return {
        success: true,
        matches: groupedMatches,
        totalMatches: searchResults.length,
        searchTimeMs: Date.now() - startTime,
        sessionId,
      };
    } catch (error) {
      logger.error('Cached face search failed:', error);
      throw error;
    }
  }

  /**
   * Group search results by photo.
   * Returns photos sorted by best match score.
   */
  private groupByPhoto(
    results: Array<{ payload: { photoId: string; bbox: unknown; confidence: number }; score: number }>
  ): GroupedPhotoMatch[] {
    const photoMap = new Map<string, FaceMatch[]>();

    // Group faces by photo
    for (const result of results) {
      const { photoId, bbox, confidence } = result.payload;
      const match: FaceMatch = {
        photoId,
        similarity: result.score,
        bbox: bbox as FaceMatch['bbox'],
        confidence,
      };

      const existing = photoMap.get(photoId) || [];
      existing.push(match);
      photoMap.set(photoId, existing);
    }

    // Convert to array and sort by best match
    const grouped: GroupedPhotoMatch[] = [];

    for (const [photoId, faces] of photoMap) {
      // Sort faces by similarity (descending)
      faces.sort((a, b) => b.similarity - a.similarity);

      grouped.push({
        photoId,
        bestSimilarity: faces[0]?.similarity ?? 0,
        matchCount: faces.length,
        faces,
      });
    }

    // Sort photos by best similarity (descending)
    grouped.sort((a, b) => b.bestSimilarity - a.bestSimilarity);

    return grouped;
  }

  /**
   * Delete cached embedding for a session.
   * Call when user ends their search session.
   */
  async endSession(sessionId: string): Promise<void> {
    await embeddingCacheService.deleteEmbedding(sessionId);
    logger.debug(`Ended search session ${sessionId}`);
  }
}

// Export singleton instance
export const faceSearchService = new FaceSearchService();

