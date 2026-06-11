# FBPLY V8 Bundle Report

Date: 2026-06-11
Phase: V8.0 Performance and Bundle Optimization

## Summary

V8.0 reduced the primary app entry chunk and separated heavy vendors into stable cacheable chunks without changing user-facing functionality, calculations, analytics semantics, APIs, or Supabase schemas.

## Measurement Method

Commands used:

```bash
npm run build -- --sourcemap
npm run lint
```

Chunk sizes are from the Vite production build output. Gzip numbers are calculated from generated JS assets in `dist/assets`.

## Before V8

Key baseline from the pre-optimization sourcemap build:

| Area | Chunk | Raw | Gzip |
| --- | --- | ---: | ---: |
| App shell | `index-*.js` | 908.49 KB | 255.31 KB |
| Quick Tools | `QuickToolsSheet-*.js` | 8.65 KB | 2.91 KB |
| Product Health | `ProductHealthDashboard-*.js` | 5.60 KB | 2.31 KB |
| Reports | `ReportsScreen-*.js` | 34.38 KB | 7.61 KB |
| Statement UI | `StatementUploadSheet-*.js` | 16.27 KB | 4.87 KB |
| Statement engine | `statementImport-*.js` | 17.33 KB | 6.62 KB |
| Charts | `ReportCharts-*.js` | 364.24 KB | 105.03 KB |
| PDF parser | `pdf-*.js` | 442.02 KB | 128.39 KB |
| PDF export | `jspdf.es.min-*.js` | 400.03 KB | 128.70 KB |
| DOM capture | `html2canvas-*.js` | 199.65 KB | 46.63 KB |

Largest app-shell contributors included React DOM, `src/App.jsx`, Supabase client modules, and the Framer Motion runtime.

## After V8

Final production chunk layout:

| Area | Chunk | Raw | Gzip |
| --- | --- | ---: | ---: |
| App entry | `index-*.js` | 384.48 KB | 101.51 KB |
| React vendor | `vendor-react-*.js` | 194.63 KB | 61.76 KB |
| Supabase vendor | `vendor-supabase-*.js` | 196.47 KB | 49.75 KB |
| Runtime | `rolldown-runtime-*.js` | 0.69 KB | 0.42 KB |
| Quick Tools | `QuickToolsSheet-*.js` | 8.77 KB | 2.96 KB |
| Product Health | `ProductHealthDashboard-*.js` | 4.28 KB | 1.69 KB |
| Reports | `ReportsScreen-*.js` | 34.55 KB | 7.61 KB |
| Statement UI | `StatementUploadSheet-*.js` | 15.90 KB | 4.69 KB |
| Statement engine | `statementImport-*.js` | 17.42 KB | 6.65 KB |
| Charts view | `ReportCharts-*.js` | 3.12 KB | 1.33 KB |
| Charts vendor | `vendor-charts-*.js` | 372.98 KB | 107.63 KB |
| PDF parser | `vendor-pdfjs-*.js` | 442.18 KB | 128.53 KB |
| PDF export | `vendor-jspdf-*.js` | 401.90 KB | 129.56 KB |
| DOM capture | `vendor-html2canvas-*.js` | 199.66 KB | 46.64 KB |
| PDF SVG helpers | `vendor-pdf-svg-*.js` | 151.72 KB | 48.66 KB |
| Sanitizer | `vendor-sanitize-*.js` | 23.87 KB | 9.41 KB |

Initial JS path after chunking is app entry plus React, Supabase, and runtime:

| Metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| Entry chunk raw | 908.49 KB | 384.48 KB | -524.01 KB |
| Entry chunk gzip | 255.31 KB | 101.51 KB | -153.80 KB |
| Initial JS gzip, including React and Supabase vendors | 255.31 KB | 213.44 KB | -41.87 KB |

## Bundle Improvements

KEEP:

- Reports remains route-lazy through `ReportsScreen`.
- Statement Analysis remains sheet/engine-lazy through `StatementUploadSheet` and `statementImport`.
- Product Health Dashboard remains founder-gated and lazy.
- Quick Tools remains lazy through `QuickToolsSheet`.

CHANGED:

- Removed Framer Motion from the app shell and dependency manifest.
- Replaced Framer wrapper usage with the existing CSS-first V7.5 motion token system via `fbply-v8-motion-surface`.
- Added manual vendor chunk boundaries for React, Supabase, charting, PDF parsing, PDF export, DOM capture, SVG helpers, icons, and sanitizer libraries.
- Kept PDF parser and PDF export dependencies in separate chunks so Statement Analysis does not load export-only libraries.

## Duplicate Dependency Review

Runtime-relevant duplicate:

| Package | Versions | Source | Decision |
| --- | --- | --- | --- |
| `immer` | `10.2.0`, `11.1.8` | Recharts dependency stack | DEFER. Do not override dependency internals without a dedicated chart regression pass. |

Tooling or local-package duplicates:

| Package | Decision |
| --- | --- |
| `eslint-visitor-keys`, `fs-extra`, `kleur`, `lru-cache`, `semver`, `xmlbuilder`, `yallist`, `@emnapi/wasi-threads` | DEFER. Dev or optional-package transitive versions, not first-load app code. |

`npm ls --all` still reports local optional-package noise around `@napi-rs/wasm-runtime` from the PDF/native canvas chain. `npm prune` completed successfully, and production build/lint are unaffected.

## Legacy Flag Audit

| Flag | Location | Classification | Reason |
| --- | --- | --- | --- |
| `window.__FBPLY_LEGACY_MOTION__` | `src/App.jsx`, CSS motion layer | KEEP | Required rollback for V7.5 Premium Motion System. |
| `window.__FBPLY_LEGACY_PROGRESS_LAYER__` | `src/lib/progressLayer.js` | KEEP | Required rollback for Progress Layer. |
| `window.__FBPLY_LEGACY_MONEY_SCORE__` | `src/lib/moneyScore.js` | KEEP | Required rollback for Money Health. |
| `window.__FBPLY_LEGACY_QUICK_TOOLS__` | `src/App.jsx` | KEEP | Required rollback for V7.7 Quick Tools. |
| `window.__FBPLY_LEGACY_NEXT_ACTION__` | `src/lib/nextBestAction.js` | KEEP | Required rollback for V7.8 Next Best Action. |
| `window.__FBPLY_LEGACY_DAILY_HERO__` | `src/App.jsx` | DEFER | Current Daily Hero preservation requirement. Remove only after dedicated Daily regression pass. |
| `window.__FBPLY_LEGACY_INSIGHTS__` | `src/App.jsx` | DEFER | Current Insights Hub preservation requirement. Remove only after dedicated Insights regression pass. |
| `window.__FBPLY_LEGACY_NAVIGATION__` | `src/App.jsx` | DEFER | Broad navigation behavior fallback, higher route-regression risk. |
| `window.__FBPLY_LEGACY_HOME__` | `src/screens/TodayScreen.jsx` | DEFER | Older Home branch; removal needs Home activation and Next Action validation. |
| `window.__FBPLY_LEGACY_DAILY_BOOK__` | `src/screens/DailyBookScreen.jsx` | DEFER | Daily Book legacy branch; remove only with filter/history tests. |
| `window.__FBPLY_LEGACY_PEOPLE__` | `src/screens/ActivityScreen.jsx` | DEFER | People workflows are settlement-sensitive. |
| `window.__FBPLY_LEGACY_BORROW_LEND__` | `src/screens/ActivityScreen.jsx` | DEFER | Borrow/lend settlement behavior is high risk. |
| `window.__FBPLY_LEGACY_SHARED_EXPENSES__` | `src/screens/ActivityScreen.jsx` | DEFER | Shared group settlement behavior is high risk. |
| `window.__FBPLY_LEGACY_REPORTS__` | `src/components/ReportsScreen.jsx` | DEFER | Reports/export/statement flows need dedicated regression before removal. |
| `window.__FBPLY_LEGACY_ADD__` | `src/App.jsx` | DEFER | Add Hub drives creation flows and analytics. |
| `window.__FBPLY_LEGACY_FOOTER__` | `src/App.jsx` | DEFER | Legal/support/profile access rollback. |
| `window.__FBPLY_LEGACY_PROFILE_HUB__` | `src/App.jsx` | DEFER | Profile hub/settings access rollback. |

No flags were removed in V8.0 because all candidates either protect recently added systems or affect high-risk workflows.

## Component Consolidation Review

Consolidated:

- Framer Motion wrapper duplication was replaced by one `motionSurfaceClassName` helper and one CSS motion surface class.

Identified for future consolidation:

- Button usage still mixes `primary-button` / `ghost-button` classes with Money OS `PrimaryButton` / `SecondaryButton` components.
- Card usage is mostly on Money OS primitives, but legacy branch cards remain in older screens.
- Loader usage is centralized around `FLoader`, with route-specific labels preserved.

V8.0 did not consolidate form buttons or cards further because those changes would touch many workflows and require broader visual regression testing.

## CSS Cleanup Review

Removed:

- No low-risk CSS blocks were removed.

Changed:

- Added `fbply-v8-motion-surface` so route/shell fade motion stays CSS-first after removing Framer Motion.

Deferred:

- Legacy V5/V6/V7 screen CSS should be removed only with the corresponding legacy flag removal.
- Button class cleanup should wait for a shared button migration pass.
- Report and people CSS cleanup should wait for report export and settlement regression coverage.

## Performance Impact

- Main entry chunk is substantially smaller and easier to parse.
- First-load gzip is lower even after separating React and Supabase vendor chunks.
- Vendor chunks are more cacheable across route changes and future releases.
- Report and statement heavy libraries remain action-gated.
- Recharts heavy dependencies are isolated to `vendor-charts`.
- PDF parser/export libraries are split by purpose to avoid loading export-only code during statement parsing.

## Verification

Passed:

- `npm run lint`
- `npm run build -- --sourcemap`

Required final smoke checks:

- Daily Hero still renders.
- Insights Hub still renders.
- Progress Layer still renders.
- Money Health still renders.
- Quick Tools opens.
- Next Best Action renders one shared action.
- Mobile 390px has no horizontal overflow.
- Fresh browser console has no errors.
