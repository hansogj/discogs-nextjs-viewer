---
name: deploy-local
description: Redeploy the Discogs viewer app to localhost via Docker Compose. Rebuilds images with --no-cache but preserves the discogs-data volume (cached collection/wantlist JSON) so no re-sync is needed. Use when the user says "deploy", "redeploy", "deploy locally", "rebuild the app", or wants to bring the local docker stack up fresh.
allowed-tools: Bash
---

# deploy-local

Perform a clean image rebuild of the Discogs viewer stack (web + worker + redis cache) via Docker Compose, **without** wiping the persistent `discogs-data` volume. The cached collection/wantlist JSON survives every redeploy, so the user does not need to re-sync from Discogs.

If the user *does* want a factory-reset that also nukes the data volume, they should ask for it explicitly ("wipe volumes", "factory reset", "clear cache and redeploy"). See "Full wipe" section at the bottom.

## Preconditions

- `.env.local` exists at the repo root (`/git/music/discogs-nextjs-viewer/.env.local`)
- Docker daemon is running
- Compose file lives at `compose/docker-compose.yml`

If `.env.local` is missing, stop and tell the user — do not proceed.

## Steps

Run these commands from the `compose/` directory in sequence. Do not run them in parallel — later steps depend on earlier ones completing.

1. **Tear down** the existing stack. Do **not** use `-v` — the `discogs-data` named volume must survive so cached sync JSON is not lost:

   ```bash
   docker compose --env-file ../.env.local down
   ```

2. **Rebuild** all images from scratch (no cache):

   ```bash
   docker compose --env-file ../.env.local build --no-cache
   ```

3. **Bring the stack up** in detached mode:

   ```bash
   docker compose --env-file ../.env.local up -d
   ```

4. **Verify** the containers are running:
   ```bash
   docker compose --env-file ../.env.local ps
   ```

## One-shot form

If the user wants it all in one command:

```bash
cd /git/music/discogs-nextjs-viewer/compose && \
  docker compose --env-file ../.env.local down && \
  docker compose --env-file ../.env.local build --no-cache && \
  docker compose --env-file ../.env.local up -d && \
  docker compose --env-file ../.env.local ps
```

The `build --no-cache` step is slow (multi-minute). Run it with a generous timeout (e.g. `timeout: 600000` on the Bash tool) and consider `run_in_background: true` if the user does not need to wait.

## After deploy

Report to the user:

- Which containers are up (from `docker compose ps`)
- The web URL: <http://localhost:3000>
- Reminder that the sync worker runs in its own container — no separate `pnpm dev:worker` needed
- Reminder that the cached sync data was preserved — no re-sync required

If any container is not `running` / `healthy`, dump its logs with `docker compose --env-file ../.env.local logs <service>` and surface the failure.

## Full wipe (explicit opt-in only)

If the user explicitly asks for a factory reset / clean slate / to clear cached data, add `-v` to the tear-down step. This deletes both the `cache` (Redis / BullMQ queue) and `discogs-data` (cached collection + wantlist JSON) volumes. After this, the user must re-sync from Discogs manually.

```bash
docker compose --env-file ../.env.local down -v
```

Warn the user first — a full wipe means the next page load shows empty state until a sync completes, and the sync itself takes multiple minutes and burns Discogs API budget.
