# Vision — Photography, FaceIQ & VisionIQ Platform

A multi-service platform combining:

- **photography** — event photography gallery management
- **faceIQ** — AI-powered face detection, indexing, clustering, and search
- **visionIQ** — video surveillance with anomaly detection and rule-based events
- **common** — shared ML sidecar (`vision-core`) and shared storage

---

## Repository Structure

```
vision/
├── photography/                          # Photo gallery product
│   ├── node-backend-photography/         # Main product API (Express + Prisma)         :4000
│   ├── next-frontend-photography/        # Photographer & client portal (Next.js 16)   :3000
│   ├── data-photography/                 # Sample images / videos / gallery templates
│   └── docs-photography/                 # Product docs (face detection pipeline, etc.)
│
├── faceIQ/                               # Face analysis platform
│   ├── node-backend-faceIQ/              # Face analysis microservice (Express + Qdrant) :4001
│   └── next-frontend-faceIQ/             # Admin dashboard (Next.js 16)                 :3001
│
├── visionIQ/                             # Video surveillance platform
│   ├── node-backend-visionIQ/            # REST API (Express + Prisma)                  :8000
│   ├── python-workers-visionIQ/          # Video processing workers (Redis Streams)
│   ├── next-frontend-visionIQ/           # (not started)
│   └── docs-visionIQ/
│
├── common/                               # Shared services
│   ├── vision-core/                      # Python ML sidecar (FastAPI + InsightFace)    :4002
│   └── shared-storage/                   # Shared filesystem mount
│
└── scripts/                              # Repo-wide utilities (log cleanup, tunneling)
```

---

## Architecture

```
                      ┌───────────────────────────────────────────────────────────┐
                      │                     photography                            │
                      │                                                           │
   ┌─────────────┐    │   ┌─────────────────────────────┐                         │
   │   Browser   │───►│   │ next-frontend-photography   │                         │
   │ (end user)  │    │   │        (Next.js :3000)       │                         │
   └─────────────┘    │   └──────────────┬──────────────┘                         │
                      │                  │ API calls                              │
                      │                  ▼                                         │
                      │   ┌─────────────────────────────┐                         │
                      │   │  node-backend-photography   │                         │
                      │   │       (Express :4000)       │                         │
                      │   │                             │                         │
                      │   │  - Auth (JWT/OTP)           │                         │
                      │   │  - Events / Albums / Photos │  internal HTTP          │
                      │   │  - Uploads / Comments       │  (x-internal-key)       │
                      │   │  - Favorites / Analytics    │──────────┐              │
                      │   │  - Subscriptions            │          │              │
                      │   └─────────────────────────────┘          │              │
                      └────────────────────────────────────────────┼──────────────┘
                                                                   │
                      ┌────────────────────────────────────────────┼──────────────┐
                      │                      faceIQ                │              │
                      │                                            ▼              │
                      │   ┌─────────────────────────┐   ┌────────────────────┐   │
                      │   │ next-frontend-faceIQ    │   │ node-backend-faceIQ│   │
                      │   │ (admin dashboard :3001) │──►│   (Express :4001)  │   │
                      │   │                         │   │                    │   │
                      │   │ - Org management        │   │ - Face detection   │   │
                      │   │ - Health monitoring     │   │ - Face indexing    │   │
                      │   │ - Settings config       │   │ - Face search      │   │
                      │   └─────────────────────────┘   │ - Face clustering  │   │
                      │                                 │ - Video frames     │   │
                      │                                 │ - Multi-tenant orgs│   │
                      │                                 └────┬────────┬──────┘   │
                      └──────────────────────────────────────┼────────┼──────────┘
                                                             │        │
                             ┌───────────────────────────────┘        └───────────┐
                             ▼                                                     ▼
              ┌──────────────────────────────┐              ┌──────────────────────────┐
              │     common/vision-core        │              │         Qdrant           │
              │      (FastAPI :4002)          │              │    (Vector DB :6333)     │
              │                               │              │                          │
              │  - YuNet / SCRFD detection     │              │  - 512-dim embeddings    │
              │  - InsightFace (ArcFace)       │              │  - Cosine similarity     │
              │  - Face alignment              │              │  - Per-event collections │
              │  - HDBSCAN clustering          │              │  - HNSW indexing         │
              │  - Age / gender estimation     │              └──────────────────────────┘
              └──────────────────────────────┘


                      ┌───────────────────────────────────────────────────────────┐
                      │                      visionIQ                              │
                      │                                                           │
                      │  ┌─────────────────────────┐   ┌───────────────────────┐  │
                      │  │ node-backend-visionIQ   │   │ python-workers-visionIQ│ │
                      │  │   (Express :8000)       │   │   (Redis Streams)     │  │
                      │  │                         │   │                       │  │
                      │  │  - Users / Auth         │   │  - Frame extraction   │  │
                      │  │  - Cameras              │   │  - Motion detection   │  │
                      │  │  - Jobs                 │◄─►│  - Frame description  │  │
                      │  │  - Sessions             │   │  - Session evaluation │  │
                      │  │  - Events / Rules       │   │  - Event creation     │  │
                      │  │  - Profiles             │   │                       │  │
                      │  └─────────────────────────┘   └───────────┬───────────┘  │
                      │                                            │              │
                      └────────────────────────────────────────────┼──────────────┘
                                                                   │
                                                        uses vision-core + Qdrant


        ┌──────────────────────── Shared Infrastructure ────────────────────────┐
        │                                                                        │
        │   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐     │
        │   │PostgreSQL│    │  Redis   │    │  Qdrant  │    │Shared Storage│     │
        │   │          │    │          │    │          │    │              │     │
        │   │ pics     │    │ BullMQ   │    │ Vectors  │    │   common/    │     │
        │   │ img_anal │    │ Caching  │    │ 512-dim  │    │   shared-    │     │
        │   │ visioniq │    │ Streams  │    │ faces    │    │   storage/   │     │
        │   └──────────┘    └──────────┘    └──────────┘    └──────────────┘     │
        │                                                                        │
        └────────────────────────────────────────────────────────────────────────┘
```

### Sequence: Photo upload → face search

```
 Photographer    next-frontend-    node-backend-     node-backend-     vision-core    Qdrant
                  photography       photography          faceIQ
      │               │                 │                  │               │           │
      │ Upload photos │                 │                  │               │           │
      ├──────────────►│  POST /uploads  │                  │               │           │
      │               ├────────────────►│                  │               │           │
      │               │                 ├─ BullMQ process ►│               │           │
      │               │                 │  POST /index/photo (x-internal) │           │
      │               │                 ├─────────────────►│               │           │
      │               │                 │                  │ POST detect-  │           │
      │               │                 │                  │ and-embed     │           │
      │               │                 │                  ├──────────────►│           │
      │               │                 │                  │◄──────────────┤           │
      │               │                 │                  │ upsert points │           │
      │               │                 │                  ├──────────────────────────►│
      │               │                 │◄─────────────────┤ 200 indexed   │           │
      │               │                 │                  │               │           │
 Client              │                 │                  │               │           │
      │ Search by selfie              │                  │               │           │
      ├──────────────►│ POST /search    │                  │               │           │
      │               ├────────────────►│ POST /search     │               │           │
      │               │                 ├─────────────────►│ extract embed │           │
      │               │                 │                  ├──────────────►│           │
      │               │                 │                  │◄──────────────┤           │
      │               │                 │                  │ search similar│           │
      │               │                 │                  ├──────────────────────────►│
      │               │                 │                  │◄──────────────────────────┤
      │               │                 │◄─────────────────┤ matching photos           │
      │               │◄────────────────┤                  │               │           │
      │◄──────────────┤ gallery results │                  │               │           │
```

---

## Projects

### 1. photography — photo gallery platform

Primary product. A platform for **event photographers** to upload, manage, and share galleries with clients, with AI-powered face search.

| Service | Path | Port | Tech |
|---------|------|------|------|
| Product API | [photography/node-backend-photography/](photography/node-backend-photography/) | 4000 | Express, Prisma, BullMQ |
| Portal & gallery | [photography/next-frontend-photography/](photography/next-frontend-photography/) | 3000 | Next.js 16, React 19, shadcn/ui |
| Sample data | [photography/data-photography/](photography/data-photography/) | — | Images, videos, templates |
| Docs | [photography/docs-photography/](photography/docs-photography/) | — | Pipeline & ops notes |

**Key features**
- **8 gallery view modes** (Masonry, Grid, Carousel, Timeline, Filmstrip, Collage, Story, Magazine) — chosen by the client
- **6 theme presets** (MODERN, CLASSIC, MINIMAL, ELEGANT, FASHION, SIDEBAR) — chosen by the photographer in event settings
- Chunked file uploads (5 MB chunks, 4 parallel files) with session tracking and retry
- Face search: upload a selfie to find all your photos
- Social: comments, likes, favorites (with custom folders), download packages
- Subscription tiers: FREE, PRO, BUSINESS

### 2. faceIQ — face analysis platform

AI microservice and admin dashboard for face detection, indexing, clustering, and search. Called internally by `node-backend-photography` and by other future products.

| Service | Path | Port | Tech |
|---------|------|------|------|
| Face analysis API | [faceIQ/node-backend-faceIQ/](faceIQ/node-backend-faceIQ/) | 4001 | Express, Prisma, Qdrant |
| Admin dashboard | [faceIQ/next-frontend-faceIQ/](faceIQ/next-frontend-faceIQ/) | 3001 | Next.js 16, React 19, shadcn/ui |

**photography vs faceIQ**

| | node-backend-photography | node-backend-faceIQ |
|---|---|---|
| **Role** | Product API (business logic) | AI microservice (ML logic) |
| **Called by** | Frontends | node-backend-photography (internal) |
| **Auth** | JWT + OTP for end users | API keys + master key |
| **Database** | `pics` | `img_analyse` |
| **Owns** | Galleries, uploads, subscriptions, analytics | Face detection, embeddings, vector search, clustering |
| **External deps** | node-backend-faceIQ | vision-core, Qdrant, CompreFace |
| **Queue jobs** | Thumbnail generation, event cleanup | Face indexing, clustering, video frames |

**Face processing pipeline**
```
Photo upload
  → Detection   (CompreFace → fallback SCRFD → YuNet)
  → Alignment   (5-point landmarks, 112x112 crop)
  → Embedding   (InsightFace ArcFace, 512-dim vector)
  → Indexing    (Qdrant, per-event collection)
  → Clustering  (HDBSCAN or Qdrant-based Union-Find)
  → Search      (cosine similarity, top-K)
```

### 3. visionIQ — video surveillance platform

Early-stage platform for AI-powered video surveillance with anomaly detection, rule-based events, and person tracking.

| Service | Path | Port | Tech |
|---------|------|------|------|
| REST API | [visionIQ/node-backend-visionIQ/](visionIQ/node-backend-visionIQ/) | 8000 | Express, Prisma, BullMQ |
| Workers | [visionIQ/python-workers-visionIQ/](visionIQ/python-workers-visionIQ/) | — | Python, Redis Streams, asyncpg |
| Frontend | [visionIQ/next-frontend-visionIQ/](visionIQ/next-frontend-visionIQ/) | — | Not started |
| Docs | [visionIQ/docs-visionIQ/](visionIQ/docs-visionIQ/) | — | — |

**Data flow (Redis Streams)**
```
Video upload → video.uploaded
  → Frame extraction    → frames.extracted
  → Motion detection    → frames.motion
  → Frame description   → frame.described
  → Session evaluation  → session.evaluate
  → Rules applied       → session.rules_ready
  → Event detected      → event.created
  → Event persisted     → event.written
  → Job DONE
```

**Database models**
- **User** — account management
- **Camera** — user-owned devices with location
- **Job** — video processing jobs (QUEUED → EXTRACTING → PROCESSING → EVALUATING → DONE/FAILED)
- **Session** — continuous event windows with timeline
- **Rule** — detection rules (TEMPLATE, CUSTOM, AI_GENERATED)
- **Profile** — person/vehicle profiles with face vector IDs
- **Event** — detected incidents with severity (LOW/MEDIUM/HIGH)

### 4. common — shared services

#### [common/vision-core/](common/vision-core/) (Port 4002)

Python FastAPI sidecar for ML inference, shared by both faceIQ and visionIQ.

| Endpoint | Purpose |
|----------|---------|
| `POST /detect/yunet` | Fast face detection (frontal faces) |
| `POST /detect/scrfd` | Robust face detection (difficult angles) |
| `POST /align` | Face alignment via 5-point landmarks |
| `POST /insightface/detect-and-embed` | Detect + embed + age/gender |
| `POST /insightface/embed` | Embedding from cropped face |
| `POST /insightface/detect` | Detection only |
| `POST /cluster/hdbscan` | HDBSCAN clustering on embedding vectors |
| `GET /health` | Service health + detector availability |

**Models**
- YuNet (`face_detection_yunet_2023mar.onnx`) — OpenCV Zoo
- SCRFD (`scrfd_10g_bnkps.onnx`) — HuggingFace
- InsightFace buffalo_l (ArcFace) — auto-downloads on first use (~326 MB)

#### [common/shared-storage/](common/shared-storage/)
Shared filesystem mount for images, videos, thumbnails, and temp processing files across services.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui + Radix UI, Framer Motion |
| **Backend** | Express.js, TypeScript, Prisma ORM, BullMQ |
| **ML / AI** | FastAPI, InsightFace (ArcFace), OpenCV, ONNX Runtime, HDBSCAN |
| **Databases** | PostgreSQL (3 databases), Redis (queues + cache + streams), Qdrant (vector search) |
| **Infra** | Docker, Docker Compose |
| **Auth** | JWT, OTP (email/phone), API keys, bcrypt |
| **Image processing** | Sharp, FFmpeg |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose

### Quick start

**1. Start shared infrastructure**
```bash
# PostgreSQL + Redis
cd photography/node-backend-photography
docker compose up -d

# Qdrant vector DB
cd ../../faceIQ/node-backend-faceIQ
docker compose up -d qdrant

# Python ML sidecar
cd ../../common/vision-core
docker compose up -d
```

**2. Start photography + faceIQ backends**
```bash
# Terminal 1 — photography API
cd photography/node-backend-photography
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev                  # → http://localhost:4000

# Terminal 2 — faceIQ face analysis service
cd faceIQ/node-backend-faceIQ
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev                  # → http://localhost:4001
```

**3. Start frontends**
```bash
# Photographer & client portal
cd photography/next-frontend-photography
npm install && npm run dev   # → http://localhost:3000

# faceIQ admin dashboard
cd faceIQ/next-frontend-faceIQ
npm install && npm run dev   # → http://localhost:3001
```

**4. (Optional) Start visionIQ**
```bash
cd visionIQ/node-backend-visionIQ
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev                  # → http://localhost:8000
```

### Environment variables

Each service has a `.env.example` file. Key variables:

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | All backends | PostgreSQL connection string |
| `REDIS_HOST` / `REDIS_PORT` | All backends | Redis connection |
| `JWT_SECRET` | node-backend-photography | JWT signing secret |
| `INTERNAL_API_KEY` | node-backend-photography | Key for calling node-backend-faceIQ |
| `MASTER_API_KEY` | node-backend-faceIQ | Master key for admin operations |
| `QDRANT_URL` | node-backend-faceIQ, visionIQ | Qdrant vector DB URL |
| `PYTHON_SIDECAR_URL` | node-backend-faceIQ | vision-core FastAPI URL |
| `COMPREFACE_URL` | node-backend-faceIQ | CompreFace API URL (optional) |
| `OPENAI_API_KEY` | visionIQ | OpenAI API for frame descriptions |

---

## Database Overview

| Database | Service | Key tables |
|----------|---------|------------|
| `pics` | node-backend-photography | Photographer, Event, Album, Photo, Comment, PhotoLike, FavoritePhoto, DetectedFace, PersonTag, UploadSession, ClientVisit |
| `img_analyse` | node-backend-faceIQ | Organization, ApiKey, EventImageStatus, PersonCluster, FaceClusterAssignment, ClusteringJob, GlobalSettings, CollectionSettings |
| `visioniq` | node-backend-visionIQ | User, Camera, Job, Session, Event, Rule, Profile |

---

## Service Ports

| Service | Port |
|---------|------|
| node-backend-photography | 4000 |
| node-backend-faceIQ | 4001 |
| vision-core (Python) | 4002 |
| next-frontend-photography | 3000 |
| next-frontend-faceIQ (admin) | 3001 |
| node-backend-visionIQ | 8000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Qdrant (REST) | 6333 |
| Qdrant (gRPC) | 6334 |
| CompreFace (optional) | 8000 |

---

## Project Status

| Project | Status | Notes |
|---------|--------|-------|
| photography | Active development | Full-stack operational — galleries, uploads, social features |
| faceIQ | Active development | Face detection, indexing, clustering, search; admin dashboard live |
| visionIQ | Early stage | Backend schema + Python workers scaffolded, no frontend |
| common/vision-core | Stable | Shared ML sidecar used by both faceIQ and visionIQ |

---

## Scripts

Repo-wide utilities live in [scripts/](scripts/):

- [scripts/clean_logs.sh](scripts/clean_logs.sh) — clear accumulated log files across services
- [scripts/tunnel.sh](scripts/tunnel.sh) — local tunneling helper

---

## No CI/CD

This repository currently has no CI/CD pipelines. Deployment is manual via Docker Compose.
