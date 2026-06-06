# FBPLY Performance and Bundle Audit

Date: 2026-06-06

Scope: Audit only, before Reports Modernization. No business logic, API, route, database, Supabase, auth, Reports, Savings, or Trips behavior was changed.

## Build Result

Command used for attribution:

```bash
npm run build -- --sourcemap --outDir %TEMP%/fbply-audit-dist --emptyOutDir
```

Result: build passed.

Vite warning remains:

```text
Some chunks are larger than 700 kB after minification.
```

A second local-only production build was used to isolate auth/Supabase weight:

```bash
npm run build -- --config %TEMP%/fbply-audit-vite.config.mjs --outDir %TEMP%/fbply-audit-local-dist --emptyOutDir
```

Result: build passed. Local-only main chunk was 654.77 KB raw / 191.62 KB gzip versus the Supabase-enabled main chunk at 851.94 KB raw / 242.51 KB gzip. This implies Supabase/auth/sync code contributes roughly 197 KB raw / 51 KB gzip to the initial shell when cloud mode is enabled.

## Top 10 Largest Output Contributors

| Rank | Output | Raw | Gzip | Notes |
| --- | --- | ---: | ---: | --- |
| 1 | `pdf.worker-B1D2UnXD.mjs` | 2161.14 KB | n/a | PDF.js worker asset for statement analysis. Not part of ordinary screen load, but very large when needed. |
| 2 | `index-BzJ5vp_O.js` | 851.94 KB | 242.51 KB | Main app shell: React, App state, Supabase/auth/sync, framer-motion, quick add, profile pieces. |
| 3 | `pdf-7dTuBR-b.js` | 442.01 KB | 129.23 KB | `pdfjs-dist` statement parsing runtime. Deferred behind statement import. |
| 4 | `jspdf.es.min-Cizi7F7s.js` | 400.02 KB | 129.74 KB | PDF export runtime. Deferred behind export. |
| 5 | `ReportCharts-DJpLhRbC.js` | 364.24 KB | 105.88 KB | Recharts chart stack. Deferred behind report chart details. |
| 6 | `html2canvas-BF1v9HFb.js` | 199.64 KB | 46.85 KB | Transitive export dependency. Deferred. |
| 7 | `index-HsXffciV.css` | 165.52 KB | 27.18 KB | Global + legacy + Money OS CSS. |
| 8 | `index.es-CNFUmwpF.js` | 151.58 KB | 48.94 KB | `canvg`/export support stack from jsPDF path. Deferred. |
| 9 | `PublicSeoScreen-B_SUbqUi.js` | 70.32 KB | 17.14 KB | Public SEO route content. Lazy route. |
| 10 | `ActivityScreen-Do2NxFFL.js` | 42.64 KB | 11.48 KB | Activity/People screen logic and presentation. Lazy route. |

## Largest Source Contributors

Source-map attribution by original source content:

| Rank | Source/package | Original source size | Chunk |
| --- | --- | ---: | --- |
| 1 | `pdfjs-dist/build/pdf.mjs` | 797.9 KiB | `pdf-*.js` |
| 2 | `react-dom/cjs/react-dom-client.production.js` | 523.5 KiB | `index-*.js` |
| 3 | `html2canvas/dist/html2canvas.js` | 431.2 KiB | `html2canvas-*.js` |
| 4 | `jspdf/dist/jspdf.es.min.js` | 335.6 KiB | `jspdf.es.min-*.js` |
| 5 | `src/App.jsx` | 284.3 KiB | `index-*.js` |
| 6 | `@supabase/auth-js/GoTrueClient.js` | 230.6 KiB | `index-*.js` |
| 7 | `pako/dist/pako.esm.mjs` | 221.0 KiB | `jspdf.es.min-*.js` |
| 8 | `canvg/lib/index.es.js` | 176.1 KiB | `index.es-*.js` |
| 9 | `@supabase/postgrest-js/dist/index.mjs` | 126.1 KiB | `index-*.js` |
| 10 | `@supabase/storage-js/dist/index.mjs` | 100.9 KiB | `index-*.js` |

No repeated source files across chunks were detected in the generated source maps.

## Shared Dependencies and Duplicates

- `recharts` pulls a large chart stack: `@reduxjs/toolkit`, `react-redux`, `redux`, `reselect`, `victory-vendor`, D3 modules, and `immer`.
- There are two `immer` versions in the Recharts dependency tree: `immer@10.2.0` and `immer@11.1.8` under `@reduxjs/toolkit`.
- `jspdf` pulls optional/report support weight: `canvg`, `core-js`, `dompurify`, `html2canvas`, `pako`, `fflate`, and `fast-png`.
- `lucide-react` is tree-shaken into tiny icon chunks, but icons are imported across many migrated screens. This is not a major byte issue right now.
- `npm ls --all` reports local `node_modules` hygiene issues: extraneous `@napi-rs/wasm-runtime` and `@tybys/wasm-util`, plus missing `@emnapi/*` for that extraneous package. This does not appear in the app bundle, but a clean install should be verified before release.

## Screen Loading Inspection

Temporary local-only production preview was served from `%TEMP%/fbply-audit-local-dist` on `127.0.0.1:5174`.

Observed local app assets:

| Screen | Newly observed local chunks |
| --- | --- |
| Home | `index-*.js`, `index-*.css`, `TodayScreen-*.js`, `NotificationCenter-*.js`, `store-*.js`, `calendar-days-*.js`, `trending-up-*.js` |
| Daily | `DailyBookScreen-*.js`, `ActivityScreen-*.js` |
| People | No extra chunk beyond Daily; People is rendered inside the Daily Book route in the current shell. |
| Savings | `GoalsScreen-*.js` |
| Reports | `ReportsScreen-*.js`, `heart-handshake-*.js` |
| Profile | `SettingsScreen-*.js` |

Findings:

- Home loads `NotificationCenter` immediately even when notifications are not open. This is safe to defer until the notification panel is opened.
- Daily and People currently share the Daily Book route load. This matches the Money OS perception model, but it means People code loads with Daily even if the user only needs expense history.
- Reports screen itself stays small. The heavy chart, statement parsing, PDF export, PDF.js, and jsPDF chunks remain deferred behind report/statement/export actions.
- Profile Hub appears in `SettingsScreen`, but `ProfileHub` is also imported directly by `App.jsx` for the inline `ProfileScreen`, so part of Profile Hub is currently in the main shell.

## Design System Inspection

Findings:

- Money OS components are centralized in `src/design-system`, but legacy primitives still coexist:
  - `src/components/AppPrimitives.jsx` still exports legacy `EmptyState`, `CurrencyInput`, `AppModal`, etc.
  - Money OS exports `EmptyState`, `FLoader`, `MoneyCard`, `StatCard`, `ActionCard`, `InsightCard`, `StatusBadge`, `SectionHeader`, etc.
- Some migrated screens still use both legacy and Money OS primitives in the same file:
  - `DailyBookScreen.jsx` imports both legacy `EmptyState` and Money OS `EmptyState`.
  - `SharedExpenseScreen.jsx`, `SavingsBucketsManager.jsx`, and settings/profile areas mix legacy forms/cards with Money OS states.
- CSS is split between a large global `src/index.css` source file and `src/design-system/money-os.css`. The final CSS output is 165.52 KB raw / 27.18 KB gzip.
- `money-os.css` is imported from `src/design-system/index.js`, `components.jsx`, and `forms.jsx`. Bundling dedupes this, but the import convention is easy to simplify later.
- Several card and empty-state patterns remain screen-local (`chart-card`, `planner-*card`, `shared-card`, `history-summary-card`, `daily-book-insight-card`, etc.). These are mostly presentation duplication, not duplicate runtime libraries.

## Safe Optimization Opportunities

| Opportunity | Safety | Estimated reduction | Notes |
| --- | --- | ---: | --- |
| Lazy-load `NotificationCenter` only when opened | Low | 2-4 KB gzip initial | Already lazy, but currently observed on Home load. Gate rendering by open state. |
| Move inline `ProfileScreen` + `ProfileHub` out of `App.jsx` into a lazy route/module | Low-Medium | 5-15 KB gzip initial | Presentation-only split if props stay unchanged. Also keeps Profile Hub out of base shell. |
| Move `QuickAddSheet` / add hub UI out of `App.jsx` into a lazy component | Medium | 10-25 KB gzip initial | Needs careful prop pass-through to preserve existing save flows. No business logic rewrite required. |
| Split auth/cloud sync code from the local app shell where possible | Medium-High | Up to 50 KB gzip initial in local/offline modes | Local-only build shows the approximate delta. Must preserve auth behavior; do later with focused tests. |
| Keep Reports heavy dependencies action-gated | Low | Prevents 300+ KB gzip from initial route | Already mostly true. Protect this during Reports Modernization. |
| Consider lighter chart rendering than Recharts for report summaries | Medium | 60-100 KB gzip on report chart path | Recharts bundle is large, but deferred. Replace only if chart feature scope stays simple. |
| Prune legacy CSS after rollback validation | Low-Medium | 4-10 KB gzip CSS | Requires visual regression across Home, Daily, People, Savings, Reports, Profile. |
| Consolidate legacy/Money OS empty states and card primitives | Low-Medium | 3-8 KB gzip plus CSS cleanup | Do after migration validation to avoid rollback churn. |
| Review jsPDF export dependency path before modernization | High | 80-150 KB gzip on export path | High risk because Reports/PDF output is user-facing and accuracy-sensitive. |
| Keep PDF.js worker off initial load and out of any future precache | Low | Avoids 2.1 MB upfront asset | Current screen loading keeps it deferred; preserve this. |

## Risk Assessment

Low risk:

- Deferring Notification Center render until open.
- Keeping existing Reports heavy chunks lazy.
- Removing redundant CSS after visual validation.
- Cleaning local `node_modules` by fresh install/lockfile verification.

Medium risk:

- Lazy-splitting Profile Hub/ProfileScreen and QuickAddSheet from `App.jsx`.
- Moving remaining presentation-only card/empty-state UI to Money OS primitives.
- Replacing Recharts if Reports Modernization can accept simpler chart primitives.

High risk:

- Changing PDF generation dependencies or output flow.
- Changing statement parsing/PDF.js behavior.
- Moving Supabase/auth/sync code without a dedicated auth regression plan.

## Optimization Roadmap

Phase A: Guardrails before Reports Modernization

1. Preserve current lazy boundaries for `StatementUploadSheet`, `statementImport`, `pdfjs-dist`, `reportPdf`, `jspdf`, `html2canvas`, `canvg`, and `ReportCharts`.
2. Add a build-size budget check for `index-*.js`, `ReportCharts-*.js`, `pdf-*.js`, and CSS output.
3. Record current baseline:
   - Main app shell: 851.94 KB raw / 242.51 KB gzip.
   - CSS: 165.52 KB raw / 27.18 KB gzip.
   - Report chart chunk: 364.24 KB raw / 105.88 KB gzip.

Phase B: Safe presentation splits

1. Gate `NotificationCenter` lazy import behind the open state.
2. Extract Profile Hub/ProfileScreen from `App.jsx` into a lazy presentation module.
3. Extract Quick Add/Add Hub presentation from `App.jsx` into a lazy module while passing existing callbacks unchanged.

Phase C: Design-system cleanup after rollback validation

1. Replace remaining legacy empty states in migrated screens.
2. Consolidate repeated screen-local card styles only after the rollback flags are retired.
3. Prune global CSS that no longer maps to live or rollback screens.

Phase D: Reports Modernization guardrail

1. Do not import Recharts, jsPDF, PDF.js, html2canvas, canvg, or DOMPurify from the Reports route root unless the specific user action requires it.
2. If charts are redesigned, evaluate native SVG/CSS charts before adding new chart dependencies.
3. If PDF output changes, compare generated report content and layout before any dependency replacement.

## Final Notes

- Build passes.
- No behavior changes were made.
- The main bundle warning is real and mainly driven by the app shell, React DOM, Supabase/auth/sync, and framer-motion.
- Reports/statement/export dependencies are large but mostly deferred correctly today. The main Reports Modernization risk is accidentally pulling those deferred chunks into the base Reports route or main app shell.
