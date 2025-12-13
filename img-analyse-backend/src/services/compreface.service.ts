/**
 * =============================================================================
 * CompreFace Service
 * =============================================================================
 * Wrapper for CompreFace API for face detection and recognition.
 *
 * Supports two modes:
 * - 'recognition_only': Single call to /recognize (detection + embedding)
 * - 'detection_then_recognition': Separate detection and recognition calls
 *
 * @see https://github.com/exadel-inc/CompreFace
 * =============================================================================
 */

import axios, { type AxiosInstance } from 'axios';
import FormData from 'form-data';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import type { DetectedFace, FaceWithEmbedding, BoundingBox } from '../types/index.js';
import type { OrgSettings } from '../modules/org/org.types.js';

// =============================================================================
// TYPES
// =============================================================================

interface CompreFaceBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
  probability: number;
}

interface CompreFaceLandmarks {
  left_eye: [number, number];
  right_eye: [number, number];
  nose: [number, number];
  left_lip: [number, number];
  right_lip: [number, number];
}

interface CompreFaceResult {
  box: CompreFaceBox;
  embedding?: number[];
  landmarks?: CompreFaceLandmarks;
  age?: { low: number; high: number };
  gender?: { value: 'male' | 'female'; probability: number };
  pose?: { pitch: number; roll: number; yaw: number };
  landmarks2d106?: Array<[number, number]>;
  subjects?: Array<{ subject: string; similarity: number }>;
  execution_time?: Record<string, number>;
}

interface CompreFaceResponse {
  result: CompreFaceResult[];
  plugins_versions?: Record<string, string>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert CompreFace box to our BoundingBox format.
 */
function convertBox(box: CompreFaceBox): BoundingBox {
  return {
    x: Math.round(box.x_min),
    y: Math.round(box.y_min),
    width: Math.round(box.x_max - box.x_min),
    height: Math.round(box.y_max - box.y_min),
  };
}

/**
 * Convert CompreFace landmarks to our format.
 */
function convertLandmarks(landmarks: CompreFaceLandmarks) {
  if (!landmarks.left_eye || !landmarks.right_eye || !landmarks.nose || !landmarks.left_lip || !landmarks.right_lip) {
    return undefined;
  }
  return {
    leftEye: { x: landmarks.left_eye[0], y: landmarks.left_eye[1] },
    rightEye: { x: landmarks.right_eye[0], y: landmarks.right_eye[1] },
    nose: { x: landmarks.nose[0], y: landmarks.nose[1] },
    leftMouth: { x: landmarks.left_lip[0], y: landmarks.left_lip[1] },
    rightMouth: { x: landmarks.right_lip[0], y: landmarks.right_lip[1] },
  };
}

// =============================================================================
// COMPREFACE SERVICE
// =============================================================================

/**
 * CompreFace API wrapper service.
 * Now accepts org settings per-request for multi-tenancy.
 */
class CompreFaceService {
  /**
   * Create a recognition API client for the given org settings.
   */
  private createRecognitionClient(settings: OrgSettings): AxiosInstance {
    return axios.create({
      baseURL: settings.comprefaceUrl || '',
      timeout: 30000,
      headers: {
        'x-api-key': settings.comprefaceRecognitionApiKey || '',
      },
    });
  }

  /**
   * Create a detection API client for the given org settings.
   */
  private createDetectionClient(settings: OrgSettings): AxiosInstance {
    return axios.create({
      baseURL: settings.comprefaceUrl || '',
      timeout: 30000,
      headers: {
        'x-api-key': settings.comprefaceDetectionApiKey || '',
      },
    });
  }

  /**
   * Detect faces and extract embeddings in a single call.
   * Uses the /recognize endpoint which does both detection and embedding.
   *
   * @param settings - Organization settings
   * @param imageBuffer - Image buffer to process
   * @returns Array of faces with embeddings
   */
  async detectAndEmbed(settings: OrgSettings, imageBuffer: Buffer): Promise<FaceWithEmbedding[]> {
    const startTime = Date.now();
    const client = this.createRecognitionClient(settings);
    logger.info('Calling CompreFace detectAndEmbed...');

    try {
      const formData = new FormData();
      formData.append('file', imageBuffer, {
        filename: 'image.jpg',
        contentType: 'image/jpeg',
      });

      const response = await client.post<CompreFaceResponse>(
        '/api/v1/recognition/recognize',
        formData,
        {
          headers: formData.getHeaders(),
          params: {
            limit: 0, // Return all faces, no subject matching
            det_prob_threshold: settings.minConfidence,
            face_plugins: 'landmarks,calculator,age,gender',
          },
        }
      );

      logger.debug(`CompreFace response: ${JSON.stringify({
        status: response.status,
        facesCount: response.data.result.length,
        firstFaceHasEmbedding: !!response.data.result[0]?.embedding,
        firstFaceEmbeddingLength: response.data.result[0]?.embedding?.length
      })}`);

      const faces: FaceWithEmbedding[] = response.data.result.map((result) => ({
        id: uuidv4(),
        bbox: convertBox(result.box),
        confidence: result.box.probability,
        landmarks: result.landmarks ? convertLandmarks(result.landmarks) : undefined,
        detectorSource: 'compreface' as const,
        embedding: result.embedding || [],
        wasAligned: false,
        age: result.age,
        gender: result.gender,
        pose: result.pose,
        landmarks2d106: result.landmarks2d106,
      }));

      logger.debug(`CompreFace detectAndEmbed: ${faces.length} faces in ${Date.now() - startTime}ms`);
      return faces;
    } catch (error: any) {
      // Handle known "No face found" error gracefully
      if (error.response?.data?.code === 28 || error.response?.data?.message === 'No face is found in the given image') {
        logger.debug('CompreFace reported no face found (code 28). Returning empty result.');
        return [];
      }

      if (error.response?.data) {
        logger.error(`CompreFace request failed. Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
      logger.error('CompreFace detectAndEmbed failed:', error.message);
      throw error;
    }
  }

  /**
   * Detect faces only (without embeddings).
   * Uses the /detect endpoint.
   *
   * @param settings - Organization settings
   * @param imageBuffer - Image buffer to process
   * @returns Array of detected faces (without embeddings)
   */
  async detectOnly(settings: OrgSettings, imageBuffer: Buffer): Promise<DetectedFace[]> {
    const startTime = Date.now();
    const client = this.createDetectionClient(settings);

    try {
      const formData = new FormData();
      formData.append('file', imageBuffer, {
        filename: 'image.jpg',
        contentType: 'image/jpeg',
      });

      const response = await client.post<CompreFaceResponse>(
        '/api/v1/detection/detect',
        formData,
        {
          headers: formData.getHeaders(),
          params: {
            det_prob_threshold: settings.minConfidence,
            face_plugins: 'landmarks,age,gender',
          },
        }
      );

      const faces: DetectedFace[] = response.data.result.map((result) => ({
        id: uuidv4(),
        bbox: convertBox(result.box),
        confidence: result.box.probability,
        landmarks: result.landmarks ? convertLandmarks(result.landmarks) : undefined,
        detectorSource: 'compreface' as const,
        age: result.age,
        gender: result.gender,
        pose: result.pose,
        landmarks2d106: result.landmarks2d106,
      }));

      logger.debug(`CompreFace detectOnly: ${faces.length} faces in ${Date.now() - startTime}ms`);
      return faces;
    } catch (error) {
      logger.error('CompreFace detectOnly failed:', error);
      throw error;
    }
  }

  /**
   * Extract embedding from a cropped face image.
   *
   * @param settings - Organization settings
   * @param faceImageBuffer - Cropped face image buffer
   * @returns Embedding vector
   */
  async extractEmbedding(settings: OrgSettings, faceImageBuffer: Buffer): Promise<number[]> {
    const client = this.createRecognitionClient(settings);

    try {
      const formData = new FormData();
      formData.append('file', faceImageBuffer, {
        filename: 'face.jpg',
        contentType: 'image/jpeg',
      });

      const response = await client.post<CompreFaceResponse>(
        '/api/v1/recognition/recognize',
        formData,
        {
          headers: formData.getHeaders(),
          params: {
            limit: 0,
            // Use a very low threshold for embedding extraction since we are sending a verified face crop.
            // This bypasses strict detection when we already know a face is present (e.g. found by fallback).
            det_prob_threshold: 0.01,
            face_plugins: 'calculator',
          },
        }
      );

      if (response.data.result.length === 0 || !response.data.result[0]?.embedding) {
        throw new Error('No embedding extracted from face image');
      }

      return response.data.result?.[0]?.embedding || [];
    } catch (error: any) {
      if (error.response?.data) {
        logger.error(`CompreFace embedding extraction failed. Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
      logger.error('CompreFace extractEmbedding failed:', error.message);
      throw error;
    }
  }

  /**
   * Check if CompreFace is reachable with given settings.
   */
  async healthCheck(settings: OrgSettings): Promise<{ status: 'up' | 'down'; responseTimeMs: number }> {
    const startTime = Date.now();

    try {
      await axios.get(`${settings.comprefaceUrl}/api/v1/recognition/subjects`, {
        headers: { 'x-api-key': settings.comprefaceRecognitionApiKey || '' },
        params: { limit: 1 },
        timeout: 5000,
      });

      return { status: 'up', responseTimeMs: Date.now() - startTime };
    } catch (error) {
      logger.error('CompreFace health check failed:', error);
      return { status: 'down', responseTimeMs: Date.now() - startTime };
    }
  }
}

// Export singleton instance
export const compreFaceService = new CompreFaceService();

