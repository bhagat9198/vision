# visionIQ

Early-stage AI-powered video surveillance platform. Ingests recorded video, extracts frames, runs motion detection and scene description, applies user-defined rules, and emits scored events with person / vehicle profiles.

> **Status:** backend schema and Python worker pipeline are scaffolded. No frontend yet. Expect significant movement in both.

```
visionIQ/
├── node-backend-visionIQ/       # REST API (Express + Prisma)      :8000
├── python-workers-visionIQ/     # Redis Streams video workers
├── next-frontend-visionIQ/      # (empty — not started)
└── docs-visionIQ/               # PRD & design notes
```

## Subservices

| Folder | State | Tech | Purpose |
|---|---|---|---|
| [node-backend-visionIQ/](node-backend-visionIQ/) | Skeleton — `app.ts`, `server.ts`, config, middleware, Prisma schema, BullMQ wiring | Express 4.22, Prisma 7, BullMQ 5, ioredis, JWT, zod | REST API for users, cameras, jobs, sessions, events, rules, profiles |
| [python-workers-visionIQ/](python-workers-visionIQ/) | Shared module layer present (`config`, `db`, `qdrant_client`, `storage`, `streams`); per-stage workers not yet in tree | Python + Redis Streams + asyncpg | Frame extraction, motion detection, description, session evaluation, event creation |
| [next-frontend-visionIQ/](next-frontend-visionIQ/) | Empty | — | — |

## Planned data flow (Redis Streams)

```
Video upload → video.uploaded
  → Frame extraction     → frames.extracted
  → Motion detection     → frames.motion
  → Frame description    → frame.described
  → Session evaluation   → session.evaluate
  → Rules applied        → session.rules_ready
  → Event detected       → event.created
  → Event persisted      → event.written
  → Job DONE
```

Each arrow is a separate worker that consumes from one stream and produces to the next. Shared helpers live in [python-workers-visionIQ/shared/](python-workers-visionIQ/shared/):

- `config.py` — env + runtime settings
- `db.py` — async Postgres access (asyncpg)
- `qdrant_client.py` — vector DB for person / face vectors (reused from [common/vision-core](../common/vision-core/))
- `storage.py` — shared-storage paths
- `streams.py` — Redis Streams helpers (xadd, consumer groups, ack, retry)

## Prisma schema (visioniq database)

The node backend models — see `node-backend-visionIQ/prisma/schema.prisma` for the authoritative list.

| Model | Purpose |
|---|---|
| `User` | Account |
| `Camera` | User-owned device, location |
| `Job` | Video processing job — lifecycle `QUEUED → EXTRACTING → PROCESSING → EVALUATING → DONE/FAILED` |
| `Session` | Continuous event window with timeline |
| `Rule` | Detection rules — `TEMPLATE`, `CUSTOM`, `AI_GENERATED` |
| `Profile` | Person / vehicle profile with face vector ID |
| `Event` | Detected incident — severity `LOW / MEDIUM / HIGH` |

## Docs

[docs-visionIQ/VisionIQ_FinalTechPRD_1.md](docs-visionIQ/VisionIQ_FinalTechPRD_1.md) — the current Product Requirements Document. Read this before making scope decisions.

## Local dev

```bash
cd node-backend-visionIQ
cp .env.example .env                 # DATABASE_URL → visioniq db, Redis, JWT secret
npm install
npx prisma migrate dev
npm run dev                          # → :8000

# Workers (each stage is its own process once implemented)
cd ../python-workers-visionIQ
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements-shared.txt
# (per-worker entrypoints pending)
```

Shares Postgres + Redis with the other projects; uses [common/vision-core](../common/vision-core/) for face / scene inference and Qdrant (started via [../faceIQ/node-backend-faceIQ/docker-compose.yml](../faceIQ/node-backend-faceIQ/docker-compose.yml)) for vector storage.
