# node-backend-photography

Main product API for the **photography** platform — the Express + Prisma service that photographers and their clients talk to. Owns authentication, events, albums, photos, chunked uploads, social features (comments / likes / favorites), download packages, analytics, super-admin, and configuration.

Formerly known as `api-node-backend`.

- **Port:** `4000`
- **Database:** PostgreSQL — `pics`
- **Queue backing:** Redis (BullMQ)
- **Internal peers:** [node-backend-faceIQ](../../faceIQ/node-backend-faceIQ/) (face indexing & search)

---

## Quick start

```bash
cp .env.example .env            # edit secrets
docker compose up -d            # postgres + redis
npm install
npx prisma migrate dev          # or: npm run db:migrate
npm run dev                     # → http://localhost:4000
```

Swagger UI: `http://localhost:4000/api-docs`
Health:     `http://localhost:4000/health`

---

## Tech stack

| Area | Choice |
|------|--------|
| Runtime | Node.js ≥ 20 |
| Framework | Express 4.21 |
| Language | TypeScript 5 |
| ORM | Prisma 7 (PostgreSQL) |
| Queue | BullMQ 5 (Redis) |
| Image | Sharp 0.34 + heic-convert |
| Auth | JWT (jsonwebtoken) + bcryptjs + OTP |
| Mail | nodemailer |
| HTTP | axios |
| Security | helmet, cors, express-rate-limit, compression |
| Validation | zod |
| Docs | swagger-jsdoc + swagger-ui-express |
| Logging | winston |

### Scripts

```bash
npm run dev          # tsx watch src/server.ts
npm run build        # tsc → dist/
npm start            # node dist/server.js
npm run db:generate  # prisma generate
npm run db:push      # prisma db push
npm run db:migrate   # prisma migrate dev
npm run db:studio    # prisma studio
npm run db:reset     # reset + run migrations
```

---

## Folder layout (`src/`)

```
src/
├── app.ts                      # Express app, middleware, route registration
├── server.ts                   # bootstrap, graceful shutdown, worker boot
│
├── config/                     # env (zod), database, redis, swagger, constants
├── lib/                        # prisma client wrapper
├── middleware/                 # authenticate, authenticateSuperAdmin,
│                               # optionalAuth, validateInternalKey, validate,
│                               # errorHandler, requestLogger, 404
├── common/
│   ├── exceptions/             # AppError, NotFoundError, ForbiddenError, …
│   ├── services/               # email (nodemailer), sms stubs
│   ├── utils/                  # logger, pagination, response helpers
│   └── types/
│
├── modules/                    # feature modules: controllers / dto / routes / services
│   ├── auth/                   # OTP, password, register, login, profile
│   ├── photographers/          # photographer CRUD, stats, public profile
│   ├── events/                 # events CRUD, public access, password gate
│   ├── albums/                 # hierarchical albums, reorder
│   ├── photos/                 # photos, likes, favorites, comments
│   ├── comments/
│   ├── uploads/                # chunked upload session lifecycle
│   ├── config/                 # system config (auth, storage, face, templates)
│   └── super-admin/            # platform admin
│
├── queues/
│   ├── image-processing.queue.ts   # chunk merge → processing → Photo row
│   └── event-cleanup.queue.ts      # soft/hard delete of event directories
│
├── services/
│   ├── face-analysis.client.ts     # calls node-backend-faceIQ (retries + curl logging)
│   ├── image-processor.service.ts  # HEIC→JPEG, thumbnail, watermark, storage
│   └── storage adapter
│
└── scripts/                    # utility scripts (e.g. token generation)
```

---

## HTTP surface

Prefix for app routes: `/api/v1`.
Static: `/uploads/*`.
Docs:   `/api-docs`, `/api-docs.json`.
Health: `/health`.

### Auth `/api/v1/auth` — rate-limited 30 req / 15 min
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/send-otp` | public | Email OTP for signup / login / reset |
| POST | `/verify-otp` | public | Verify OTP code |
| POST | `/register` | public | Photographer signup (email + password) |
| POST | `/login` | public | Password login → JWT |
| GET  | `/profile` | JWT | Current photographer |
| PATCH | `/profile` | JWT | Update profile |
| PATCH | `/change-password` | JWT | Change password |

### Photographers `/api/v1/photographers`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/me` | JWT | My profile |
| PATCH | `/me` | JWT | Update bio / website / watermark |
| GET | `/me/stats` | JWT | Events / photos / storage stats |
| GET | `/:id` | public | Public profile |

### Events `/api/v1/events`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/public/:id` | public | Public event by id |
| GET | `/public/slug/*` | public | Public event by `photographer/event-name` slug |
| POST | `/:id/verify-password` | public | Password gate |
| POST | `/` | JWT | Create event |
| GET | `/` | JWT | List my events |
| GET | `/:id` | JWT | Event detail |
| PATCH | `/:id` | JWT | Update (template, watermark, permissions) |
| DELETE | `/:id` | JWT | Delete (queued soft / hard) |

### Albums `/api/v1/albums`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/event/:eventId` | optional | List albums in event |
| GET | `/:id` | optional | Album detail |
| POST | `/event/:eventId` | JWT | Create album |
| PATCH | `/:id` | JWT | Rename album |
| DELETE | `/:id` | JWT | Delete album |
| PUT | `/event/:eventId/reorder` | JWT | Reorder (array of albumIds) |

### Photos `/api/v1/photos`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/event/:eventId` | optional | Photos in event |
| GET | `/:id` | optional | Photo + comments + likes + similar |
| POST | `/:id/like` | public | Toggle like (sessionId or userEmail) |
| POST | `/:id/favorite` | public | Toggle favorite into folder |
| POST | `/:photoId/comments` | optional | Add comment |
| GET | `/:photoId/comments` | public | List comments |
| GET | `/me/likes` | JWT | My liked photos |
| GET | `/me/favorites` | JWT | My favorites |
| POST | `/album/:albumId` | JWT | Create single photo |
| POST | `/album/:albumId/bulk` | JWT | Bulk create |
| PATCH | `/:id` | JWT | Update sort / metadata |
| DELETE | `/:id` | JWT | Delete |

### Comments `/api/v1/comments`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/photo/:photoId` | optional | Add comment |
| GET | `/photo/:photoId` | public | List comments |
| DELETE | `/:id` | JWT | Delete (photographer only) |

### Uploads `/api/v1/uploads` — JWT, rate-limited 5000 req / min
| Method | Path | Purpose |
|---|---|---|
| POST | `/init` | Start session — returns `{sessionId, chunkSize, files[]}` |
| GET  | `/:sessionId/status` | Poll progress |
| GET  | `/:sessionId/files/:fileId` | File info + missing chunks |
| PUT  | `/:sessionId/files/:fileId/chunks/:chunkIndex` | Upload one chunk |
| POST | `/:sessionId/files/:fileId/complete` | Enqueue processing |
| POST | `/:sessionId/retry` | Retry failed files (max 3) |

### Config `/api/v1/config`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/auth/public` | public | Enabled login methods |
| GET | `/face-analysis` | internal key | Face-analysis config |
| GET/PATCH | `/auth` | super-admin | Auth config |
| GET | `/test-face-analysis` | super-admin | Ping faceIQ backend |
| GET | `/providers` | super-admin | Enabled message providers |
| CRUD | `/templates` | super-admin | Email / SMS templates |
| GET | `/` | super-admin | All system configs |

### Super-admin `/api/v1/super-admin` — rate-limited 100 req / min
| Method | Path | Purpose |
|---|---|---|
| GET | `/check` | Does a super-admin exist? |
| POST | `/setup` | One-time bootstrap |
| POST | `/login` | Super-admin login |
| GET | `/profile` | Super-admin profile |
| PATCH | `/change-password` | Change password |
| GET | `/dashboard/stats` | Platform metrics |
| GET | `/photographers` | List all |
| PATCH | `/photographers/:id/toggle-status` | Enable / disable |
| GET | `/photographers/:id` | Photographer detail |
| GET | `/events` | All events |
| GET | `/events/:id` | Event detail |

---

## Authentication

Three role-scoped JWTs signed with `JWT_SECRET`, plus a service-to-service header.

| Role | Flow | Middleware | Notes |
|------|------|------------|-------|
| `PHOTOGRAPHER` | OTP → password register / login | `authenticate` | Checked in DB; `isActive` required |
| `CLIENT` | Ephemeral JWT minted for gallery viewers | `authenticate` / `optionalAuth` | No DB check |
| `SUPER_ADMIN` | Password only (no OTP) | `authenticateSuperAdmin` | Bootstrapped via `/super-admin/setup` |
| — | `x-internal-key` header | `validateInternalKey` | Service-to-service (e.g. faceIQ → this API) |

Default expiry `JWT_EXPIRES_IN=7d`. OTP codes live in the `Otp` table with a **10-minute** expiry ([src/modules/auth/auth.service.ts:75](src/modules/auth/auth.service.ts#L75)). Auth routes are rate-limited to 30 attempts per 15 minutes.

---

## Prisma schema (`pics` database)

| Model | Purpose |
|-------|---------|
| `SuperAdmin` | Platform admins |
| `Photographer` | Gallery owner: username, email, subscription (FREE / PRO / BUSINESS), storageUsed, storageLimit, watermark config, defaultTemplate |
| `Client` | Gallery viewer (minimal) |
| `Event` | Gallery event — slug, date, location, template, watermark, password gate, permissions (allowDownloads / allowComments / allowLikes) |
| `Album` | Nested photo collection (`parentId` self-relation) |
| `Photo` | Image / video asset — url, thumbnail, size, dimensions, aspect ratio, metadata |
| `Comment` | Photo comment — text, userName, userEmail |
| `PhotoLike` | Unique per `(photoId, userEmail \| sessionId)` |
| `PersonTag` | Named face on a photo, links to `DetectedFace` |
| `DetectedFace` | Face detected by faceIQ, scoped per event |
| `SimilarPhoto` | Similarity edge (face / scene / color / clothing) |
| `FavoriteFolder` | Named favorites collection per event |
| `FavoritePhoto` | Membership in a favorite folder |
| `DownloadPackage` | Curated zip — photoIds[], status (`PENDING`/`PROCESSING`/`READY`/`EXPIRED`), expiresAt |
| `ClientVisit` | Visit analytics — photosViewed/liked/downloaded, commentsLeft |
| `ActivityLog` | Event audit trail (COMMENT / LIKE / DOWNLOAD / VIEW / UPLOAD) |
| `Otp` | Email OTP codes (15 min expiry) |
| `UploadSession` | Chunked upload session (24h expiry) |
| `UploadFile` | File within session — totalChunks, chunksReceived[], status, retryCount |
| `SystemConfig` | Key / value config store |
| `MessageTemplate` | Reusable email / SMS template |

**Gallery templates** (Prisma enum, six values): `MODERN`, `CLASSIC`, `MINIMAL`, `ELEGANT`, `FASHION`, `SIDEBAR`. These are *theme presets*. The frontend additionally supports 8 *layout view modes* (masonry, grid, carousel, timeline, filmstrip, collage, story, magazine) that are orthogonal to the theme.

---

## Chunked upload pipeline

```
client                               backend
  │                                    │
  │ POST /uploads/init                 │
  ├───────────────────────────────────►│  create UploadSession + UploadFile rows
  │◄───── {sessionId, chunkSize, files[]}
  │                                    │
  │ PUT /uploads/:s/files/:f/chunks/:i │  save ./uploads/temp/{s}/{f}/chunk_{i}
  ├───────────────────────────────────►│
  │            (repeat)                │
  │                                    │
  │ POST /uploads/:s/files/:f/complete │  enqueue image-processing job
  ├───────────────────────────────────►│
  │                                    │  BullMQ worker (concurrency 5):
  │                                    │    merge chunks
  │                                    │    HEIC → JPEG (if needed)
  │                                    │    Sharp: dimensions + thumbnail
  │                                    │    apply watermark
  │                                    │    upload to storage
  │                                    │    create Photo row
  │                                    │    → call faceIQ /index/photo
  │                                    │    cleanup temp files
  │ GET /uploads/:s/status             │
  ├───────────────────────────────────►│
```

Defaults from the frontend: 5 MB chunks, 4 parallel files. Retry a failed file up to 3 times with `POST /uploads/:sessionId/retry`.

---

## BullMQ queues

| Queue | Concurrency | Attempts | Backoff | Job data | Processor |
|-------|-------------|----------|---------|----------|-----------|
| `image-processing` | 5 | 3 | exp. 5/10/20s | `{sessionId, fileId, photographerId, eventId, albumId, originalName, mimeType}` | `services/image-processor.service.ts` |
| `event-cleanup` | 5 | default | — | `{orgId, photographerId, eventId, eventSlug, deletionMode: 'soft' \| 'hard', trashPath}` | built into `queues/event-cleanup.queue.ts` |

`event-cleanup` also calls `DELETE /api/v1/index/event/:eventId` on the faceIQ backend so face embeddings are torn down alongside assets.

---

## Talking to faceIQ

Single client at [src/services/face-analysis.client.ts](src/services/face-analysis.client.ts). Configured from `SystemConfig` entries (not env), keyed by:

- `FACE_ANALYSIS_BACKEND_URL`
- `FACE_ANALYSIS_API_KEY`
- `FACE_ANALYSIS_ENABLED`

Retries up to 3× with exponential backoff on 429 / 5xx / network errors. Non-fatal: if face indexing fails, the photo upload still succeeds — errors are logged with full curl for reproduction.

Endpoints called:

```
GET    /health
POST   /api/v1/index/photo
POST   /api/v1/index/video
POST   /api/v1/search
POST   /api/v1/search/cached
DELETE /api/v1/search/session/:sessionId
DELETE /api/v1/index/photo/:photoId
DELETE /api/v1/index/event/:eventId
POST   /api/v1/index/event
GET    /api/v1/index/event/:eventId/stats
PATCH  /orgs/:orgId/settings
```

---

## Environment variables

| Var | Required | Default | Purpose |
|-----|----------|---------|---------|
| `NODE_ENV` | — | `development` | `development` \| `production` \| `test` |
| `PORT` | — | `4000` | HTTP port |
| `DATABASE_URL` | **yes** | — | PostgreSQL DSN (must include `?schema=public`) |
| `JWT_SECRET` | **yes** | — | ≥ 32 chars |
| `JWT_EXPIRES_IN` | — | `7d` | Token lifetime |
| `CORS_ORIGIN` | — | `http://localhost:3000` | Frontend origin |
| `REDIS_HOST` | — | `localhost` | BullMQ / rate limit |
| `REDIS_PORT` | — | `6379` | — |
| `REDIS_PASSWORD` | — | — | optional |
| `RATE_LIMIT_WINDOW_MS` | — | `900000` | 15 min |
| `RATE_LIMIT_MAX_REQUESTS` | — | `100` | Global default; routes override |
| `MAX_FILE_SIZE` | — | `10485760` | 10 MB |
| `UPLOAD_DIR` | — | `./uploads` | Temp + storage root |
| `INTERNAL_API_KEY` | — | — | Value for `x-internal-key` header |

Face-analysis connection settings are stored in the `SystemConfig` DB table, not in env.

---

## Logging & observability

- Winston — console + `logs/combined.log` + `logs/error.log` (10 MB × 5)
- Morgan request logging
- OTP codes logged only in dev and with masked phone / email
- Face-analysis client emits the request as a ready-to-paste `curl` on failure
- `/health` returns `{ status: 'ok', timestamp }`

---

## See also

- [node-backend-faceIQ](../../faceIQ/node-backend-faceIQ/) — face detection, indexing, search
- [next-frontend-photography](../next-frontend-photography/) — photographer portal + client gallery
- [common/vision-core](../../common/vision-core/) — Python ML sidecar used transitively via faceIQ
