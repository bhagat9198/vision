# PICS - Photography & Vision Intelligence Platform

A multi-service platform for **photography event management** with AI-powered face detection/search, and **video surveillance** with anomaly detection.

---

## Repository Structure

```
pics/
├── img-analyse/                  # Photo gallery platform (primary product)
│   ├── api-node-backend/         # Main product API (Express + Prisma)
│   ├── img-analyse-backend/      # Face analysis microservice (Express + Qdrant)
│   ├── client-next-frontend/            # Photographer & client portal (Next.js 16)
│   ├── admin-next-frontend/     # Admin monitoring dashboard (Next.js 16)
│   ├── docs/
│   └── scripts/
│
├── visionIQ/                     # Video surveillance platform (early stage)
│   ├── node-backend/             # REST API (Express + Prisma)
│   ├── python-workers/           # Video processing workers (Redis Streams)
│   ├── next-frontend/            # (not started)
│   └── docs/
│
└── common/                       # Shared services
    ├── vision-core/              # Python ML sidecar (FastAPI + InsightFace)
    └── shared-storage/           # Shared file storage mount
```

---

## Architecture Diagram

### How All Services Connect

```
                              ┌──────────────────────────────────────────────────────┐
                              │                    img-analyse                        │
                              │                                                      │
 ┌─────────────┐   HTTP       │  ┌──────────────────┐        ┌────────────────────┐  │
 │   Browser    │────────────►│  │  client-next-frontend    │        │ admin-next-frontend       │  │
 │  (end user)  │◄────────────│  │  (Next.js :3000)  │        │ frontend (:3001)   │  │
 └─────────────┘              │  │                   │        │ (admin dashboard)  │  │
                              │  │  Photographer     │        │                    │  │
                              │  │  Portal + Client  │        │  Org management    │  │
                              │  │  Gallery          │        │  Health monitoring │  │
                              │  └────────┬──────────┘        │  Settings config   │  │
                              │           │ API calls          └─────────┬──────────┘  │
                              │           ▼                              │              │
                              │  ┌──────────────────┐                   │ API calls    │
                              │  │ api-node-backend  │                   │              │
                              │  │ (Express :4000)   │                   │              │
                              │  │                   │                   │              │
                              │  │ - Auth (JWT/OTP)  │                   │              │
                              │  │ - Events/Albums   │  internal HTTP    │              │
                              │  │ - Photos/Uploads  │  (x-internal-key) │              │
                              │  │ - Comments/Likes  │──────────┐       │              │
                              │  │ - Favorites       │          │       │              │
                              │  │ - Subscriptions   │          ▼       ▼              │
                              │  │ - Analytics       │  ┌────────────────────┐         │
                              │  └──────────────────┘  │ img-analyse-backend│         │
                              │                         │ (Express :4001)    │         │
                              │                         │                    │         │
                              │                         │ - Face detection   │         │
                              │                         │ - Face indexing    │         │
                              │                         │ - Face search      │         │
                              │                         │ - Face clustering  │         │
                              │                         │ - Video processing │         │
                              │                         │ - Multi-tenant orgs│         │
                              │                         └───┬──────┬────────┘         │
                              │                             │      │                   │
                              └─────────────────────────────┼──────┼───────────────────┘
                                                            │      │
                                    ┌───────────────────────┘      └──────────────┐
                                    │ HTTP                                         │ HTTP
                                    ▼                                              ▼
                   ┌─────────────────────────────┐              ┌──────────────────────────┐
                   │       common/vision-core     │              │       Qdrant             │
                   │       (FastAPI :4002)         │              │   (Vector DB :6333)      │
                   │                               │              │                          │
                   │  - YuNet face detection        │              │  - 512-dim embeddings    │
                   │  - SCRFD face detection         │              │  - Cosine similarity     │
                   │  - InsightFace (ArcFace)        │              │  - Per-event collections │
                   │  - Face alignment               │              │  - HNSW indexing         │
                   │  - HDBSCAN clustering           │              └──────────────────────────┘
                   │  - Age/gender estimation        │
                   └─────────────────────────────────┘


                              ┌──────────────────────────────────────────────────────┐
                              │                      visionIQ                         │
                              │                                                      │
                              │  ┌──────────────────┐      ┌──────────────────────┐  │
                              │  │  node-backend     │      │   python-workers     │  │
                              │  │  (Express :8000)  │      │   (Redis Streams)    │  │
                              │  │                   │      │                      │  │
                              │  │  - Users/Auth     │      │  - Frame extraction  │  │
                              │  │  - Cameras        │ Redis│  - Motion detection  │  │
                              │  │  - Jobs           │◄────►│  - Frame description │  │
                              │  │  - Sessions       │Streams  - Session eval     │  │
                              │  │  - Events/Rules   │      │  - Event creation    │  │
                              │  │  - Profiles       │      │                      │  │
                              │  └──────────────────┘      └──────────┬───────────┘  │
                              │                                        │              │
                              └────────────────────────────────────────┼──────────────┘
                                                                       │
                                                            Uses vision-core
                                                            + Qdrant (shared)


              ┌───────────────────── Shared Infrastructure ─────────────────────┐
              │                                                                  │
              │   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
              │   │PostgreSQL│    │  Redis    │    │  Qdrant  │    │ Shared   │  │
              │   │          │    │          │    │          │    │ Storage  │  │
              │   │ pics     │    │ BullMQ   │    │ Vectors  │    │ /common/ │  │
              │   │ img_anal │    │ Caching  │    │ 512-dim  │    │ shared-  │  │
              │   │ visioniq │    │ Streams  │    │ faces    │    │ storage/ │  │
              │   └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
              │                                                                  │
              └──────────────────────────────────────────────────────────────────┘
```

### Sequence: Photo Upload to Face Search

```
 Photographer          next-frontend         api-node-backend      img-analyse-backend     vision-core        Qdrant
      │                     │                       │                       │                    │               │
      │  Upload photos      │                       │                       │                    │               │
      ├────────────────────►│                       │                       │                    │               │
      │                     │  POST /uploads/init   │                       │                    │               │
      │                     ├──────────────────────►│                       │                    │               │
      │                     │  Upload chunks        │                       │                    │               │
      │                     ├──────────────────────►│                       │                    │               │
      │                     │                       │                       │                    │               │
      │                     │                       ├─ BullMQ: process ────►│                    │               │
      │                     │                       │  thumbnails, resize   │                    │               │
      │                     │                       │                       │                    │               │
      │                     │                       │  POST /index/photo    │                    │               │
      │                     │                       ├──────────────────────►│                    │               │
      │                     │                       │  (x-internal-key)     │                    │               │
      │                     │                       │                       │                    │               │
      │                     │                       │                       │  POST /insightface │               │
      │                     │                       │                       │  /detect-and-embed │               │
      │                     │                       │                       ├───────────────────►│               │
      │                     │                       │                       │  faces + 512d vecs │               │
      │                     │                       │                       │◄───────────────────┤               │
      │                     │                       │                       │                    │               │
      │                     │                       │                       │  PUT /collections  │               │
      │                     │                       │                       │  (upsert points)   │               │
      │                     │                       │                       ├───────────────────────────────────►│
      │                     │                       │                       │                    │               │
      │                     │                       │◄──────────────────────┤ 200 indexed        │               │
      │                     │                       │                       │                    │               │
      │                     │                       │                       │                    │               │
 Client                     │                       │                       │                    │               │
      │  Search by selfie   │                       │                       │                    │               │
      ├────────────────────►│                       │                       │                    │               │
      │                     │  POST /search/photo   │                       │                    │               │
      │                     ├──────────────────────►│                       │                    │               │
      │                     │                       │  POST /search/photo   │                    │               │
      │                     │                       ├──────────────────────►│                    │               │
      │                     │                       │                       │  extract embedding │               │
      │                     │                       │                       ├───────────────────►│               │
      │                     │                       │                       │◄───────────────────┤               │
      │                     │                       │                       │                    │               │
      │                     │                       │                       │  search similar    │               │
      │                     │                       │                       ├───────────────────────────────────►│
      │                     │                       │                       │  matching photoIds │               │
      │                     │                       │                       │◄──────────────────────────────────┤
      │                     │                       │◄──────────────────────┤                    │               │
      │                     │◄──────────────────────┤  photos with faces    │                    │               │
      │◄────────────────────┤  gallery results      │                       │                    │               │
      │                     │                       │                       │                    │               │
```

---

## Projects

### 1. img-analyse (Photo Gallery Platform)

The primary product. A platform for **event photographers** to upload, manage, and share photo galleries with clients, featuring AI-powered face search.

#### Services

| Service | Port | Tech | Purpose |
|---------|------|------|---------|
| [api-node-backend](img-analyse/api-node-backend/) | 4000 | Express, Prisma, BullMQ | Main product API: auth, events, albums, photos, uploads, social features |
| [img-analyse-backend](img-analyse/img-analyse-backend/) | 4001 | Express, Prisma, Qdrant | Face analysis microservice: detection, indexing, search, clustering |
| [next-frontend](img-analyse/next-frontend/) | 3000 | Next.js 16, React 19, shadcn/ui | Photographer portal + client gallery (69 components) |
| [admin-next-frontend](img-analyse/admin-next-frontend/) | 3001 | Next.js 16, React 19, shadcn/ui | Admin dashboard for monitoring face indexing (28 components) |

#### api-node-backend vs img-analyse-backend

| | api-node-backend | img-analyse-backend |
|---|---|---|
| **Role** | Product API (business logic) | AI microservice (ML logic) |
| **Called by** | Frontends (next-frontend) | api-node-backend (internal) |
| **Auth** | JWT + OTP for end users | API keys + master key |
| **Database** | `pics` - users, events, albums, photos, social | `img_analyse` - orgs, face clusters, indexing status |
| **Owns** | Galleries, uploads, subscriptions, analytics | Face detection, embeddings, vector search, clustering |
| **External deps** | img-analyse-backend | vision-core, Qdrant, CompreFace |
| **Queue jobs** | Thumbnail generation, event cleanup | Face indexing, clustering, video frames |

#### Key Features
- 8 gallery templates (Masonry, Grid, Carousel, Timeline, Filmstrip, Collage, Story, Magazine)
- Chunked file uploads with session tracking
- Face search: upload a selfie to find all your photos
- Face clustering: auto-group detected faces by person
- Multi-tenant: per-organization settings for face analysis
- Social: comments, likes, favorites, download packages
- Subscription tiers: FREE, PRO, BUSINESS

#### Face Processing Pipeline
```
Photo Upload
    → Detection (CompreFace → fallback: SCRFD → YuNet)
    → Alignment (5-point landmarks, 112x112 crop)
    → Embedding (InsightFace ArcFace, 512-dim vector)
    → Indexing (Qdrant vector DB, per-event collection)
    → Clustering (HDBSCAN or Qdrant-based Union-Find)
    → Search (cosine similarity, top-K matching)
```

---

### 2. visionIQ (Video Surveillance Platform)

Early-stage platform for **AI-powered video surveillance** with anomaly detection, rule-based event generation, and person tracking.

#### Services

| Service | Port | Tech | Purpose |
|---------|------|------|---------|
| [node-backend](visionIQ/node-backend/) | 8000 | Express, Prisma, BullMQ | REST API: users, cameras, jobs, sessions, events, rules |
| [python-workers](visionIQ/python-workers/) | - | Python, Redis Streams, asyncpg | Video processing pipeline workers |
| next-frontend | - | - | Not started |

#### Data Flow (Redis Streams)
```
Video Upload → video.uploaded
    → Frame Extraction → frames.extracted
    → Motion Detection → frames.motion
    → Frame Description → frame.described
    → Session Evaluation → session.evaluate
    → Rules Applied → session.rules_ready
    → Event Detected → event.created
    → Event Persisted → event.written
    → Job DONE
```

#### Database Models
- **User** - Account management
- **Camera** - User-owned devices with location
- **Job** - Video processing jobs (QUEUED → EXTRACTING → PROCESSING → EVALUATING → DONE/FAILED)
- **Session** - Continuous event windows with timeline
- **Rule** - Detection rules (TEMPLATE, CUSTOM, AI_GENERATED)
- **Profile** - Person/vehicle profiles with face vector IDs
- **Event** - Detected incidents with severity (LOW/MEDIUM/HIGH)

---

### 3. common (Shared Services)

#### [vision-core](common/vision-core/) (Port 4002)

Python FastAPI sidecar service for ML inference, shared by both img-analyse and visionIQ.

| Endpoint | Purpose |
|----------|---------|
| `POST /detect/yunet` | Fast face detection (frontal faces) |
| `POST /detect/scrfd` | Robust face detection (difficult angles) |
| `POST /align` | Face alignment via 5-point landmarks |
| `POST /insightface/detect-and-embed` | All-in-one: detect + embed + age/gender |
| `POST /insightface/embed` | Embedding extraction from cropped face |
| `POST /insightface/detect` | Detection only (no embeddings) |
| `POST /cluster/hdbscan` | HDBSCAN clustering on embedding vectors |
| `GET /health` | Service health + detector availability |

**Models:**
- YuNet (`face_detection_yunet_2023mar.onnx`) - OpenCV Zoo
- SCRFD (`scrfd_10g_bnkps.onnx`) - HuggingFace
- InsightFace buffalo_l (ArcFace) - auto-downloads on first use (~326MB)

#### [shared-storage](common/shared-storage/)
Shared filesystem mount for images, videos, thumbnails, and temp processing files across services.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui + Radix UI, Framer Motion |
| **Backend** | Express.js, TypeScript, Prisma ORM, BullMQ |
| **ML/AI** | FastAPI, InsightFace (ArcFace), OpenCV, ONNX Runtime, HDBSCAN |
| **Databases** | PostgreSQL (3 databases), Redis (queues + cache + streams), Qdrant (vector search) |
| **Infra** | Docker, Docker Compose |
| **Auth** | JWT, OTP (email/phone), API keys, bcrypt |
| **Image Processing** | Sharp, FFmpeg |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose

### Quick Start

**1. Start shared infrastructure:**
```bash
# PostgreSQL + Redis (from api-node-backend)
cd img-analyse/api-node-backend
docker compose up -d

# Qdrant vector DB (from img-analyse-backend)
cd img-analyse/img-analyse-backend
docker compose up -d qdrant

# Python ML sidecar
cd common/vision-core
docker compose up -d
```

**2. Start img-analyse backends:**
```bash
# Terminal 1: Main API
cd img-analyse/api-node-backend
cp .env.example .env    # configure DB, Redis, JWT secret
npm install
npx prisma migrate dev
npm run dev              # → http://localhost:4000

# Terminal 2: Face analysis service
cd img-analyse/img-analyse-backend
cp .env.example .env    # configure DB, Redis, Qdrant, sidecar URL
npm install
npx prisma migrate dev
npm run dev              # → http://localhost:4001
```

**3. Start frontend:**
```bash
cd img-analyse/next-frontend
npm install
npm run dev              # → http://localhost:3000
```

**4. (Optional) Start visionIQ:**
```bash
cd visionIQ/node-backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev              # → http://localhost:8000
```

### Environment Variables

Each service has a `.env.example` file. Key variables:

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | All backends | PostgreSQL connection string |
| `REDIS_HOST` / `REDIS_PORT` | All backends | Redis connection |
| `JWT_SECRET` | api-node-backend | JWT signing secret |
| `INTERNAL_API_KEY` | api-node-backend | Key for calling img-analyse-backend |
| `MASTER_API_KEY` | img-analyse-backend | Master key for admin operations |
| `QDRANT_URL` | img-analyse-backend, visionIQ | Qdrant vector DB URL |
| `PYTHON_SIDECAR_URL` | img-analyse-backend | vision-core FastAPI URL |
| `COMPREFACE_URL` | img-analyse-backend | CompreFace API URL (optional) |
| `OPENAI_API_KEY` | visionIQ | OpenAI API for frame descriptions |

---

## Database Overview

| Database | Service | Key Tables |
|----------|---------|------------|
| `pics` | api-node-backend | Photographer, Event, Album, Photo, Comment, PhotoLike, FavoritePhoto, DetectedFace, PersonTag, UploadSession, ClientVisit |
| `img_analyse` | img-analyse-backend | Organization, ApiKey, EventImageStatus, PersonCluster, FaceClusterAssignment, ClusteringJob, GlobalSettings, CollectionSettings |
| `visioniq` | visionIQ node-backend | User, Camera, Job, Session, Event, Rule, Profile |

---

## Service Ports

| Service | Port |
|---------|------|
| api-node-backend | 4000 |
| img-analyse-backend | 4001 |
| vision-core (Python) | 4002 |
| next-frontend | 3000 |
| admin-next-frontend | 3001 |
| visionIQ node-backend | 8000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Qdrant (REST) | 6333 |
| Qdrant (gRPC) | 6334 |
| CompreFace (optional) | 8000 |

---

## Project Status

| Project | Status | Notes |
|---------|--------|-------|
| img-analyse | Active development | Full stack operational - galleries, face search, clustering |
| visionIQ | Early stage | Backend schema + Python workers scaffolded, no frontend |
| vision-core | Stable | Shared ML sidecar, used by both projects |

---

## No CI/CD

This repository currently has no CI/CD pipelines. Deployment is manual via Docker Compose.
