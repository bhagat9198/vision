"""
=============================================================================
Python Sidecar - Face Detection & Alignment Service
=============================================================================
FastAPI service providing:
- YuNet face detection (fast, good for frontal faces)
- SCRFD face detection (robust, handles difficult angles)
- Face alignment using 5-point landmarks
=============================================================================
"""

import base64
import io
import os
import time
import urllib.request
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image
from pydantic import BaseModel

from detectors import YuNetDetector, SCRFDDetector
from alignment import align_face

# =============================================================================
# MODEL PATHS & URLS
# =============================================================================

MODELS_DIR = "/app/models"
YUNET_MODEL_PATH = f"{MODELS_DIR}/face_detection_yunet_2023mar.onnx"
SCRFD_MODEL_PATH = f"{MODELS_DIR}/scrfd_10g_bnkps.onnx"

# Model download URLs (fallback sources)
YUNET_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
SCRFD_URL = "https://drive.google.com/uc?export=download&id=1g7e7RxQqtg8sEvJw9RHJy7pfqX4Q_ffH"

# =============================================================================
# MODEL DOWNLOAD HELPER
# =============================================================================

def ensure_model_exists(model_path: str, url: str, name: str) -> bool:
    """Download model if it doesn't exist. Returns True if available."""
    if os.path.exists(model_path) and os.path.getsize(model_path) > 1000:
        return True

    print(f"Downloading {name} model...")
    os.makedirs(os.path.dirname(model_path), exist_ok=True)

    try:
        urllib.request.urlretrieve(url, model_path)
        print(f"{name} model downloaded successfully")
        return True
    except Exception as e:
        print(f"Failed to download {name}: {e}")
        return False

# =============================================================================
# APP SETUP
# =============================================================================

app = FastAPI(
    title="Face Detection Sidecar",
    description="YuNet and SCRFD face detection with alignment",
    version="1.0.0",
)

# Initialize detectors (lazy loading)
yunet_detector: Optional[YuNetDetector] = None
scrfd_detector: Optional[SCRFDDetector] = None
scrfd_available: bool = True  # Track if SCRFD is available


def get_yunet() -> YuNetDetector:
    """Get or initialize YuNet detector."""
    global yunet_detector
    if yunet_detector is None:
        if not ensure_model_exists(YUNET_MODEL_PATH, YUNET_URL, "YuNet"):
            raise RuntimeError("YuNet model not available")
        yunet_detector = YuNetDetector(YUNET_MODEL_PATH)
    return yunet_detector


def get_scrfd() -> SCRFDDetector:
    """Get or initialize SCRFD detector."""
    global scrfd_detector, scrfd_available
    if scrfd_detector is None:
        if not ensure_model_exists(SCRFD_MODEL_PATH, SCRFD_URL, "SCRFD"):
            scrfd_available = False
            raise RuntimeError("SCRFD model not available")
        scrfd_detector = SCRFDDetector(SCRFD_MODEL_PATH)
    return scrfd_detector


# =============================================================================
# MODELS
# =============================================================================

class FaceResult(BaseModel):
    """Single face detection result."""
    bbox: dict  # x, y, width, height
    confidence: float
    landmarks: Optional[dict] = None
    yaw_angle: Optional[float] = None


class DetectionResponse(BaseModel):
    """Detection endpoint response."""
    success: bool
    detector: str
    faces: list[FaceResult]
    processing_time_ms: float


class AlignResponse(BaseModel):
    """Alignment endpoint response."""
    success: bool
    aligned_image: str  # Base64 encoded
    processing_time_ms: float


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

async def read_image(file: UploadFile) -> np.ndarray:
    """Read uploaded image into numpy array."""
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file")
    return img


def estimate_yaw_angle(landmarks: dict) -> float:
    """
    Estimate face yaw angle from landmarks.
    Returns angle in degrees (-90 to 90).
    """
    left_eye = np.array(landmarks["left_eye"])
    right_eye = np.array(landmarks["right_eye"])
    nose = np.array(landmarks["nose"])
    
    # Calculate eye center
    eye_center = (left_eye + right_eye) / 2
    
    # Calculate horizontal distances
    left_dist = np.linalg.norm(nose - left_eye)
    right_dist = np.linalg.norm(nose - right_eye)
    
    # Estimate yaw based on asymmetry
    if left_dist + right_dist > 0:
        ratio = (right_dist - left_dist) / (left_dist + right_dist)
        yaw = ratio * 90  # Scale to degrees
        return float(np.clip(yaw, -90, 90))
    
    return 0.0


# =============================================================================
# ENDPOINTS
# =============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "python-sidecar",
        "detectors": {
            "yunet": os.path.exists(YUNET_MODEL_PATH),
            "scrfd": scrfd_available and os.path.exists(SCRFD_MODEL_PATH),
        }
    }


@app.post("/detect/yunet", response_model=DetectionResponse)
async def detect_yunet(image: UploadFile = File(...)):
    """Detect faces using YuNet detector."""
    start_time = time.time()
    
    img = await read_image(image)
    detector = get_yunet()
    
    faces = detector.detect(img)
    
    results = []
    for face in faces:
        landmarks = face.get("landmarks")
        yaw = estimate_yaw_angle(landmarks) if landmarks else None
        
        results.append(FaceResult(
            bbox=face["bbox"],
            confidence=face["confidence"],
            landmarks=landmarks,
            yaw_angle=yaw,
        ))
    
    return DetectionResponse(
        success=True,
        detector="yunet",
        faces=results,
        processing_time_ms=(time.time() - start_time) * 1000,
    )


@app.post("/detect/scrfd", response_model=DetectionResponse)
async def detect_scrfd(image: UploadFile = File(...)):
    """Detect faces using SCRFD detector."""
    start_time = time.time()

    # Check if SCRFD is available
    if not scrfd_available:
        raise HTTPException(
            status_code=503,
            detail="SCRFD model not available. Use /detect/yunet instead."
        )

    try:
        img = await read_image(image)
        detector = get_scrfd()

        faces = detector.detect(img)

        results = []
        for face in faces:
            landmarks = face.get("landmarks")
            yaw = estimate_yaw_angle(landmarks) if landmarks else None

            results.append(FaceResult(
                bbox=face["bbox"],
                confidence=face["confidence"],
                landmarks=landmarks,
                yaw_angle=yaw,
            ))

        return DetectionResponse(
            success=True,
            detector="scrfd",
            faces=results,
            processing_time_ms=(time.time() - start_time) * 1000,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/align", response_model=AlignResponse)
async def align_face_endpoint(
    image: UploadFile = File(...),
    landmarks: str = Form(...),
):
    """
    Align a face image using 5-point landmarks.

    Args:
        image: Face image file
        landmarks: JSON string with landmark coordinates
    """
    import json

    start_time = time.time()

    img = await read_image(image)

    try:
        lm = json.loads(landmarks)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid landmarks JSON")

    # Convert landmarks to numpy array
    landmarks_array = np.array([
        lm["left_eye"],
        lm["right_eye"],
        lm["nose"],
        lm["left_mouth"],
        lm["right_mouth"],
    ], dtype=np.float32)

    # Align face
    aligned = align_face(img, landmarks_array)

    # Convert to base64
    _, buffer = cv2.imencode(".jpg", aligned, [cv2.IMWRITE_JPEG_QUALITY, 95])
    base64_image = base64.b64encode(buffer).decode("utf-8")

    return AlignResponse(
        success=True,
        aligned_image=base64_image,
        processing_time_ms=(time.time() - start_time) * 1000,
    )


# =============================================================================
# STARTUP
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Pre-load models on startup."""
    print("Loading face detection models...")
    try:
        get_yunet()
        print("YuNet loaded successfully")
    except Exception as e:
        print(f"Failed to load YuNet: {e}")

    try:
        get_scrfd()
        print("SCRFD loaded successfully")
    except Exception as e:
        print(f"Failed to load SCRFD: {e}")

    print("Python sidecar ready!")

