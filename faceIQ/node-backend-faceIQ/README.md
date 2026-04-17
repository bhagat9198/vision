# node-backend-faceIQ

Multi-tenant face-analysis microservice. Detects faces, extracts 512-dim ArcFace embeddings, indexes them in Qdrant, searches by similarity, and clusters faces into people. Called internally by [node-backend-photography](../../photography/node-backend-photography/) and can serve other products in the future.

Formerly known as `img-analyse-backend`.

- **Port:** `4001`
- **Database:** PostgreSQL — `img_analyse`
- **Vectors:** Qdrant
- **Queue:** Redis (BullMQ)
- **ML sidecar:** [common/vision-core](../../common/vision-core/) (FastAPI, optional CompreFace)

---

## Quick start

```bash
cp .env.example .env            # set MASTER_API_KEY, DATABASE_URL, QDRANT_URL, etc.
docker compose up -d qdrant     # vector DB
npm install
npx prisma migrate dev
npm run dev                     # → http://localhost:4001
```

Postgres and Redis are **not** declared in this service’s compose file — start them from [photography/node-backend-photography/docker-compose.yml](../../photography/node-backend-photography/docker-compose.yml) and point `DATABASE_URL` at the `img_analyse` database on the same instance.

Start [common/vision-core](../../common/vision-core/) alongside if any org uses `faceRecognitionProvider=INSIGHTFACE` (the default) or needs HDBSCAN clustering.

Swagger UI: `http://localhost:4001/api-docs`
Health:     `http://localhost:4001/health` (and `/health/detailed`, `/ready`, `/live`)

---

## Tech stack

| Area | Choice |
|------|--------|
| Runtime | Node.js ≥ 18 (ESM) |
| Framework | Express 4.21 |
| Language | TypeScript 5.6 |
| ORM | Prisma 6 (PostgreSQL) |
| Vectors | `@qdrant/js-client-rest` 1.12 |
| Queue | BullMQ 5 on ioredis 5 |
| Images | Sharp 0.33 |
| Video | fluent-ffmpeg 2.1 |
| Auth | jsonwebtoken + bcryptjs |
| Security | helmet, cors |
| Validation | zod |
| Docs | swagger-jsdoc + swagger-ui-express |
| Logs | winston + morgan |

### Scripts

```bash
npm run dev         # tsx watch --max-old-space-size=4096 src/server.ts
npm run build       # tsc
npm start           # node --max-old-space-size=4096 dist/server.js
npm run lint        # eslint src --ext .ts
npm run typecheck   # tsc --noEmit
```

---

## Folder layout (`src/`)

```
src/
├── app.ts                      # Express app factory
├── server.ts                   # startup / graceful shutdown, Qdrant ping
│
├── config/
│   ├── env.ts                  # zod-validated env (NODE_ENV, PORT, DATABASE_URL,
│   │                           # MASTER_API_KEY (min 8), QDRANT_URL, REDIS_*,
│   │                           # PYTHON_SIDECAR_URL, LOG_LEVEL)
│   ├── database.ts             # prisma client
│   ├── redis.ts                # ioredis instance (BullMQ + caches)
│   ├── qdrant.ts               # qdrant client + collection defaults
│   └── swagger.ts
│
├── middleware/
│   ├── auth.ts                 # validateMasterKey (x-master-key)
│   ├── org-auth.ts             # requireOrgAuth (x-api-key or x-auth-token) +
│   │                           # requireMasterKey + requireOrgSettings(...)
│   ├── error-handler.ts
│   └── request-logger.ts
│
├── modules/                    # module = {routes, controller, service, types}
│   ├── auth/                   # setup-status / setup / login (admin JWT)
│   ├── org/                    # register, list, get, settings, delete
│   ├── api-key/                # create / list / revoke org keys
│   └── settings/               # GlobalSettings (system defaults)
│
├── routes/
│   ├── health.routes.ts
│   ├── index.routes.ts         # /api/v1/index/... (photo + video)
│   ├── search.routes.ts        # /api/v1/search/...
│   └── clustering.routes.ts    # /api/v1/clustering/...
│
├── controllers/                # request handlers (index, search, clustering,
│                               # health, images, collection-settings)
│
├── services/
│   ├── qdrant.service.ts           # ensureCollection, indexFaces, searchFaces, deleteByPhoto
│   ├── face-detection.service.ts   # orchestrates COMPREFACE / INSIGHTFACE providers
│   ├── compreface.service.ts       # CompreFace HTTP client
│   ├── python-sidecar.service.ts   # vision-core HTTP client (InsightFace, HDBSCAN)
│   ├── face-search.service.ts
│   ├── face-quality.service.ts     # confidence / size / angle filtering
│   ├── face-clustering.service.ts  # Qdrant Union-Find + HDBSCAN persistence
│   ├── embedding-cache.service.ts  # Redis cache for search sessions
│   ├── collection-settings.service.ts
│   ├── thumbnail.service.ts
│   └── video-processor.service.ts
│
├── queues/
│   ├── face-indexing.queue.ts      # per-photo detect → embed → upsert
│   ├── video-processing.queue.ts   # ffmpeg extract → enqueue face-indexing
│   └── clustering.queue.ts         # run clustering, persist PersonCluster rows
│
├── types/
├── utils/
│   ├── logger.ts               # winston (logs/error.log, logs/combined.log)
│   ├── image-utils.ts          # fetch / read / resize helpers
│   └── slug.ts                 # collection-name sanitisation
```

---

## HTTP surface

### Health (no auth)
| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Basic ping |
| GET | `/health/detailed` | PostgreSQL + Redis + Qdrant status |
| GET | `/health/ready` | Kubernetes readiness |
| GET | `/health/live` | Kubernetes liveness |

### Admin auth (`/auth`)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/auth/setup-status` | public | Is the first admin set up? |
| POST | `/auth/setup` | public (one-time) | Create first admin user |
| POST | `/auth/login` | public | Login → JWT (`x-auth-token`) |

### Organizations (`/orgs`)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/orgs/register` | `x-master-key` | Create org |
| GET | `/orgs` | `x-master-key` | List all orgs |
| GET | `/orgs/collections` | `x-master-key` | All Qdrant collections |
| GET | `/orgs/:id` | `x-api-key` | Org detail |
| GET | `/orgs/:id/collections` | `x-api-key` | Org’s collections |
| GET | `/orgs/:id/settings` | `x-api-key` | Read settings |
| PATCH | `/orgs/:id/settings` | `x-api-key` | Update settings |
| DELETE | `/orgs/:id` | `x-api-key` | Deactivate |

### API keys (`/orgs/:orgId/api-keys`)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/` | `x-api-key` | Create `{name?, expiresAt?}` |
| GET | `/` | `x-api-key` | List |
| DELETE | `/:keyId` | `x-api-key` | Revoke |

### Global settings (`/settings/global`)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | `x-master-key` | Read system defaults |
| PUT | `/` | `x-master-key` | Update system defaults |

### Indexing (`/api/v1/index`) — `x-api-key` + `requireOrgSettings(comprefaceUrl, comprefaceRecognitionApiKey)` unless noted
| Method | Path | Purpose |
|---|---|---|
| POST | `/photo` | Queue single photo (multipart — `photoId`, `eventId`, `imageUrl?`, `imagePath?`, `image?`) |
| DELETE | `/photo/:photoId?eventId=…` | Drop photo’s face points |
| GET | `/photo/:photoId/faces?eventId=…` | List faces for photo |
| POST | `/photo/:photoId/reindex` | Re-index (optional high-accuracy 800×800) |
| DELETE | `/event/:eventId` | Delete event’s collection |
| POST | `/event` | Create event collection eagerly |
| POST | `/video` | Index video — `{videoId, eventId, videoPath}` |
| DELETE | `/video/:videoId?eventId=…` | Drop video + frames |
| GET | `/event/:eventId/stats` | Total / indexed / failed counts |
| GET | `/event/:eventId/images?status=…` | Per-photo status |
| GET | `/event/:eventId/videos` | Per-video status |
| GET | `/images/view/:photoId` | **no auth** — serve stored image (token in query) |

### Search (`/api/v1/search`) — `x-api-key` + CompreFace settings
| Method | Path | Purpose |
|---|---|---|
| POST | `/` | Selfie upload (multipart — `eventId`, `image`, `topK?`, `minSimilarity?`) |
| POST | `/cached` | Reuse cached embedding — `{eventId, sessionId, topK?, minSimilarity?}` |
| DELETE | `/session/:sessionId` | End cached session |

### Clustering (`/api/v1/clustering`) — `x-api-key`
| Method | Path | Purpose |
|---|---|---|
| POST | `/run` | Start clustering — `{eventId, eventSlug}` |
| GET | `/job/:jobId` | Poll job |
| GET | `/event/:eventId/clusters?includeNoise=…` | List clusters |
| GET | `/cluster/:clusterId/faces?page=&limit=` | Faces in cluster |
| PATCH | `/cluster/:clusterId` | Rename |
| POST | `/merge` | `{clusterIds[], targetName?}` |
| POST | `/move-face` | `{faceId, targetClusterId}` |
| POST | `/split` | `{faceIds[], newClusterName?, eventId, eventSlug}` |
| GET | `/face/:faceId/thumbnail?size=150&format=jpeg` | Cropped face |
| GET | `/cluster/:clusterId/thumbnail` | Representative face |

### Collection settings (open for now)
| Method | Path | Purpose |
|---|---|---|
| GET | `/collections/:name/settings` | Read |
| PUT | `/collections/:name/settings` | Update auto-clustering / auto-indexing / notifications |

### Docs
| Method | Path |
|---|---|
| GET | `/api-docs` (Swagger UI) |
| GET | `/api-docs.json` |

---

## Authentication

Three mechanisms, all set via request headers (`x-master-key`, `x-api-key`, `x-auth-token`). Allowed by CORS in [src/app.ts](src/app.ts).

### `x-master-key` — platform admin
Validated against `MASTER_API_KEY` env var (min 8 chars). Used for org registration, global settings, cross-org listing. See [src/middleware/auth.ts](src/middleware/auth.ts).

### `x-api-key` — organization key
UUID stored in `ApiKey` table. Validated in [src/middleware/org-auth.ts](src/middleware/org-auth.ts) with a 5-minute Redis cache (`api_key:{keyId}`). On success sets `req.orgId` and `req.orgSettings` for downstream handlers. Checks: key active, not expired, org active.

### `x-auth-token` — admin user JWT
Issued by `POST /auth/login`. Also accepted as `?token=` query param for image URLs that can’t set headers.

---

## Prisma schema (`img_analyse` database)

| Model | Purpose |
|---|---|
| `Organization` | Tenant — slug, isActive, useCustomSettings + per-org face detection / recognition / clustering knobs, storage mode, CompreFace + sidecar URLs |
| `ApiKey` | Per-org keys — `key` (unique), isActive, expiresAt |
| `User` | Admin users (`/auth/*`) |
| `GlobalSettings` | Singleton row with system-wide defaults for all the knobs below |
| `CollectionSettings` | Per-collection toggles — autoClustering, autoIndexing, notifyOnCompletion |
| `EventImageStatus` | Per-photo indexing row — status (PENDING / PROCESSING / COMPLETED / FAILED), facesDetected, facesIndexed, sourceVideoId / videoTimestamp when extracted from video |
| `EventVideoStatus` | Per-video row — durationSec, framesExtracted, facesFound |
| `ClusteringJob` | Async job — status, provider (QDRANT / HDBSCAN), totalFaces, clustersFound, noiseFaces |
| `PersonCluster` | Face group — name, displayOrder, representativeFaceId, thumbnailUrl, faceCount, photoCount, isNoise, isMerged |
| `FaceClusterAssignment` | Face → cluster edge — unique on `qdrantPointId` |

### Enums
- `FaceDetectionMode` — `RECOGNITION_ONLY`, `DETECTION_THEN_RECOGNITION`
- `ImageSourceMode` — `URL`, `MULTIPART`, `SHARED_STORAGE`
- `FaceRecognitionProvider` — `COMPREFACE` (default), `INSIGHTFACE`
- `ClusteringProvider` — `QDRANT` (default), `HDBSCAN`
- `IndexingStatus` / `ClusteringJobStatus` — `PENDING` / `PROCESSING` (or `RUNNING`) / `COMPLETED` / `FAILED`

### Relevant Prisma defaults (per-org, overridable)
| Field | Default | Notes |
|---|---|---|
| `minConfidence` | 0.5 | GlobalSettings singleton defaults to 0.7 |
| `minSizePx` | 60 | Px size threshold |
| `searchDefaultTopK` | 50 | Applied when a search request omits `topK` |
| `searchMinSimilarity` | 0.6 | Cosine-distance floor |
| `embeddingCacheTtlSeconds` | 1800 | 30 minutes |
| `clusteringSimilarityThreshold` | 0.6 | Union-Find merge cut-off |
| `clusteringMinClusterSize` | 2 | HDBSCAN param |
| `clusteringMinSamples` | 2 | HDBSCAN param |

---

## Qdrant

- **Collection name:** `org_{orgSlug}_event_{eventSlug}_faces` (sanitised in [src/utils/slug.ts](src/utils/slug.ts))
- **Vector size:** 512
- **Distance:** cosine
- **HNSW:** `m=16`, `ef_construction=100`
- **Auto-indexing threshold:** 1000 vectors

Each point payload captures: `photoId`, `eventId`, `faceIndex`, `bbox`, `confidence`, `detectorSource`, `wasAligned`, optional `age` / `gender` / `pose`, `indexedAt`. Implementation: [src/services/qdrant.service.ts](src/services/qdrant.service.ts).

---

## BullMQ queues

| Queue | Concurrency | Attempts | Backoff | Keep (done / failed) | What it does |
|---|---|---|---|---|---|
| `face-indexing` | 2 | 3 | exp 1 s | 1 000 / 5 000 | Fetch image (URL or shared storage) → detect (CompreFace or InsightFace via vision-core) → filter by quality → upsert into Qdrant → update `EventImageStatus` |
| `video-processing` | 1 | 1 | — | 1 000 / 5 000 | ffmpeg extract frames (1 fps) → create `EventImageStatus` rows → enqueue `face-indexing` per frame |
| `face-clustering` | 1 | 2 | exp 5 s | 100 / 100 | Pull vectors from Qdrant → Qdrant Union-Find **or** vision-core HDBSCAN → persist `PersonCluster` + `FaceClusterAssignment` |

`face-indexing` concurrency is intentionally low to avoid OOM when Sharp and InsightFace run together on the same node ([src/queues/face-indexing.queue.ts:153](src/queues/face-indexing.queue.ts#L153)). Video frame extraction defaults to **1 frame per second** ([src/queues/video-processing.queue.ts:76](src/queues/video-processing.queue.ts#L76)).

All job data carries a snapshot of `orgSettings` so the worker doesn’t re-read the DB per job.

---

## Face pipeline

```
POST /api/v1/index/photo
  ↓
create/upsert EventImageStatus (PENDING) → enqueue face-indexing
  ↓ BullMQ worker
fetch image → resize if huge (>2500 px)
  ↓ provider
  ├── COMPREFACE   → POST {comprefaceUrl}/api/v1/recognition/recognize
  └── INSIGHTFACE  → POST {pythonSidecarUrl}/insightface/detect-and-embed
  ↓
face-quality filter (minConfidence, minSizePx, skipExtremeAngles)
  ↓
qdrant.indexFaces() → upsert 512-dim points with rich payload
  ↓
update EventImageStatus (COMPLETED, facesDetected, facesIndexed)
```

Clustering reads vectors back out and runs either a Node Union-Find (QDRANT) or HDBSCAN via vision-core (HDBSCAN). Results are persisted as `PersonCluster` rows with representative face thumbnails rendered through [src/services/thumbnail.service.ts](src/services/thumbnail.service.ts).

---

## Environment variables

| Var | Required | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | — | `development` | — |
| `PORT` | — | `4001` | HTTP port |
| `DATABASE_URL` | — | `postgresql://postgres:postgres@localhost:5432/img_analyse` | Prisma DSN |
| `MASTER_API_KEY` | **yes** (≥8 chars) | `master-key-change-me-in-production` | Admin ops |
| `QDRANT_URL` | — | `http://localhost:6333` | Qdrant REST |
| `QDRANT_API_KEY` | — | — | optional |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | — | `localhost` / `6379` / — | BullMQ + caches |
| `PYTHON_SIDECAR_URL` | — | `http://localhost:4002` | vision-core base URL |
| `LOG_LEVEL` | — | `info` | winston |

CompreFace URL / API keys and all detection / clustering knobs are stored in `GlobalSettings` or per-org `Organization` settings, not in env.

---

## Health & logging

- `GET /health/detailed` probes Postgres (`$queryRaw('SELECT 1')`), Redis (`ping`), Qdrant (`getCollections`), and any downstream the org needs (CompreFace / sidecar).
- winston writes to `logs/error.log` (errors only) and `logs/combined.log` (everything). Format is JSON + custom printf; console output is colorised.
- morgan logs each HTTP request.

---

## Docker Compose

[docker-compose.yml](docker-compose.yml) starts **Qdrant** and (optionally) the full **CompreFace** stack. Postgres and Redis live in the photography service’s compose file — share them across both services.

```bash
docker compose up -d qdrant                     # minimum
docker compose up -d qdrant compreface-fe ...   # if using CompreFace provider
```

---

## See also

- [next-frontend-faceIQ](../next-frontend-faceIQ/) — admin dashboard for this service
- [node-backend-photography](../../photography/node-backend-photography/) — main caller
- [common/vision-core](../../common/vision-core/) — InsightFace / SCRFD / YuNet / HDBSCAN sidecar
