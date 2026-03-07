/**
 * =============================================================================
 * Face Quality Service
 * =============================================================================
 * Assesses face quality to filter out low-quality detections.
 *
 * Filters:
 * - Minimum face size (configurable, default: 60px)
 * - Minimum confidence (configurable, default: 0.7)
 * - Extreme angles (configurable, default: skip >45°)
 *
 * All thresholds are configurable via admin settings.
 * =============================================================================
 */

import { logger } from '../utils/logger.js';
import type { DetectedFace, FaceQualityResult, FaceRejectionReason } from '../types/index.js';
import type { OrgSettings } from '../modules/org/org.types.js';

// =============================================================================
// FACE QUALITY SERVICE
// =============================================================================

/**
 * Service for assessing and filtering face quality.
 * Now accepts org settings per-request for multi-tenancy.
 */
class FaceQualityService {
  /**
   * Assess the quality of a detected face.
   *
   * @param settings - Organization settings
   * @param face - The detected face to assess
   * @returns Quality assessment result
   */
  assessQuality(settings: OrgSettings, face: DetectedFace): FaceQualityResult {
    // Calculate face size (use larger dimension)
    const faceSize = Math.max(face.bbox.width, face.bbox.height);

    // Initialize metrics
    const metrics = {
      faceSize,
      confidence: face.confidence,
      yawAngle: face.yawAngle,
      blurScore: undefined as number | undefined,
    };

    // Check minimum size
    if (faceSize < settings.minSizePx) {
      return {
        isAcceptable: false,
        rejectionReason: 'too_small',
        qualityScore: 0,
        metrics,
      };
    }

    // Check minimum confidence
    if (face.confidence < settings.minConfidence) {
      return {
        isAcceptable: false,
        rejectionReason: 'low_confidence',
        qualityScore: 0,
        metrics,
      };
    }

    // Check extreme angles (if enabled and angle is available)
    if (settings.skipExtremeAngles && face.yawAngle !== undefined) {
      const absAngle = Math.abs(face.yawAngle);
      if (absAngle > 45) {
        return {
          isAcceptable: false,
          rejectionReason: 'extreme_angle',
          qualityScore: 0,
          metrics,
        };
      }
    }

    // Calculate quality score (0 to 1)
    const qualityScore = this.calculateQualityScore(face, settings.minSizePx);

    return {
      isAcceptable: true,
      qualityScore,
      metrics,
    };
  }

  /**
   * Filter faces based on quality.
   * Returns only faces that pass quality checks.
   *
   * @param settings - Organization settings
   * @param faces - Array of detected faces
   * @returns Object with accepted and rejected faces
   */
  filterFaces(settings: OrgSettings, faces: DetectedFace[]): {
    accepted: DetectedFace[];
    rejected: Array<{ face: DetectedFace; reason: FaceRejectionReason }>;
  } {
    const accepted: DetectedFace[] = [];
    const rejected: Array<{ face: DetectedFace; reason: FaceRejectionReason }> = [];

    for (const face of faces) {
      const result = this.assessQuality(settings, face);

      if (result.isAcceptable) {
        accepted.push(face);
      } else if (result.rejectionReason) {
        rejected.push({ face, reason: result.rejectionReason });
        // Log detailed rejection info
        logger.info(
          `[Quality] Face ${face.id} REJECTED: reason=${result.rejectionReason}, ` +
          `bbox=${face.bbox.width}x${face.bbox.height}, confidence=${face.confidence.toFixed(3)}, ` +
          `thresholds: minSize=${settings.minSizePx}, minConf=${settings.minConfidence}`
        );
      }
    }

    logger.debug(
      `Face quality filter: ${accepted.length} accepted, ${rejected.length} rejected`
    );

    return { accepted, rejected };
  }

  /**
   * Calculate a quality score for a face.
   * Higher score = better quality.
   *
   * @param face - Detected face
   * @param minSize - Minimum size threshold
   * @returns Quality score (0 to 1)
   */
  private calculateQualityScore(face: DetectedFace, minSize: number): number {
    const faceSize = Math.max(face.bbox.width, face.bbox.height);

    // Size score: normalized by min size, capped at 1
    // Larger faces get higher scores
    const sizeScore = Math.min(1, faceSize / (minSize * 3));

    // Confidence score: direct mapping
    const confidenceScore = face.confidence;

    // Angle score: 1 for front-facing, decreasing for angled faces
    let angleScore = 1;
    if (face.yawAngle !== undefined) {
      // Score decreases as angle increases (0° = 1.0, 45° = 0.5, 90° = 0)
      angleScore = 1 - Math.min(1, Math.abs(face.yawAngle) / 90);
    }

    // Weighted average of scores
    const weights = { size: 0.3, confidence: 0.5, angle: 0.2 };
    const totalScore =
      sizeScore * weights.size +
      confidenceScore * weights.confidence +
      angleScore * weights.angle;

    return Math.round(totalScore * 100) / 100;
  }
}

// Export singleton instance
export const faceQualityService = new FaceQualityService();

