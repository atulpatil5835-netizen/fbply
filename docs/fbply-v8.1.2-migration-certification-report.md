# FBPLY V8.1.2 Migration Certification Report

Validation date: 2026-06-11

Certification status: **PASS - Migration Safety Certified**

Scope: professional validation of Anonymous Mode to Cloud Backup to verified account migration using the real Supabase email-confirmation flow. No authentication controls, Supabase security, schemas, migration logic, business logic, calculations, or analytics behavior were changed during this validation.

## A. Test Environment

| Item | Evidence |
| --- | --- |
| App target | `http://127.0.0.1:5183/` |
| Build command | `npm run build` |
| Build result | Passed |
| Supabase project | Existing production-configured project host `klvdaxyearifahfynhkd.supabase.co` |
| Auth method | Disposable email account with real confirmation email |
| Test email | `fbply-v812-cert-mq9llwzg6qyp@web-library.net` |
| Browser validation | In-app Browser, desktop and 390px mobile viewport |
| Console check | 0 browser errors/warnings observed after migration and mobile checks |
| Rollback flag | `window.__FBPLY_LEGACY_AUTH_REQUIRED__` present |

## B. User Journey Validation

| Journey Step | Result | Evidence |
| --- | --- | --- |
| Anonymous app entry | PASS | App opened without auth and showed `Local Only`. |
| Add 5 expenses | PASS | Expense amounts migrated: 101, 202, 303, 404, 505. |
| Add 1 income | PASS | Profile monthly income migrated as 9000. |
| Create 1 savings goal | PASS | `V812 Safety Goal`, saved 600, target 12000. |
| Create 1 borrow/lend record | PASS | `V812 Friend`, amount 777, kind `given`, status `pending`. |
| Create 1 shared expense | PASS | `V812 Trip Group` with one `V812 Dinner` payment of 1200 paid by `You`. |
| Generate report | PASS | Report surface opened and remained available after re-login. Saved report history stayed 0 because the existing export/save gate was not completed. |
| Enable Cloud Backup | PASS | App moved from `Local Only` to verified cloud flow. |
| Receive verification email | PASS | Email received from `noreply@fbply.com` with subject `Confirm your email address`. |
| Verify email | PASS | Supabase confirmed the account and redirected back into the app. |
| Login/session | PASS | Authenticated session created; `user.id` available; email confirmed. |
| Migration executes | PASS | Cloud rows appeared under the authenticated user. |
| Reload app | PASS | Data and `Protected by Cloud Backup` persisted. |
| Logout and login again | PASS | Data persisted and no duplicate rows were created. |

## C. Data Integrity Validation

| Entity | Expected | Cloud Result | Status |
| --- | ---: | ---: | --- |
| Expenses | 5 | 5 | PASS |
| Expense values | 101, 202, 303, 404, 505 | 101, 202, 303, 404, 505 | PASS |
| Income/profile value | 9000 | 9000 | PASS |
| Savings goals | 1 | 1 | PASS |
| Savings goal values | saved 600, target 12000 | saved 600, target 12000 | PASS |
| Borrow/lend records | 1 | 1 | PASS |
| Borrow/lend value | 777 pending | 777 pending | PASS |
| Shared groups | 1 | 1 | PASS |
| Shared payments | 1 | 1 | PASS |
| Shared payment value | 1200 | 1200 | PASS |
| Reports available | Yes | Yes | PASS |
| Saved report history | 0 saved before migration | 0 saved after migration | PASS |

The cloud data matched the anonymous baseline for all saved entity families in scope. No data loss, corruption, or value drift was observed.

## D. Duplicate Safety Validation

| Checkpoint | Expenses | Savings | Borrow/Lend | Shared Groups | Shared Payments | Reports |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| After first verified migration | 5 | 1 | 1 | 1 | 1 | 0 |
| After reload | 5 | 1 | 1 | 1 | 1 | 0 |
| After logout and login again | 5 | 1 | 1 | 1 | 1 | 0 |

Duplicate ID check after re-login:

| Entity | Duplicate IDs |
| --- | ---: |
| Expenses | 0 |
| Savings goals | 0 |
| Borrow/lend records | 0 |
| Shared groups | 0 |
| Report history | 0 |

Result: idempotent behavior passed for the tested production journey. Repeated login did not create a second import.

## E. Session Validation

| Session Requirement | Result | Evidence |
| --- | --- | --- |
| Email confirmation preserved | PASS | Account required and received a real verification email before confirmed login. |
| Authenticated session created | PASS | Supabase `signInWithPassword` returned a session. |
| User id available | PASS | Authenticated `user.id` was present for row queries. |
| Cloud backup status updates | PASS | UI changed from `Local Only` to `Protected by Cloud Backup`. |
| Logout behavior | PASS | App returned to `Local Only` without deleting local data. |
| Re-login behavior | PASS | App returned to `Protected by Cloud Backup` and loaded the same data. |
| Mobile 390px | PASS | Daily, Insights, Tools, and Profile had no horizontal overflow. |

## F. Analytics Validation

Required events:

| Event | Validation Result | Evidence |
| --- | --- | --- |
| `anonymous_started` | Code-path verified | Centralized `trackEvent` call exists when anonymous app mode starts. |
| `backup_enabled` | Code-path verified | Centralized `trackEvent` call exists after successful login/session creation. |
| `migration_completed` | Code-path verified | Centralized `trackEvent` call exists after migration loading completes. |

Runtime observability note: the in-app Browser inspection context did not expose the page runtime `window.__FBPLY_ANALYTICS__`, and the founder-gated Product Health dashboard was not available to this disposable account. Analytics dispatch was therefore not directly readable from the test account UI. The validation confirms the centralized event wiring and that the user journey reached the code paths that should emit the events.

No additional financial values were collected for analytics validation.

## G. Certification Status

Status: **PASS - Migration Safety Certified**

Certification basis:

- No data loss observed.
- No duplicated cloud rows observed.
- No corrupted values observed.
- No migration failures observed.
- Verified-account flow completed without weakening authentication.
- Existing email confirmation remained active.
- Existing Supabase schemas and security were not modified.
- Existing business logic and calculations were not changed.

Professional review:

| Area | Review |
| --- | --- |
| Trust risks | The core trust risk is analytics observability from non-founder accounts; it does not affect data safety, but a future validation build should expose a test-safe event readout. |
| Migration risks | Saved report history only migrates when a saved report exists. In this run, the report export/save gate was opened but not completed, so report history correctly remained empty. |
| Recovery paths | Local data remained available after logout, and the verified account loaded the same cloud data after re-login. |
| Rollback readiness | `window.__FBPLY_LEGACY_AUTH_REQUIRED__` is present for restoring mandatory-login behavior if needed. |

Final certification: FBPLY V8.1.2 anonymous-to-cloud migration is certified for the tested real-world verified-account journey.
