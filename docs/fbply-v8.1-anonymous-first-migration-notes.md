# FBPLY V8.1 Anonymous First Migration Notes

## Current State Audit

- Auth entry points: splash and welcome previously routed users to the auth phase before the app when Supabase was configured. Profile and Settings contained account/status surfaces but did not expose cloud backup as an optional upgrade.
- Protected routes: the main Daily, Insights, Tools, and Profile surfaces are not technically route-protected; access was controlled by the top-level `phase` state in `App.jsx`.
- Onboarding flow: first launch showed welcome, then auth, then setup. Existing setup remains available for legacy auth-required flows and authenticated profiles that still need it.
- Cloud sync assumptions: existing sync helpers already load cloud data for authenticated users, write local caches when unauthenticated, and migrate local data into cloud with per-user migration flags.
- Data ownership assumptions: local data is keyed to browser/device storage until a Supabase user is present. Cloud writes are scoped to `user.id` through existing sync payloads and upserts.

## Migration Plan

- Default new users into the app after welcome using the existing local-storage state.
- Keep Supabase auth intact and reachable as an optional data-protection action.
- Use the current duplicate-safe upsert and queue helpers for expenses, income/profile, savings goals, borrow/lend money book entries, shared expenses, settings/profile fields, report history, statement mappings, and voice memory.
- Preserve existing-user behavior by loading existing cloud data when present instead of overwriting it with local data.
- Add one rollback flag: `window.__FBPLY_LEGACY_AUTH_REQUIRED__`.

## Rollback

Set `window.__FBPLY_LEGACY_AUTH_REQUIRED__ = true` before app initialization to restore the mandatory auth entry path.

## Analytics

New centralized events:

- `anonymous_started`
- `backup_enabled`
- `migration_completed`

These events do not include financial values.
