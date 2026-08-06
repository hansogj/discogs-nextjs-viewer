# TODO

Working list for discogs-nextjs-viewer. Items reference GitHub issue numbers where applicable.

## Storage consolidation epic (replaces original #5)

Move persistent user data from `.next/cache/discogs-data/*.json` into Redis. Enable auto-sync on stale data (>6h) when the user has an active session — the Discogs TOU staleness rule (see `SyncInfo.syncedAt` comment) becomes the trigger, not just a marker. Replace "Clear cache" with an honest "Leave and delete my data" button.

Sequenced as small PRs:

- [ ] **Epic-1 — Redis storage layer alongside files, behind a flag.** New `lib/store.ts` with `getUserData / setUserData / deleteUserData / deleteAllUserData`. Env `STORAGE_BACKEND=file|redis|dual` (default `file`). Unit tests.
- [ ] **Epic-2 — Worker writes to store.** `worker.ts` calls the abstraction. In `dual` mode it writes both files and Redis.
- [ ] **Epic-3 — Reads flip to Redis under the flag.** `lib/data.ts` uses the store abstraction. Verify page regressions with E2E.
- [x] **Epic-4 — Retire file cache.** File backend removed. Redis is the sole storage. AOF + RDB persistence configured in `compose/`. E2E setup seeds Redis. (PR pending merge)
- [ ] **Epic-5 — Auto-sync on stale data.** A client-mount effect already lives in `AppContainer.tsx:89-130` (calls `getCacheStaleness()` and self-triggers `syncAllData()` when stale). Remaining scope: decide whether to add a server-side fallback (middleware or root layout) for users who stay on one page longer than 6h without navigating.
- [ ] **Epic-6 — "Leave the app" action + About page rewrite.** New `leaveAppAction`: destroy session, `DEL user:{username}:*`. Header UI replaces "Clear cache" with "Leave and delete my data". About page copy revised in nb/en/de/fr — describe data, not backend. Fold in the burger-menu wording fix at the same time.
- [ ] **Epic-7 — Inactive-user cleanup.** Redis key TTL or small daily job scanning `user:*` for stale `syncedAt` (default 90d). Tiny compared to the original file-based #5.

## Other open

- [ ] **#2 — Contact Discogs API team.** Reach out re: consumer key registration and public-use expectations. Coordinates with #8.
- [ ] **#7 — Make Playwright CI blocking.** Drop `continue-on-error` from `.github/workflows/e2e.yml` once fixtures/secrets are stable.
- [ ] **#8 — Confirm Discogs consumer-key registration for public use.** Verify current `DISCOGS_CONSUMER_KEY` is approved for multi-user deployment. Blocked by #2.
- [ ] **#10 — i18n follow-up.** Translate `StatsDashboard` strings, translate worker `stepName` values (currently English keys leak into UI progress), and get native-speaker review for nb/de/fr copy.
- [ ] **Add favicon (browser tab icon).** Ship an `.ico` and/or app icon set. Next 16 App Router picks up `app/icon.png|icon.svg|favicon.ico` automatically. Needs source artwork.

## Done

_(move completed items here with the PR link)_
