# Face Detection & Indexing Pipeline - Technical Documentation

> **Last Updated:** 2024-12-14  
> **Source of Truth:** This document describes the complete flow from photographer upload to face indexing.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Upload Flow (api-node-backend)](#2-upload-flow-api-node-backend)
3. [Image Processing Queue](#3-image-processing-queue)
4. [Face Analysis Backend (img-analyse-backend)](#4-face-analysis-backend-img-analyse-backend)
5. [Python Sidecar Service](#5-python-sidecar-service)
6. [Qdrant Vector Database](#6-qdrant-vector-database)
7. [Video Processing Flow](#7-video-processing-flow)
8. [Search Flow](#8-search-flow)
9. [Organization Settings](#9-organization-settings)
10. [Environment Variables](#10-environment-variables)

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PHOTOGRAPHER PORTAL                                 │
│                            (next-frontend:3000)                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼ Chunked Upload (5MB chunks)
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API NODE BACKEND                                    │
│                            (api-node-backend:4000)                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ Upload Service  │→ │ Image Processing│→ │ Face Analysis Client            │  │
│  │ (Chunk Merge)   │  │ Queue (BullMQ)  │  │ (HTTP → img-analyse-backend)    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼ POST /api/v1/index/photo
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           IMG ANALYSE BACKEND                                    │
│                         (img-analyse-backend:4001)                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ Index Controller│→ │ Face Indexing   │→ │ Face Detection Service          │  │
│  │ (Queue Job)     │  │ Queue (BullMQ)  │  │ (Orchestrator)                  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────────┘  │
│                                                        │                         │
│                                                        ▼                         │
│                              ┌─────────────────────────────────────────────┐    │
│                              │ Provider Selection                          │    │
│                              │ ├─ INSIGHTFACE → Python Sidecar             │    │
│                              │ └─ COMPREFACE → External CompreFace         │    │
│                              └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼ POST /insightface/detect-and-embed
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            PYTHON SIDECAR                                        │
│                          (python-sidecar:4002)                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ InsightFace     │  │ SCRFD Detector  │  │ YuNet Detector                  │  │
│  │ (buffalo_l)     │  │ (Fallback #1)   │  │ (Fallback #2)                   │  │
│  │ det_thresh=0.5  │  │ conf_thresh=0.1 │  │ conf_thresh=0.5                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────────┘  │
│                              │                                                   │
│                              ▼ Landmark Validation                               │
│                    ┌─────────────────────────────────────┐                      │
│                    │ validate_face_landmarks_basic()     │                      │
│                    │ - At least 3 landmarks exist        │                      │
│                    │ - Landmarks inside bbox (20% tol)   │                      │
│                    │ - Minimum spread (10% of face)      │                      │
│                    │ - Vertical structure check          │                      │
│                    └─────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼ 512-dim ArcFace Embeddings
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              QDRANT VECTOR DB                                    │
│                              (qdrant:6333)                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │ Collection: org_{orgSlug}_event_{eventSlug}_faces                       │    │
│  │ Vector Dimension: 512                                                   │    │
│  │ Distance Metric: Cosine                                                 │    │
│  │ HNSW Config: m=16, ef_construction=100                                  │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Upload Flow (api-node-backend)

### 2.1 Chunked Upload System

**File:** `api-node-backend/src/modules/uploads/upload.service.ts`

| Config | Value | Description |
|--------|-------|-------------|
| `CHUNK_SIZE_MB` | 5 | Each chunk is 5MB |
| `TEMP_UPLOAD_DIR` | `./uploads/temp` | Temporary storage for chunks |
| `sessionExpiryHours` | 24 | Upload session expires after 24 hours |

**Flow:**
1. **Init Session** (`POST /api/v1/uploads/init`)
   - Creates `UploadSession` record in PostgreSQL
   - Creates `UploadFile` records for each file
   - Returns `sessionId`, `chunkSize`, `fileIds`

2. **Upload Chunks** (`POST /api/v1/uploads/chunk`)
   - Chunks saved to `./uploads/temp/{sessionId}/{fileId}/chunk_{index}`
   - Progress tracked in `UploadFile.uploadedChunks`

3. **Complete File** (automatic when all chunks received)
   - Triggers `addImageProcessingJob()` to BullMQ queue

---

## 3. Image Processing Queue

**File:** `api-node-backend/src/queues/image-processing.queue.ts`

### 3.1 Queue Configuration

```typescript
Queue: 'image-processing'
Concurrency: 5
Attempts: 3
Backoff: exponential, 5000ms delay
```

### 3.2 Job Data Structure

```typescript
interface ImageProcessingJobData {
  sessionId: string;
  fileId: string;
  photographerId: string;
  eventId: string;
  albumId: string;
  originalName: string;
  mimeType: string;
}
```

### 3.3 Processing Steps

**File:** `api-node-backend/src/services/image-processor.service.ts`

1. **Merge Chunks** → Single file from `./uploads/temp/{sessionId}/{fileId}/`
2. **Convert HEIC** → JPEG (if needed)
3. **Get Metadata** → Width, height, aspect ratio
4. **Generate Thumbnail** → Configurable size
5. **Apply Watermark** → If enabled (event or photographer setting)
6. **Upload to Storage** → Local or S3
7. **Create Photo Record** → PostgreSQL
8. **Trigger Face Indexing** → `faceAnalysisClient.indexPhoto()`

---

## 4. Face Analysis Backend (img-analyse-backend)

### 4.1 API Endpoints

**File:** `img-analyse-backend/src/controllers/index.controller.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/index/photo` | POST | Queue photo for face indexing |
| `/api/v1/index/photo/:photoId` | DELETE | Delete faces for a photo |
| `/api/v1/index/photo/:photoId/faces` | GET | Get face bboxes for a photo |
| `/api/v1/index/photo/:photoId/reindex` | POST | Re-index with optional high accuracy |
| `/api/v1/index/video` | POST | Queue video for processing |
| `/api/v1/index/event/:eventId` | DELETE | Delete all faces for event |
| `/api/v1/index/event/:eventId/stats` | GET | Get indexing statistics |

### 4.2 Index Photo Request

```typescript
interface IndexPhotoRequest {
  photoId: string;      // Required
  eventId: string;      // Required
  eventSlug?: string;   // For Qdrant collection naming
  imageUrl?: string;    // If imageSourceMode = 'URL'
  imagePath?: string;   // If imageSourceMode = 'SHARED_STORAGE'
}
```

### 4.3 Queue-Based Processing

**File:** `img-analyse-backend/src/queues/face-indexing.queue.ts`

```typescript
Queue: 'face-indexing'
Concurrency: 2  // Reduced to prevent OOM
Attempts: 3
Backoff: exponential, 1000ms delay
```

**Job Flow:**
1. Update status to `PROCESSING`
2. Fetch image (URL or file path)
3. Call `faceDetectionService.detectAndEmbed()`
4. Index faces to Qdrant via `qdrantService.indexFaces()`
5. Update status to `COMPLETED` or `FAILED`

---

## 5. Python Sidecar Service

### 5.1 Service Overview

**File:** `python-sidecar/main.py`

| Endpoint | Description |
|----------|-------------|
| `/health` | Health check with detector availability |
| `/detect/yunet` | YuNet face detection |
| `/detect/scrfd` | SCRFD face detection |
| `/align` | Face alignment using 5-point landmarks |
| `/insightface/detect-and-embed` | Detection + 512-dim embedding |
| `/insightface/embed` | Embedding from cropped face |
| `/insightface/detect` | Detection only (no embedding) |
| `/insightface/health` | InsightFace model info |

### 5.2 InsightFace Configuration

**File:** `python-sidecar/insightface_service.py`

| Config | Value | Description |
|--------|-------|-------------|
| `model_name` | `buffalo_l` | Best accuracy model (~326MB) |
| `det_size` | `(640, 640)` | Default detection size |
| `det_thresh` | `0.5` | Detection confidence threshold |
| High Accuracy `det_size` | `(800, 800)` | For re-indexing |

### 5.3 Landmark Validation

**Function:** `validate_face_landmarks_basic()`

Filters false positives while allowing profile/side-view faces:

```python
# Validation Checks:
1. At least 3 of 5 landmarks must exist
2. At least 3 landmarks inside bbox (20% tolerance)
3. Landmarks must have spread (min 10% of face size)
4. Vertical structure: nose not below mouth
```

**5-Point Landmarks:**
- `left_eye` [x, y]
- `right_eye` [x, y]
- `nose` [x, y]
- `left_mouth` [x, y]
- `right_mouth` [x, y]

### 5.4 Fallback Detectors

**File:** `python-sidecar/detectors.py`

| Detector | Model | Threshold | Use Case |
|----------|-------|-----------|----------|
| SCRFD | `scrfd_10g_bnkps.onnx` | 0.1 | Fallback #1, robust |
| YuNet | `face_detection_yunet_2023mar.onnx` | 0.5 | Fallback #2, fast |

---

## 6. Qdrant Vector Database

### 6.1 Collection Naming

**File:** `img-analyse-backend/src/services/qdrant.service.ts`

```
Format: org_{orgSlug}_event_{eventSlug}_faces
Example: org_acme_photos_event_wedding_2024_faces
```

### 6.2 Vector Configuration

| Config | Value | Description |
|--------|-------|-------------|
| `VECTOR_DIMENSION` | 512 | ArcFace embedding size |
| `DISTANCE_METRIC` | Cosine | Similarity metric |
| `HNSW m` | 16 | Graph connections per node |
| `HNSW ef_construction` | 100 | Build-time search depth |
| `indexing_threshold` | 1000 | Start indexing after 1000 vectors |

### 6.3 Face Point Payload

```typescript
interface QdrantFacePayload {
  photoId: string;
  eventId: string;
  faceIndex: number;
  bbox: { x, y, width, height };
  confidence: number;
  detectorSource: string;  // 'insightface', 'compreface', 'scrfd', 'yunet'
  age?: number;
  gender?: 'M' | 'F';
  pose?: { yaw, pitch, roll };
}
```

---

## 7. Video Processing Flow

### 7.1 Video Queue

**File:** `img-analyse-backend/src/queues/video-processing.queue.ts`

```typescript
Queue: 'video-processing'
Concurrency: 1  // Videos are resource-intensive
```

### 7.2 Processing Steps

1. **Get Metadata** → Duration, resolution, fps
2. **Extract Frames** → 1 frame per second (configurable)
3. **Create Frame Records** → `EventImageStatus` with `sourceVideoId`
4. **Copy to Permanent Storage** → `frames/{videoId}/{photoId}.jpg`
5. **Queue Each Frame** → Add to `face-indexing` queue

### 7.3 Frame Storage Path

```
{sharedStoragePath}/frames/{videoId}/{photoId}.jpg
```

---

## 8. Search Flow

### 8.1 Search Endpoint

**File:** `img-analyse-backend/src/controllers/search.controller.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/search` | POST | Search with selfie image |
| `/api/v1/search/cached` | POST | Search with cached embedding |
| `/api/v1/search/session/:id` | DELETE | End search session |

### 8.2 Search Process

1. **Upload Selfie** → Multipart form data
2. **Detect Face** → Python sidecar `/insightface/detect-and-embed`
3. **Extract Embedding** → 512-dim vector
4. **Cache Embedding** → Redis with TTL (default 1800s)
5. **Vector Search** → Qdrant similarity search
6. **Return Matches** → PhotoIds with similarity scores

### 8.3 Search Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `topK` | 100 | Max results to return |
| `minSimilarity` | 0.6 | Minimum cosine similarity |

---

## 9. Organization Settings

### 9.1 Settings Schema

**File:** `img-analyse-backend/src/modules/org/org.types.ts`

```typescript
interface OrgSettings {
  // Identity
  orgId: string;
  name: string;
  slug: string;
  isActive: boolean;

  // Provider Selection
  faceRecognitionProvider: 'COMPREFACE' | 'INSIGHTFACE';
  insightfaceModel: string | null;  // 'buffalo_l', 'buffalo_s', 'antelopev2'

  // CompreFace (if provider = COMPREFACE)
  comprefaceUrl: string | null;
  comprefaceRecognitionApiKey: string | null;
  comprefaceDetectionApiKey: string | null;

  // Detection Mode
  faceDetectionMode: 'RECOGNITION_ONLY' | 'DETECTION_THEN_RECOGNITION';

  // Image Source
  imageSourceMode: 'URL' | 'MULTIPART' | 'SHARED_STORAGE';
  sharedStoragePath: string | null;

  // Quality Filtering
  minConfidence: number;      // Default: 0.7
  minSizePx: number;          // Default: 60
  skipExtremeAngles: boolean; // Default: true

  // Search
  searchDefaultTopK: number;       // Default: 100
  searchMinSimilarity: number;     // Default: 0.6
  embeddingCacheTtlSeconds: number; // Default: 1800

  // Python Sidecar
  pythonSidecarUrl: string | null;
  enableFallbackDetection: boolean;
  enableAlignment: boolean;
}
```

### 9.2 Quality Filtering

**File:** `img-analyse-backend/src/services/face-quality.service.ts`

Faces are filtered based on:
- **Confidence** < `minConfidence` → Rejected
- **Size** < `minSizePx` → Rejected
- **Extreme Angles** (yaw > 60°) → Rejected if `skipExtremeAngles=true`

---

## 10. Environment Variables

### 10.1 img-analyse-backend

**File:** `img-analyse-backend/src/config/env.ts`

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Environment mode |
| `PORT` | 4001 | Server port |
| `DATABASE_URL` | postgresql://... | PostgreSQL connection |
| `MASTER_API_KEY` | master-key-change-me | Admin API key |
| `QDRANT_URL` | http://localhost:6333 | Qdrant server |
| `QDRANT_API_KEY` | (empty) | Qdrant auth key |
| `REDIS_HOST` | localhost | Redis host |
| `REDIS_PORT` | 6379 | Redis port |
| `REDIS_PASSWORD` | (empty) | Redis password |
| `COMPREFACE_URL` | http://localhost:8000 | CompreFace server |
| `COMPREFACE_RECOGNITION_API_KEY` | (empty) | CompreFace recognition key |
| `COMPREFACE_DETECTION_API_KEY` | (empty) | CompreFace detection key |
| `PYTHON_SIDECAR_URL` | http://localhost:4002 | Python sidecar |
| `FACE_MIN_SIZE_PX` | 60 | Minimum face size |
| `FACE_MIN_CONFIDENCE` | 0.7 | Minimum confidence |
| `FACE_SKIP_EXTREME_ANGLES` | true | Skip extreme angles |
| `FACE_EMBEDDING_DIMENSION` | 512 | Embedding vector size |
| `SEARCH_DEFAULT_TOP_K` | 100 | Default search results |
| `SEARCH_MIN_SIMILARITY` | 0.6 | Minimum similarity |
| `EMBEDDING_CACHE_TTL_SECONDS` | 1800 | Cache TTL (30 min) |
| `LOG_LEVEL` | info | Logging level |

### 10.2 Python Sidecar

**File:** `python-sidecar/main.py`

| Config | Value | Description |
|--------|-------|-------------|
| `MODELS_DIR` | `./models` or `/app/models` | Model storage |
| `YUNET_MODEL_PATH` | `{MODELS_DIR}/face_detection_yunet_2023mar.onnx` | YuNet model |
| `SCRFD_MODEL_PATH` | `{MODELS_DIR}/scrfd_10g_bnkps.onnx` | SCRFD model |

---

## 11. Detection Pipeline Details

### 11.1 Face Detection Service

**File:** `img-analyse-backend/src/services/face-detection.service.ts`

**Pre-processing:**
- Images > 2500px are resized to prevent OOM
- Scale factor saved to map coordinates back

**Provider Routing:**
```
if (provider === 'INSIGHTFACE'):
    → pythonSidecarService.detectAndEmbed()
else (COMPREFACE):
    if (mode === 'RECOGNITION_ONLY'):
        → compreFaceService.recognize()
    else:
        → executeDetectionPipeline() (Detect → Crop → Recognize)
```

### 11.2 InsightFace Detection Flow

**File:** `python-sidecar/insightface_service.py`

```python
def detect_and_embed(image, det_size=None):
    1. Prepare detector with det_thresh=0.5
    2. Run detection → get faces with landmarks
    3. For each face:
       a. Validate landmarks (validate_face_landmarks_basic)
       b. Extract 512-dim ArcFace embedding
       c. Get age/gender estimates
    4. Return valid faces with embeddings
```

### 11.3 Fallback Detection

When primary detection finds no faces:
1. Try SCRFD (conf_threshold=0.1)
2. If still no faces, try YuNet (conf_threshold=0.5)
3. For fallback detections, get embeddings via `/insightface/embed`

---

## 12. Data Flow Summary

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. UPLOAD                                                                     │
│    Photographer → Chunked Upload → Merge → Image Processing Queue            │
└──────────────────────────────────────────────────────────────────────────────┘
                                       ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ 2. PROCESS                                                                    │
│    Convert HEIC → Thumbnail → Watermark → Storage → Create Photo Record      │
└──────────────────────────────────────────────────────────────────────────────┘
                                       ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ 3. INDEX REQUEST                                                              │
│    api-node-backend → POST /api/v1/index/photo → img-analyse-backend         │
└──────────────────────────────────────────────────────────────────────────────┘
                                       ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ 4. QUEUE                                                                      │
│    Index Controller → Face Indexing Queue (BullMQ) → Worker                  │
└──────────────────────────────────────────────────────────────────────────────┘
                                       ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ 5. DETECT                                                                     │
│    Face Detection Service → Python Sidecar → InsightFace (det_thresh=0.5)    │
│    → Landmark Validation → 512-dim Embedding                                 │
└──────────────────────────────────────────────────────────────────────────────┘
                                       ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ 6. STORE                                                                      │
│    Qdrant Service → Collection: org_{slug}_event_{slug}_faces                │
│    → Vector + Payload (photoId, bbox, confidence, age, gender)               │
└──────────────────────────────────────────────────────────────────────────────┘
                                       ↓
┌──────────────────────────────────────────────────────────────────────────────┐
│ 7. SEARCH                                                                     │
│    Selfie Upload → Detect Face → Extract Embedding → Qdrant Search           │
│    → Return PhotoIds with Similarity Scores                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Key Thresholds & Limits

| Component | Threshold | Value | Purpose |
|-----------|-----------|-------|---------|
| InsightFace | `det_thresh` | 0.5 | Detection confidence |
| SCRFD Fallback | `conf_threshold` | 0.1 | Lower for rescue |
| YuNet Fallback | `conf_threshold` | 0.5 | Standard |
| Quality Filter | `minConfidence` | 0.7 | Post-detection filter |
| Quality Filter | `minSizePx` | 60 | Minimum face size |
| Image Resize | `MAX_DIMENSION` | 2500 | Prevent OOM |
| Queue | `concurrency` | 2 | Face indexing workers |
| Qdrant | `indexing_threshold` | 1000 | Start HNSW indexing |

---

## 14. Troubleshooting

### False Positives
- Raised `det_thresh` from 0.3 → 0.5
- Added landmark validation to filter non-face shapes
- Logs: `Landmark validation: X faces rejected, Y accepted`

### Missing Faces
- Use "Re-index with High Accuracy" (det_size 800x800)
- Check `minSizePx` setting (faces < 60px rejected)
- Check `skipExtremeAngles` (profile faces may be skipped)

### OOM Errors
- Images > 2500px are auto-resized
- Queue concurrency reduced to 2
- Check server memory allocation

---

*End of Document*

