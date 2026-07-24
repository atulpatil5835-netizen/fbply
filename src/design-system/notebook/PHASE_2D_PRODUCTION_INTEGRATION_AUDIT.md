# FBPLY V10 Phase 2D - Production Integration Audit & Migration Strategy

This document is an audit and migration plan only. It does not authorize a production Notebook UI migration by itself.

## Audit Decision

Public production Notebook integration is a No-Go for this phase.

Internal, disabled-by-default preview work is acceptable only after a feature flag is added and the existing expense save path is reused without modification.

Reason: the current production app has a highly centralized financial state and sync model in `src/App.jsx`. The Notebook foundation is isolated and safe, but connecting it to expense creation would touch the live save, validation, analytics, local cache, and Supabase sync path. That should happen behind a guardrail, not as an immediate UI replacement.

## Current Production Architecture

### Runtime Shape

- `src/main.jsx` mounts the React app.
- `src/App.jsx` owns the primary app state, app phase, active tab, financial inputs, sync readiness, report export state, voice draft state, and local cache writes.
- `src/App.jsx` lazy-loads major screens: `TodayScreen`, `DailyBookScreen`, `ActivityScreen`, `GoalsScreen`, `ReportsScreen`, `SettingsScreen`, `PublicSeoScreen`, `QuickToolsSheet`, `ProfileHub`, and `NotificationCenter`.
- Public SEO routes bypass normal app state side effects by using `isPublicSeoPage` guards throughout `App`.
- Existing production screens use the root Money OS design system through `src/design-system`. Notebook is not imported by production screens.

### State Management

`src/App.jsx` is the state owner for:

- Profile and setup state.
- Expense records.
- Savings buckets.
- Recurring schedules.
- Shared groups.
- Money Book entries.
- Statement category mappings.
- Voice memory and voice drafts.
- Report history and export UI state.
- Navigation tab state.
- Auth/session state and sync readiness flags.

State is held in React state and mirrored through refs where async sync effects need current values. There is no external state library.

### Expense Flow

Current manual expense creation:

1. UI entry surfaces:
   - `QuickAddSheet` -> `QuickExpenseEntry`
   - `ProfileScreen` -> `ProfileExpenseQuickAdd`
   - Daily Book CTA opens the add sheet.
   - Home/next-action shortcuts open the add sheet.
2. `addExpense(event)` prevents form submission and reads the shared form state.
3. `saveExpenseRecord({ label, category, amount, note, type, source, date })` performs validation and record construction.
4. Validation rules currently include:
   - Positive amount required.
   - Category required.
   - Amount over `999999999` blocked as unusually high.
5. A new expense is prepended with `setExpenses((current) => [newExpense, ...current])`.
6. `trackFeatureUsage('expense_saved')` and first-expense activation tracking fire from the save path.
7. Expense state changes trigger local cache writes and Supabase sync effects.

Current voice expense creation:

1. `VoiceExpenseBox` captures or reviews transcripts.
2. Voice drafts are parsed in the existing voice flow.
3. `saveVoiceDrafts()` maps valid drafts to `saveExpenseRecord(...)`.
4. Voice memory learning and voice-specific analytics happen around that existing save path.

Notebook must not replace `saveExpenseRecord` during first integration. The safest future integration is an adapter that produces a candidate payload and then calls the existing save callback only after explicit user confirmation.

### Persistence And Sync

Local persistence:

- Profile: `fbply-profile`
- Setup: `fbply-setup-complete`
- Expenses: `fbply-expenses`
- Savings buckets: `fbply-savings-buckets`
- Recurring schedules: `fbply-recurring-schedules`
- Shared groups: `fbply-shared-groups`
- Money Book: `fbply-money-book`
- Report history: `fbply-report-history`
- Statement mappings: `fbply-statement-category-mappings`
- Voice memory: `fbply-voice-memory`

Expense cloud sync:

- `src/lib/expenseSync.js` owns normalization, cloud payloads, diffing, queueing, upserts, and soft deletes.
- `App.jsx` computes `diffExpenseRecords(previousSyncedExpensesRef.current, expenses)`.
- Online sync applies queued operations first, then upserts and soft deletes.
- Offline sync appends queued operations and keeps local cache authoritative.

Notebook Phase 2D must not write storage, queues, Supabase rows, or URL state.

### Calculations

Primary calculation path:

- `buildUnifiedFinanceEngine(...)` combines expenses, shared groups, savings, money book, profile, and planner state.
- `calculateFinancialState(profile, entries)` calculates income, commitments, spending pressure, safe-to-spend, breathing room, and related financial state.
- `buildInsights`, `buildAdvancedReport`, `buildFinancialHealthScore`, `buildMoneyScore`, `buildNextBestAction`, and `buildSmartFeedback` derive user-facing guidance.
- Selected-month calculations repeat the same engine for report and history contexts.

Notebook integration must reuse this calculation path. It should never create a parallel finance engine.

### Reports And Exports

Report flow:

1. `ReportsScreen` presents export actions.
2. `requestReportExport(type, overrides)` builds the request and handles missing-data prompts.
3. `RewardedExportModal` gates PDF export.
4. `downloadReportRequest()` dynamically imports:
   - `./lib/nativeFileShare`
   - `./lib/reportPdf`
5. PDF generation calls `createReportPdfBlob(activeRequest)`.
6. Browser export uses `URL.createObjectURL` and an anchor download.
7. Native export uses the mobile share helper.
8. Successful report exports update `reportHistory`.

CSV export maps `selectedMonthActivity.transactions` to rows.

Notebook must not touch report generation, PDF generation, CSV export, history export, rewarded export, or report history sync in early phases.

### Routing And SEO

Routing is not a React Router setup. It uses:

- `currentPath` from `window.location.pathname`.
- `popstate` listener to update path state.
- `isPublicSeoRoute(normalizedCurrentPath)` to select public SEO rendering.
- `legalPages` for legal route rendering.
- App navigation tabs through `activeTab`, not URL routes.

SEO metadata is centralized in `src/lib/seoRoutes.js`:

- Canonical URL generation.
- Title and meta description updates.
- Robots meta.
- Open Graph and Twitter tags.
- JSON-LD structured data.

Notebook migration must not add routes, modify public route metadata, or change sitemap/robots/canonical behavior.

### Analytics

GA4 initialization is in `index.html`:

- `gtag/js?id=G-ZP0RX3ZHH2`
- `gtag('config', 'G-ZP0RX3ZHH2')`

AdSense initialization is in `index.html`:

- `pagead2.googlesyndication.com/pagead/js/adsbygoogle.js`
- client `ca-pub-8482951627272767`

Runtime analytics are centralized in `src/lib/analytics.js`:

- `trackEvent`
- `trackFeatureUsage`
- `trackActivation`
- `trackPublicPageView`
- Duplicate event guard window: 500ms.

Notebook should initially emit no analytics events. Once preview starts, analytics must be added only through existing helpers and must not duplicate current event names unless replacing the same existing action.

### Current Design System Usage

Production screens use root Money OS exports:

- `MoneyOSProvider`
- `MoneyCard`
- `ActionCard`
- `BottomSheet`
- `FLoader`
- Status and state primitives
- Form primitives

Notebook currently lives under `src/design-system/notebook` and is intentionally opt-in. The root `src/design-system/index.js` does not export Notebook, so current production bundles do not import Notebook unless a future screen explicitly does so.

## Dependency Map

```text
main.jsx
  -> App.jsx
      -> auth/session state
      -> local cache helpers
      -> Supabase sync helpers
      -> analytics helpers
      -> seo route helpers
      -> ruleEngine / financeEngine / reportInsights
      -> root design-system
      -> lazy screens and sheets

Manual expense UI
  -> QuickExpenseEntry or ProfileExpenseQuickAdd
  -> addExpense(event)
  -> saveExpenseRecord(payload)
  -> setExpenses
  -> writeExpenseCache
  -> diffExpenseRecords
  -> applyExpenseSyncOperations / saveCloudExpenses / softDeleteCloudExpenses
  -> Supabase expenses table

Voice expense UI
  -> VoiceExpenseBox
  -> existing voice draft parsing/review
  -> saveVoiceDrafts
  -> saveExpenseRecord

Financial state
  -> expenses / sharedGroups / moneyBookEntries / savingsBuckets / profile / planner
  -> buildUnifiedFinanceEngine
  -> calculateFinancialState
  -> insights / money score / next action / smart feedback / reports

Reports
  -> ReportsScreen
  -> requestReportExport
  -> RewardedExportModal
  -> dynamic import reportPdf/nativeFileShare
  -> report history sync

SEO
  -> currentPath
  -> isPublicSeoRoute / legalPages
  -> PublicSeoScreen or LegalScreen
  -> applySeoMetadata

Analytics
  -> index.html GA4 bootstrap
  -> src/lib/analytics.js
  -> trackEvent / trackFeatureUsage / trackActivation
```

## Integration Points

### Safe Insertion Points

- Read-only Daily Book visual wrappers: low risk because data remains derived from existing props.
- Read-only Activity/history line renderers: low risk if no mutation APIs change.
- Internal preview route-equivalent tab section hidden behind an existing-style rollback flag: safe only if it does not modify routes or persistence.
- Add-sheet shell wrapper behind a disabled flag: acceptable only if the existing `QuickExpenseEntry` remains the default and unchanged.
- Draft-only input component inside an internal preview: safe if it never calls save until a user confirms through the existing save adapter.

### Unsafe Insertion Points

- Direct replacement of `saveExpenseRecord`.
- Direct changes to `expenses` shape, ids, date normalization, or source values.
- Changes to `expenseSync.js`, Supabase table columns, or queue format.
- Changes to `buildUnifiedFinanceEngine`, `calculateFinancialState`, or report payload construction.
- Replacing report/export views before Notebook expense entry is stable.
- Adding app routes or URL params for notebook mode.
- Emitting new pageviews or duplicate existing analytics events from Notebook components.
- Importing Notebook from the root `src/design-system` barrel.

### Coupled Modules

- `src/App.jsx`: very high coupling; owns most state, effects, callbacks, analytics, and screen composition.
- `src/lib/expenseSync.js`: persistence contract for expense records.
- `src/lib/financeEngine.js`: cross-feature transaction model.
- `src/lib/reportPdf.js`: large export surface with business-sensitive formatting.
- `src/lib/voiceExpense.js`: existing parsing and draft flow.
- `src/components/ReportsScreen.jsx`: report UI, event tracking, export CTAs.

### Reusable Modules

- `src/lib/money.js`
- `src/lib/categoryIntelligence.js`
- `src/lib/ruleEngine.js`
- `src/lib/financeEngine.js`
- `src/lib/financialActivity.js`
- `src/lib/reportHistory.js`
- Root Money OS primitives where current screens remain active.
- Notebook tokens/components/draft/intent foundation for future opt-in views.

## Screen Migration Strategy

| Production area | Decision | Strategy |
| --- | --- | --- |
| Splash, Welcome, Auth, Setup | Keep | Do not migrate. These are app lifecycle gates and auth-sensitive. |
| Public SEO pages | Keep / Never migrate | Do not import Notebook. Preserve metadata, canonical URLs, public pageviews, sitemap, robots. |
| Legal pages | Keep | No Notebook migration; legal copy and SEO should remain stable. |
| MainApp shell and BottomNav | Keep | Do not change routes or tab state. Add Notebook only at leaf surfaces later. |
| Today/Home | Wrap later | Start with read-only Notebook cards/lines after preview flag exists. Do not replace CTAs first. |
| QuickAddSheet manual expense | Replace later, behind flag | Highest UX value but high risk. Build a parallel Notebook preview component that calls the existing save adapter only on explicit confirmation. |
| Profile quick expense | Keep initially | Reuse after QuickAddSheet is proven. Avoid duplicating form state changes. |
| DailyBookScreen | Wrap first | Good first user-visible candidate because it is mostly read-only history and insights. |
| ActivityScreen | Wrap second | Notebook line rendering can improve scanability, but editing/deleting must keep existing handlers. |
| ReportsScreen | Keep initially | Do not alter export, ad unlock, history, or report payloads. Later wrap report summaries only. |
| SharedExpenseScreen | Keep | Settlement math and grouped people flows are high-risk. Migrate only after expense entry is stable. |
| GoalsScreen | Keep | Not core to Notebook expense capture. |
| SettingsScreen | Keep | Settings/auth/profile sync are not Notebook targets. |
| StatementUploadSheet | Keep / Never early | Statement import is parsing-heavy and report-sensitive. Do not mix with Notebook until a future adapter phase. |
| VoiceExpenseBox | Keep | Future intent adapter candidate, but do not merge with Notebook until manual draft flow is stable. |
| QuickToolsSheet | Wrap later | Use Notebook visual affordances only after main Notebook entry proves safe. |

Future removals should happen only after telemetry and support checks show the Notebook replacement is stable. No removal is recommended in Phase 2D.

## Recommended Migration Order

1. Add `isNotebookPreviewEnabled()` and `ensureNotebookPreviewRollbackFlag()` with default `false`.
2. Add internal-only Notebook preview surface that is not linked from production navigation by default.
3. Build a headless adapter from Notebook draft candidate to the existing `saveExpenseRecord` payload shape, with no persistence in the draft layer.
4. Add unit tests for adapter outcomes:
   - Empty draft does not save.
   - Invalid amount does not save.
   - Category absent does not save.
   - Confirmed valid draft calls existing save callback once.
   - Existing analytics still fire only through `saveExpenseRecord`.
5. Wrap Daily Book read-only history rows with Notebook presentation behind the flag.
6. Wrap Activity read-only transaction rows behind the flag.
7. Introduce Notebook manual quick-add preview behind the flag.
8. Run internal preview with production analytics comparison.
9. Run beta rollout for a small cohort with instant rollback.
10. Consider public rollout only after report exports, sync queues, and support feedback remain stable.

## Rollback Strategy

Every migration step must preserve the current implementation in place.

Rollback rules:

- Feature flag defaults to current production UI.
- Notebook preview imports should be lazy-loaded at leaf level.
- Existing components remain available until after public rollout confidence.
- Existing save, sync, calculation, report, analytics, route, and SEO code remain the source of truth.
- Rollback should require changing one flag value or deleting a leaf-level Notebook branch.
- Do not add Notebook dependencies to root app initialization.
- Do not add Notebook exports to the root design-system barrel during preview.

Suggested flag shape for a later implementation:

```js
function ensureNotebookPreviewRollbackFlag() {
  if (typeof window === 'undefined') {
    return
  }

  if (typeof window.__FBPLY_NOTEBOOK_PREVIEW__ === 'undefined') {
    window.__FBPLY_NOTEBOOK_PREVIEW__ = false
  }
}

function isNotebookPreviewEnabled() {
  return typeof window !== 'undefined' && Boolean(window.__FBPLY_NOTEBOOK_PREVIEW__)
}
```

This should not be implemented until the first preview surface is ready.

## Performance Analysis

### Bundle Impact

- Current production bundle does not include Notebook because no production screen imports it.
- The direct draft engine bundle is small, but any styled Notebook import will bring Notebook CSS into that leaf chunk.
- Keep Notebook imports out of `src/design-system/index.js` to preserve tree-shaking and current bundle isolation.
- Heavy future capabilities such as AI, OCR, voice, statement import, PDF, search, and reports must remain outside Notebook core.

### Render Impact

- `App.jsx` recomputes multiple derived finance views with `useMemo`, including current, selected, and previous month engines.
- Adding Notebook at `App.jsx` level would increase render work across every tab.
- Add Notebook at screen leaf level, preferably read-only first.
- Do not introduce observers, polling, or global event listeners for Notebook preview.

### Memory Impact

- Existing app already holds multiple financial collections in memory.
- Notebook draft state should remain one active draft session per mounted surface.
- Do not retain draft history in memory unless a later phase explicitly defines limits.

### Network Impact

- Phase 2D Notebook integration should add zero network calls.
- Supabase calls must continue to originate from existing sync effects.
- Report and statement imports must remain lazy.

### Interaction Latency

- Manual quick-add should remain native input based.
- Notebook parsing/intent resolution should be confirm-time or debounced locally in future phases.
- No adapter should run expensive work on every keystroke in the first production integration.

### Rendering Bottlenecks

- Large files and high render surfaces:
  - `src/App.jsx`: 10500+ lines, many state/effect/callback hooks.
  - `src/screens/TodayScreen.jsx`: 1900+ lines.
  - `src/components/ReportsScreen.jsx`: 1500+ lines.
  - `src/screens/ActivityScreen.jsx`: 1300+ lines.
  - `src/lib/reportPdf.js`: 1300+ lines.
  - `src/lib/voiceExpense.js`: 1100+ lines.
- Avoid making these files larger with Notebook business logic. Add small leaf components and headless adapters instead.

## Analytics And SEO Safety Audit

Verified architecture:

- GA4 bootstrap lives in `index.html`.
- Runtime event dispatch lives in `src/lib/analytics.js`.
- Public pageviews are handled by `trackPublicPageView`.
- Public route metadata and canonical URLs are handled by `src/lib/seoRoutes.js`.
- `public/robots.txt` allows the site and points to `https://fbply.com/sitemap.xml`.
- `public/sitemap.xml` lists public SEO, FAQ, sample report, template, and legal URLs.
- AdSense bootstrap lives in `index.html`.

Migration safety rules:

- Do not edit `index.html` for Notebook.
- Do not add Notebook public routes.
- Do not change sitemap, robots, canonical URL generation, JSON-LD, or legal route metadata.
- Do not emit Notebook pageviews.
- If Notebook replaces an existing click or save action later, keep the existing event meaning and avoid duplicate events.
- Any new preview analytics must use unique preview-only event names and be disabled with the feature flag.

## User Experience Audit

### Current Pain Points

- Expense entry exists in multiple places with shared state and prop drilling.
- Manual entry asks for category, label, amount, and note as separate interactions.
- Users can reach similar actions through FAB, home chips, profile quick add, Daily Book, and action hubs.
- Reports/export flow has necessary gating but high cognitive weight.
- Daily Book and Activity both surface history, which can feel duplicative.
- Voice flow has draft review and correction, but it is separate from manual entry.

### Where Notebook Helps

- Manual quick expense capture: natural text can reduce form friction.
- Daily Book/history: ruled lines and date grouping can improve scanning.
- Intent review: Notebook draft can show a calm review state before committing to the existing expense engine.
- Voice/OCR/manual convergence: the intent adapter model can unify future sources without touching storage.

### Where Notebook Does Not Help Yet

- Auth and setup.
- Supabase sync.
- Report export and PDF generation.
- Public SEO pages.
- Statement import parsing.
- Settlement calculations.

## Code Health Audit

Strengths:

- Business calculations are mostly pure utility modules.
- Supabase sync is separated per domain.
- Reports and statement import are lazy-loaded.
- Existing analytics are centralized.
- Notebook foundation is isolated and tree-shakable.

Risks:

- `App.jsx` is a very large orchestration file with many state owners and side effects.
- Expense form state is shared across several UI surfaces.
- Manual, voice, and quick-chip entry are coupled around `saveExpenseRecord`.
- Navigation is tab state rather than route state, so adding URL-driven Notebook modes would be risky.
- Multiple migration/rollback flags already exist; adding more without documentation could get confusing.

Cleanup candidates before public Notebook rollout:

- Extract expense command adapter from `App.jsx` without changing behavior.
- Add tests around `saveExpenseRecord` behavior through a pure wrapper or adapter.
- Add tests for `expenseSync` normalization and diff behavior.
- Add tests for report export request creation.
- Create a small migration flag registry to avoid scattered global flag functions.

## Risk Matrix

| Risk | Severity | Likelihood | Mitigation | Rollback |
| --- | --- | --- | --- | --- |
| Notebook saves malformed expenses | High | Medium | Reuse existing `saveExpenseRecord`; add adapter tests; require confirm step | Disable Notebook preview flag |
| Duplicate analytics events | High | Medium | Keep events in existing save/export handlers; no Notebook pageviews | Disable flag and remove preview event calls |
| Supabase sync regression | High | Low if untouched | Do not edit `expenseSync` or expense shape | Disable flag; existing state path remains |
| Report/export regression | High | Low if untouched | Do not touch report request or PDF/CSV code | No rollback needed if unchanged |
| Bundle increase in main chunk | Medium | Medium | Lazy import Notebook leaf surfaces; keep root barrel unchanged | Remove leaf import or disable flag |
| Input latency from intent pipeline | Medium | Medium | No parsing on keystroke; run lightweight draft only | Disable preview branch |
| User confusion from parallel add UIs | Medium | Medium | Internal preview first; clear labels; no public exposure | Hide preview flag |
| SEO/pageview changes | High | Low if untouched | Do not add routes or pageviews | Revert route/meta edits; none planned |
| Accessibility regression | High | Medium | Keep native inputs; test keyboard and screen-reader labels | Disable preview branch |
| Support burden after rollout | Medium | Medium | Beta cohort and event comparison before public rollout | Return flag to existing UI |

## Release Strategy

1. Internal preview:
   - Hidden behind `window.__FBPLY_NOTEBOOK_PREVIEW__ = true`.
   - No public navigation entry by default.
   - No persistence until explicit save confirmation.
2. Staff/founder QA:
   - Validate keyboard, mobile keyboard, reduced motion, and empty/error states.
   - Compare existing quick-add output to Notebook quick-add output.
3. Private beta:
   - Very small cohort.
   - Existing quick-add remains one click away.
   - Monitor save success, validation failure, abandonment, and sync failure events.
4. Gradual public rollout:
   - Start with read-only Daily Book/Activity presentation.
   - Then manual quick-add preview.
   - Delay shared expenses, voice, OCR, reports, and statement import.
5. Full migration:
   - Only after analytics parity, support feedback, and rollback drills pass.

## Final Scores

- Production Architecture Score: 7.5/10
- Integration Complexity: High
- Rollback Readiness: 8.5/10 if Notebook stays leaf-level and flag gated
- Performance Forecast: Safe for read-only wrappers; moderate risk for input/intent surfaces if imported globally
- Analytics Safety: Safe only if Notebook emits no events and existing handlers remain the source of truth
- UX Opportunity: High for manual quick expense capture and Daily Book scanning
- Public Production Integration Decision: No-Go

## Required Before Production Notebook Integration

- Feature flag and rollback path documented and tested.
- Expense adapter tests around existing save semantics.
- No root barrel export of Notebook.
- No route, SEO, sitemap, robots, or analytics bootstrap changes.
- Internal preview of read-only Notebook surfaces.
- Runtime QA on mobile and desktop.
- Bundle comparison showing no main chunk regression.
