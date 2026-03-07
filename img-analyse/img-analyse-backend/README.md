# img-analyse-backend

High-speed face search backend for event photography. Detects faces in photos, extracts embeddings, and enables users to find their photos by uploading a selfie.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           img-analyse-backend                                │
│                              (Port 4001)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │   Index API     │    │   Search API    │    │  Health API     │          │
│  │  POST /index    │    │  POST /search   │    │  GET /health    │          │
│  └────────┬────────┘    └────────┬────────┘    └─────────────────┘          │
│           │                      │                                           │
│  ┌────────▼──────────────────────▼────────┐                                 │
│  │         Face Detection Service          │                                 │
│  │    (Fallback Chain: CompreFace →        │                                 │
│  │         YuNet → SCRFD)                  │                                 │
│  └────────┬───────────────────────────────┘                                 │
│           │                                                                  │
│  ┌────────▼────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │ Face Quality    │    │ Embedding Cache │    │ Qdrant Service  │          │
│  │ Filter Service  │    │ (Redis, 30min)  │    │ (Per-event)     │          │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                │                    │                      │
                ▼                    ▼                      ▼
┌───────────────────┐    ┌─────────────────┐    ┌─────────────────────────────┐
│    CompreFace     │    │      Redis      │    │         Qdrant              │
│   (Port 8000)     │    │   (Port 6379)   │    │       (Port 6333)           │
│  Face Detection   │    │ Session Cache   │    │  Vector DB (512-dim)        │
│  & Recognition    │    │                 │    │  Collection per event       │
└───────────────────┘    └─────────────────┘    └─────────────────────────────┘
                │
                ▼
┌───────────────────┐
│  Python Sidecar   │
│   (Port 4002)     │
│ YuNet/SCRFD/Align │
└───────────────────┘
```

## 📋 Features

- **Multi-detector fallback chain**: CompreFace → YuNet → SCRFD
- **Per-event collections**: Fast, isolated vector search per event
- **Configurable quality filters**: Min size, confidence, angle thresholds
- **Session-based caching**: 30-minute TTL for user embeddings
- **Admin-configurable**: All settings via api-node-backend admin panel
- **Face alignment**: 5-point landmark alignment for better embeddings

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Redis (shared with api-node-backend)
- CompreFace instance running

### 1. Install Dependencies

```bash
cd img-analyse-backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Required
API_NODE_BACKEND_URL=http://localhost:4000
API_NODE_BACKEND_INTERNAL_KEY=1234

# CompreFace (get keys from CompreFace admin UI)
COMPREFACE_URL=http://localhost:8000
COMPREFACE_RECOGNITION_API_KEY=your-recognition-api-key
COMPREFACE_DETECTION_API_KEY=your-detection-api-key

# Qdrant
QDRANT_URL=http://localhost:6333

# Redis (same as api-node-backend)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Start Infrastructure

```bash
# Start Qdrant and Python Sidecar
docker-compose up -d
```

### 4. Start the Service

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 5. Enable in Admin Settings

In the api-node-backend admin panel, configure:

| Setting | Value |
|---------|-------|
| `face_analysis_enabled` | `true` |
| `compreface_recognition_api_key` | Your key |
| `face_detection_mode` | `recognition_only` or `detection_then_recognition` |

## 📡 API Endpoints

### Health Check
```http
GET /health
```

### Index Faces in Photo
```http
POST /api/v1/index/photo
Content-Type: application/json

{
  "photoId": "uuid",
  "eventId": "uuid", 
  "imageUrl": "https://..."
}
```

### Search with Image
```http
POST /api/v1/search
Content-Type: multipart/form-data

image: <file>
eventId: uuid
topK: 100 (optional)
minSimilarity: 0.6 (optional)
```

### Search with Cached Embedding
```http
POST /api/v1/search/cached
Content-Type: application/json

{
  "sessionId": "uuid",
  "eventId": "uuid",
  "topK": 100
}
```

### Delete Photo Faces
```http
DELETE /api/v1/index/photo/:photoId
Content-Type: application/json

{
  "eventId": "uuid"
}
```

### Delete Event Collection
```http
DELETE /api/v1/index/event/:eventId
```

### Get Event Statistics
```http
GET /api/v1/index/event/:eventId/stats
```

Response:
```json
{
  "eventId": "uuid",
  "totalFaces": 1234,
  "totalPhotos": 500
}
```

## ⚙️ Admin Configuration

All settings are fetched from `api-node-backend` and can be changed via admin panel:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `face_analysis_enabled` | boolean | `false` | Enable/disable face analysis |
| `compreface_url` | string | `http://localhost:8000` | CompreFace server URL |
| `compreface_recognition_api_key` | string | - | Recognition service API key |
| `compreface_detection_api_key` | string | - | Detection service API key |
| `face_detection_mode` | enum | `recognition_only` | `recognition_only` or `detection_then_recognition` |
| `face_min_size_px` | number | `60` | Skip faces smaller than this |
| `face_min_confidence` | number | `0.7` | Skip faces below this confidence |
| `face_skip_extreme_angles` | boolean | `true` | Skip faces with yaw > 45° |
| `face_max_angle_degrees` | number | `45` | Max yaw angle threshold |
| `search_default_top_k` | number | `100` | Default search results count |
| `search_min_similarity` | number | `0.6` | Min similarity threshold |
| `embedding_cache_ttl_seconds` | number | `1800` | Cache TTL (30 min) |
| `face_alignment_enabled` | boolean | `true` | Enable face alignment |

## 🔧 Detection Modes

### Mode 1: Recognition Only (`recognition_only`)
- Single API call to CompreFace Recognition service
- Returns bounding box + embedding in one request
- Faster, simpler setup
- Requires Recognition service API key

### Mode 2: Detection + Recognition (`detection_then_recognition`)
- Two API calls: Detection → Recognition
- Better for multi-face images
- Allows quality filtering between steps
- Requires both API keys

## 🐍 Python Sidecar

The Python sidecar provides fallback face detection and alignment:

### Endpoints
- `GET /health` - Health check
- `POST /detect/yunet` - YuNet face detection
- `POST /detect/scrfd` - SCRFD face detection
- `POST /align` - Face alignment using 5-point landmarks

### Models
Models are automatically downloaded on first run:
- **YuNet**: OpenCV's lightweight face detector
- **SCRFD**: High-accuracy ONNX face detector

## 🗄️ Qdrant Collections

Each event gets its own collection for isolated, fast search:

```
Collection: event_{eventId}_faces
├── Vectors: 512-dimensional (cosine similarity)
├── Index: HNSW (m=16, ef_construct=100)
└── Payload:
    ├── photoId: string
    ├── faceIndex: number
    ├── confidence: number
    └── createdAt: timestamp
```

## 🔄 Integration with api-node-backend

Face indexing is automatically triggered when photos are uploaded:

1. Photo uploaded → Image processed → Photo created in DB
2. `imageProcessor` calls `faceAnalysisClient.indexPhoto()`
3. img-analyse-backend detects faces, extracts embeddings
4. Embeddings stored in Qdrant

## 🐳 Docker Deployment

### Full Stack

```bash
# Start all services
docker-compose up -d

# Verify health
curl http://localhost:4001/health
curl http://localhost:6333/health
curl http://localhost:4002/health
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4001 | Server port |
| `NODE_ENV` | development | Environment |
| `QDRANT_URL` | http://localhost:6333 | Qdrant URL |
| `REDIS_HOST` | localhost | Redis host |
| `PYTHON_SIDECAR_URL` | http://localhost:4002 | Python sidecar |

## 📊 Performance

Expected performance (512-dim embeddings, cosine similarity):

| Event Size | Index Time | Search Time |
|------------|------------|-------------|
| 1,000 faces | ~50ms/face | <5ms |
| 10,000 faces | ~50ms/face | <10ms |
| 100,000 faces | ~50ms/face | <20ms |

## 🔒 Security

- Internal API key authentication between services
- No direct external access to Qdrant/Redis
- Photo IDs only returned (no direct image URLs)

## 📝 License

Part of the Pics photography platform.

