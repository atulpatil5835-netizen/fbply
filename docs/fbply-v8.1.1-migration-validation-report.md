# FBPLY V8.1.1 Migration Validation Report

Validation date: 2026-06-11

## Summary

V8.1.1 cloud migration cannot be certified in the current environment because Supabase email confirmation is enabled and no confirmed test account, test inbox, or service-role validation key is available in the workspace.

A disposable synthetic auth probe was created successfully, but Supabase did not return an authenticated session. Immediate login failed with `email_not_confirmed`. Because V8.1 migration requires an authenticated `user.id`, the app cannot complete cloud migration for a new synthetic account until email confirmation is completed.

Result: **BLOCKED / NOT CERTIFIED**

## Evidence

- Supabase config exists: `.env.local` includes `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Disposable signup probe:
  - `signupOk`: true
  - `signupHasUser`: true
  - `signupHasSession`: false
- Immediate login probe:
  - `loginOk`: false
  - `loginHasSession`: false
  - `loginErrorCode`: `email_not_confirmed`
  - `loginErrorMessage`: `Email not confirmed`
- No confirmed test credentials or service-role key were found in the repo/env.

## A. Test Matrix

| Scenario | Required Validation | Result | Reason |
| --- | --- | --- | --- |
| A. 5 expenses, 1 income, 1 savings goal | Enable Cloud Backup and compare cloud counts/values | BLOCKED | New synthetic account cannot obtain session before email confirmation. |
| B. Create data, reload, continue, then backup | Verify no duplicates or missing records | BLOCKED | Cloud migration cannot start without confirmed auth session. |
| C. Expenses, borrow/lend, shared expense | Verify all entity families migrate | BLOCKED | Cloud writes are scoped to authenticated `user.id`; no confirmed session available. |
| D. Logout, login again | Verify persistence and no duplicate imports | BLOCKED | Login fails with `email_not_confirmed` for synthetic accounts. |
| E. Run migration twice | Verify idempotent and duplicate-safe behavior | BLOCKED | Cannot execute first authenticated migration. |

## B. Passed Scenarios

No full migration scenario passed.

Prerequisite checks that passed:

- Supabase client configuration is present.
- Synthetic auth user creation reaches Supabase.
- V8.1 rollback flag exists in code: `window.__FBPLY_LEGACY_AUTH_REQUIRED__`.
- Existing migration helpers remain present and unchanged for profile, expenses, savings, commitments, shared groups, money book, report history, statement mappings, and voice memory.

## C. Failed Scenarios

All required cloud migration scenarios are blocked at the auth/session prerequisite.

This is a validation failure, not a code change request. The product currently cannot prove anonymous-to-cloud migration for brand-new accounts unless the validation runner can complete email confirmation or use a confirmed test account.

## D. Duplicate Check

Duplicate-safe cloud behavior was not proven in this run.

Design evidence remains favorable but unvalidated:

- Existing sync helpers use deterministic local IDs.
- Cloud writes use `upsert` with conflict keys such as `user_id,id` or `user_id`.
- Migration run flags are per user.

These are implementation signals only. They do not replace a successful cloud duplicate test.

## E. Data Integrity Check

Cloud data integrity was not proven.

No authenticated cloud migration could be executed, so the following comparisons could not be completed:

- expense count and values
- income/profile values
- savings goal count and values
- borrow/lend entries
- shared expense records
- post-login persistence
- second-run idempotency

## Analytics

Required events:

- `anonymous_started`
- `backup_enabled`
- `migration_completed`

Code wiring exists for all three events through the centralized analytics service.

Runtime proof is incomplete:

- `backup_enabled` and `migration_completed` require a confirmed session and could not be fired.
- The running browser build did not expose `window.__FBPLY_ANALYTICS__`, so dispatch could not be observed through the debug dashboard.

## F. Rollback Readiness

Rollback flag is present:

```js
window.__FBPLY_LEGACY_AUTH_REQUIRED__
```

Expected rollback behavior:

- `false`: anonymous-first app entry remains enabled.
- `true`: mandatory auth-required entry path is restored.

Rollback is ready at the flag level, but a full migration rollback drill was not executed because the cloud migration itself could not be authenticated.

## Required To Certify

Provide one of the following:

- a confirmed disposable Supabase test account and password,
- temporary access to the validation email inbox for synthetic accounts,
- a temporary validation-only service-role path to create confirmed test users,
- or temporarily disable email confirmation in a test Supabase project.

After that, rerun scenarios A-E and compare cloud rows by `user_id` across:

- `user_profiles`
- `expenses`
- `savings_buckets`
- `user_commitments`
- `user_money_book`
- `user_shared_groups`
- `user_report_history`
- `user_statement_mappings`
- `user_voice_memory`

## Certification

FBPLY V8.1.1 anonymous-to-cloud migration is **not certified** from this validation run.

Trust outcome: do not expand this layer until a confirmed-auth migration test proves zero data loss, zero duplication, and zero corruption.
