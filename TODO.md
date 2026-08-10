# TODO

Working list for discogs-nextjs-viewer. Items reference GitHub issue numbers where applicable.

## Storage consolidation epic

- [x] **Epic-1 — Redis storage layer alongside files, behind a flag.** (PR #38)
- [x] **Epic-2 — Worker writes to store.** (PR #40)
- [x] **Epic-3 — Reads flip to Redis under the flag.** (PR #41)
- [x] **Epic-4 — Retire file cache.** Redis is the sole store; AOF + RDB persistence; E2E seeds Redis. (PR #43)
- [x] **Epic-5 — Auto-sync on stale data.** Client-mount effect in `AppContainer.tsx` checks `getCacheStaleness()` and self-triggers `syncAllData()` when data is >6h old. No server-side fallback needed for a personal-scale app.
- [x] **Epic-6 — "Leave the app" action + About page rewrite.** `leaveAppAction` in `app/actions.ts`; header UI; About page copy in nb/en/de/fr. (PR #45)
- [ ] **Epic-7 — Inactive-user cleanup.** Redis key TTL or small daily job scanning for stale `syncedAt` (default 90d). Prevents orphaned keys if a user never returns.

## Other open

- [ ] **#10 — i18n follow-up.** Translate worker `stepName` values (English keys currently leak into the sync-progress UI in non-English locales). Native-speaker review for nb/de/fr copy.
- [ ] **Add favicon.** Next 16 App Router picks up `app/favicon.ico` or `app/icon.png` automatically. Needs source artwork.
- [ ] **#2/#8 — Discogs consumer-key registration.** Reach out to Discogs API team to confirm the consumer key is approved for multi-user deployment. Manual action.

## Done

- [x] Remove "Tøm buffer / Clear cache" menu action (PR #39)
- [x] Fix React 19 console warning — cookie-based theme, no inline script (PR #44 after PR #42)
- [x] Make Playwright CI blocking — `e2e.yml` has no `continue-on-error`; failures block merges
- [x] Security: pin brace-expansion/js-yaml/nanoid past advisories; switch to range overrides (PR #46)
- [x] Clean up 20+ stale remote branches
