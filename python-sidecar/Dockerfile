# =============================================================================
# Python Sidecar Dockerfile
# =============================================================================
# Face detection and alignment service using YuNet and SCRFD
# =============================================================================

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create models directory
RUN mkdir -p /app/models

# Download YuNet model (OpenCV Zoo - reliable source)
RUN wget -q --show-progress -O /app/models/face_detection_yunet_2023mar.onnx \
    "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx" \
    || echo "YuNet download failed - will retry at runtime"

# Note: SCRFD model will be downloaded at runtime if needed
# This avoids build failures due to unreliable external URLs

# Copy application code
COPY . .

# Expose port
EXPOSE 4002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:4002/health')" || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "4002"]

