# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Next.js 16 (App Router) web app for browsing a Discogs vinyl collection and wantlist. Uses OAuth 1.0a for authentication, file-based JSON caching to respect Discogs API rate limits, and BullMQ + Redis for background sync jobs. Wantlist items integrate with Finn.no marketplace search to show available listings.

## Commands

```bash
# Development (run both in parallel)
pnpm dev           # Next.js dev server on 0.0.0.0:3000
pnpm dev:worker    # BullMQ worker process (required for sync)

# Build & production
pnpm build
pnpm start

# Code quality
pnpm lint          # ESLint check
pnpm lint:fix      # ESLint auto-fix
pnpm format        # Prettier check
pnpm format:fix    # Prettier auto-fix

# Testing
pnpm test                  # Vitest unit tests (watch mode)
pnpm test:e2e              # Playwright E2E tests
pnpm test:e2e:ui           # Playwright with UI

# Docker (from compose/ directory)
docker compose up --build
```

## Architecture

### Data Flow

**Page load**: Pages use `lib/data.ts` helper functions (`getCachedCollection()`, `getCachedWantlist()`, etc.) which read from file cache at `.next/cache/discogs-data/{username}-{key}.json`. No live API calls on page render.

**Sync**: User triggers sync → `syncAllData()` server action (`app/actions.ts`) → enqueues job to BullMQ `'sync'` queue → `worker.ts` fetches full lists from Discogs API → diffs against cached data → fetches details only for new items → merges with cached details → writes back to cache files. Frontend polls `/api/sync-progress` for status.

**Sync strategy**: The worker always fetches the complete collection/wantlist from the Discogs API (all pages), then compares with cached data to identify new and removed items. Only new items (or items missing details) trigger additional API calls for release details and master info. Cached details are reused for unchanged items.

### Docker Deployment

Three services in `compose/docker-compose.yml`: `cache` (Redis), `web` (Next.js), `worker` (BullMQ). The `web` and `worker` containers share a `discogs-data` Docker volume mounted at `/app/.next/cache/discogs-data` so the worker's cache writes are visible to the web server.

### Authentication

OAuth 1.0a via Discogs:
1. `POST /api/oauth/request` — fetches oauth_token from Discogs, stores request secret in session
2. User redirected to Discogs authorization page
3. `GET /api/oauth/callback` — exchanges verifier for access token, stores in session
4. Session encrypted via `iron-session` (HTTP-only cookie, 8-hour expiry, cookie name `discogs-viewer-session`)

All Discogs API calls use `getAuthHeaderOAuth()` in `lib/discogs.ts`, which signs with consumer + access token/secret.

Middleware (`middleware.ts`) protects `/collection`, `/wantlist`, `/duplicates`, `/user` — redirects to `/` if `session.isLoggedIn` is false.

### Discogs API Rate Limiting

Adaptive rate limiter in `lib/discogs.ts`: starts at 2s between requests, doubles interval (up to 60s) on 429 responses, decreases by 25% on success (down to 2s minimum). Respects `Retry-After` headers. Retries up to 8 times on 429/5xx/401 with exponential backoff. Concurrent detail fetches use `p-limit(1)` for release details, `p-limit(2)` for master info.

### Finn.no Integration

Wantlist items show Finn.no marketplace hit counts:
- `app/api/finn-search/route.ts` — server-side proxy that fetches Finn.no search pages and scrapes listing counts from HTML meta descriptions (with JSON-LD fallback)
- `hooks/useFinnCounts.ts` — client hook that batch-fetches counts for all wantlist items (max 3 concurrent)
- `components/WantlistItemDetail.tsx` — expandable card with Discogs and Finn.no links
- Search query format: `{artist} {title} vinyl` on `finn.no/recommerce/forsale/search`

### Key Modules

- **`lib/discogs.ts`** — All Discogs API calls: OAuth signing, pagination, release detail fetching, adaptive rate limiting
- **`lib/cache.ts`** — Read/write JSON cache files, sync info (timestamps), sync progress (via Redis)
- **`lib/data.ts`** — Data access layer for pages: `getCachedCollection()`, `getCachedWantlist()`, `getHeaderData()`, etc.
- **`lib/queue.ts`** — BullMQ queue instance (`'sync'` queue)
- **`lib/redis.ts`** — ioredis connection (env: `REDIS_URL`, `REDIS_PASSWORD`)
- **`lib/session-options.ts`** — iron-session config (env: `AUTH_SECRET`)
- **`worker.ts`** — BullMQ worker: fetches Discogs data, diffs with cache, processes new items, writes cache; `lockDuration: 30min`
- **`app/actions.ts`** — Server actions: `syncAllData()`, `clearCacheAction()`

### Environment Variables

Required in `.env.local`:
```
DISCOGS_CONSUMER_KEY=
DISCOGS_CONSUMER_SECRET=
DISCOGS_CALLBACK_URL=     # e.g. http://localhost:3000/api/oauth/callback
AUTH_SECRET=               # min 32 chars for iron-session
REDIS_URL=
REDIS_PASSWORD=           # optional
NEXT_PUBLIC_APP_URL=      # e.g. http://localhost:3000
```

### Component Patterns

- Pages (`app/collection/page.tsx`, `app/wantlist/page.tsx`) are server components that read from cache via `lib/data.ts` and pass data to client components
- `AlbumViewer` is the main client component handling filtering, sorting, display state, and Finn.no count fetching (wantlist only)
- `AlbumCard` / `AlbumListItem` render individual items; on wantlist, clicking expands a detail card instead of navigating away
- `FilterSidebar` and `SortControls` are controlled by state lifted into `AlbumViewer`
- `SortControls` supports multiple filter toggles (array of `FilterOptions`)
- `Header` contains the sync button which calls the `syncAllData` server action

### Testing

- Unit tests live alongside source in `*.test.ts` files or in `tests/`
- E2E tests in `tests/e2e/` use Playwright; `login-oauth.spec.ts` covers the OAuth flow
- Vitest config in `vitest.config.ts`, Playwright config in `playwright.config.ts`
