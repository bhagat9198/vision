# Face Detection & Indexing Pipeline

> **Source of truth** for the end-to-end flow: photographer uploads a photo → faces are detected, embedded, indexed, and searchable. All section references are to current paths after the December 2025 folder rename.
>
> Superseded: `FACE_DETECTION_PIPELINE.old.md` (pre-rename).

---

## 1. System architecture

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                          next-frontend-photography (:3000)                    │
│                          photographer portal + client gallery                 │
└───────────────────────────────────────────────────────────────────────────────┘
                               │  chunked upload — 5 MB chunks, 4 files parallel
                               ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                       node-backend-photography (:4000)                        │
│   Express + Prisma on the `pics` database, BullMQ on Redis                    │
│                                                                               │
│   Upload service ─► merge chunks ─► image-processing queue (concurrency 5)    │
│                                        │                                      │
│                                        ▼                                      │
│                       HEIC→JPEG • thumbnail (Sharp) • watermark •             │
│                       storage adapter (local or S3) • Photo row               │
│                                        │                                      │
│                                        ▼                                      │
│                          face-analysis.client.ts                              │
│                          POST /api/v1/index/photo  (retries 3× w/ backoff)    │
└───────────────────────────────────────────────────────────────────────────────┘
                               │  x-internal-key / per-org x-api-key
                               ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         node-backend-faceIQ (:4001)                           │
│   Express + Prisma on the `img_analyse` database, BullMQ + Qdrant             │
│                                                                               │
│   Index controller ─► face-indexing queue (concurrency 2)                     │
│                              │                                                │
│                              ▼                                                │
│                    face-detection.service.ts                                  │
│                    ├─ INSIGHTFACE (default for zero-dep setups)               │
│                    │    → common/vision-core /insightface/detect-and-embed    │
│                    └─ COMPREFACE (Prisma default)                             │
│                         → CompreFace /api/v1/recognition/recognize            │
└───────────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                         common/vision-core (:4002)                            │
│   FastAPI • InsightFace buffalo_l (ArcFace) • SCRFD • YuNet • HDBSCAN         │
│                                                                               │
│   det_thresh = 0.5 • det_size default (640,640) • high-accuracy (800,800)     │
│   SCRFD fallback conf_threshold = 0.1 • YuNet conf_threshold = 0.5            │
│   Landmark validation guards against false positives                          │
└───────────────────────────────────────────────────────────────────────────────┘
                               │  512-dim ArcFace embeddings
                               ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                               Qdrant (:6333)                                  │
│   Collection format: `org_{orgSlug}_event_{eventSlug}_faces`                  │
│   Vector dim 512 • Cosine • HNSW m=16 ef_construction=100                     │
│   indexing_threshold = 1000                                                   │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Upload flow — `node-backend-photography`

[src/modules/uploads/upload.service.ts](../node-backend-photography/src/modules/uploads/upload.service.ts)

| Constant | Value | Source |
|---|---|---|
| `CHUNK_SIZE_MB` | 5 | `upload.service.ts:10` |
| `sessionExpiryHours` | 24 | `upload.service.ts:58` |
| Max retries per file | 3 | `upload.service.ts:245` |
| Temp storage | `./uploads/temp/{sessionId}/{fileId}/chunk_{n}` | `UPLOAD_DIR` env |

### Steps

1. **`POST /api/v1/uploads/init`** — create `UploadSession` + `UploadFile[]` rows, return `{sessionId, chunkSize, files[].fileId, files[].totalChunks}`.
2. **`PUT /api/v1/uploads/:sessionId/files/:fileId/chunks/:chunkIndex`** — persist chunk, update `UploadFile.uploadedChunks` and `chunksReceived[]`.
3. **`POST /api/v1/uploads/:sessionId/files/:fileId/complete`** — validate all chunks received, enqueue an `image-processing` job.
4. **`POST /api/v1/uploads/:sessionId/retry`** — resets failed files whose `retryCount < 3`.
5. **`GET /api/v1/uploads/:sessionId/status?includeFiles=true`** — poll progress.

---

## 3. Image processing queue

[src/queues/image-processing.queue.ts](../node-backend-photography/src/queues/image-processing.queue.ts)

```
Queue name:   image-processing
Concurrency:  5
Attempts:     3
Backoff:      exponential, 5 000 ms base
Keep:         1 000 completed / 5 000 failed
```

### Job data

```ts
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

### Worker steps — [src/services/image-processor.service.ts](../node-backend-photography/src/services/image-processor.service.ts)

1. Merge chunks from `./uploads/temp/{sessionId}/{fileId}/chunk_*` → `{fileId}_merged`.
2. Detect `.heic`/`.heif` → convert to JPEG via `heic-convert`.
3. Extract metadata (width, height, aspect ratio) with Sharp.
4. Generate thumbnail (≤400 px longest side, quality 80).
5. Apply watermark if enabled (event-level setting wins over photographer-level).
6. Upload final + thumbnail to storage adapter (local fs today, S3 ready).
7. Insert `Photo` row.
8. **Non-blocking** call to faceIQ via [src/services/face-analysis.client.ts](../node-backend-photography/src/services/face-analysis.client.ts) — `indexPhoto()` with up to 3 retries. Upload is never failed by a face-indexing error.
9. Clean up temp files.

---

## 4. Face analysis backend — `node-backend-faceIQ`

### 4.1 Endpoints consumed by the photography backend

All require the org `x-api-key` header (the photography backend configures this in `SystemConfig.FACE_ANALYSIS_API_KEY`).

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/index/photo` | Queue a single photo for face indexing |
| DELETE | `/api/v1/index/photo/:photoId?eventId=…` | Drop a photo’s face vectors |
| POST | `/api/v1/index/photo/:photoId/reindex` | Re-run detection, optional `{highAccuracy:true}` → det_size 800 |
| GET | `/api/v1/index/photo/:photoId/faces?eventId=…` | Bounding-box debug list |
| POST | `/api/v1/index/video` | Queue a video file for frame-wise indexing |
| DELETE | `/api/v1/index/video/:videoId?eventId=…` | Drop video + frames |
| POST | `/api/v1/index/event` | Eagerly create the Qdrant collection |
| DELETE | `/api/v1/index/event/:eventId` | Delete event collection (called during event-cleanup) |
| GET | `/api/v1/index/event/:eventId/stats` | `{total, pending, processing, completed, failed, facesTotal}` |
| POST | `/api/v1/search` | Selfie upload → find matching photos |
| POST | `/api/v1/search/cached` | Reuse a cached embedding session |
| DELETE | `/api/v1/search/session/:sessionId` | End cached session |

### 4.2 Index-photo request

```ts
interface IndexPhotoRequest {
  photoId: string;
  eventId: string;
  eventSlug?: string;    // used for Qdrant collection name
  imageUrl?: string;     // imageSourceMode = URL
  imagePath?: string;    // imageSourceMode = SHARED_STORAGE
  // or multipart field `image` when imageSourceMode = MULTIPART
}
```

`imageSourceMode` is a per-org `Organization` setting.

### 4.3 Face-indexing queue

[src/queues/face-indexing.queue.ts](../../faceIQ/node-backend-faceIQ/src/queues/face-indexing.queue.ts)

```
Queue name:   face-indexing
Concurrency:  2     (low to prevent OOM when Sharp + InsightFace run together)
Attempts:     3
Backoff:      exponential, 1 000 ms base
Keep:         1 000 completed / 5 000 failed
```

### 4.4 Worker pipeline

1. Update `EventImageStatus` → `PROCESSING`.
2. Fetch image buffer (URL fetch, file read, or multipart already in memory).
3. **Resize** if the longest side > 2500 px (record the scale to map bbox coords back).
4. `face-detection.service.ts` picks provider from org settings:
   - `INSIGHTFACE` → `python-sidecar.service.ts` → common/vision-core `/insightface/detect-and-embed`.
   - `COMPREFACE` → `compreface.service.ts` → either `/api/v1/recognition/recognize` (RECOGNITION_ONLY) or Detect → crop → Recognize pipeline.
5. **Quality filter** (`face-quality.service.ts`): drop faces below `minConfidence`, smaller than `minSizePx`, or with yaw > 60° when `skipExtremeAngles=true`.
6. `qdrant.service.ts → indexFaces()` upserts 512-dim points into `org_{orgSlug}_event_{eventSlug}_faces`.
7. Update `EventImageStatus` → `COMPLETED`, record `facesDetected` / `facesIndexed`.

Per-org thresholds live on the `Organization` Prisma model (and a cascaded `GlobalSettings` singleton):

| Field | Organization default | GlobalSettings default |
|---|---|---|
| `minConfidence` | 0.5 | 0.7 |
| `minSizePx` | 60 | 60 |
| `skipExtremeAngles` | false | false (overridable) |
| `searchDefaultTopK` | 50 | 50 |
| `searchMinSimilarity` | 0.6 | 0.6 |
| `embeddingCacheTtlSeconds` | 1800 | 1800 |

---

## 5. common/vision-core — Python ML sidecar

[common/vision-core/main.py](../../common/vision-core/main.py)

| Endpoint | Implementation | Purpose |
|---|---|---|
| `GET /health` | `main.py:289` | Liveness + which detectors are loaded |
| `POST /detect/yunet` | `main.py:310` | YuNet detection only |
| `POST /detect/scrfd` | `main.py:346` | SCRFD detection only |
| `POST /align` | `main.py:388` | 5-point landmark alignment to 112×112 |
| `POST /insightface/detect-and-embed` | `main.py:441` | All-in-one — detect, align, embed, age/gender/pose |
| `POST /insightface/embed` | `main.py:497` | Embed a pre-cropped face |
| `POST /insightface/detect` | `main.py:536` | Detection only |
| `GET /insightface/health` | `main.py:579` | Loaded model info |
| `POST /cluster/hdbscan` | `main.py:630` | HDBSCAN on a batch of embeddings |
| `GET /cluster/health` | `main.py:737` | hdbscan-availability probe |

### Detector thresholds

| Detector | Threshold constant | Value | Source |
|---|---|---|---|
| InsightFace `buffalo_l` | `det_thresh` | 0.5 | [insightface_service.py:161](../../common/vision-core/insightface_service.py#L161) |
| InsightFace default det_size | — | 640×640 | [insightface_service.py:112](../../common/vision-core/insightface_service.py#L112) |
| InsightFace high-accuracy det_size | — | 800×800 (via API param) | [insightface_service.py:183](../../common/vision-core/insightface_service.py#L183) |
| SCRFD (fallback #1) | `conf_threshold` | 0.1 | [main.py:174](../../common/vision-core/main.py#L174) |
| YuNet (fallback #2) | `conf_threshold` | 0.5 | [detectors.py:21](../../common/vision-core/detectors.py#L21) |

### Landmark validation — `validate_face_landmarks_basic`

Filters false positives while preserving profile / side-view faces:

1. At least 3 of the 5 landmarks must exist.
2. At least 3 landmarks inside the bbox (20% tolerance).
3. Minimum spread of 10% of the face size.
4. Vertical sanity: nose not below mouth.

The 5-point landmark set is: `left_eye`, `right_eye`, `nose`, `left_mouth`, `right_mouth`.

---

## 6. Qdrant

[faceIQ/node-backend-faceIQ/src/services/qdrant.service.ts](../../faceIQ/node-backend-faceIQ/src/services/qdrant.service.ts)

### Collection naming

```
Format:  org_{orgSlug}_event_{eventSlug}_faces
Example: org_acme_photos_event_wedding_2024_faces
```

Non-alphanumeric characters other than `-` and `_` are sanitised to `_` ([src/utils/slug.ts](../../faceIQ/node-backend-faceIQ/src/utils/slug.ts)).

### Vector / index config

| Config | Value |
|---|---|
| `VECTOR_DIMENSION` | 512 (ArcFace) |
| `DISTANCE_METRIC` | cosine |
| HNSW `m` | 16 |
| HNSW `ef_construction` | 100 |
| `indexing_threshold` | 1 000 points before HNSW graph build |

### Point payload

```ts
interface QdrantFacePayload {
  photoId: string;
  eventId: string;
  faceIndex: number;
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
  detectorSource: 'insightface' | 'compreface' | 'scrfd' | 'yunet';
  wasAligned?: boolean;
  age?: { low: number; high: number };
  gender?: 'male' | 'female';
  pose?: { yaw: number; pitch: number; roll: number };
  indexedAt: string;  // ISO timestamp
}
```

---

## 7. Video pipeline

[faceIQ/node-backend-faceIQ/src/queues/video-processing.queue.ts](../../faceIQ/node-backend-faceIQ/src/queues/video-processing.queue.ts)

```
Queue name:   video-processing
Concurrency:  1     (videos are resource-intensive)
Attempts:     1     (fail fast; heavy jobs aren't retried blindly)
```

### Steps

1. Update `EventVideoStatus` → `PROCESSING`.
2. Probe metadata with fluent-ffmpeg (duration, resolution, fps).
3. **Extract 1 frame per second** → [video-processing.queue.ts:76](../../faceIQ/node-backend-faceIQ/src/queues/video-processing.queue.ts#L76).
4. Copy each frame to `{sharedStoragePath}/frames/{videoId}/{photoId}.jpg` (permanent before indexing to avoid race conditions).
5. Create one `EventImageStatus` row per frame with `sourceVideoId = videoId`.
6. Enqueue a `face-indexing` job per frame.
7. Update `EventVideoStatus` → `COMPLETED` with `framesExtracted`, `durationSec`.

---

## 8. Search flow

[faceIQ/node-backend-faceIQ/src/controllers/search.controller.ts](../../faceIQ/node-backend-faceIQ/src/controllers/search.controller.ts)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/search` | POST | Selfie upload (multipart `image`) |
| `/api/v1/search/cached` | POST | Reuse a cached embedding from a prior `/search` |
| `/api/v1/search/session/:sessionId` | DELETE | End the cached session |

### Processing

1. Multipart selfie → common/vision-core `/insightface/detect-and-embed`.
2. Pick the highest-confidence face, extract its 512-dim embedding.
3. Cache embedding in Redis under `sessionId` for `embeddingCacheTtlSeconds` (default 1800).
4. Qdrant cosine search in `org_{orgSlug}_event_{eventSlug}_faces`, top-K (default 50), min similarity (default 0.6).
5. Return matches deduplicated by `photoId` with similarity scores.

### Defaults

| Parameter | Effective default | Source |
|---|---|---|
| `topK` | 50 | Prisma `Organization.searchDefaultTopK` |
| `minSimilarity` | 0.6 | Prisma `Organization.searchMinSimilarity` |
| `embeddingCacheTtlSeconds` | 1800 | Prisma `Organization.embeddingCacheTtlSeconds` |

> Note: `.env.example` still lists `SEARCH_DEFAULT_TOP_K=100` as a historical default, but the runtime reads from DB settings, not env. The DB defaults (50) win.

---

## 9. Clustering flow

[faceIQ/node-backend-faceIQ/src/queues/clustering.queue.ts](../../faceIQ/node-backend-faceIQ/src/queues/clustering.queue.ts)

```
Queue name:   face-clustering
Concurrency:  1
Attempts:     2
Backoff:      exponential, 5 000 ms base
Keep:         100 completed / 100 failed
```

Trigger: `POST /api/v1/clustering/run { eventId, eventSlug }`.

### Strategy A — QDRANT (Node Union-Find)

1. Pull all face vectors for the event.
2. Compute pairwise cosine similarity.
3. Merge into the same cluster when similarity > `clusteringSimilarityThreshold` (default 0.6).
4. Persist `PersonCluster` rows (`name="Person {n}"`, `displayOrder` by cluster size, representative face thumbnail from `thumbnail.service.ts`).
5. Orphan vectors become a single `isNoise=true` cluster.

### Strategy B — HDBSCAN (vision-core)

1. Pull embeddings.
2. `POST pythonSidecarUrl/cluster/hdbscan` with `{min_cluster_size, min_samples}` (defaults 2, 2).
3. Same DB persistence as Strategy A.

---

## 10. Organization settings

[faceIQ/node-backend-faceIQ/src/modules/org/org.types.ts](../../faceIQ/node-backend-faceIQ/src/modules/org/org.types.ts)

```ts
interface OrgSettings {
  orgId: string;
  name: string;
  slug: string;
  isActive: boolean;

  // Provider selection
  faceRecognitionProvider: 'COMPREFACE' | 'INSIGHTFACE';
  insightfaceModel: string | null;           // 'buffalo_l' (default) | 'buffalo_s' | 'antelopev2'

  // CompreFace credentials (only when provider = COMPREFACE)
  comprefaceUrl: string | null;
  comprefaceRecognitionApiKey: string | null;
  comprefaceDetectionApiKey: string | null;

  // Detection mode
  faceDetectionMode: 'RECOGNITION_ONLY' | 'DETECTION_THEN_RECOGNITION';

  // Image source
  imageSourceMode: 'URL' | 'MULTIPART' | 'SHARED_STORAGE';
  sharedStoragePath: string | null;

  // Quality thresholds
  minConfidence: number;        // default 0.5 per org
  minSizePx: number;            // default 60
  skipExtremeAngles: boolean;

  // Search tuning
  searchDefaultTopK: number;        // default 50
  searchMinSimilarity: number;      // default 0.6
  embeddingCacheTtlSeconds: number; // default 1800

  // Python sidecar (common/vision-core)
  pythonSidecarUrl: string | null;
  enableFallbackDetection: boolean;
  enableAlignment: boolean;

  // Clustering
  clusteringProvider: 'QDRANT' | 'HDBSCAN';         // default QDRANT
  clusteringSimilarityThreshold: number;            // default 0.6
  clusteringMinClusterSize: number;                 // default 2
  clusteringMinSamples: number;                     // default 2
}
```

Admin dashboard UI for these knobs lives in [next-frontend-faceIQ/app/organizations/[id]/org-settings-form.tsx](../../faceIQ/next-frontend-faceIQ/app/organizations/%5Bid%5D/org-settings-form.tsx).

---

## 11. Environment variables

### `node-backend-photography`

| Variable | Required | Default |
|---|---|---|
| `NODE_ENV` | — | development |
| `PORT` | — | 4000 |
| `DATABASE_URL` | **yes** | postgresql://postgres:root@localhost:5432/pics?schema=public |
| `JWT_SECRET` | **yes** (≥32 chars) | — |
| `JWT_EXPIRES_IN` | — | 7d |
| `CORS_ORIGIN` | — | http://localhost:3000 |
| `RATE_LIMIT_WINDOW_MS` | — | 900000 (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | — | 100 |
| `MAX_FILE_SIZE` | — | 10485760 (10 MB) |
| `UPLOAD_DIR` | — | ./uploads |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | — | localhost / 6379 / — |
| `INTERNAL_API_KEY` | — | — |

Face-analysis connection (`FACE_ANALYSIS_BACKEND_URL`, `FACE_ANALYSIS_API_KEY`, `FACE_ANALYSIS_ENABLED`) lives in the `SystemConfig` DB table, not in env.

### `node-backend-faceIQ`

| Variable | Required | Default |
|---|---|---|
| `NODE_ENV` | — | development |
| `PORT` | — | 4001 |
| `DATABASE_URL` | — | postgresql://postgres:postgres@localhost:5432/img_analyse |
| `MASTER_API_KEY` | **yes** (≥8 chars) | master-key-change-me-in-production |
| `QDRANT_URL` / `QDRANT_API_KEY` | — | http://localhost:6333 / — |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | — | localhost / 6379 / — |
| `PYTHON_SIDECAR_URL` | — | http://localhost:4002 |
| `LOG_LEVEL` | — | info |

Per-tenant knobs (`COMPREFACE_URL`, `FACE_MIN_*`, `SEARCH_*`, `DEFAULT_*`, etc.) seed the `GlobalSettings` singleton — they are not consulted on each request.

### common/vision-core

| Variable | Value |
|---|---|
| `MODELS_DIR` | `./models` or `/app/models` (auto-resolves) |
| `YUNET_MODEL_PATH` | `{MODELS_DIR}/face_detection_yunet_2023mar.onnx` |
| `SCRFD_MODEL_PATH` | `{MODELS_DIR}/scrfd_10g_bnkps.onnx` |

InsightFace `buffalo_l` auto-downloads from the InsightFace model zoo (~326 MB) on first `/insightface/*` call.

---

## 12. End-to-end summary

```
1. Chunked upload (5 MB chunks) → node-backend-photography
2. image-processing queue: HEIC→JPEG • Sharp thumb • watermark • storage • Photo row
3. face-analysis.client.indexPhoto() → node-backend-faceIQ
4. face-indexing queue (concurrency 2, attempts 3)
5. common/vision-core /insightface/detect-and-embed  (det_thresh 0.5, det_size 640×640)
6. Landmark validation → quality filter → 512-dim embeddings
7. qdrant.indexFaces → org_{orgSlug}_event_{eventSlug}_faces
8. Update EventImageStatus → COMPLETED
9. Later: POST /api/v1/search with selfie → cosine search in Qdrant → photoIds
```

---

## 13. Key thresholds & limits (cheat sheet)

| Where | Threshold | Value | Purpose |
|---|---|---|---|
| common/vision-core | `det_thresh` | 0.5 | InsightFace detection confidence |
| common/vision-core | `det_size` (default) | 640×640 | InsightFace input size |
| common/vision-core | `det_size` (high-accuracy re-index) | 800×800 | Caller override |
| common/vision-core | SCRFD `conf_threshold` | 0.1 | Fallback — high recall |
| common/vision-core | YuNet `conf_threshold` | 0.5 | Fallback — standard |
| node-backend-faceIQ | `minConfidence` | 0.5 (org) / 0.7 (global) | Post-detection filter |
| node-backend-faceIQ | `minSizePx` | 60 | Minimum face size in px |
| node-backend-faceIQ | Image resize cap | 2500 px | Prevent OOM |
| node-backend-faceIQ | `face-indexing` concurrency | 2 | Prevent OOM |
| node-backend-faceIQ | `video-processing` concurrency | 1 | Video is heavy |
| node-backend-faceIQ | `face-clustering` concurrency | 1 | Global per event |
| node-backend-photography | `image-processing` concurrency | 5 | CPU-bound |
| Qdrant | `indexing_threshold` | 1 000 | HNSW build trigger |
| Upload | `CHUNK_SIZE_MB` | 5 | Client + server agreed |
| Upload | Session expiry | 24 h | From init |
| Upload | Max retries per file | 3 | Enforced at DB level |

---

## 14. Troubleshooting

### False positives on indexed faces
- `det_thresh = 0.5` keeps InsightFace aggressive but reliable; raise in [insightface_service.py:161](../../common/vision-core/insightface_service.py#L161) if still too permissive.
- `validate_face_landmarks_basic` already rejects shapes without valid 5-point structure.
- Tighten per-org `minConfidence` from the faceIQ admin dashboard (`/organizations/:id` → settings tab).

### Missing faces in results
- Use **Reindex with high accuracy** (sends `highAccuracy:true` → det_size 800). Available from the admin dashboard image viewer or via `POST /api/v1/index/photo/:id/reindex`.
- Check `minSizePx` (faces < 60 px are rejected).
- Check `skipExtremeAngles` — profile faces may be filtered.

### OOM during indexing
- Images > 2 500 px are auto-resized before detection.
- `face-indexing` concurrency is 2; reduce to 1 on smaller hosts.
- Ensure the Node process has `--max-old-space-size=4096` (already configured in `npm run dev` / `npm start`).

### Upload stuck at 80%
- The progress bar maps chunks to 80% and processing to 20%. A stuck job is almost always in the `image-processing` BullMQ queue — check `logs/combined.log` or BullMQ board.

---

*Document last updated after the December 2025 folder rename: `api-node-backend` → `photography/node-backend-photography`, `img-analyse-backend` → `faceIQ/node-backend-faceIQ`, `python-sidecar` → `common/vision-core`.*
