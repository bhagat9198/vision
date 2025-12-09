/**
 * =============================================================================
 * Face Detection Orchestrator Service
 * =============================================================================
 * Orchestrates face detection across multiple detectors with fallback logic.
 *
 * Detection Pipeline:
 * 1. Try CompreFace (primary) - gets detection + embeddings in one call
 * 2. If no faces found and fallback enabled, try YuNet
 * 3. If still no faces, try SCRFD (best for hard cases)
 * 4. Apply quality filtering to results
 *
 * @see compreface.service.ts - Primary detector
 * @see python-sidecar.service.ts - Fallback detectors
 * =============================================================================
 */

import { v4 as uuidv4 } from 'uuid';
import { compreFaceService } from './compreface.service.js';
import { pythonSidecarService } from './python-sidecar.service.js';
import { faceQualityService } from './face-quality.service.js';
import { logger } from '../utils/logger.js';
import { cropFace } from '../utils/image-utils.js';
import type {
  DetectedFace,
  FaceWithEmbedding,
  DetectionResult,
} from '../types/index.js';
import type { OrgSettings } from '../modules/org/org.types.js';

// =============================================================================
// FACE DETECTION ORCHESTRATOR
// =============================================================================

/**
 * Orchestrates face detection and embedding extraction.
 * Now accepts org settings per-request for multi-tenancy.
 */
class FaceDetectionService {
  /**
   * Detect faces and extract embeddings from an image.
   * Uses the configured detection mode and applies fallback logic.
   *
   * @param settings - Organization settings
   * @param imageBuffer - Image buffer to process
   * @returns Detection result with faces and embeddings
   */
  async detectAndEmbed(settings: OrgSettings, imageBuffer: Buffer): Promise<{
    faces: FaceWithEmbedding[];
    detectionResult: DetectionResult;
  }> {
    const startTime = Date.now();
    const detectorsUsed: DetectionResult['detectorsUsed'] = [];

    let faces: FaceWithEmbedding[] = [];

    try {
      // Use configured detection mode
      logger.info(`Starting face detection. Mode: ${settings.faceDetectionMode}`);
      if (settings.faceDetectionMode === 'RECOGNITION_ONLY') {
        faces = await this.detectRecognitionOnly(settings, imageBuffer, detectorsUsed);
      } else {
        faces = await this.detectThenRecognize(settings, imageBuffer, detectorsUsed);
      }
    } catch (error) {
      logger.error('Primary detection failed, attempting fallback:', error);
      faces = await this.attemptFallbackDetection(settings, imageBuffer, detectorsUsed);
    }

    // Apply quality filtering
    const { accepted, rejected } = await faceQualityService.filterFaces(settings, faces);

    // Filter to only accepted faces with embeddings
    const acceptedFaces = faces.filter((f) =>
      accepted.some((a) => a.id === f.id)
    );

    const detectionResult: DetectionResult = {
      faces: acceptedFaces,
      acceptedCount: acceptedFaces.length,
      rejectedCount: rejected.length,
      processingTimeMs: Date.now() - startTime,
      detectorsUsed,
    };

    logger.info(
      `Face detection complete: ${acceptedFaces.length} faces accepted, ` +
      `${rejected.length} rejected in ${detectionResult.processingTimeMs}ms`
    );

    return { faces: acceptedFaces, detectionResult };
  }

  /**
   * Recognition-only mode: Single call to CompreFace /recognize.
   */
  private async detectRecognitionOnly(
    settings: OrgSettings,
    imageBuffer: Buffer,
    detectorsUsed: DetectionResult['detectorsUsed']
  ): Promise<FaceWithEmbedding[]> {
    detectorsUsed.push('compreface');

    let faces = await compreFaceService.detectAndEmbed(settings, imageBuffer);

    // If no faces found and fallback enabled, try fallback detectors
    if (faces.length === 0 && settings.enableFallbackDetection) {
      faces = await this.attemptFallbackDetection(settings, imageBuffer, detectorsUsed);
    }

    return faces;
  }

  /**
   * Detection-then-recognition mode: Separate detection and embedding.
   * Allows for custom cropping and alignment before embedding extraction.
   */
  private async detectThenRecognize(
    settings: OrgSettings,
    imageBuffer: Buffer,
    detectorsUsed: DetectionResult['detectorsUsed']
  ): Promise<FaceWithEmbedding[]> {
    detectorsUsed.push('compreface');

    // Step 1: Detect faces
    let detectedFaces = await compreFaceService.detectOnly(settings, imageBuffer);

    // Try fallback if no faces found
    if (detectedFaces.length === 0 && settings.enableFallbackDetection) {
      detectedFaces = await this.runFallbackDetection(settings, imageBuffer, detectorsUsed);
    }

    if (detectedFaces.length === 0) {
      return [];
    }

    // Step 2: Process each face - crop, optionally align, extract embedding
    const facesWithEmbeddings: FaceWithEmbedding[] = [];

    for (const face of detectedFaces) {
      try {
        let faceImage = await cropFace(imageBuffer, face.bbox);
        let wasAligned = false;

        // Optionally align face using landmarks
        if (settings.enableAlignment && face.landmarks) {
          try {
            faceImage = await pythonSidecarService.alignFace(settings, faceImage, face.landmarks);
            wasAligned = true;
          } catch (alignError) {
            logger.warn('Face alignment failed, using unaligned image:', alignError);
          }
        }

        // Extract embedding
        const embedding = await compreFaceService.extractEmbedding(settings, faceImage);

        facesWithEmbeddings.push({
          ...face,
          embedding,
          wasAligned,
        });
      } catch (error) {
        logger.warn(`Failed to process face ${face.id}:`, error);
      }
    }

    return facesWithEmbeddings;
  }

  /**
   * Attempt fallback detection and then extract embeddings.
   */
  private async attemptFallbackDetection(
    settings: OrgSettings,
    imageBuffer: Buffer,
    detectorsUsed: DetectionResult['detectorsUsed']
  ): Promise<FaceWithEmbedding[]> {
    logger.info('Attempting fallback detection...');
    const detectedFaces = await this.runFallbackDetection(settings, imageBuffer, detectorsUsed);

    if (detectedFaces.length === 0) {
      return [];
    }

    // Extract embeddings for fallback-detected faces
    const facesWithEmbeddings: FaceWithEmbedding[] = [];

    for (const face of detectedFaces) {
      try {
        let faceImage = await cropFace(imageBuffer, face.bbox);
        let wasAligned = false;

        // Try to align if landmarks available
        if (settings.enableAlignment && face.landmarks) {
          try {
            faceImage = await pythonSidecarService.alignFace(settings, faceImage, face.landmarks);
            wasAligned = true;
          } catch (alignError) {
            logger.warn('Face alignment failed:', alignError);
          }
        }

        // Extract embedding via CompreFace
        const embedding = await compreFaceService.extractEmbedding(settings, faceImage);

        facesWithEmbeddings.push({
          ...face,
          embedding,
          wasAligned,
        });
      } catch (error) {
        logger.warn(`Failed to extract embedding for fallback face ${face.id}:`, error);
      }
    }

    return facesWithEmbeddings;
  }

  /**
   * Run fallback detectors (YuNet, then SCRFD).
   */
  private async runFallbackDetection(
    settings: OrgSettings,
    imageBuffer: Buffer,
    detectorsUsed: DetectionResult['detectorsUsed']
  ): Promise<DetectedFace[]> {
    logger.info(`Running fallback detection. Sidecar URL: ${settings.pythonSidecarUrl}`);

    // Try YuNet first (faster)
    try {
      detectorsUsed.push('yunet');
      const yunetFaces = await pythonSidecarService.detectWithYuNet(settings, imageBuffer);
      if (yunetFaces.length > 0) {
        logger.debug(`YuNet fallback found ${yunetFaces.length} faces`);
        return yunetFaces;
      }
    } catch (error: any) {
      logger.warn('YuNet fallback failed:', error.message);
      if (error.response?.data) {
        logger.warn('YuNet error details:', JSON.stringify(error.response.data));
      }
    }

    // Try SCRFD (best for hard cases)
    try {
      detectorsUsed.push('scrfd');
      const scrfdFaces = await pythonSidecarService.detectWithSCRFD(settings, imageBuffer);
      if (scrfdFaces.length > 0) {
        logger.debug(`SCRFD fallback found ${scrfdFaces.length} faces`);
        return scrfdFaces;
      }
    } catch (error) {
      logger.warn('SCRFD fallback failed:', error);
    }

    return [];
  }

  /**
   * Detect faces only (without embeddings).
   * Useful for quick face count or bounding box visualization.
   */
  async detectOnly(settings: OrgSettings, imageBuffer: Buffer): Promise<DetectedFace[]> {
    try {
      const faces = await compreFaceService.detectOnly(settings, imageBuffer);

      if (faces.length > 0) {
        return faces;
      }

      // Fallback detection
      if (settings.enableFallbackDetection) {
        const detectorsUsed: DetectionResult['detectorsUsed'] = [];
        return await this.runFallbackDetection(settings, imageBuffer, detectorsUsed);
      }

      return [];
    } catch (error) {
      logger.error('Detection failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const faceDetectionService = new FaceDetectionService();

