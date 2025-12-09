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
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

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
        // Enforce Detect-Crop-Recognize pipeline
        faces = await this.executeDetectionPipeline(settings, imageBuffer, detectorsUsed);
      }
    } catch (error) {
      logger.error('Primary detection pipeline failed, attempting fallback rescue:', error);
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
   * This is the legacy mode that sends full images.
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
   * Unified Detection Pipeline:
   * Waterfall: CompreFace -> YuNet -> SCRFD
   * Logic: Detect -> Crop -> Align -> Verify (Embed).
   * If Detection yields 0 faces OR Embedding fails for all faces (false positives), continue to next detector.
   */
  private async executeDetectionPipeline(
    settings: OrgSettings,
    imageBuffer: Buffer,
    detectorsUsed: DetectionResult['detectorsUsed']
  ): Promise<FaceWithEmbedding[]> {
    // 1. Try CompreFace
    detectorsUsed.push('compreface');
    try {
      const faces = await compreFaceService.detectOnly(settings, imageBuffer);
      if (faces.length > 0) {
        const validFaces = await this.processFaces(settings, imageBuffer, faces);
        if (validFaces.length > 0) return validFaces;
        logger.warn('CompreFace found faces but none could be embedded (false positives?). Trying fallbacks...');
      }
    } catch (err) {
      logger.warn('CompreFace detection failed/timed out, continuing to fallbacks', err);
    }

    if (!settings.enableFallbackDetection) return [];

    logger.info('Starting fallback detection waterfall...');

    // 2. Try YuNet
    try {
      detectorsUsed.push('yunet');
      const faces = await pythonSidecarService.detectWithYuNet(settings, imageBuffer);
      if (faces.length > 0) {
        logger.debug(`YuNet found ${faces.length} faces. Verifying...`);
        const validFaces = await this.processFaces(settings, imageBuffer, faces);
        if (validFaces.length > 0) return validFaces;
        logger.warn('YuNet found faces but none could be embedded. Trying SCRFD...');
      }
    } catch (err) {
      logger.warn('YuNet detection failed:', err);
    }

    // 3. Try SCRFD
    try {
      detectorsUsed.push('scrfd');
      const faces = await pythonSidecarService.detectWithSCRFD(settings, imageBuffer);
      if (faces.length > 0) {
        logger.debug(`SCRFD found ${faces.length} faces. Verifying...`);
        const validFaces = await this.processFaces(settings, imageBuffer, faces);
        if (validFaces.length > 0) return validFaces;
      }
    } catch (err) {
      logger.warn('SCRFD detection failed:', err);
    }

    return [];
  }

  /**
   * Process detected faces: Crop -> Align -> Embed.
   * Only returns faces that successfully generated an embedding.
   */
  private async processFaces(
    settings: OrgSettings,
    imageBuffer: Buffer,
    detectedFaces: DetectedFace[]
  ): Promise<FaceWithEmbedding[]> {
    // DEBUG: Visualize Bounding Boxes
    try {
      if (detectedFaces.length > 0) {
        const metadata = await sharp(imageBuffer).metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;

        const svgRects = detectedFaces.map(face => `
          <rect 
            x="${face.bbox.x}" 
            y="${face.bbox.y}" 
            width="${face.bbox.width}" 
            height="${face.bbox.height}" 
            style="fill:none;stroke:red;stroke-width:5" 
          />
        `).join('\n');

        const svgImage = `
          <svg width="${width}" height="${height}">
            ${svgRects}
          </svg>
        `;

        const debugImage = await sharp(imageBuffer)
          .composite([{ input: Buffer.from(svgImage), top: 0, left: 0 }])
          .toBuffer();

        const logsDir = path.join(process.cwd(), 'logs');
        // Use the ID of the first face as a unique identifier for the batch
        const debugFilename = `debug_viz_${detectedFaces[0].id}_${detectedFaces[0].detectorSource}.jpg`;
        await fs.writeFile(path.join(logsDir, debugFilename), debugImage);
        logger.info(`Saved debug visualization to ${debugFilename}`);
        logger.info(`BBox Coordinates: ${JSON.stringify(detectedFaces.map(f => f.bbox))}`);
      }
    } catch (vizError) {
      logger.error('Failed to create debug visualization:', vizError);
    }

    const validFaces: FaceWithEmbedding[] = [];

    for (const face of detectedFaces) {
      try {
        // 1. Crop original face
        const unalignedFaceImage = await cropFace(imageBuffer, face.bbox);
        let faceImage = unalignedFaceImage;
        let wasAligned = false;

        // 2. Optionally align face
        if (settings.enableAlignment && face.landmarks) {
          try {
            const alignedImage = await pythonSidecarService.alignFace(settings, unalignedFaceImage, face.landmarks);
            faceImage = alignedImage;
            wasAligned = true;
          } catch (alignError) {
            logger.warn('Face alignment failed, proceeding with unaligned image:', alignError);
            wasAligned = false;
            faceImage = unalignedFaceImage;
          }
        }

        // 3. Extract embedding with retry logic
        let embedding: number[] = [];
        try {
          embedding = await compreFaceService.extractEmbedding(settings, faceImage);
        } catch (embeddingError) {
          // Critical Retry: If aligned face failed, retry with unaligned
          if (wasAligned) {
            logger.warn(`Embedding fail for aligned face ${face.id}. Retrying unaligned...`);
            try {
              embedding = await compreFaceService.extractEmbedding(settings, unalignedFaceImage);
              wasAligned = false; // We fell back to unaligned
              logger.info(`Retry successful for face ${face.id} using unaligned image`);
            } catch (retryError) {
              logger.debug(`Retry failed for face ${face.id}`);
              // Optional: Save debug images here if needed
              throw retryError;
            }
          } else {
            throw embeddingError;
          }
        }

        validFaces.push({
          ...face,
          embedding,
          wasAligned,
        });
      } catch (error) {
        logger.warn(`Failed to process face ${face.id} (skipped):`, error);
      }
    }

    return validFaces;
  }

  // NOTE: attemptFallbackDetection and runFallbackDetection methods are removed
  // as they are now integrated into the unified executeDetectionPipeline.

  /**
   * Legacy wrapper for "attemptFallbackDetection" calls if any remain.
   * Can be removed if we are sure no one calls it.
   */
  private async attemptFallbackDetection(
    settings: OrgSettings,
    imageBuffer: Buffer,
    detectorsUsed: DetectionResult['detectorsUsed']
  ): Promise<FaceWithEmbedding[]> {
    return this.executeDetectionPipeline(settings, imageBuffer, detectorsUsed);
  }

  /**
   * Detect faces only (without embeddings).
   * Useful for quick face count or bounding box visualization.
   */
  /**
   * Detect faces only (without embeddings).
   * Useful for quick face count or bounding box visualization.
   * NOTE: This returns unverified faces.
   */
  async detectOnly(settings: OrgSettings, imageBuffer: Buffer): Promise<DetectedFace[]> {
    try {
      // 1. CompreFace
      const faces = await compreFaceService.detectOnly(settings, imageBuffer);
      if (faces.length > 0) return faces;

      // 2. Fallbacks
      if (settings.enableFallbackDetection) {
        // YuNet
        try {
          const yunetFaces = await pythonSidecarService.detectWithYuNet(settings, imageBuffer);
          if (yunetFaces.length > 0) return yunetFaces;
        } catch (e) { /* ignore */ }

        // SCRFD
        try {
          const scrfdFaces = await pythonSidecarService.detectWithSCRFD(settings, imageBuffer);
          if (scrfdFaces.length > 0) return scrfdFaces;
        } catch (e) { /* ignore */ }
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
