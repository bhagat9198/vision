/**
 * =============================================================================
 * Face Analysis Client
 * =============================================================================
 * API client for communicating with img-analyse-backend.
 * Handles face indexing, searching, and session management.
 * =============================================================================
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import FormData from 'form-data';
import { configService } from '../modules/config/config.service.js';
import { env } from '../config/env.js';
import { logger } from '../common/utils/logger.js';

// =============================================================================
// TYPES
// =============================================================================

export interface IndexPhotoRequest {
  photoId: string;
  eventId: string;
  imageUrl?: string;
  imagePath?: string;
}

export interface IndexPhotoResult {
  photoId: string;
  facesIndexed: number;
  facesSkipped: number;
  processingTimeMs: number;
}

export interface SearchRequest {
  eventId: string;
  topK?: number;
  minSimilarity?: number;
}

export interface FaceMatch {
  photoId: string;
  faceId: string;
  similarity: number;
}

export interface SearchResponse {
  sessionId: string;
  matches: FaceMatch[];
  totalMatches: number;
  processingTimeMs: number;
}

export interface EventStats {
  eventId: string;
  totalFaces: number;
  totalPhotos: number;
}

// =============================================================================
// CLIENT CLASS
// =============================================================================

class FaceAnalysisClient {
  private client: AxiosInstance | null = null;
  private baseUrl: string | null = null;

  /**
   * Get or create axios client with current config.
   */
  private async getClient(): Promise<AxiosInstance> {
    const url = await configService.getFaceAnalysisBackendUrl();
    const apiKey = await configService.getFaceAnalysisApiKey();

    // Recreate client if URL or API Key changed (though simplistic check)
    if (this.client && this.baseUrl === url) {
      return this.client;
    }

    this.baseUrl = url;
    this.client = axios.create({
      baseURL: url,
      timeout: 60000,
      headers: {
        'x-api-key': apiKey,
      },
    });

    return this.client;
  }

  /**
   * Check if face analysis is enabled.
   */
  async isEnabled(): Promise<boolean> {
    return configService.isFaceAnalysisEnabled();
  }

  /**
   * Check health of img-analyse-backend.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.getClient();
      const response = await client.get('/health');
      return response.data?.status === 'ok';
    } catch (error) {
      logger.error('Face analysis health check failed:', error);
      return false;
    }
  }

  /**
   * Index faces in a photo.
   */
  async indexPhoto(request: IndexPhotoRequest): Promise<IndexPhotoResult | null> {
    if (!(await this.isEnabled())) {
      logger.debug('Face analysis disabled, skipping indexPhoto');
      return null;
    }

    try {
      const client = await this.getClient();
      const response = await client.post<{ data: IndexPhotoResult }>(
        '/api/v1/index/photo',
        request
      );
      return response.data.data;
    } catch (error) {
      this.handleError('indexPhoto', error);
      return null;
    }
  }

  /**
   * Index photo with image file upload.
   */
  async indexPhotoWithFile(
    photoId: string,
    eventId: string,
    imageBuffer: Buffer,
    filename: string
  ): Promise<IndexPhotoResult | null> {
    if (!(await this.isEnabled())) {
      logger.debug('Face analysis disabled, skipping indexPhotoWithFile');
      return null;
    }

    try {
      const client = await this.getClient();
      const formData = new FormData();
      formData.append('photoId', photoId);
      formData.append('eventId', eventId);
      formData.append('image', imageBuffer, { filename });

      const response = await client.post<{ data: IndexPhotoResult }>(
        '/api/v1/index/photo',
        formData,
        { headers: formData.getHeaders() }
      );
      return response.data.data;
    } catch (error) {
      this.handleError('indexPhotoWithFile', error);
      return null;
    }
  }

  /**
   * Search for faces using an image file.
   */
  async searchWithImage(
    eventId: string,
    imageBuffer: Buffer,
    filename: string,
    options?: { topK?: number; minSimilarity?: number }
  ): Promise<SearchResponse | null> {
    if (!(await this.isEnabled())) {
      logger.debug('Face analysis disabled, skipping searchWithImage');
      return null;
    }

    try {
      const client = await this.getClient();
      const formData = new FormData();
      formData.append('eventId', eventId);
      formData.append('image', imageBuffer, { filename });
      if (options?.topK) formData.append('topK', options.topK.toString());
      if (options?.minSimilarity) formData.append('minSimilarity', options.minSimilarity.toString());

      const response = await client.post<{ data: SearchResponse }>(
        '/api/v1/search',
        formData,
        { headers: formData.getHeaders() }
      );
      return response.data.data;
    } catch (error) {
      this.handleError('searchWithImage', error);
      return null;
    }
  }

  /**
   * Search using a cached embedding (for subsequent searches in same session).
   */
  async searchWithCached(
    sessionId: string,
    eventId: string,
    options?: { topK?: number; minSimilarity?: number }
  ): Promise<SearchResponse | null> {
    if (!(await this.isEnabled())) {
      logger.debug('Face analysis disabled, skipping searchWithCached');
      return null;
    }

    try {
      const client = await this.getClient();
      const response = await client.post<{ data: SearchResponse }>(
        '/api/v1/search/cached',
        { sessionId, eventId, ...options }
      );
      return response.data.data;
    } catch (error) {
      this.handleError('searchWithCached', error);
      return null;
    }
  }

  /**
   * End a search session (clear cached embedding).
   */
  async endSession(sessionId: string): Promise<boolean> {
    try {
      const client = await this.getClient();
      await client.delete(`/api/v1/search/session/${sessionId}`);
      return true;
    } catch (error) {
      this.handleError('endSession', error);
      return false;
    }
  }

  /**
   * Delete faces for a photo.
   */
  async deletePhoto(photoId: string, eventId: string): Promise<boolean> {
    if (!(await this.isEnabled())) {
      return true;
    }

    try {
      const client = await this.getClient();
      await client.delete(`/api/v1/index/photo/${photoId}`, {
        params: { eventId },
      });
      return true;
    } catch (error) {
      this.handleError('deletePhoto', error);
      return false;
    }
  }

  /**
   * Delete all faces for an event.
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    if (!(await this.isEnabled())) {
      return true;
    }

    try {
      const client = await this.getClient();
      await client.delete(`/api/v1/index/event/${eventId}`);
      return true;
    } catch (error) {
      this.handleError('deleteEvent', error);
      return false;
    }
  }

  /**
   * Get event statistics.
   */
  async getEventStats(eventId: string): Promise<EventStats | null> {
    if (!(await this.isEnabled())) {
      return null;
    }

    try {
      const client = await this.getClient();
      const response = await client.get<{ data: EventStats }>(
        `/api/v1/index/event/${eventId}/stats`
      );
      return response.data.data;
    } catch (error) {
      this.handleError('getEventStats', error);
      return null;
    }
  }

  /**
   * Handle and log errors.
   */
  private handleError(operation: string, error: unknown): void {
    if (error instanceof AxiosError) {
      logger.error(`Face analysis ${operation} failed:`, {
        status: error.response?.status,
        message: error.response?.data?.error || error.message,
      });
    } else {
      logger.error(`Face analysis ${operation} failed:`, error);
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const faceAnalysisClient = new FaceAnalysisClient();

