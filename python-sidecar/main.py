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
import logging
from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Request
from fastapi.responses import JSONResponse
from PIL import Image
from pydantic import BaseModel

from detectors import YuNetDetector, SCRFDDetector
from alignment import align_face
from insightface_service import get_insightface_service, InsightFaceService

# =============================================================================
# LOGGING SETUP
# =============================================================================
# =============================================================================
# LOGGING SETUP
# =============================================================================
LOGS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

class IsoFormatter(logging.Formatter):
    """Custom formatter to match Node.js log format: [ISO_TIMESTAMP] [LEVEL] MESSAGE"""
    def formatTime(self, record, datefmt=None):
        return time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(record.created))

    def format(self, record):
        record.asctime = self.formatTime(record)
        return super().format(record)

# Create custom logger
logger = logging.getLogger("python-sidecar")
logger.setLevel(logging.INFO)
logger.propagate = False  # Prevent double logging in Uvicorn

# Formatter
formatter = IsoFormatter("[%(asctime)s] [%(levelname)s] %(message)s")

# 1. Console Handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

# 2. File Handler (Combined)
file_handler = logging.FileHandler(os.path.join(LOGS_DIR, "combined.log"))
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

# 3. File Handler (Error)
error_handler = logging.FileHandler(os.path.join(LOGS_DIR, "error.log"))
error_handler.setLevel(logging.ERROR)
error_handler.setFormatter(formatter)
logger.addHandler(error_handler)

# =============================================================================
# MODEL PATHS & URLS
# =============================================================================

# Determine models directory (handle local vs docker)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
if os.path.exists("/app/models"):
    MODELS_DIR = "/app/models"
YUNET_MODEL_PATH = f"{MODELS_DIR}/face_detection_yunet_2023mar.onnx"
SCRFD_MODEL_PATH = f"{MODELS_DIR}/scrfd_10g_bnkps.onnx"

# Model download URLs (fallback sources)
YUNET_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
SCRFD_URL = "https://huggingface.co/DIAMONIK7777/antelopev2/resolve/main/scrfd_10g_bnkps.onnx"

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

# Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log incoming requests and outgoing responses."""
    start_time = time.time()
    
    # Log Incoming
    logger.info(f"Incoming Request: {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        
        # Log Response
        logger.info(f"Response Sent: {response.status_code} {request.method} {request.url.path} - {process_time:.2f}ms")
        return response
    except Exception as e:
        process_time = (time.time() - start_time) * 1000
        logger.error(f"Request failed: {request.method} {request.url.path} - {e} - {process_time:.2f}ms")
        raise e

# Initialize detectors (lazy loading)
yunet_detector: Optional[YuNetDetector] = None
scrfd_detector: Optional[SCRFDDetector] = None
scrfd_available: bool = True  # Track if SCRFD is available
insightface_service: Optional[InsightFaceService] = None
insightface_available: bool = True  # Track if InsightFace is available


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
        # Lower threshold for better recall on difficult faces
        scrfd_detector = SCRFDDetector(SCRFD_MODEL_PATH, conf_threshold=0.1)
    return scrfd_detector


def get_insightface() -> InsightFaceService:
    """Get or initialize InsightFace service."""
    global insightface_service, insightface_available
    if insightface_service is None:
        try:
            insightface_service = get_insightface_service()
            # Force initialization to check if models load correctly
            insightface_service._ensure_initialized()
        except Exception as e:
            insightface_available = False
            raise RuntimeError(f"InsightFace not available: {e}")
    return insightface_service


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


class InsightFaceResult(BaseModel):
    """InsightFace detection result with embedding."""
    bbox: dict  # x, y, width, height
    confidence: float
    landmarks: Optional[dict] = None
    embedding: Optional[list[float]] = None  # 512-dim vector
    age: Optional[int] = None
    gender: Optional[str] = None  # 'M' or 'F'


class InsightFaceResponse(BaseModel):
    """InsightFace endpoint response."""
    success: bool
    detector: str = "insightface"
    faces: list[InsightFaceResult]
    processing_time_ms: float
    embedding_dimension: int = 512


class EmbedResponse(BaseModel):
    """Embedding extraction response."""
    success: bool
    embedding: list[float]
    embedding_dimension: int = 512
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
            "insightface": insightface_available,
        },
        "capabilities": {
            "detection": True,
            "alignment": True,
            "embedding": insightface_available,  # Only with InsightFace
            "age_gender": insightface_available,  # Only with InsightFace
        }
    }


@app.post("/detect/yunet", response_model=DetectionResponse)
async def detect_yunet(image: UploadFile = File(...)):
    """Detect faces using YuNet detector."""
    start_time = time.time()
    logger.info("Received YuNet detection request")
    
    try:
        img = await read_image(image)
        detector = get_yunet()
        
        faces = detector.detect(img)
        logger.info(f"YuNet detected {len(faces)} faces in {(time.time() - start_time)*1000:.2f}ms")
        
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
    except Exception as e:
        logger.error(f"YuNet detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/detect/scrfd", response_model=DetectionResponse)
async def detect_scrfd(image: UploadFile = File(...)):
    """Detect faces using SCRFD detector."""
    start_time = time.time()
    logger.info("Received SCRFD detection request")

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
        logger.info(f"SCRFD detected {len(faces)} faces in {(time.time() - start_time)*1000:.2f}ms")

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
    logger.info("Received Face Alignment request")

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
    
    logger.info(f"Face alignment completed in {(time.time() - start_time)*1000:.2f}ms")

    return AlignResponse(
        success=True,
        aligned_image=base64_image,
        processing_time_ms=(time.time() - start_time) * 1000,
    )


# =============================================================================
# INSIGHTFACE ENDPOINTS
# =============================================================================

@app.post("/insightface/detect-and-embed", response_model=InsightFaceResponse)
async def insightface_detect_and_embed(
    image: UploadFile = File(...),
    det_size: Optional[int] = None
):
    """
    All-in-one face processing using InsightFace.
    Detects faces and extracts 512-dim embeddings in a single call.
    Also returns age and gender estimates.

    Args:
        image: Image file to process
        det_size: Optional detection size override (e.g., 800 for 800x800, higher = more accurate but slower)
    """
    start_time = time.time()
    det_size_info = f" with det_size={det_size}" if det_size else ""
    logger.info(f"Received InsightFace detect-and-embed request{det_size_info}")

    if not insightface_available:
        raise HTTPException(
            status_code=503,
            detail="InsightFace not available. Check server logs."
        )

    try:
        img = await read_image(image)
        service = get_insightface()

        # Pass optional det_size for higher accuracy detection
        faces_data = service.detect_and_embed(img, det_size=det_size)
        logger.info(f"InsightFace detected {len(faces_data)} faces in {(time.time() - start_time)*1000:.2f}ms{det_size_info}")

        faces = [
            InsightFaceResult(
                bbox=face["bbox"],
                confidence=face["confidence"],
                landmarks=face["landmarks"],
                embedding=face["embedding"],
                age=face["age"],
                gender=face["gender"],
            )
            for face in faces_data
        ]

        return InsightFaceResponse(
            success=True,
            faces=faces,
            processing_time_ms=(time.time() - start_time) * 1000,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"InsightFace detect-and-embed failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/insightface/embed", response_model=EmbedResponse)
async def insightface_embed(image: UploadFile = File(...)):
    """
    Extract embedding from a cropped face image.
    Use this when detection was done by another detector.
    """
    start_time = time.time()
    logger.info("Received InsightFace embed request")

    if not insightface_available:
        raise HTTPException(
            status_code=503,
            detail="InsightFace not available. Check server logs."
        )

    try:
        img = await read_image(image)
        logger.info(f"InsightFace embed: received image shape {img.shape}")
        service = get_insightface()

        embedding = service.embed_only(img)
        logger.info(f"InsightFace embedding extracted in {(time.time() - start_time)*1000:.2f}ms, dim={len(embedding)}")

        return EmbedResponse(
            success=True,
            embedding=embedding,
            processing_time_ms=(time.time() - start_time) * 1000,
        )
    except ValueError as e:
        logger.warning(f"InsightFace embed ValueError: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"InsightFace embed RuntimeError: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"InsightFace embedding failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/insightface/detect", response_model=DetectionResponse)
async def insightface_detect(image: UploadFile = File(...)):
    """
    Detect faces using InsightFace (without embeddings).
    Faster than detect-and-embed when you only need bounding boxes.
    """
    start_time = time.time()
    logger.info("Received InsightFace detect request")

    if not insightface_available:
        raise HTTPException(
            status_code=503,
            detail="InsightFace not available. Check server logs."
        )

    try:
        img = await read_image(image)
        service = get_insightface()

        faces_data = service.detect_only(img)
        logger.info(f"InsightFace detected {len(faces_data)} faces in {(time.time() - start_time)*1000:.2f}ms")

        results = []
        for face in faces_data:
            results.append(FaceResult(
                bbox=face["bbox"],
                confidence=face["confidence"],
                landmarks=face["landmarks"],
            ))

        return DetectionResponse(
            success=True,
            detector="insightface",
            faces=results,
            processing_time_ms=(time.time() - start_time) * 1000,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"InsightFace detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/insightface/health")
async def insightface_health():
    """Check InsightFace availability and model info."""
    global insightface_available

    try:
        service = get_insightface()
        info = service.get_model_info()
        return {
            "status": "available",
            "model_info": info,
        }
    except Exception as e:
        insightface_available = False
        return {
            "status": "unavailable",
            "error": str(e),
        }


# =============================================================================
# STARTUP
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Pre-load models on startup."""
    global insightface_available

    logger.info("Starting Python Sidecar Service...")
    logger.info(f"Logging initialized in: {LOGS_DIR}")
    logger.info(f"Models directory: {MODELS_DIR}")

    try:
        get_yunet()
        logger.info("YuNet loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load YuNet: {e}")

    try:
        get_scrfd()
        logger.info("SCRFD loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load SCRFD: {e}")

    # Try to load InsightFace (optional - may not be installed)
    try:
        get_insightface()
        logger.info("InsightFace loaded successfully (embedding capability enabled)")
    except Exception as e:
        insightface_available = False
        logger.warning(f"InsightFace not available: {e}")
        logger.info("Continuing without InsightFace embedding capability")

    logger.info("Python sidecar ready!")
    logger.info(f"Capabilities: Detection=True, Alignment=True, Embedding={insightface_available}")

