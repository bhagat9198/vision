"""
=============================================================================
InsightFace Service
=============================================================================
Complete face analysis using InsightFace library:
- Face Detection (SCRFD-based)
- Face Recognition/Embedding (ArcFace - 512-dim)
- Age & Gender Estimation
- 5-point Landmarks

This makes the Python sidecar a COMPLETE face analysis service,
eliminating the need for CompreFace for embedding extraction.
=============================================================================
"""

import os
import logging
import numpy as np
from typing import Optional

# Setup logger
logger = logging.getLogger("python-sidecar")

# =============================================================================
# LANDMARK VALIDATION
# =============================================================================

def validate_face_landmarks_basic(landmarks: dict, bbox: dict) -> bool:
    """
    Basic landmark validation that accommodates profile/extreme angles.
    Just checks that landmarks exist and have reasonable positions.

    Works for:
    - Frontal faces (both eyes visible)
    - Profile faces (one eye visible)
    - Extreme angles

    Rejects:
    - Random noise detections where landmarks are outside bbox
    - Detections with all landmarks on same pixel

    Args:
        landmarks: Dict with left_eye, right_eye, nose, left_mouth, right_mouth
        bbox: Dict with x, y, width, height

    Returns:
        True if face passes validation, False otherwise
    """
    if not landmarks:
        return False  # No landmarks = not a valid face

    # Get landmark points
    left_eye = landmarks.get("left_eye")
    right_eye = landmarks.get("right_eye")
    nose = landmarks.get("nose")
    left_mouth = landmarks.get("left_mouth")
    right_mouth = landmarks.get("right_mouth")

    # At least 3 landmarks must exist (accommodates profiles)
    existing = [p for p in [left_eye, right_eye, nose, left_mouth, right_mouth] if p]
    if len(existing) < 3:
        return False

    # Get bbox bounds with tolerance (20% padding for edge cases)
    x, y, w, h = bbox["x"], bbox["y"], bbox["width"], bbox["height"]
    tolerance = 0.2
    x_min = x - w * tolerance
    x_max = x + w * (1 + tolerance)
    y_min = y - h * tolerance
    y_max = y + h * (1 + tolerance)

    # Check: Most landmarks should be inside or near the bounding box
    inside_count = 0
    for point in existing:
        px, py = point[0], point[1]
        if x_min <= px <= x_max and y_min <= py <= y_max:
            inside_count += 1

    if inside_count < 3:
        return False  # Too many landmarks outside bbox = likely false positive

    # Check: Landmarks should have some spread (not all on same pixel)
    all_x = [p[0] for p in existing]
    all_y = [p[1] for p in existing]
    x_spread = max(all_x) - min(all_x)
    y_spread = max(all_y) - min(all_y)

    min_spread = min(w, h) * 0.1  # At least 10% of face size
    if x_spread < min_spread and y_spread < min_spread:
        return False  # All landmarks clustered = likely noise

    # Check: Some vertical structure (eye region above mouth region)
    # For profiles, at least nose or one eye should be above mouth
    if nose and (left_mouth or right_mouth):
        mouth_y = left_mouth[1] if left_mouth else right_mouth[1]
        if nose[1] > mouth_y + h * 0.1:  # Nose significantly below mouth = wrong
            return False

    return True


# =============================================================================
# INSIGHTFACE SERVICE
# =============================================================================

class InsightFaceService:
    """
    InsightFace-based face analysis service.
    Provides detection + embedding in a single call.
    """
    
    def __init__(self, model_name: str = 'buffalo_l', det_size: tuple = (640, 640)):
        """
        Initialize InsightFace with specified model pack.
        
        Args:
            model_name: Model pack name. Options:
                - 'buffalo_l' (default): Best accuracy, ~326MB
                - 'buffalo_s': Smaller, faster, ~159MB
                - 'buffalo_m': Medium balance
                - 'antelopev2': Alternative high-quality model
            det_size: Detection input size (width, height)
        """
        self.model_name = model_name
        self.det_size = det_size
        self._app = None
        self._initialized = False
        
    def _ensure_initialized(self):
        """Lazy initialization of InsightFace models."""
        if self._initialized:
            return
            
        try:
            from insightface.app import FaceAnalysis
            
            logger.info(f"Initializing InsightFace with model: {self.model_name}")
            
            # Determine providers based on available hardware
            providers = ['CPUExecutionProvider']
            
            # Check for GPU support
            try:
                import onnxruntime
                available_providers = onnxruntime.get_available_providers()
                if 'CUDAExecutionProvider' in available_providers:
                    providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
                    logger.info("CUDA detected, using GPU acceleration")
            except Exception:
                pass
            
            # Initialize FaceAnalysis
            self._app = FaceAnalysis(
                name=self.model_name,
                providers=providers,
                allowed_modules=['detection', 'recognition', 'genderage']
            )
            
            # Prepare with detection size and balanced threshold
            # det_thresh=0.5 reduces false positives while still catching most faces
            self._app.prepare(ctx_id=0, det_size=self.det_size, det_thresh=0.5)
            
            self._initialized = True
            logger.info(f"InsightFace initialized successfully with {self.model_name}")
            
        except ImportError as e:
            logger.error(f"InsightFace not installed: {e}")
            raise RuntimeError("InsightFace package not installed. Run: pip install insightface")
        except Exception as e:
            logger.error(f"Failed to initialize InsightFace: {e}")
            raise
    
    def set_det_size(self, det_size: int):
        """
        Temporarily change the detection size for higher accuracy.
        Call prepare() again with the new size.

        Args:
            det_size: New detection size (e.g., 800 for 800x800)
        """
        self._ensure_initialized()
        if det_size and det_size != self.det_size[0]:
            logger.info(f"Updating InsightFace det_size from {self.det_size} to ({det_size}, {det_size})")
            self.det_size = (det_size, det_size)
            self._app.prepare(ctx_id=0, det_size=self.det_size, det_thresh=0.5)

    def reset_det_size(self):
        """Reset det_size back to default (640x640)."""
        if self.det_size != (640, 640):
            self.det_size = (640, 640)
            if self._app:
                self._app.prepare(ctx_id=0, det_size=self.det_size, det_thresh=0.5)
                logger.info("Reset InsightFace det_size to default (640, 640)")

    def detect_and_embed(self, image: np.ndarray, det_size: Optional[int] = None) -> list[dict]:
        """
        Detect faces and extract embeddings in a single call.

        Args:
            image: BGR image as numpy array (OpenCV format)
            det_size: Optional detection size override (e.g., 800 for higher accuracy)

        Returns:
            List of face dictionaries with:
            - bbox: {x, y, width, height}
            - confidence: detection score
            - landmarks: 5-point landmarks
            - embedding: 512-dim vector
            - age: estimated age
            - gender: 'M' or 'F'
        """
        self._ensure_initialized()

        # Temporarily update det_size if specified
        original_det_size = self.det_size
        if det_size and det_size != self.det_size[0]:
            self.set_det_size(det_size)

        try:
            # Run face analysis
            faces = self._app.get(image)

            results = []
            rejected_count = 0
            for face in faces:
                # Extract bounding box (x1, y1, x2, y2 format)
                bbox = face.bbox.astype(int)
                x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]

                # Convert landmarks to dict format
                landmarks = None
                if face.kps is not None:
                    kps = face.kps.astype(float).tolist()
                    landmarks = {
                        "left_eye": kps[0],
                        "right_eye": kps[1],
                        "nose": kps[2],
                        "left_mouth": kps[3],
                        "right_mouth": kps[4],
                    }

                # Build bbox dict for validation
                bbox_dict = {
                    "x": int(x1),
                    "y": int(y1),
                    "width": int(x2 - x1),
                    "height": int(y2 - y1),
                }

                # Apply basic landmark validation to filter false positives
                if not validate_face_landmarks_basic(landmarks, bbox_dict):
                    rejected_count += 1
                    logger.debug(f"Rejected face with confidence {face.det_score:.2f} - failed landmark validation")
                    continue

                # Build result
                result = {
                    "bbox": bbox_dict,
                    "confidence": float(face.det_score),
                    "landmarks": landmarks,
                    "embedding": face.embedding.tolist() if face.embedding is not None else None,
                    "age": int(face.age) if hasattr(face, 'age') and face.age is not None else None,
                    "gender": ("M" if face.gender == 1 else "F") if hasattr(face, 'gender') and face.gender is not None else None,
                }

                results.append(result)

            if rejected_count > 0:
                logger.info(f"Landmark validation: {rejected_count} faces rejected, {len(results)} accepted")

            return results
        finally:
            # Reset det_size back to original if changed
            if det_size and original_det_size != self.det_size:
                self.det_size = original_det_size
                self._app.prepare(ctx_id=0, det_size=self.det_size, det_thresh=0.5)
                logger.debug(f"Restored det_size to {original_det_size}")

    def embed_only(self, aligned_face: np.ndarray) -> list[float]:
        """
        Extract embedding from a pre-aligned/cropped face image.
        Useful when detection was done by another detector (YuNet/SCRFD).

        Args:
            aligned_face: Cropped face image (BGR format, any size - will be resized to 112x112)

        Returns:
            512-dimensional embedding vector
        """
        self._ensure_initialized()
        import cv2

        h, w = aligned_face.shape[:2]
        logger.info(f"embed_only: received face image {w}x{h}")

        # Validate input
        if h < 10 or w < 10:
            raise ValueError(f"Face image too small: {w}x{h}")

        # Resize to 112x112 (the expected input size for ArcFace recognition)
        face_112 = cv2.resize(aligned_face, (112, 112))

        # Method 1: Try using the recognition model directly via get_feat
        # The recognition model in InsightFace uses cv2.dnn.blobFromImages internally
        if hasattr(self._app, 'models') and 'recognition' in self._app.models:
            rec_model = self._app.models['recognition']

            # get_feat expects a list of images or single image
            # It handles preprocessing internally (resize to input_size, normalize)
            try:
                embedding = rec_model.get_feat(face_112).flatten()
                logger.info(f"Direct embedding extraction successful via get_feat, dim={len(embedding)}")
                return embedding.tolist()
            except Exception as e:
                logger.warning(f"get_feat failed: {e}, trying alternative method...")

        # Method 2: If recognition model not available, try with padded image for detection
        logger.info("Recognition model not directly accessible, trying padded detection...")

        # Create a larger canvas with the face centered (adds context for detector)
        pad_size = 80  # pixels of padding around face
        canvas_size = 112 + (pad_size * 2)
        canvas = np.zeros((canvas_size, canvas_size, 3), dtype=np.uint8) + 128  # Gray background
        canvas[pad_size:pad_size+112, pad_size:pad_size+112] = face_112

        faces = self._app.get(canvas)

        if len(faces) == 0:
            # Method 3: Try with original image upscaled significantly
            logger.warning("Padded detection failed, trying upscaled original...")
            upscaled = cv2.resize(aligned_face, (320, 320))
            faces = self._app.get(upscaled)

            if len(faces) == 0:
                raise ValueError(f"No face detected in the provided image ({w}x{h}) after multiple attempts")

        logger.info(f"Embedding extracted via detection fallback, found {len(faces)} face(s)")
        return faces[0].embedding.tolist()

    def detect_only(self, image: np.ndarray) -> list[dict]:
        """
        Detect faces without extracting embeddings (faster).

        Args:
            image: BGR image as numpy array

        Returns:
            List of face dictionaries (without embeddings)
        """
        self._ensure_initialized()

        # Run detection only
        faces = self._app.get(image)

        results = []
        rejected_count = 0
        for face in faces:
            bbox = face.bbox.astype(int)
            x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]

            landmarks = None
            if face.kps is not None:
                kps = face.kps.astype(float).tolist()
                landmarks = {
                    "left_eye": kps[0],
                    "right_eye": kps[1],
                    "nose": kps[2],
                    "left_mouth": kps[3],
                    "right_mouth": kps[4],
                }

            bbox_dict = {
                "x": int(x1),
                "y": int(y1),
                "width": int(x2 - x1),
                "height": int(y2 - y1),
            }

            # Apply basic landmark validation to filter false positives
            if not validate_face_landmarks_basic(landmarks, bbox_dict):
                rejected_count += 1
                logger.debug(f"Rejected face with confidence {face.det_score:.2f} - failed landmark validation")
                continue

            results.append({
                "bbox": bbox_dict,
                "confidence": float(face.det_score),
                "landmarks": landmarks,
            })

        if rejected_count > 0:
            logger.info(f"Landmark validation: {rejected_count} faces rejected, {len(results)} accepted")

        return results

    def is_available(self) -> bool:
        """Check if InsightFace is available and can be initialized."""
        try:
            self._ensure_initialized()
            return True
        except Exception:
            return False

    def get_model_info(self) -> dict:
        """Get information about loaded models."""
        if not self._initialized:
            return {"initialized": False, "model_name": self.model_name}

        return {
            "initialized": True,
            "model_name": self.model_name,
            "det_size": self.det_size,
            "embedding_dim": 512,
            "models_loaded": list(self._app.models.keys()) if self._app else [],
        }


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

# Global instance - lazy loaded
_insightface_service: Optional[InsightFaceService] = None

def get_insightface_service(model_name: str = 'buffalo_l') -> InsightFaceService:
    """Get or create InsightFace service singleton."""
    global _insightface_service

    if _insightface_service is None:
        # Check for model override from environment
        model = os.environ.get('INSIGHTFACE_MODEL', model_name)
        _insightface_service = InsightFaceService(model_name=model)

    return _insightface_service

