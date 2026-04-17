# photography

Event-photography gallery platform — the primary product of the Vision repo. Photographers upload galleries, clients view them, and AI-powered face search (delegated to [faceIQ](../faceIQ/)) lets a client find every photo they appear in.

```
photography/
├── node-backend-photography/   # Express + Prisma API                :4000
├── next-frontend-photography/  # Next.js portal + client gallery     :3000
├── data-photography/           # Sample data (images, videos, gallery templates)
└── docs-photography/           # Pipeline & ops notes
```

## Subservices

| Folder | What it is | Port | Docs |
|---|---|---|---|
| [node-backend-photography/](node-backend-photography/) | Main product API — auth, events, albums, photos, uploads, comments, likes, favorites, download packages, analytics, super-admin | 4000 | [README](node-backend-photography/README.md) |
| [next-frontend-photography/](next-frontend-photography/) | Photographer portal (create events, upload, manage) + client gallery (8 view modes, face search, favorites, downloads) + super-admin dashboard | 3000 | [README](next-frontend-photography/README.md) |

## Reference data

- [data-photography/images/](data-photography/images/) — sample photos for local testing
- [data-photography/videos/](data-photography/videos/) — sample videos for frame-extraction flows
- [data-photography/templates/](data-photography/templates/) — reference gallery template layouts

## Docs

- [docs-photography/FACE_DETECTION_PIPELINE.md](docs-photography/FACE_DETECTION_PIPELINE.md) — end-to-end walkthrough of the detection / indexing pipeline used when a photographer uploads photos.

## How it fits together

```
Browser
   │
   ▼
next-frontend-photography (:3000)
   │   HTTP (Bearer JWT)
   ▼
node-backend-photography (:4000) ────────► node-backend-faceIQ (:4001)
   │   Postgres `pics`                          │   Postgres `img_analyse`
   │   Redis (BullMQ)                           │   Qdrant + Redis
   │   ./uploads + common/shared-storage        │   → common/vision-core (:4002)
```

When a photo is uploaded, the backend processes it locally (HEIC→JPEG, thumbnail, watermark) and then asynchronously indexes faces via faceIQ. Failures on the face-indexing side never block an upload.

## Local dev

```bash
# 1. Shared infra
cd node-backend-photography
docker compose up -d                         # postgres + redis

# 2. API
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev                                  # → :4000

# 3. Frontend (separate terminal)
cd ../next-frontend-photography
npm install
npm run dev                                  # → :3000
```

For face search to actually work, also start [../faceIQ/node-backend-faceIQ/](../faceIQ/node-backend-faceIQ/) on `:4001` and [../common/vision-core/](../common/vision-core/) on `:4002`.
