/**
 * =============================================================================
 * Python Sidecar Service
 * =============================================================================
 * Client for the Python FastAPI sidecar that provides:
 * - YuNet face detection (fallback #1)
 * - SCRFD face detection (fallback #2)
 * - InsightFace detection + embedding (complete face analysis)
 * - Face alignment using 5-point landmarks
 * =============================================================================
 */

import axios, { type AxiosInstance } from 'axios';
import FormData from 'form-data';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import type { DetectedFace, FaceLandmarks, FaceWithEmbedding } from '../types/index.js';
import type { OrgSettings } from '../modules/org/org.types.js';

// =============================================================================
// TYPES
// =============================================================================

interface PythonFaceResult {
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  landmarks?: {
    left_eye: [number, number];
    right_eye: [number, number];
    nose: [number, number];
    left_mouth: [number, number];
    right_mouth: [number, number];
  };
  yaw_angle?: number;
}

interface PythonDetectionResponse {
  success: boolean;
  detector: 'yunet' | 'scrfd';
  faces: PythonFaceResult[];
  processing_time_ms: number;
}

interface PythonAlignResponse {
  success: boolean;
  aligned_image: string; // Base64 encoded
  processing_time_ms: number;
}

// InsightFace response types
interface InsightFaceResult {
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  landmarks?: {
    left_eye: [number, number];
    right_eye: [number, number];
    nose: [number, number];
    left_mouth: [number, number];
    right_mouth: [number, number];
  };
  embedding?: number[];
  age?: number;
  gender?: 'M' | 'F';
}

interface InsightFaceResponse {
  success: boolean;
  detector: 'insightface';
  faces: InsightFaceResult[];
  processing_time_ms: number;
  embedding_dimension: number;
}

interface InsightFaceEmbedResponse {
  success: boolean;
  embedding: number[];
  embedding_dimension: number;
  processing_time_ms: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function convertLandmarks(landmarks: PythonFaceResult['landmarks']): FaceLandmarks | undefined {
  if (!landmarks) return undefined;

  return {
    leftEye: { x: landmarks.left_eye[0], y: landmarks.left_eye[1] },
    rightEye: { x: landmarks.right_eye[0], y: landmarks.right_eye[1] },
    nose: { x: landmarks.nose[0], y: landmarks.nose[1] },
    leftMouth: { x: landmarks.left_mouth[0], y: landmarks.left_mouth[1] },
    rightMouth: { x: landmarks.right_mouth[0], y: landmarks.right_mouth[1] },
  };
}

// =============================================================================
// PYTHON SIDECAR SERVICE
// =============================================================================

/**
 * Python sidecar API client for fallback detection and alignment.
 * Now accepts org settings per-request for multi-tenancy.
 */
class PythonSidecarService {
  /**
   * Create HTTP client for the given org settings.
   */
  private createClient(settings: OrgSettings): AxiosInstance {
    return axios.create({
      baseURL: settings.pythonSidecarUrl || '',
      timeout: 30000,
    });
  }

  /**
   * Detect faces using YuNet detector.
   *
   * @param settings - Organization settings
   * @param imageBuffer - Image buffer to process
   * @returns Array of detected faces
   */
  async detectWithYuNet(settings: OrgSettings, imageBuffer: Buffer): Promise<DetectedFace[]> {
    const startTime = Date.now();
    const client = this.createClient(settings);
    logger.info(`Calling Python Sidecar (YuNet) at ${client.defaults.baseURL}...`);

    try {
      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename: 'image.jpg',
        contentType: 'image/jpeg',
      });

      const response = await client.post<PythonDetectionResponse>(
        '/detect/yunet',
        formData,
        { headers: formData.getHeaders() }
      );

      const faces: DetectedFace[] = response.data.faces.map((face) => ({
        id: uuidv4(),
        bbox: face.bbox,
        confidence: face.confidence,
        landmarks: convertLandmarks(face.landmarks),
        yawAngle: face.yaw_angle,
        detectorSource: 'yunet' as const,
      }));

      logger.debug(`YuNet detection: ${faces.length} faces in ${Date.now() - startTime}ms`);
      return faces;
    } catch (error) {
      logger.error('YuNet detection failed:', error);
      throw error;
    }
  }

  /**
   * Detect faces using SCRFD detector.
   *
   * @param settings - Organization settings
   * @param imageBuffer - Image buffer to process
   * @returns Array of detected faces
   */
  async detectWithSCRFD(settings: OrgSettings, imageBuffer: Buffer): Promise<DetectedFace[]> {
    const startTime = Date.now();
    const client = this.createClient(settings);

    try {
      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename: 'image.jpg',
        contentType: 'image/jpeg',
      });

      const response = await client.post<PythonDetectionResponse>(
        '/detect/scrfd',
        formData,
        { headers: formData.getHeaders() }
      );

      const faces: DetectedFace[] = response.data.faces.map((face) => ({
        id: uuidv4(),
        bbox: face.bbox,
        confidence: face.confidence,
        landmarks: convertLandmarks(face.landmarks),
        yawAngle: face.yaw_angle,
        detectorSource: 'scrfd' as const,
      }));

      logger.debug(`SCRFD detection: ${faces.length} faces in ${Date.now() - startTime}ms`);
      return faces;
    } catch (error) {
      logger.error('SCRFD detection failed:', error);
      throw error;
    }
  }

  /**
   * Align a face image using 5-point landmarks.
   * This improves embedding quality for angled faces.
   *
   * @param settings - Organization settings
   * @param imageBuffer - Image buffer containing the face
   * @param landmarks - 5-point facial landmarks
   * @returns Aligned face image buffer
   */
  async alignFace(settings: OrgSettings, imageBuffer: Buffer, landmarks: FaceLandmarks): Promise<Buffer> {
    const client = this.createClient(settings);

    try {
      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename: 'face.jpg',
        contentType: 'image/jpeg',
      });

      // Send landmarks as JSON
      formData.append('landmarks', JSON.stringify({
        left_eye: [landmarks.leftEye.x, landmarks.leftEye.y],
        right_eye: [landmarks.rightEye.x, landmarks.rightEye.y],
        nose: [landmarks.nose.x, landmarks.nose.y],
        left_mouth: [landmarks.leftMouth.x, landmarks.leftMouth.y],
        right_mouth: [landmarks.rightMouth.x, landmarks.rightMouth.y],
      }));

      const response = await client.post<PythonAlignResponse>(
        '/align',
        formData,
        { headers: formData.getHeaders() }
      );

      // Decode base64 response
      return Buffer.from(response.data.aligned_image, 'base64');
    } catch (error) {
      logger.error('Face alignment failed:', error);
      throw error;
    }
  }

  /**
   * Check if Python sidecar is reachable.
   */
  async healthCheck(settings: OrgSettings): Promise<{ status: 'up' | 'down'; responseTimeMs: number }> {
    const startTime = Date.now();

    try {
      await axios.get(`${settings.pythonSidecarUrl}/health`, { timeout: 5000 });
      return { status: 'up', responseTimeMs: Date.now() - startTime };
    } catch (error) {
      logger.error('Python sidecar health check failed:', error);
      return { status: 'down', responseTimeMs: Date.now() - startTime };
    }
  }

  // =============================================================================
  // INSIGHTFACE METHODS
  // =============================================================================

  /**
   * Detect faces and extract embeddings using InsightFace.
   * This is a complete face analysis call - detection + embedding in one.
   *
   * @param settings - Organization settings
   * @param imageBuffer - Image buffer to process
   * @param options - Optional parameters (detSize for higher accuracy)
   * @returns Array of faces with embeddings
   */
  async insightFaceDetectAndEmbed(
    settings: OrgSettings,
    imageBuffer: Buffer,
    options?: { detSize?: number }
  ): Promise<FaceWithEmbedding[]> {
    const startTime = Date.now();
    const client = this.createClient(settings);
    const detSize = options?.detSize;
    logger.info(`Calling InsightFace detect-and-embed at ${client.defaults.baseURL}${detSize ? ` with det_size=${detSize}` : ''}...`);

    try {
      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename: 'image.jpg',
        contentType: 'image/jpeg',
      });

      // Build URL with optional det_size query param
      let url = '/insightface/detect-and-embed';
      if (detSize) {
        url += `?det_size=${detSize}`;
      }

      const response = await client.post<InsightFaceResponse>(
        url,
        formData,
        { headers: formData.getHeaders() }
      );

      const faces: FaceWithEmbedding[] = response.data.faces.map((face) => ({
        id: uuidv4(),
        bbox: face.bbox,
        confidence: face.confidence,
        landmarks: convertLandmarks(face.landmarks),
        detectorSource: 'insightface' as const,
        embedding: face.embedding || [],
        wasAligned: true, // InsightFace handles alignment internally
        age: face.age ? { low: face.age - 3, high: face.age + 3, probability: 0.9 } : undefined,
        gender: face.gender ? { value: face.gender === 'M' ? 'male' : 'female', probability: 0.9 } : undefined,
      }));

      logger.debug(`InsightFace: ${faces.length} faces with embeddings in ${Date.now() - startTime}ms`);
      return faces;
    } catch (error) {
      logger.error('InsightFace detect-and-embed failed:', error);
      throw error;
    }
  }

  /**
   * Extract embedding from a cropped face image using InsightFace.
   *
   * @param settings - Organization settings
   * @param faceImageBuffer - Cropped face image buffer
   * @returns Embedding vector (512-dim)
   */
  async insightFaceExtractEmbedding(settings: OrgSettings, faceImageBuffer: Buffer): Promise<number[]> {
    const startTime = Date.now();
    const client = this.createClient(settings);

    try {
      const formData = new FormData();
      formData.append('image', faceImageBuffer, {
        filename: 'face.jpg',
        contentType: 'image/jpeg',
      });

      const response = await client.post<InsightFaceEmbedResponse>(
        '/insightface/embed',
        formData,
        { headers: formData.getHeaders() }
      );

      logger.debug(`InsightFace embedding extracted in ${Date.now() - startTime}ms`);
      return response.data.embedding;
    } catch (error) {
      logger.error('InsightFace embedding extraction failed:', error);
      throw error;
    }
  }

  /**
   * Detect faces using InsightFace (without embeddings).
   *
   * @param settings - Organization settings
   * @param imageBuffer - Image buffer to process
   * @returns Array of detected faces
   */
  async insightFaceDetect(settings: OrgSettings, imageBuffer: Buffer): Promise<DetectedFace[]> {
    const startTime = Date.now();
    const client = this.createClient(settings);

    try {
      const formData = new FormData();
      formData.append('image', imageBuffer, {
        filename: 'image.jpg',
        contentType: 'image/jpeg',
      });

      const response = await client.post<PythonDetectionResponse>(
        '/insightface/detect',
        formData,
        { headers: formData.getHeaders() }
      );

      const faces: DetectedFace[] = response.data.faces.map((face) => ({
        id: uuidv4(),
        bbox: face.bbox,
        confidence: face.confidence,
        landmarks: convertLandmarks(face.landmarks),
        detectorSource: 'insightface' as const,
      }));

      logger.debug(`InsightFace detection: ${faces.length} faces in ${Date.now() - startTime}ms`);
      return faces;
    } catch (error) {
      logger.error('InsightFace detection failed:', error);
      throw error;
    }
  }

  /**
   * Check if InsightFace is available in the Python sidecar.
   */
  async insightFaceHealthCheck(settings: OrgSettings): Promise<{
    available: boolean;
    modelInfo?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      const response = await axios.get<{
        status: string;
        model_info?: Record<string, unknown>;
        error?: string;
      }>(`${settings.pythonSidecarUrl}/insightface/health`, { timeout: 5000 });

      return {
        available: response.data.status === 'available',
        modelInfo: response.data.model_info,
        error: response.data.error,
      };
    } catch (error) {
      logger.error('InsightFace health check failed:', error);
      return { available: false, error: 'Connection failed' };
    }
  }
}

// Export singleton instance
export const pythonSidecarService = new PythonSidecarService();

