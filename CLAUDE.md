# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Next.js 16 (App Router) web app for browsing a Discogs vinyl collection and wantlist. Uses OAuth 1.0a for authentication, file-based JSON caching to respect Discogs API rate limits, and BullMQ + Redis for background sync jobs.

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

**Page load**: Pages read from file cache at `.next/cache/discogs-data/{username}-{key}.json`. No live API calls on page render.

**Sync**: User triggers sync → `syncAllData()` server action (app/actions.ts) → enqueues job to BullMQ `'sync'` queue → `worker.ts` fetches from Discogs API incrementally → writes back to cache files. Frontend polls `/api/sync-progress` for status.

**Incremental sync**: Worker tracks `collectionLastAdded` and `wantlistLastAdded` timestamps in `sync_info` cache. On subsequent syncs, only fetches items newer than those timestamps and merges with existing cache.

### Authentication

OAuth 1.0a via Discogs:
1. `POST /api/oauth/request` — fetches oauth_token from Discogs, stores request secret in session
2. User redirected to Discogs authorization page
3. `GET /api/oauth/callback` — exchanges verifier for access token, stores in session
4. Session encrypted via `iron-session` (HTTP-only cookie, 8-hour expiry)

All Discogs API calls use `getAuthHeaderOAuth()` in `lib/discogs.ts`, which signs with consumer + access token/secret.

Middleware (`middleware.ts`) protects `/collection`, `/wantlist`, `/duplicates`, `/user` — redirects to `/` if `session.isLoggedIn` is false.

### Key Modules

- **`lib/discogs.ts`** — All Discogs API calls: OAuth signing, pagination, release detail fetching, rate limiting (1.1s per request via p-limit)
- **`lib/cache.ts`** — Read/write JSON cache files, sync info (timestamps), sync progress (via Redis)
- **`lib/queue.ts`** — BullMQ queue instance (`'sync'` queue)
- **`lib/redis.ts`** — ioredis connection (env: `REDIS_URL`, `REDIS_PASSWORD`)
- **`lib/session-options.ts`** — iron-session config (env: `SESSION_PASSWORD`)
- **`worker.ts`** — BullMQ worker: fetches Discogs data, processes images, writes cache; `lockDuration: 30min` prevents timeout
- **`app/actions.ts`** — Server actions: `syncAllData()`, `clearCache()`, reading cached data for pages
- **`services/discogsService.ts`** — Higher-level service layer used by pages

### Environment Variables

Required in `.env.local`:
```
DISCOGS_CONSUMER_KEY=
DISCOGS_CONSUMER_SECRET=
SESSION_PASSWORD=         # min 32 chars for iron-session
REDIS_URL=
REDIS_PASSWORD=           # optional
NEXT_PUBLIC_APP_URL=      # e.g. http://localhost:3000
```

### Session Shape

```ts
interface SessionData {
  isLoggedIn: boolean;
  accessToken: string;
  accessTokenSecret: string;
  requestSecret: string;  // temporary during OAuth flow
  user: { id: number; username: string; ... };
}
```

### Component Patterns

- Pages (`app/collection/page.tsx`, `app/wantlist/page.tsx`) are server components that read from cache and pass data to client components
- `AlbumViewer` is the main client component handling filtering, sorting, and display state
- `FilterSidebar` and `SortControls` are controlled by state lifted into `AlbumViewer`
- `Header` contains the sync button which calls the `syncAllData` server action

### Testing

- Unit tests live alongside source in `*.test.ts` files or in `tests/`
- E2E tests in `tests/e2e/` use Playwright; `login-oauth.spec.ts` covers the OAuth flow
- Vitest config in `vitest.config.ts`, Playwright config in `playwright.config.ts`
