/**
 * =============================================================================
 * Face Analysis Type Definitions
 * =============================================================================
 * Core types for face detection, embeddings, and search operations.
 * =============================================================================
 */

// =============================================================================
// BOUNDING BOX & LANDMARKS
// =============================================================================

/**
 * Bounding box coordinates for a detected face.
 * Uses pixel coordinates relative to the original image.
 */
export interface BoundingBox {
  /** X coordinate of top-left corner */
  x: number;
  /** Y coordinate of top-left corner */
  y: number;
  /** Width of the bounding box */
  width: number;
  /** Height of the bounding box */
  height: number;
}

/**
 * 5-point facial landmarks for alignment.
 * Standard landmarks: left eye, right eye, nose, left mouth, right mouth.
 */
export interface FaceLandmarks {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  nose: { x: number; y: number };
  leftMouth: { x: number; y: number };
  rightMouth: { x: number; y: number };
}

// =============================================================================
// DETECTED FACE
// =============================================================================

/**
 * A detected face with its properties.
 */
export interface DetectedFace {
  /** Unique identifier for this face detection */
  id: string;
  /** Bounding box in original image coordinates */
  bbox: BoundingBox;
  /** Detection confidence score (0.0 to 1.0) */
  confidence: number;
  /** Facial landmarks (if available) */
  landmarks?: FaceLandmarks;
  /** Estimated yaw angle in degrees (for profile detection) */
  yawAngle?: number;
  /** Estimated age */
  age?: {
    low: number;
    high: number;
  };
  /** Estimated gender */
  gender?: {
    value: 'male' | 'female';
    probability: number;
  };
  /** Head pose (pitch, roll, yaw) */
  pose?: {
    pitch: number;
    roll: number;
    yaw: number;
  };
  /** 106-point 2D facial landmarks */
  landmarks2d106?: Array<[number, number]>;
  /** Which detector found this face */
  detectorSource: 'compreface' | 'yunet' | 'scrfd' | 'insightface';
}

/**
 * Face with extracted embedding vector.
 */
export interface FaceWithEmbedding extends DetectedFace {
  /** 512-dimensional embedding vector */
  embedding: number[];
  /** Whether face was aligned before embedding extraction */
  wasAligned: boolean;
  /** Which provider generated the embedding (compreface, insightface, insightface-fallback) */
  embeddingProvider?: string;
}

// =============================================================================
// QUALITY ASSESSMENT
// =============================================================================

/**
 * Reasons why a face might be rejected during quality check.
 */
export type FaceRejectionReason =
  | 'too_small'
  | 'low_confidence'
  | 'extreme_angle'
  | 'blur_detected'
  | 'no_landmarks';

/**
 * Result of face quality assessment.
 */
export interface FaceQualityResult {
  /** Whether the face passes quality checks */
  isAcceptable: boolean;
  /** Rejection reason if not acceptable */
  rejectionReason?: FaceRejectionReason;
  /** Quality score (0.0 to 1.0) */
  qualityScore: number;
  /** Detailed quality metrics */
  metrics: {
    faceSize: number;
    confidence: number;
    yawAngle?: number;
    blurScore?: number;
  };
}

// =============================================================================
// DETECTION RESULTS
// =============================================================================

/**
 * Result of face detection on a single image.
 */
export interface DetectionResult {
  /** All faces detected in the image */
  faces: DetectedFace[];
  /** Number of faces that passed quality checks */
  acceptedCount: number;
  /** Number of faces that failed quality checks */
  rejectedCount: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Which detector(s) were used */
  detectorsUsed: Array<'compreface' | 'yunet' | 'scrfd' | 'insightface'>;
}

// =============================================================================
// INDEXING
// =============================================================================

/**
 * Request to index faces from a photo.
 */
export interface IndexPhotoRequest {
  /** Photo ID from the main database */
  photoId: string;
  /** Event ID this photo belongs to */
  eventId: string;
  /** URL to fetch the image (for 'url' mode) */
  imageUrl?: string;
  /** Image buffer (for 'multipart' mode) */
  imageBuffer?: Buffer;
  /** Path to image (for 'shared_storage' mode) */
  imagePath?: string;
}

/**
 * Result of indexing a photo's faces.
 */
export interface IndexPhotoResult {
  /** Photo ID that was indexed */
  photoId: string;
  /** Event ID */
  eventId: string;
  /** Number of faces detected */
  facesDetected: number;
  /** Number of faces indexed (after quality filtering) */
  facesIndexed: number;
  /** Number of faces rejected */
  facesRejected: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Which detectors were used */
  detectorsUsed: Array<'compreface' | 'yunet' | 'scrfd' | 'insightface'>;
}

