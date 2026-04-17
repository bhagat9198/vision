# next-frontend-faceIQ

Admin dashboard for [node-backend-faceIQ](../node-backend-faceIQ/). Monitors vector collections, manages organizations and API keys, browses per-event indexing status, inspects detected faces, and drives clustering — merge, split, rename, move faces between people.

Formerly known as `admin-next-frontend`.

- **Dev port:** `3001` (use `next dev -p 3001` to avoid colliding with next-frontend-photography on `3000`)
- **React:** 19.2
- **Next.js:** 16.0 (App Router)
- **UI:** Tailwind v4 + shadcn/ui + Radix primitives

---

## Quick start

```bash
cp .env.example .env         # set NEXT_PUBLIC_IMG_ANALYSE_API_URL
npm install
npm run dev -- -p 3001       # → http://localhost:3001
```

The first time you open the app with no backend admin user present, it will redirect to `/auth/setup`.

Backend required: [node-backend-faceIQ](../node-backend-faceIQ/) at `:4001`.

### Scripts

```bash
npm run dev     # next dev
npm run build   # next build
npm start       # next start
npm run lint    # eslint
```

---

## Routing

App Router under [app/](app/). [middleware.ts](middleware.ts) is the only server-side gate.

| Route | Purpose |
|---|---|
| `/` | Dashboard — stats cards (orgs, collections, vectors), health card polling `/health/detailed`, collection insights |
| `/auth/setup` | First-run admin account creation (hidden once setup is done) |
| `/auth/login` | Email + password login |
| `/dashboard/profile` | Current user card — name, email, role, user id |
| `/organizations` | List all orgs + create dialog |
| `/organizations/[id]` | Tabs: collections / API keys / settings (face detection, clustering, search defaults, storage mode, …) |
| `/collections` | Global collections monitor — search, filter by status (indexed / progress / empty / deleted), vector counts, progress bars |
| `/collections/[collectionName]/settings` | Toggles — autoClustering, autoIndexing, notifyOnCompletion |
| `/dashboard/events/[id]` | Event detail — tabs for Images, Videos, People (clusters). Includes a canvas that overlays bounding boxes, a reindex action, and the full clustering UI |
| `/settings` | Master key + org API key config (stored in localStorage) and the global org default settings form |

### Middleware

[middleware.ts](middleware.ts) reads the `img-analyse-auth-token` cookie:
- No token + navigating to `/` or `/dashboard/...` → `/auth/login`
- Has token + navigating to `/auth/*` → `/`
- Skips `_next/`, `api/`, `favicon.ico`

---

## API integration

Everything funnels through a single fetch-based client in [lib/api.ts](lib/api.ts). Headers are injected automatically from localStorage:

- `x-auth-token` — JWT from `/auth/login`
- `x-master-key` — platform key (from `/settings`)
- `x-api-key` — org key (from `/settings`)
- `Content-Type: application/json`

Endpoints the dashboard actually calls:

| Area | Calls |
|---|---|
| Health | `GET /health`, `GET /health/detailed` (30 s polling) |
| Orgs | `GET /orgs`, `POST /orgs/register`, `GET/PATCH /orgs/:id/settings`, `GET /settings/global`, `PUT /settings/global` |
| API keys | `GET /orgs/:id/api-keys`, `POST /orgs/:id/api-keys` |
| Collections | `GET /orgs/collections`, `GET /orgs/:id/collections`, `GET/PUT /collections/:name/settings` |
| Indexing | `GET /api/v1/index/event/:id/stats`, `/images`, `/videos`; `DELETE /api/v1/index/event/:id`; `GET /api/v1/index/photo/:id/faces`; `POST /api/v1/index/photo/:id/reindex`; `POST /api/v1/index/video` |
| Clustering | `POST /api/v1/clustering/run`, `GET /api/v1/clustering/job/:id`, `/event/:id/clusters`, `/cluster/:id/faces`; `PATCH /api/v1/clustering/cluster/:id`; `POST /api/v1/clustering/merge`, `/move-face`, `/split`; `GET /api/v1/clustering/face/:id/thumbnail`, `/cluster/:id/thumbnail` |
| Auth | `GET /auth/setup-status`, `POST /auth/setup`, `POST /auth/login` |

---

## Component map

Under [components/](components/):

| Folder | Contents |
|---|---|
| `ui/` | Radix-based primitives: avatar, badge, button, card, checkbox, dialog, dropdown-menu, input, label, progress, select, separator, skeleton, switch, table, tabs, tooltip, theme-provider (≈ 19 files) |
| `layout/` | `app-layout.tsx`, `sidebar.tsx`, `header.tsx` — fixed left sidebar + top bar |
| `dashboard/` | `stats-cards.tsx`, `health-status.tsx` (30 s poll), `collection-insights.tsx` |
| `events/` | `video-list.tsx`, `event-detail-skeleton.tsx` |
| `clustering/` | `person-gallery.tsx`, `cluster-detail.tsx`, `cluster-grid.tsx` — the full merge / split / move / rename UX |

Hooks in [lib/](lib/):
- `useApi` — one-shot fetch wrapper
- `usePollingApi` — polling fetch (used by health card)
- `useQueryTabs` — URL-backed tab state (shareable deep links)
- `AuthContext` — user + token + master/org key state

---

## Authentication flow

1. On first boot, `/auth/setup-status` decides whether `/auth/setup` is allowed.
2. `/auth/setup` → `POST /auth/setup` creates the admin and returns `{ user, token }`.
3. `/auth/login` → `POST /auth/login` returns the same shape.
4. Token → cookie `img-analyse-auth-token` (7-day expiry, via `js-cookie`).
5. User JSON → `localStorage.img-analyse-auth-user`.
6. `middleware.ts` enforces token presence on private routes.

Logout clears the cookie + localStorage and redirects to `/auth/login`.

### localStorage keys
- `img-analyse-auth-token` (duplicated from cookie for header injection)
- `img-analyse-auth-user`
- `img-analyse-master-key`
- `img-analyse-api-key`
- `img-analyse-theme` (`dark` by default)

API keys are **only** stored in the browser — no server round-trip. Clear them on shared machines.

---

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_IMG_ANALYSE_API_URL` | `http://localhost:4001` | Backend base URL used by [lib/api.ts](lib/api.ts) and [lib/auth-service.ts](lib/auth-service.ts) |

The `/settings` page surfaces this value alongside the header conventions (`x-master-key`, `x-api-key`).

---

## Styling

- **Tailwind v4** via `@tailwindcss/postcss`
- **CSS variables** in OKLCH — primary indigo, success green, destructive red, warning yellow
- **Dark mode** default, persisted as `img-analyse-theme`
- **Typography** Geist + Geist Mono
- **Radius** `0.625rem`

---

## Folder structure

```
next-frontend-faceIQ/
├── app/               # routes + layouts
├── components/        # ui / layout / dashboard / events / clustering
├── lib/               # api.ts, auth-service.ts, auth-context.tsx,
│                      # hooks, types, utilities
├── middleware.ts      # cookie-based auth gate
├── public/
├── next.config.ts
├── postcss.config.mjs
└── tsconfig.json
```

---

## Notable implementation details

- **Canvas overlays** draw face bounding boxes on top of images with aspect-ratio-aware letterboxing; labels show detector source and confidence.
- **URL-backed tabs** via `useQueryTabs` → every filter / tab state is shareable.
- **No state manager** — React Context for auth, fetch + custom hooks for data. Very lightweight.
- **No WebSockets** — health and long jobs are polled.
- **Image endpoints that can’t send headers** use `?token=` query param (the backend accepts the admin JWT this way for `/index/images/view/:photoId` and thumbnails).

---

## See also

- [node-backend-faceIQ](../node-backend-faceIQ/) — the API this dashboard drives
- [next-frontend-photography](../../photography/next-frontend-photography/) — the sibling client-facing Next.js app
