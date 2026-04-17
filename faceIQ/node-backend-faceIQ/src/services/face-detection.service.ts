/**
 * =============================================================================
 * Face Detection Orchestrator Service
 * =============================================================================
 * Orchestrates face detection across multiple providers with fallback logic.
 *
 * Provider Options:
 * - COMPREFACE: External CompreFace service (requires comprefaceUrl)
 * - INSIGHTFACE: Python sidecar's built-in InsightFace (self-contained)
 *
 * Detection Pipeline (for each provider):
 * 1. Try primary detector - gets detection + embeddings in one call
 * 2. If no faces found and fallback enabled, try SCRFD (most accurate)
 * 3. If still no faces, try YuNet (faster, frontal faces)
 * 4. Apply quality filtering to results
 *
 * @see compreface.service.ts - CompreFace provider
 * @see python-sidecar.service.ts - InsightFace provider + fallback detectors
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
 * Options for face detection
 */
export interface DetectionOptions {
  /** Use higher accuracy mode (det_size 800x800 instead of 640x640) */
  highAccuracy?: boolean;
}

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
   * @param options - Optional detection options (highAccuracy mode)
   * @returns Detection result with faces and embeddings
   */
  async detectAndEmbed(
    settings: OrgSettings,
    imageBuffer: Buffer,
    options: DetectionOptions = {}
  ): Promise<{
    faces: FaceWithEmbedding[];
    detectionResult: DetectionResult;
  }> {
    const startTime = Date.now();
    const detectorsUsed: DetectionResult['detectorsUsed'] = [];
    let faces: FaceWithEmbedding[] = [];
    let scale = 1;
    let processedBuffer = imageBuffer;

    try {
      // 0. Pre-process: Resize huge images to prevent OOM
      // 2500px balances accuracy vs memory - small faces remain detectable
      const MAX_DIMENSION = 2500;
      const metadata = await sharp(imageBuffer).metadata();

      if (metadata.width && (metadata.width > MAX_DIMENSION || (metadata.height && metadata.height > MAX_DIMENSION))) {
        const width = metadata.width;
        logger.info(`Resizing huge image (${width}x${metadata.height}) to max ${MAX_DIMENSION}px to prevent OOM`);

        processedBuffer = await sharp(imageBuffer)
          .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside' })
          .toBuffer();

        // Recalculate scale to map coordinates back later
        // Sharp maintains aspect ratio with 'inside', so scale is based on the dominant dimension
        const newMetadata = await sharp(processedBuffer).metadata();
        if (newMetadata.width) {
          scale = newMetadata.width / width;
        }
      }

      // Use configured provider and detection mode
      logger.info(`Starting face detection. Provider: ${settings.faceRecognitionProvider}, Mode: ${settings.faceDetectionMode}, HighAccuracy: ${options.highAccuracy || false}`);

      // Route based on face recognition provider
      if (settings.faceRecognitionProvider === 'INSIGHTFACE') {
        // InsightFace: Use Python sidecar's built-in face analysis
        faces = await this.detectWithInsightFace(settings, processedBuffer, detectorsUsed, options);
      } else {
        // CompreFace (default): Use external CompreFace service
        if (settings.faceDetectionMode === 'RECOGNITION_ONLY') {
          faces = await this.detectRecognitionOnly(settings, processedBuffer, detectorsUsed);
        } else {
          // Enforce Detect-Crop-Recognize pipeline
          faces = await this.executeDetectionPipeline(settings, processedBuffer, detectorsUsed);
        }
      }

      // Scale bounding boxes back to original coordinates if resized
      if (scale !== 1) {
        logger.info(`[Scale] Scaling ${faces.length} face bboxes back to original (scale=${scale.toFixed(4)})`);
        faces = faces.map(face => {
          const scaledBbox = {
            x: Math.round(face.bbox.x / scale),
            y: Math.round(face.bbox.y / scale),
            width: Math.round(face.bbox.width / scale),
            height: Math.round(face.bbox.height / scale),
          };
          logger.debug(`[Scale] Face ${face.id}: ${face.bbox.width}x${face.bbox.height} -> ${scaledBbox.width}x${scaledBbox.height}`);
          return {
            ...face,
            bbox: scaledBbox,
          };
        });
      }

      // Log face info before quality filtering
      for (const face of faces) {
        logger.info(`[PreFilter] Face ${face.id}: bbox=${face.bbox.width}x${face.bbox.height}, conf=${face.confidence?.toFixed(3)}, hasEmbedding=${!!face.embedding}, embeddingLen=${face.embedding?.length}`);
      }

    } catch (error) {
      logger.error('Primary detection pipeline failed, attempting fallback rescue:', error);
      // Try fallback with the processed buffer to be safe
      faces = await this.attemptFallbackDetection(settings, processedBuffer, detectorsUsed);

      // Also scale fallback results
      if (scale !== 1) {
        faces = faces.map(face => ({
          ...face,
          bbox: {
            x: Math.round(face.bbox.x / scale),
            y: Math.round(face.bbox.y / scale),
            width: Math.round(face.bbox.width / scale),
            height: Math.round(face.bbox.height / scale),
          }
        }));
      }
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
   * InsightFace detection mode: Uses Python sidecar's InsightFace.
   * Complete face analysis (detection + embedding) in a single call.
   * No external CompreFace dependency required.
   */
  private async detectWithInsightFace(
    settings: OrgSettings,
    imageBuffer: Buffer,
    detectorsUsed: DetectionResult['detectorsUsed'],
    options: DetectionOptions = {}
  ): Promise<FaceWithEmbedding[]> {
    detectorsUsed.push('insightface');

    try {
      // Pass highAccuracy option to use larger det_size (800x800)
      let faces = await pythonSidecarService.insightFaceDetectAndEmbed(settings, imageBuffer, {
        detSize: options.highAccuracy ? 800 : undefined, // Use 800x800 for high accuracy, otherwise default (640x640)
      });

      // If no faces found and fallback enabled, try traditional detectors
      // then extract embeddings with InsightFace
      if (faces.length === 0 && settings.enableFallbackDetection) {
        logger.info('InsightFace found no faces, trying fallback detectors...');
        faces = await this.attemptFallbackDetectionWithInsightFace(settings, imageBuffer, detectorsUsed);
      }

      // Apply confidence boost: Since InsightFace successfully extracted embeddings,
      // all returned faces are validated as real faces. Boost confidence to ensure
      // they pass quality filtering (especially for faces with detection confidence < minConfidence)
      for (const face of faces) {
        if (face.embedding && face.confidence < settings.minConfidence) {
          logger.debug(`[ConfBoost] Face ${face.id}: ${face.confidence.toFixed(3)} → ${settings.minConfidence} (InsightFace validated)`);
          face.confidence = settings.minConfidence;
        }
      }

      return faces;
    } catch (error) {
      logger.error('InsightFace detection failed:', error);

      // If InsightFace fails, try fallback detectors
      if (settings.enableFallbackDetection) {
        logger.warn('Falling back to alternative detectors with InsightFace embedding...');
        return this.attemptFallbackDetectionWithInsightFace(settings, imageBuffer, detectorsUsed);
      }

      throw error;
    }
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

    // 2. Try SCRFD first (more accurate, better for multi-face detection)
    try {
      detectorsUsed.push('scrfd');
      const faces = await pythonSidecarService.detectWithSCRFD(settings, imageBuffer);
      if (faces.length > 0) {
        logger.debug(`SCRFD found ${faces.length} faces. Verifying...`);
        const validFaces = await this.processFaces(settings, imageBuffer, faces);
        if (validFaces.length > 0) return validFaces;
        logger.warn('SCRFD found faces but none could be embedded. Trying YuNet...');
      }
    } catch (err) {
      logger.warn('SCRFD detection failed:', err);
    }

    // 3. Try YuNet as fallback (faster, good for frontal faces)
    try {
      detectorsUsed.push('yunet');
      const faces = await pythonSidecarService.detectWithYuNet(settings, imageBuffer);
      if (faces.length > 0) {
        logger.debug(`YuNet found ${faces.length} faces. Verifying...`);
        const validFaces = await this.processFaces(settings, imageBuffer, faces);
        if (validFaces.length > 0) return validFaces;
      }
    } catch (err) {
      logger.warn('YuNet detection failed:', err);
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
    // DEBUG: Visualize Bounding Boxes - Disabled by default to prevent OOM on high load
    // To enable, set ENABLE_DEBUG_VIZ=true in .env
    /*
    try {
      if (detectedFaces.length > 0 && process.env.ENABLE_DEBUG_VIZ === 'true') {
        const metadata = await sharp(imageBuffer).metadata();
        // ... (rest of viz logic)
        // For now, completely skipping this block to safe memory
      }
    } catch (vizError) {
      logger.error('Failed to create debug visualization:', vizError);
    }
    */

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

        // 3. Extract embedding with retry logic and provider fallback
        let embedding: number[] = [];
        let embeddingProvider = 'compreface';

        try {
          // Try CompreFace first
          embedding = await compreFaceService.extractEmbedding(settings, faceImage);
        } catch (embeddingError) {
          logger.warn(`CompreFace embedding extraction failed for face ${face.id} using ${wasAligned ? 'aligned' : 'unaligned'} image:`, embeddingError);

          // Retry logic for aligned face failure (still using CompreFace)
          let retrySuccess = false;
          if (wasAligned) {
            logger.warn(`Retrying CompreFace embedding with unaligned image for face ${face.id}...`);
            try {
              embedding = await compreFaceService.extractEmbedding(settings, unalignedFaceImage);
              wasAligned = false;
              retrySuccess = true;
              logger.info(`Retry successful for face ${face.id} using unaligned image (CompreFace)`);
            } catch (retryError) {
              logger.warn(`CompreFace retry with unaligned image failed for face ${face.id}:`, retryError);
            }
          }

          // If CompreFace completely failed, try InsightFace fallback
          if (!retrySuccess) {
            if (settings.pythonSidecarUrl) {
              logger.info(`Attempting fallback to InsightFace embedding for face ${face.id}...`);
              try {
                // Determine which image to use for fallback
                const imageForFallback = wasAligned ? faceImage : unalignedFaceImage;
                embedding = await pythonSidecarService.insightFaceExtractEmbedding(settings, imageForFallback);
                embeddingProvider = 'insightface-fallback';
                logger.info(`Successfully extracted embedding for face ${face.id} using InsightFace fallback`);

                // IMPORTANT: If InsightFace successfully extracted an embedding, the face is VALIDATED.
                // Boost the confidence to pass quality filtering since InsightFace confirmed it's a real face.
                // Original detector (YuNet/SCRFD) may have low confidence, but successful embedding proves validity.
                if (face.confidence < settings.minConfidence) {
                  logger.info(`[Confidence Boost] Face ${face.id}: ${face.confidence.toFixed(3)} -> ${settings.minConfidence.toFixed(3)} (InsightFace validated)`);
                  face.confidence = settings.minConfidence;
                }
              } catch (fallbackError) {
                logger.error(`InsightFace fallback embedding also failed for face ${face.id}:`, fallbackError);
                throw embeddingError; // Throw original error if fallback also fails
              }
            } else {
              logger.warn(`InsightFace fallback not configured (no pythonSidecarUrl). Face ${face.id} will be skipped.`);
              throw embeddingError;
            }
          }
        }

        validFaces.push({
          ...face,
          embedding,
          wasAligned,
          embeddingProvider, // Track which provider generated the embedding
        });
      } catch (error) {
        logger.warn(`Failed to process face ${face.id} (skipped). Detection provider: ${face.detectorSource}`, error);
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
   * Fallback detection with InsightFace embedding extraction.
   * Uses SCRFD/YuNet for detection, then InsightFace for embeddings.
   * SCRFD is tried first as it's more accurate for multi-face detection.
   */
  private async attemptFallbackDetectionWithInsightFace(
    settings: OrgSettings,
    imageBuffer: Buffer,
    detectorsUsed: DetectionResult['detectorsUsed']
  ): Promise<FaceWithEmbedding[]> {
    // Try SCRFD first (more accurate, better for multi-face detection)
    try {
      detectorsUsed.push('scrfd');
      const scrfdFaces = await pythonSidecarService.detectWithSCRFD(settings, imageBuffer);
      if (scrfdFaces.length > 0) {
        const validFaces = await this.processFacesWithInsightFace(settings, imageBuffer, scrfdFaces);
        if (validFaces.length > 0) return validFaces;
        logger.warn('SCRFD found faces but InsightFace could not embed them. Trying YuNet...');
      }
    } catch (error) {
      logger.warn('SCRFD detection failed:', error);
    }

    // Try YuNet as fallback (faster, good for frontal faces)
    try {
      detectorsUsed.push('yunet');
      const yunetFaces = await pythonSidecarService.detectWithYuNet(settings, imageBuffer);
      if (yunetFaces.length > 0) {
        const validFaces = await this.processFacesWithInsightFace(settings, imageBuffer, yunetFaces);
        if (validFaces.length > 0) return validFaces;
      }
    } catch (error) {
      logger.warn('YuNet detection failed:', error);
    }

    return [];
  }

  /**
   * Process detected faces using InsightFace for embedding extraction.
   * Similar to processFaces but uses InsightFace instead of CompreFace.
   */
  private async processFacesWithInsightFace(
    settings: OrgSettings,
    imageBuffer: Buffer,
    detectedFaces: DetectedFace[]
  ): Promise<FaceWithEmbedding[]> {
    const validFaces: FaceWithEmbedding[] = [];

    for (const face of detectedFaces) {
      try {
        // 1. Crop face
        const faceImage = await cropFace(imageBuffer, face.bbox);

        // 2. Extract embedding using InsightFace
        const embedding = await pythonSidecarService.insightFaceExtractEmbedding(settings, faceImage);

        // 3. If InsightFace successfully extracted an embedding, the face is VALIDATED.
        // Boost the confidence to pass quality filtering if needed.
        if (face.confidence < settings.minConfidence) {
          logger.info(`[Confidence Boost] Face ${face.id}: ${face.confidence.toFixed(3)} -> ${settings.minConfidence.toFixed(3)} (InsightFace validated)`);
          face.confidence = settings.minConfidence;
        }

        validFaces.push({
          ...face,
          embedding,
          wasAligned: true, // InsightFace handles alignment internally
          embeddingProvider: 'insightface',
        });
      } catch (error) {
        logger.warn(`Failed to process face ${face.id} with InsightFace (skipped):`, error);
      }
    }

    return validFaces;
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
