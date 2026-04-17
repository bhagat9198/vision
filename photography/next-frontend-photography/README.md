# next-frontend-photography

Next.js 16 app serving **two audiences** behind a single codebase:

1. **Photographers** — portal for creating events, uploading photos (chunked, resumable), configuring galleries, and viewing client engagement.
2. **Clients** — public event galleries with AI-powered face search, 8 layout view modes, social features (likes / comments / favorites), and a download center.
3. **Super admins** — platform-wide dashboard for moderating photographers and events and editing system config.

Talks to [node-backend-photography](../node-backend-photography/) at `http://localhost:4000/api/v1`.

- **Dev port:** `3000`
- **React:** 19.2
- **Next.js:** 16.0 (App Router)
- **UI:** Tailwind v4 + shadcn/ui + Radix primitives + Framer Motion

---

## Quick start

```bash
npm install
npm run dev          # → http://localhost:3000
```

Make sure the photography backend is running at `:4000` first — the API base URL is currently hardcoded.

### Scripts

```bash
npm run dev     # next dev
npm run build   # next build
npm start       # next start
npm run lint    # eslint
```

---

## Routing

Next.js App Router in [app/](app/). Route groups `(portal)` and `(dashboard)` gate authenticated areas; everything under `/event/` and `/p/` is public.

### Public / client
| Route | What it shows |
|---|---|
| `/` | Marketing landing — hero, feature preview, event access form |
| `/event/[id]` | Event landing (password gate if protected) |
| `/event/[id]/gallery` | Main gallery with view-mode selector (8 modes) |
| `/event/[id]/photo/[photoId]` | Lightbox + comments + likes + similar photos + people tags |
| `/event/[id]/search` | AI search — tabs for **Face** (selfie / detected faces), **Color / Clothing**, **Prompt** |
| `/event/[id]/downloads` | Download center — create custom zip or grab existing package |
| `/event/[id]/favorites` | Favorites organised into custom folders |
| `/p/[photographerSlug]/e/[...slug]` | Branded photographer URL → resolves to an event |
| `/profile` | Client / guest profile shell |

### Photographer portal — `/photographer/...`
| Route | What it shows |
|---|---|
| `/photographer/login` / `/signup` / `/forgot-password` / `/onboarding` | Auth flows (email + password **or** phone OTP, with optional Google / Facebook / Apple gated by `/api/v1/config/auth/public`) |
| `/photographer/(portal)/dashboard` | Stats cards + recent activity + quick actions |
| `/photographer/(portal)/events` | Event list |
| `/photographer/(portal)/events/new` | Create event |
| `/photographer/(portal)/events/[eventId]` | Overview |
| `/photographer/(portal)/events/[eventId]/photos` | Photo grid |
| `/photographer/(portal)/events/[eventId]/upload` | Chunked upload UI with album picker |
| `/photographer/(portal)/events/[eventId]/settings` | Template, access, permissions |
| `/photographer/(portal)/events/[eventId]/sharing` | Share link + QR code |
| `/photographer/(portal)/settings` | Profile, subscription, notifications |

### Super-admin — `/super-admin/...`
| Route | What it shows |
|---|---|
| `/super-admin/setup` / `/login` | Bootstrap & auth |
| `/super-admin/(dashboard)/dashboard` | Platform metrics |
| `/super-admin/(dashboard)/photographers` + `/[id]` | Photographer list / detail / toggle |
| `/super-admin/(dashboard)/events` + `/[id]` | All events + moderation |
| `/super-admin/(dashboard)/settings` | Auth providers, templates, storage providers |

---

## Gallery view modes vs themes

Two orthogonal axes decide how an event renders.

### 8 layout view modes (client picks in the gallery header)
Each is a separate component in [components/gallery/](components/gallery/):

| Mode | Component |
|---|---|
| Masonry | [MasonryView.tsx](components/gallery/MasonryView.tsx) |
| Grid | [GridView.tsx](components/gallery/GridView.tsx) |
| Carousel | [CarouselView.tsx](components/gallery/CarouselView.tsx) |
| Timeline | [TimelineView.tsx](components/gallery/TimelineView.tsx) |
| Filmstrip | [FilmstripView.tsx](components/gallery/FilmstripView.tsx) |
| Collage | [CollageView.tsx](components/gallery/CollageView.tsx) |
| Story | [StoryView.tsx](components/gallery/StoryView.tsx) |
| Magazine | [MagazineView.tsx](components/gallery/MagazineView.tsx) |

Plus [FullscreenViewer.tsx](components/gallery/FullscreenViewer.tsx) for the lightbox and [photo-actions.tsx](components/gallery/photo-actions.tsx) for per-photo like/comment/favorite/download buttons.

### 6 theme presets (photographer picks in event settings)
Defined in [lib/template-styles.ts](lib/template-styles.ts) and rendered by [components/templates/](components/templates/): `modern`, `classic`, `minimal`, `elegant`, `fashion`, `sidebar`. These match the `GalleryTemplate` enum on the backend.

---

## Component map

Under [components/](components/):

| Folder | Purpose |
|---|---|
| `ui/` | shadcn / Radix primitives: button, card, dialog, dropdown, input, tabs, select, toggle, theme-provider, QR code wrapper, … (26 files) |
| `gallery/` | 8 view modes + fullscreen viewer + photo actions |
| `templates/` | 6 theme components + preview |
| `photographer/` | Portal widgets — ActivityFeed, ClientAccessList, EngagementSummary, FolderManager, PhotoGrid, PhotoUploader, QRCodeDisplay, QuickActions, StatsCard |
| `ai-search/` | FaceSearch (selfie + detected faces), ColorClothingSearch, PromptSearch, SearchResults |
| `download-center/` | DownloadPackageCard, DownloadSizeSelector, ExpiryCountdown, ZipCreation |
| `favorites/` | FavoritesActions, FavoritesGrid, FolderList |
| `photo-detail/` | CommentsSection, PeopleTagsSection, PhotoActions, SimilarPhotosSection |
| `public-event/` | GalleryContent, LandingContent |
| `auth/` | AuthModal |

---

## Chunked upload flow

Client-side logic lives in [app/photographer/(portal)/events/[eventId]/upload/page.tsx](app/photographer/(portal)/events/%5BeventId%5D/upload/page.tsx).

- Chunk size: **5 MB**
- Parallel file uploads: **4**
- Accepts `image/*, .heic, .heif`
- HEIC previews are skipped (browser can’t decode)

```
1. POST /api/v1/albums/event/:eventId                # optional, create new album
2. POST /api/v1/uploads/init                         # → sessionId + per-file fileIds
3. For each file, for each chunk:
      PUT /api/v1/uploads/:s/files/:f/chunks/:i
4. POST /api/v1/uploads/:s/files/:f/complete         # enqueue processing
5. Poll GET /api/v1/uploads/:s/status?includeFiles=true every 2s
6. POST /api/v1/uploads/:s/retry { fileIds: [...] }  # retry failed (max 3×)
```

Progress UI maps chunks → 80 % and processing → last 20 %.

---

## Authentication

Entirely client-side today — there is **no** `middleware.ts` enforcing routes; guards are localStorage + redirect.

| Audience | Flow |
|---|---|
| Photographer | `POST /auth/login` (email + password) **or** `POST /auth/send-otp` + `POST /auth/verify-otp` (phone). JWT stored in `localStorage.photographerToken`. Social login only when enabled by `/config/auth/public`. |
| Client | Public event URLs; password gate when `event.isPasswordProtected`. No user account required. |
| Super admin | `POST /super-admin/login`. Separate token. |

---

## Backend integration

No shared API client — pages call `fetch()` directly with:

```ts
headers: { Authorization: `Bearer ${localStorage.getItem('photographerToken')}` }
```

API base is **hardcoded** as `http://localhost:4000/api/v1` across the app — promote this to an env var (`NEXT_PUBLIC_API_URL` or similar) before shipping.

### Endpoints the frontend touches
- **Auth** `/auth/*`, `/config/auth/public`
- **Portal** `/photographers/me/stats`, `/events`, `/albums/event/:id`, `/photos/event/:id`
- **Gallery** `/events/public/:id`, `/photos/event/:id`, `/photos/:id`, `/likes`, `/comments`, `/favorites`
- **Uploads** `/uploads/init`, `/uploads/:s/files/:f/chunks/:i`, `/uploads/:s/files/:f/complete`, `/uploads/:s/status`, `/uploads/:s/retry`
- **Super-admin** `/super-admin/*`, `/config/*`

No direct calls to the faceIQ backend — the photography backend proxies them.

---

## Styling

- **Tailwind v4** via `@tailwindcss/postcss` — CSS variables in [app/globals.css](app/globals.css), OKLCH color space
- **Dark mode** default through a `ThemeProvider`, persisted as `pics-theme` in localStorage
- **Radius token** `--radius: 0.625rem`
- **Typography** Geist + Geist Mono
- Brand accent: amber → orange gradient

Each theme preset in `lib/template-styles.ts` overrides button, background and text classes so templates stay visually distinct across view modes.

---

## Folder structure

```
next-frontend-photography/
├── app/               # routes, layouts, pages (32 pages)
├── components/        # features + UI primitives (69 components)
├── lib/               # types.ts, template-styles.ts, mock-data.ts, hooks/, utils.ts
├── public/            # static assets
├── data/              # seed / static content
├── next.config.ts     # image remote patterns (localhost:4000, unsplash)
├── postcss.config.mjs
└── tsconfig.json      # @/* → project root
```

---

## Gaps worth calling out

- API base URL is hardcoded — add `NEXT_PUBLIC_API_URL` before deploy.
- `app/event/[id]/search/page.tsx` uses mock data from [lib/mock-data.ts](lib/mock-data.ts). The real flow needs to be wired to the backend’s `/search` endpoint (which proxies to faceIQ).
- No `middleware.ts` — auth redirects are client-side only.
- Subscription plans (`free` / `pro` / `business`) are modelled in [lib/types.ts](lib/types.ts) but there is no pricing page or paywall UI yet.

---

## See also

- [node-backend-photography](../node-backend-photography/) — the API
- [next-frontend-faceIQ](../../faceIQ/next-frontend-faceIQ/) — separate admin dashboard for face-indexing
