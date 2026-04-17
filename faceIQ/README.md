# faceIQ

Multi-tenant face-analysis platform. Detects faces, extracts 512-dim ArcFace embeddings, indexes them in Qdrant, runs similarity search, and clusters faces into people. Consumed today by [photography](../photography/), designed to serve other products too.

```
faceIQ/
├── node-backend-faceIQ/    # Express + Prisma + Qdrant face analysis API    :4001
└── next-frontend-faceIQ/   # Admin dashboard (Next.js 16)                   :3001
```

## Subservices

| Folder | What it is | Port | Docs |
|---|---|---|---|
| [node-backend-faceIQ/](node-backend-faceIQ/) | Face-analysis microservice — detection, indexing, search, clustering, per-org API keys, BullMQ workers | 4001 | [README](node-backend-faceIQ/README.md) |
| [next-frontend-faceIQ/](next-frontend-faceIQ/) | Admin dashboard — monitor vector collections, manage orgs & API keys, drive clustering (merge / split / move / rename), inspect faces with bounding-box overlays | 3001 | [README](next-frontend-faceIQ/README.md) |

## Architecture

```
               Admin (browser)
                      │
                      ▼
       next-frontend-faceIQ (:3001)
              │   x-master-key / x-api-key / x-auth-token
              ▼
┌─────────────────────────────────────┐
│     node-backend-faceIQ (:4001)     │
│                                     │
│   BullMQ queues:                    │
│     face-indexing                   │
│     video-processing                │
│     face-clustering                 │
└───┬────────┬────────┬───────────────┘
    │        │        │
    ▼        ▼        ▼
 Postgres  Redis   Qdrant
 img_      (cache  512-dim
 analyse   + queue) cosine
                     HNSW
                     │
                     ▼
            common/vision-core (:4002)
            InsightFace / SCRFD / YuNet / HDBSCAN

    (optional) CompreFace stack
```

## Multi-tenant model

Every request carries either:

- `x-master-key` — platform key (from `MASTER_API_KEY` env). Used to create orgs, list all orgs, edit global defaults.
- `x-api-key` — per-org UUID from the `ApiKey` table. Used for all indexing / search / clustering work.
- `x-auth-token` — JWT for the admin dashboard user.

Each `Organization` row owns its CompreFace / InsightFace config, quality thresholds, clustering knobs, and image-source mode. Changing them takes effect on the next job without a restart (they’re cached for 5 minutes in Redis).

## Face pipeline (short version)

```
POST /api/v1/index/photo           POST /api/v1/search
        │                                    │
        ▼                                    ▼
enqueue face-indexing           extract embedding
        │                        (same detection path)
        ▼                                    │
detect → embed → filter quality              ▼
        │                         Qdrant cosine search
        ▼                                    │
upsert 512-dim vectors                       ▼
into per-event collection             return matches
```

Full trace, file by file, is in [node-backend-faceIQ/README.md](node-backend-faceIQ/README.md#face-pipeline).

## Local dev

```bash
# Vector DB (and optionally CompreFace)
cd node-backend-faceIQ
docker compose up -d qdrant

# API
cp .env.example .env             # set MASTER_API_KEY, DATABASE_URL (img_analyse), QDRANT_URL
npm install
npx prisma migrate dev
npm run dev                      # → :4001

# Admin dashboard (separate terminal)
cd ../next-frontend-faceIQ
npm install
npm run dev -- -p 3001           # → :3001
```

Postgres + Redis come from the photography compose file — the two services share them, just on different databases (`pics` vs `img_analyse`).
