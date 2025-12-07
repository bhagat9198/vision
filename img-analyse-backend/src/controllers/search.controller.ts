/**
 * =============================================================================
 * Search Controller
 * =============================================================================
 * Handles face search requests.
 *
 * Endpoints:
 * - POST /api/v1/search - Search with selfie image
 * - POST /api/v1/search/cached - Search with cached embedding
 * - DELETE /api/v1/search/session/:sessionId - End search session
 * =============================================================================
 */

import type { Request, Response } from 'express';
import { faceSearchService } from '../services/index.js';
import { logger } from '../utils/logger.js';
import type { ApiResponse, SearchResponse } from '../types/index.js';

// =============================================================================
// SEARCH CONTROLLER
// =============================================================================

/**
 * Face search controller.
 */
export const searchController = {
  /**
   * Search for matching faces using a selfie image.
   *
   * Request body:
   * - eventId: Event to search in
   * - topK: (optional) Number of results to return
   * - minSimilarity: (optional) Minimum similarity threshold
   *
   * Image is provided as multipart form data.
   */
  async searchWithImage(req: Request, res: Response): Promise<void> {
    try {
      const settings = req.orgSettings!;
      const { eventId, topK, minSimilarity } = req.body;

      if (!eventId) {
        res.status(400).json({
          success: false,
          error: 'eventId is required',
        } as ApiResponse);
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'Image file is required',
        } as ApiResponse);
        return;
      }

      const result = await faceSearchService.searchWithImage(settings, {
        eventId,
        imageBuffer: req.file.buffer,
        topK: topK ? parseInt(topK, 10) : undefined,
        minSimilarity: minSimilarity ? parseFloat(minSimilarity) : undefined,
      });

      res.json({
        success: true,
        data: result,
      } as ApiResponse<SearchResponse>);
    } catch (error) {
      logger.error('Search with image failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      } as ApiResponse);
    }
  },

  /**
   * Search using a cached embedding from a previous search.
   * Faster than uploading the image again.
   *
   * Request body:
   * - eventId: Event to search in
   * - sessionId: Session ID from previous search
   * - topK: (optional) Number of results to return
   * - minSimilarity: (optional) Minimum similarity threshold
   */
  async searchWithCached(req: Request, res: Response): Promise<void> {
    try {
      const settings = req.orgSettings!;
      const { eventId, sessionId, topK, minSimilarity } = req.body;

      if (!eventId || !sessionId) {
        res.status(400).json({
          success: false,
          error: 'eventId and sessionId are required',
        } as ApiResponse);
        return;
      }

      const result = await faceSearchService.searchWithCachedEmbedding(settings, {
        eventId,
        sessionId,
        topK: topK ? parseInt(topK, 10) : undefined,
        minSimilarity: minSimilarity ? parseFloat(minSimilarity) : undefined,
      });

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.message || 'Session not found',
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: result,
      } as ApiResponse<SearchResponse>);
    } catch (error) {
      logger.error('Cached search failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      } as ApiResponse);
    }
  },

  /**
   * End a search session and delete cached embedding.
   */
  async endSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'sessionId is required',
        } as ApiResponse);
        return;
      }

      await faceSearchService.endSession(sessionId);

      res.json({
        success: true,
        message: 'Session ended',
      } as ApiResponse);
    } catch (error) {
      logger.error('End session failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to end session',
      } as ApiResponse);
    }
  },
};

