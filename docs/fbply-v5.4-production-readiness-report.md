# FBPLY V5.4 Production Readiness Report

Date created: 2026-06-07  
Scope: audit only  
Rule: prepare for optimization. Do not optimize yet.

## Purpose

This report prepares FBPLY for future cleanup, optimization, and scaling without changing user-facing behavior. It inventories rollback paths, legacy components, CSS debt, bundle structure, dependencies, analytics quality, and scaling risks.

No code was removed, no routes were changed, no UI was changed, no analytics behavior was changed, and no bundle optimization was performed during this phase.

## Evidence Used

| Evidence | Source |
| --- | --- |
| Rollback flags and legacy branches | Static source search across `src` |
| Component overlap | Imports of `AppPrimitives.jsx` and `src/design-system` |
| CSS candidates | Static selector scan of `src/index.css` and `src/design-system/money-os.css` |
| Bundle structure | Existing `dist/assets` artifacts, raw and gzip size scan |
| Dependency usage | `package.json`, config files, source imports, dynamic imports |
| Analytics quality | `src/lib/analytics.js` and call sites for `trackEvent`, `trackFeatureUsage`, and `trackActivation` |

Static scans are preparation evidence, not deletion proof. Any cleanup still needs validation, visual checks, and build verification.

## A. Safe To Remove

These are the safest future cleanup candidates. They are not removed in V5.4.

| Item | Location | Evidence | Risk | Readiness Notes |
| --- | --- | --- | --- | --- |
| `.mos-report-legacy-button` selector | `src/design-system/money-os.css` | Static scan found the selector only in CSS | Low | Candidate for removal after one Reports visual pass and class-construction check. |
| Old home/footer LinkedIn selectors | `src/index.css`: `.home-linkedin-button`, `.linkedin-glyph` | Static scan found no source references | Low | Current footer/profile links use newer classes. Confirm no static HTML or CMS usage. |
| Old notification selector names | `src/index.css`: `.notification-bell-button`, `.notification-center-panel`, `.notification-center-summary`, `.smart-notification-center` | Static scan found no source references | Low | Current app uses `top-notification-button` and modal primitives. Confirm notification screenshots first. |
| Old skeleton helpers | `src/index.css`: `.skeleton-icon`, `.skeleton-text-group` | Static scan found no source references | Low | Candidate after loading-state screenshot pass. |
| Legacy utility/form selectors | `src/index.css`: `.action-required`, `.critical`, `.stable-select`, `.trip-payment-form` | Static scan found no source references | Low | Remove only after checking no dynamic class names are created from data. |
| Type-only React packages, if JS-only remains intentional | `package.json`: `@types/react`, `@types/react-dom` | Static import scan found no direct use | Low | Dev-only candidate. Keep if editor tooling or future TS migration is planned. Validate with install, lint, and build before removal. |

Dependency note: no runtime dependency is safe to remove from static evidence alone. Packages that look unused by imports may still be required by scripts, peer dependencies, native builds, or Vite tooling.

## B. Requires Validation

These items should wait for the V5.2 observation window, visual regression checks, and focused production-flow verification.

### Rollback Retirement Order

Recommended retirement order after validation:

| Order | Flag / Path | Location | Dependency Chain | Risk | Validation Required |
| --- | --- | --- | --- | --- | --- |
| 1 | `window.__FBPLY_LEGACY_FOOTER__`, `window.__FBPLY_LEGACY_PROFILE_HUB__` | `src/App.jsx` | Bottom navigation, Settings/Profile entry, legal/support/founder access | Medium | Verify profile hub, legal pages, support links, sign-out, theme change, and founder dashboard gating. |
| 2 | `window.__FBPLY_LEGACY_ADD__` | `src/App.jsx`, `QuickAddFab` | Add Hub sheet, expense/income/people/other selections, creation analytics | Medium | Verify single tap, long press/context menu fallback, Add Hub selections, and creation events. |
| 3 | `window.__FBPLY_LEGACY_DAILY_BOOK__` | `src/screens/DailyBookScreen.jsx` | Daily expense summary, filters, range selection, add-expense CTA, empty states | Medium | Verify expense history, custom range, filter analytics, and empty state behavior. |
| 4 | `window.__FBPLY_LEGACY_HOME__`, `HOME_PRESENTATION_VERSION` | `src/screens/TodayScreen.jsx` | Home first viewport, Next Action, activation checklist, smart insights | Medium | Retire only after Home recommendation engagement is stable. Verify Next Action Click Rate. |
| 5 | `window.__FBPLY_LEGACY_PEOPLE__`, `window.__FBPLY_LEGACY_BORROW_LEND__`, `window.__FBPLY_LEGACY_SHARED_EXPENSES__` | `src/screens/ActivityScreen.jsx` | Activity timeline, Money Book, Shared Expenses panel, settlements, group payments | High | Verify borrow/lend creation, shared group creation, settlement completion, edit/delete, and timeline grouping. |
| 6 | `window.__FBPLY_LEGACY_REPORTS__` | `src/components/ReportsScreen.jsx` | Report library, report generation, statement upload, chart loading, PDF/CSV export | High | Verify report generation, statement analysis started/completed, export/share, and report history. |

### Legacy Components And Money OS Equivalents

| Candidate | Current Usage | Money OS Equivalent | Risk | Validation Required |
| --- | --- | --- | --- | --- |
| `AppPrimitives.EmptyState` | `App.jsx`, Daily Book, Savings, Notification Center | `EmptyState` from `src/design-system` | Medium | Replace only screen by screen after rollback branches are retired. |
| `AppPrimitives.AppModal` | `App.jsx`, Settings, Activity, Notification Center | `BottomSheet` or a future shared Money OS modal | Medium | Needs focus trap, escape close, scroll lock, and mobile layout checks. |
| `AppPrimitives.CurrencyInput` | `App.jsx`, Settings, Goals, Activity, Shared Expenses, Recurring Schedule, Profile controls, Savings | `AmountInput` from `src/design-system/forms.jsx` | High | High because money entry must not change parsing, validation, keyboard behavior, or saved values. |
| `BrandMark` / `HeaderLogo` | `App.jsx`, Settings, Legal, Public SEO | No complete Money OS replacement yet | Medium | Keep until brand/header primitive is defined and checked across public and app surfaces. |
| Mixed empty states | Daily Book, Savings, Shared Expenses | Money OS `EmptyState` / `SuccessState` | Medium | Consolidate after screenshot coverage for empty, success, and first-use states. |
| Screen-local card styles | Home, People, Reports, Savings, Profile | `MoneyCard`, `StatCard`, `ActionCard`, `InsightCard` | Medium | Consolidate only after rollback branch retirement to avoid style churn. |

### CSS Cleanup Candidates

Static CSS scan summary:

| Signal | Count | Risk | Notes |
| --- | --- | --- | --- |
| Class selectors scanned | 771 | Low | From `src/index.css` and `src/design-system/money-os.css`. |
| Candidate unused selectors | 37 | Low-Medium | Static only. Dynamic class names can produce false positives. |
| Duplicate class names across global CSS and Money OS CSS | 27 | Medium | Some duplicates are intentional overrides for migrated screens. |

Candidate unused selectors:

`action-required`, `critical`, `home-linkedin-button`, `linkedin-glyph`, `mos-add-hub-footer-actions`, `mos-badge--danger`, `mos-badge--success`, `mos-badge--warning`, `mos-button--lg`, `mos-button--sm`, `mos-card--danger`, `mos-card--flat`, `mos-card--success`, `mos-card--tint`, `mos-card--warning`, `mos-home-footer-strip`, `mos-home-header`, `mos-home-hero-metrics`, `mos-home-hero-value`, `mos-home-next-action-value`, `mos-icon-frame--danger`, `mos-icon-frame--success`, `mos-icon-frame--warning`, `mos-loader--lg`, `mos-loader--sm`, `mos-loader--xs`, `mos-report-legacy-button`, `notification-bell-button`, `notification-center-panel`, `notification-center-summary`, `skeleton-icon`, `skeleton-text-group`, `smart-notification-center`, `stable-select`, `today-careful`, `today-tight`, `trip-payment-form`.

Duplicate selector names across global CSS and Money OS CSS:

`daily-book-add-button`, `money-os-daily-book`, `money-os-home`, `money-os-people-hub`, `money-os-reports`, `mos-action-card`, `mos-add-hub-grid`, `mos-card`, `mos-card__copy`, `mos-card__detail`, `mos-eyebrow`, `mos-home-action-card-grid`, `mos-home-card-note`, `mos-insight-card__body`, `mos-loader`, `mos-loader__label`, `mos-loader__mark`, `mos-profile-hub`, `mos-profile-hub-grid`, `mos-profile-hub-section`, `mos-report-export-grid`, `mos-report-insight-grid`, `mos-report-library-grid`, `mos-section-header`, `mos-section-header__copy`, `mos-state`, `mos-state__visual`.

### Dependency Cleanup List

| Dependency | Evidence | Risk | Recommendation |
| --- | --- | --- | --- |
| `@types/react`, `@types/react-dom` | No TS files and no static import references | Low | Candidate if the project intentionally remains JS-only. Validate editor/build/lint impact first. |
| `tailwindcss` | No direct source import, but `@tailwindcss/vite` is configured in `vite.config.js` | Medium | Do not remove unless Vite/Tailwind build proves the plugin does not require the package. |
| `@capacitor/android`, `@capacitor/cli` | Not imported by app source, but used by Capacitor scripts and Android build workflow | High | Keep unless Android release support is explicitly retired. |
| `jspdf`, `pdfjs-dist`, `recharts` | All used by report export, statement import, and charts | High | Large, but live. Consider usage-led alternatives later, not cleanup removal. |
| `framer-motion` | Used by app shell motion in `App.jsx` | Medium | Keep while Money OS motion depends on existing motion behavior. |

## C. High Risk

These should not be removed or changed without dedicated tests, migration plans, and production validation.

| Item | Location | Evidence | Risk | Why High Risk |
| --- | --- | --- | --- | --- |
| Legacy shared group data compatibility | `src/lib/financialActivity.js` | `legacyAmount`, generated `legacy-payment-*` entries | High | This protects older saved shared-group records. Removing it can change settlement behavior. |
| Legacy EMI compatibility | `src/lib/ruleEngine.js` | `legacyEmi = normalizeMoney(profile.emi?.amount)` | High | This affects financial calculations for older profile data. It is not UI debt. |
| Full `AppPrimitives.jsx` removal | `src/components/AppPrimitives.jsx` | Still imported by app, settings, legal/public SEO, goals, activity, savings, shared expenses, notifications, recurring schedules | High | Currency entry, modals, branding, and empty states are live across product flows. |
| Report PDF/export stack | `src/lib/reportPdf.js`, dynamic imports in `src/App.jsx` | Uses `jspdf`, export/share flows, report history | High | Output correctness matters. Any cleanup needs report regression coverage. |
| Statement parsing stack | `src/lib/statementImport.js`, `StatementUploadSheet.jsx` | Uses `pdfjs-dist`, PDF worker, statement import flow | High | File parsing has edge cases and directly affects statement analysis completion. |
| SEO route removal | `src/lib/seoRoutes.js`, `src/screens/PublicSeoScreen.jsx` | 42 public SEO route metas and dynamic public page rendering | High | Could harm public discovery and canonical page behavior. Use crawl data before pruning. |
| Supabase sync/auth paths | `src/App.jsx`, sync libraries, `src/lib/supabaseClient.js` | Profile, expenses, savings, commitments, groups, money book, reports, statement mappings, voice memory | High | Sync and auth are behavior-critical and outside cleanup scope. |
| People settlement flows | `ActivityScreen.jsx`, `SharedExpenseScreen.jsx`, `financialActivity.js` | Borrow/lend, shared groups, settlement completion | High | Requires data integrity checks across personal and group money records. |

## D. Bundle Opportunities

This is an optimization roadmap only. Do not implement until validation confirms the highest-value paths.

Existing `dist/assets` snapshot:

| Chunk / Area | Raw Size | Gzip Size | Risk | Opportunity |
| --- | ---: | ---: | --- | --- |
| `pdf.worker-B1D2UnXD.mjs` | 2110.50 KB | 451.18 KB | High | Keep action-gated behind statement import. Investigate only if statement usage is validated and load time is painful. |
| `index-CcB_YLWk.js` | 835.09 KB | 235.67 KB | Medium | Main app shell is the largest app-owned startup chunk. Future work: split inline profile/setup/auth/export orchestration from `App.jsx`. |
| `pdf-BEQggcAO.js` | 431.62 KB | 125.34 KB | High | PDF.js runtime. Keep lazy with statement import. |
| `jspdf.es.min-BMMPt6Re.js` | 390.60 KB | 125.65 KB | High | PDF export runtime. Keep action-gated behind report export. |
| `ReportCharts-DSROZBVW.js` | 355.66 KB | 102.52 KB | Medium | Recharts is large but lazy. Optimize only if report chart usage is low or loading is slow. |
| `html2canvas-BURcflZl.js` | 194.92 KB | 45.50 KB | High | Export support dependency. Preserve gating. |
| `index-Dobxnwvs.css` | 182.08 KB | 29.08 KB | Medium | CSS cleanup should follow rollback retirement and visual regression. |
| `index.es-ouD_JBDl.js` | 147.99 KB | 47.40 KB | High | Likely export rendering dependency. Do not touch without report tests. |
| `PublicSeoScreen-DZ6zMEQl.js` | 68.66 KB | 16.66 KB | Medium | Public SEO route renderer is lazy. Optimize only with SEO validation. |
| `ActivityScreen-Bc8sqrqR.js` | 40.61 KB | 10.84 KB | Medium | People and Activity share one route. Future split only after People validation. |
| `TodayScreen-Cg3MwKAv.js` | 35.88 KB | 9.57 KB | Medium | Home is business-critical. Optimize only after Next Action validation. |
| `ReportsScreen--WU-Yus_.js` | 31.34 KB | 6.70 KB | Low | Route shell is acceptable; heavy report work is already deferred. |
| `reportPdf-CHTh2q5T.js` | 27.89 KB | 9.45 KB | High | Keep action-gated behind export. |
| `statementImport-DSd_mCDs.js` | 16.88 KB | 6.44 KB | High | Keep action-gated behind statement upload. |
| `ProductHealthDashboard-CF5IVx-z.js` | 5.40 KB | 2.21 KB | Low | Founder dashboard is small and lazy. Keep current boundary. |

Largest source files by size:

| Source | Size | Risk | Readiness Note |
| --- | ---: | --- | --- |
| `src/App.jsx` | 286.53 KB | High | Centralizes auth, sync, setup, app shell, quick add, profile, export, and navigation. Future extraction should be test-led. |
| `src/index.css` | 185.07 KB | Medium | Global CSS includes legacy, Money OS integration, app shell, and screen styles. Cleanup depends on rollback retirement. |
| `src/screens/PublicSeoScreen.jsx` | 81.21 KB | Medium | Large but public-route lazy. SEO changes require crawl validation. |
| `src/screens/TodayScreen.jsx` | 61.61 KB | Medium | Home has rollback branch and recommendation logic. Validate before cleanup. |
| `src/components/ReportsScreen.jsx` | 49.51 KB | High | Reports, statement upload entry, charts, and exports are connected. |
| `src/lib/reportPdf.js` | 49.41 KB | High | Export output correctness matters. |
| `src/screens/ActivityScreen.jsx` | 44.55 KB | High | Activity, People, shared expenses, and money book flows are connected. |

Optimization roadmap:

1. Finish V5.2 validation and V5.3/V5.4 cleanup planning.
2. Retire rollback branches in the order listed above.
3. Prune confirmed unused CSS after visual checks.
4. Split `App.jsx` only after behavior tests cover auth, sync, setup, quick add, profile, and export prompts.
5. Keep PDF, statement import, and chart dependencies lazy unless real usage data shows a different investment priority.
6. Use bundle analysis after each cleanup step, not before, to avoid optimizing code that may be retired.

## E. Scaling Risks

| Risk | Location | Rank | Production Readiness Concern |
| --- | --- | --- | --- |
| Founder dashboard uses local event history only | `src/lib/analytics.js`, `ProductHealthDashboard.jsx` | Medium | Good for privacy and validation, but not enough for cross-device, cohort, or multi-user product analytics. |
| Product Health event cap is local and small | `MAX_PRODUCT_HEALTH_EVENTS = 500` | Low | Fine for lightweight validation. Scaling would need a privacy-safe backend event sink. |
| App shell owns many domains | `src/App.jsx` | High | Growth will increase regression risk because auth, sync, navigation, setup, export, quick add, and profile state are coupled. |
| Sync modules repeat queue/load/save patterns | `src/lib/*Sync.js` | Medium | Repetition is readable today, but future domains may duplicate error handling and migration logic. |
| Public SEO route metadata is manually maintained | `src/lib/seoRoutes.js`, `PublicSeoScreen.jsx` | Medium | More public pages will increase maintenance and canonical-link risk. |
| Client-side PDF and statement work is heavy | `reportPdf.js`, `statementImport.js` | High | Large client chunks and file parsing can become mobile performance bottlenecks. Keep action-gated. |
| Analytics event universe is larger than dashboard metrics | `src/lib/analytics.js` and call sites | Medium | Many diagnostic/public/auth events are tracked, but the Product Health dashboard ranks only selected product metrics. |
| Screen naming ambiguity | `TAB_VIEW_EVENTS.history = people_viewed` while route renders Daily Book plus People/Activity | Medium | Analytics can overstate People views if the History/Daily route is treated as People usage. |
| Admin/founder access is UI-gated | Settings/Product Health entry | Medium | Current dashboard is internal and lazy, but future production rollout should verify admin-only access at the right trust boundary. |

## F. Maintenance Hotspots

| Hotspot | Location | Rank | Why It Matters |
| --- | --- | --- | --- |
| `App.jsx` concentration | `src/App.jsx` | High | The file is 286.53 KB and contains app shell, phase routing, auth, sync, quick add, profile, setup, report export, analytics calls, and modals. |
| Dual primitive systems | `src/components/AppPrimitives.jsx`, `src/design-system` | High | Legacy inputs/modals/states coexist with Money OS components, making cleanup and visual consistency harder. |
| Currency input migration | `CurrencyInput` vs `AmountInput` | High | The UI primitive touches money entry. Cleanup must preserve parsing, validation, focus, keyboard, and saved values. |
| CSS split and overrides | `src/index.css`, `src/design-system/money-os.css` | Medium | 27 duplicate selector names and 37 candidate unused selectors require visual checks before pruning. |
| Rollback flags are ad hoc | `window.__FBPLY_LEGACY_*` across screens | Medium | Useful for rollback, but there is no centralized registry or owner/status table in code. |
| People and Daily route coupling | `activeTab === 'history'` renders Daily Book plus Activity/People | Medium | It complicates analytics, lazy boundaries, and future navigation cleanup. |
| Reports dependency chain | `ReportsScreen`, `ReportCharts`, `StatementUploadSheet`, `reportPdf`, `statementImport` | High | Charts, statement analysis, PDF export, history, and share are related but loaded through multiple action paths. |
| Analytics aliases and duplicate suppression | `FEATURE_EVENT_ALIASES`, `DUPLICATE_WINDOW_MS` | Medium | Privacy-safe and centralized, but aliases can hide duplicate intent if old and new events are fired close together. |
| SEO/legal routing split | `seoRoutes.js`, `legalPages` in `App.jsx` | Medium | Public SEO routes and legal pages are handled through different metadata paths. |
| Sync diagnostic events | `profile_*`, `expense_*`, `savings_*`, `*_sync_failed` events | Medium | Operationally useful, but not part of the V5 product event map. Keep documented to avoid analytics confusion. |

## Analytics Quality Report

| Area | Status | Rank | Notes |
| --- | --- | --- | --- |
| Required V5 product events | Covered | Low | `PRODUCT_EVENT_SCREENS` includes app, home, add hub, expenses, income, people, savings, reports, and profile events. |
| Event payload privacy | Covered | Low | `buildAnalyticsEvent` emits only `event_name`, `timestamp`, `screen`, and `app_version`. Payload details are used only for screen resolution before dispatch. |
| Fire-and-forget behavior | Covered | Low | Dispatch uses `requestIdleCallback` or `setTimeout`; failures are caught. |
| Duplicate prevention | Present | Medium | Duplicate suppression keys by `event_name:screen` within 500 ms. It prevents bursts, but does not prevent delayed duplicate semantic events. |
| Product Health metrics | Partial | Medium | Metrics include core validation events, but not all tracked events. `lend_created`, `settlement_completed`, `profile_viewed`, `sign_out_clicked`, Daily Book, notifications, feedback, auth, and public SEO events are not all ranked in the dashboard. |
| Add Hub duplicate risk | Present | Medium | `add_hub_opened` can be tracked directly and through `trackFeatureUsage('quick_add_opened')` aliasing. Suppression helps but delayed duplicates remain possible. |
| Goal update counting | Present | Medium | `goal_updated` may fire for repeated edits and can overcount update intent. Interpret as interaction volume, not completed meaningful goal change. |
| Statement event overlap | Present | Medium | New canonical events coexist with older `statement_upload_*` events. Dashboard uses canonical started/completed events. |
| History/People ambiguity | Present | Medium | The History tab maps to `people_viewed` while also showing Daily Book content. This can inflate People screen adoption. |
| Public/diagnostic events | Present outside product map | Low | Auth, sync, export, public SEO, calculator, and feedback events remain outside the V5 Product Health metric list. This is acceptable if documented. |

## Readiness Summary

| Section | Best Next Action | Risk |
| --- | --- | --- |
| Rollback retirement | Wait for validation data, then retire flags in the listed order | Medium |
| Legacy components | Start with empty states after rollback branches are retired; defer money input migration | High |
| CSS | Remove only confirmed unused selectors after visual checks | Medium |
| Bundle | Keep large report/statement/chart chunks lazy; focus later on `App.jsx` and CSS after cleanup | Medium |
| Dependencies | Do not remove runtime packages from static evidence; review type packages only | Medium |
| Analytics | Keep event layer unchanged; interpret Product Health metrics with known coverage gaps | Medium |

## Final Rule

Prepare for optimization. Do not optimize yet.
