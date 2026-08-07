# FBPly Production Audit

Date: 2026-08-07

Scope: production audit and safe hardening only. Financial logic, money calculations, Supabase schema, Google Analytics, Google AdSense, SEO route content philosophy, and notebook workflows were preserved.

## Executive Summary

- Source graph audit found 70 source modules, no unreachable source files, and no import cycles after following both `import` and `export ... from` edges.
- Google Analytics and Google AdSense were audited read-only and not modified.
- SEO route coverage was verified: 47 SEO/legal routes are present in `public/sitemap.xml`.
- `npm audit fix` was applied without `--force`, resolving non-breaking dependency advisories.
- One high security advisory remains in `pdfjs-dist`; the available fix requires a breaking major upgrade to `pdfjs-dist@6.2.108`, so it was not applied automatically.
- Production validation passed with `npm run lint` and `npm run build`.

## Pass 1: Architecture Audit

Findings:

- Largest source files remain:
  - `src/App.jsx`: about 12.6k lines.
  - `src/lib/reportPdf.js`: about 3.9k lines.
  - `src/screens/PublicSeoScreen.jsx`: about 2k lines.
  - `src/screens/TodayScreen.jsx`: about 1.9k lines.
  - `src/screens/ActivityScreen.jsx`: about 1.8k lines.
- No circular dependencies were detected.
- No source module was proven unreachable, so no source files were deleted.
- Existing lazy-loaded chunks are preserving route/tool separation for large features.

Action:

- No architecture deletion was performed because nothing was proven unused.

## Pass 2: Architecture Refactor

Actions:

- Kept current folder structure stable to avoid risky production churn.
- Preserved existing domains: `components`, `screens`, `lib`, `hooks`, and `design-system`.

Remaining architecture debt:

- `src/App.jsx` should be split gradually into route shell, auth/sync provider, add-hub feature, and home orchestration modules.
- `src/lib/reportPdf.js` should be split into report data shaping, document layout, chart rendering, and export helpers.
- Global CSS should be moved toward feature CSS files or cascade layers over multiple small PRs.

## Pass 3: Performance Optimization

Findings:

- Production build already defers major feature code into chunks such as reports, activity, quick tools, statement import, PDF export, and charting.
- Heavy bundles remain intentionally deferred:
  - `pdf.worker`: about 2161 KB.
  - `vendor-pdfjs`: about 442 KB raw / 129 KB gzip.
  - `vendor-jspdf`: about 401 KB raw / 130 KB gzip.
  - `vendor-charts`: about 373 KB raw / 108 KB gzip.
- Main app bundle remains about 477 KB raw / 128 KB gzip after build.

Action:

- No risky memoization or render behavior changes were made without profiling evidence.

## Pass 4: Production Hardening

Actions:

- Improved the app-level error boundary recovery UI:
  - Added a non-reload `Try again` recovery action.
  - Kept the full `Refresh app` recovery path.
  - Added `role="alert"` and `aria-live="assertive"`.
  - Added async image decoding for the fallback logo.

## Pass 5: Code Quality

Actions:

- Ran ESLint successfully.
- Kept Google, Supabase, SEO, and analytics behavior unchanged.
- Avoided deleting rollback/legacy flags because they are active compatibility controls, not proven dead code.

Validation:

- `npm run lint`: pass.

## Pass 6: SEO Audit

Findings:

- `public/robots.txt` allows indexing and references `https://fbply.com/sitemap.xml`.
- `public/ads.txt` is present and contains the Google publisher entry.
- Sitemap coverage check passed for all 47 SEO/legal routes.
- Structured data generation serialized successfully for every SEO/legal route.

Action:

- No SEO metadata changes were needed in this pass.

## Pass 7: Google Services Audit

Findings:

- Google tag script count: 1.
- Measurement ID `G-ZP0RX3ZHH2` count in `index.html`: 2.
- `dataLayer` is initialized.
- `gtag()` function is present.
- `gtag('config', 'G-ZP0RX3ZHH2')` count: 1.
- AdSense script count: 1.
- Publisher ID `ca-pub-8482951627272767` count: 1.
- Runtime event forwarding remains centralized in `src/lib/analytics.js`.

Action:

- No Analytics or AdSense code was modified.

## Pass 8: Accessibility Audit

Actions:

- Added `inert` to the closed quick-tools drawer so hidden animated drawer controls are not keyboard-focusable.
- Improved the app-level error boundary announcement and recovery actions.

Remaining accessibility recommendations:

- Add browser-driven keyboard smoke tests for add hub, quick tools, settings, notification center, and report export flows.
- Add contrast checks for every custom theme.

## Pass 9: Security Audit

Actions:

- Ran `npm audit --omit=dev`.
- Applied `npm audit fix` without force.
- Verified dependency tree with `npm ls --depth=0`; extraneous packages from the earlier install state were removed.

Resolved by safe dependency update:

- DOMPurify advisories.
- PostCSS advisories.
- Vite development-server advisories.

Remaining security item:

- `pdfjs-dist` has a high advisory. The available automated fix requires `npm audit fix --force` and upgrades to `pdfjs-dist@6.2.108`, which is a breaking major upgrade. This should be handled in a dedicated statement-import hardening branch with PDF parsing regression tests.

## Pass 10: Final Production Audit

Validation:

- `npm run lint`: pass.
- `npm run build`: pass.
- SEO prerender: 47 route shells generated.
- `npm audit --omit=dev`: one remaining high advisory in `pdfjs-dist`, intentionally not force-upgraded.

TypeScript:

- No TypeScript project or `tsconfig.json` is configured. TypeScript validation could not be run as a project check without adding new TypeScript infrastructure.

## Files Changed In This Audit Pass

- `package-lock.json`: safe dependency resolution updates from `npm audit fix`.
- `src/components/ErrorBoundary.jsx`: recovery and accessibility hardening.
- `src/components/QuickToolsSheet.jsx`: closed drawer focus safety.
- `src/index.css`: error boundary action layout.

## Future Recommendations

- Create a dedicated `pdfjs-dist` v6 upgrade branch with statement PDF fixtures and parsing regression checks.
- Split `src/App.jsx` into smaller feature modules with no behavior changes.
- Add route-level error boundaries for reports, statement upload, quick tools, and public SEO routes.
- Add Playwright smoke tests for the primary production flows.
- Add bundle budget checks for main app, chart, PDF, and export chunks.
- Add automated SEO checks for canonical, sitemap, robots, JSON-LD, Open Graph, and Twitter metadata.
