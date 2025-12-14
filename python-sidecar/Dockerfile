# =============================================================================
# Python Sidecar Dockerfile
# =============================================================================
# Face detection, alignment, and recognition service
# Supports: YuNet, SCRFD, and InsightFace (buffalo_l model)
# =============================================================================

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV and InsightFace
# g++ and build-essential are required to compile InsightFace Cython extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    wget \
    build-essential \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create models directory
RUN mkdir -p /app/models

# Create InsightFace model cache directory
# InsightFace stores models in ~/.insightface/models
RUN mkdir -p /root/.insightface/models

# Download YuNet model (OpenCV Zoo - reliable source)
RUN wget -q --show-progress -O /app/models/face_detection_yunet_2023mar.onnx \
    "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx" \
    || echo "YuNet download failed - will retry at runtime"

# Note: SCRFD model will be downloaded at runtime if needed
# Note: InsightFace models (buffalo_l ~326MB) are downloaded on first use
# They are cached in /root/.insightface/models for subsequent runs

# Copy application code
COPY . .

# Pre-download InsightFace model during build (optional, makes first startup faster)
# Uncomment the following to pre-download the buffalo_l model (~326MB)
# RUN python -c "from insightface.app import FaceAnalysis; app = FaceAnalysis(name='buffalo_l'); app.prepare(ctx_id=-1)"

# Expose port
EXPOSE 4002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:4002/health')" || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "4002"]

