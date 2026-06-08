# FBPLY V5.3 Technical Debt Audit

Date created: 2026-06-07  
Scope: audit only  
Rule: inventory before cleanup. Do not delete, refactor, optimize, or change product behavior during this phase.

## Audit Summary

Money OS migration has left five main debt clusters:

1. Rollback flags and legacy render branches are still retained across Home, Daily Book, People, Reports, Add Hub, Footer, and Profile Hub.
2. Legacy primitives in `AppPrimitives.jsx` coexist with Money OS components and forms.
3. Global CSS and Money OS CSS overlap; static inspection found candidate unused selectors and duplicate class names.
4. Public SEO/legal routing is split between `seoRoutes.js` and `legalPages` inside `App.jsx`.
5. Analytics coverage is privacy-safe, but product-health metrics and legacy diagnostic events have some ambiguity and duplicate-risk areas.

Risk ranking means cleanup risk, not current product severity.

## A. Safe Removal Candidates

These are the lowest-risk candidates, but still require one visual/static verification pass before removal.

| Item | Location | Evidence | Risk | Notes |
| --- | --- | --- | --- | --- |
| `.mos-report-legacy-button` style | `src/design-system/money-os.css` | Static search found the selector only in CSS | Low Risk | Likely dead style. Confirm no dynamic class construction before removal. |
| Old LinkedIn/home footer selectors | `src/index.css`: `.home-linkedin-button`, `.linkedin-glyph` | Static CSS scan found no JS/JSX references | Low Risk | Footer currently uses `.home-founder-link` and related classes. |
| Old notification selector names | `src/index.css`: `.notification-bell-button`, `.notification-center-panel`, `.notification-center-summary`, `.smart-notification-center` | Static CSS scan found no JS/JSX references | Low Risk | Current app uses `top-notification-button` and `NotificationCenter` modal classes. Confirm snapshot before removal. |
| Old skeleton helper selectors | `src/index.css`: `.skeleton-icon`, `.skeleton-text-group` | Static CSS scan found no JS/JSX references | Low Risk | May be from older loading cards. Confirm no server/static markup uses them. |
| Legacy form/style selectors with no source references | `src/index.css`: `.action-required`, `.critical`, `.stable-select`, `.trip-payment-form` | Static CSS scan found no JS/JSX references | Low Risk | Treat as candidate only because class names can be data-driven. |

## B. Needs Validation

These should wait for the V5.2 observation window and visual checks.

| Item | Location | Evidence | Risk | Validation Needed |
| --- | --- | --- | --- | --- |
| Home rollback branch | `src/screens/TodayScreen.jsx` | `window.__FBPLY_LEGACY_HOME__`, `HOME_PRESENTATION_VERSION === 'legacy'` | Medium Risk | Remove only after Home Next Action engagement is stable and no rollback needed. |
| Daily Book rollback branch | `src/screens/DailyBookScreen.jsx` | `window.__FBPLY_LEGACY_DAILY_BOOK__`, legacy render branch, `LegacyEmptyState` | Medium Risk | Validate Daily Book empty states, filters, and add-expense CTA. |
| People rollback branch | `src/screens/ActivityScreen.jsx` | `window.__FBPLY_LEGACY_PEOPLE__`, `__FBPLY_LEGACY_BORROW_LEND__`, `__FBPLY_LEGACY_SHARED_EXPENSES__` | Medium Risk | Validate money book, shared groups, and settlements after observation. |
| Reports rollback branch | `src/components/ReportsScreen.jsx` | `window.__FBPLY_LEGACY_REPORTS__`, legacy report layout branch | Medium Risk | Validate report open/generate/export and statement flows. |
| Add Hub rollback branch | `src/App.jsx` | `window.__FBPLY_LEGACY_ADD__`, legacy FAB long-press behavior | Medium Risk | Validate Add Hub dominant action and creation rates. |
| Footer/Profile Hub rollback branch | `src/App.jsx` | `window.__FBPLY_LEGACY_FOOTER__`, `window.__FBPLY_LEGACY_PROFILE_HUB__` | Medium Risk | Validate legal/support/profile access and founder dashboard gating. |
| Money OS vs global CSS overrides | `src/index.css`, `src/design-system/money-os.css` | 27 duplicate class names across both CSS files | Medium Risk | Some are intentional compact overrides. Needs visual regression before consolidation. |
| Public SEO routes without direct static hrefs | `src/lib/seoRoutes.js`, `src/screens/PublicSeoScreen.jsx` | 42 SEO routes; 32 have no direct static href in simple scan | Medium Risk | Likely linked through dynamic SEO components/sitemaps. Validate crawl paths before pruning. |
| Legal routes outside SEO route map | `src/App.jsx` legalPages: `/privacy`, `/terms`, `/disclaimer`, `/about`, `/contact` | These are handled separately from `seoRouteMeta` | Medium Risk | Not unused. Candidate for routing consolidation only. |
| Product Health local event log | `src/lib/analytics.js` | Local capped event history powers founder dashboard | Medium Risk | Keep until validation concludes. Later decide whether to keep local-only or replace with backend analytics. |

## C. High Risk Removal

Do not remove these until dedicated tests and migration plans exist.

| Item | Location | Evidence | Risk | Why High Risk |
| --- | --- | --- | --- | --- |
| Legacy data compatibility for shared groups | `src/lib/financialActivity.js` | `legacyAmount`, generated `legacy-payment-*` entries | High Risk | This is data-shape compatibility, not just UI debt. Removing may break existing saved groups. |
| Legacy EMI field compatibility | `src/lib/ruleEngine.js` | `legacyEmi = normalizeMoney(profile.emi?.amount)` | High Risk | Affects financial calculations and old profile data. Not a cleanup-only change. |
| `AppPrimitives.jsx` removal | `src/components/AppPrimitives.jsx` | Still used by `App.jsx`, Settings, Activity, Goals, SharedExpense, Notifications, Profile settings, Recurring schedules | High Risk | Provides modal, currency input, branding, and legacy empty states across live flows. |
| Inline Profile and setup components | `src/App.jsx` | `ProfileScreen`, `ProfileMenuSheet`, `CommitmentEditorSheet`, setup/auth flows remain inline | High Risk | Large maintenance hotspot, but extraction risks auth/profile/commitment behavior. |
| Report PDF/export dependency path | `src/lib/reportPdf.js`, dynamic import from `App.jsx` | jsPDF/html2canvas/canvg/PDF generation path | High Risk | User-facing report output must remain accurate. Any cleanup needs report regression tests. |
| Statement parsing dependency path | `src/lib/statementImport.js`, `StatementUploadSheet.jsx` | PDF.js and statement parsing are action-gated but complex | High Risk | File parsing and statement report generation have many edge cases. |
| SEO route removal | `src/lib/seoRoutes.js`, `PublicSeoScreen.jsx` | 42 public route metas and dynamic related links | High Risk | SEO traffic and public pages can be harmed by pruning. Use crawl logs before deletion. |
| Supabase sync/auth analytics events | `src/App.jsx`, sync libs | Many sanitized cloud/sync/auth events still emitted | High Risk | They are diagnostics around sync/auth. Removing may reduce operational visibility. |

## D. Bundle Impact Candidates

These are candidates to observe, not optimize during this audit.

| Candidate | Evidence | Risk | Bundle / Maintenance Impact |
| --- | --- | --- | --- |
| Main app shell size | Current build: `index-CcB_YLWk.js` 855.13 KB raw / 243.26 KB gzip | Medium Risk | `src/App.jsx` contains auth, setup, quick add, profile, sync orchestration, export orchestration. Splitting requires careful prop boundaries. |
| Global CSS size | Current build: `index-Dobxnwvs.css` 186.44 KB raw / 29.67 KB gzip | Medium Risk | CSS cleanup likely depends on retiring rollback branches and legacy primitives. |
| Product Health Dashboard chunk | `ProductHealthDashboard-CF5IVx-z.js` 5.53 KB raw / 2.27 KB gzip | Low Risk | Already lazy and founder-gated. Keep as-is during validation. |
| Settings/Profile route | `SettingsScreen-drsuD-Hr.js` 11.11 KB raw / 3.40 KB gzip plus lazy `ProfileHub` and Product Health | Low Risk | Internal dashboard did not enter startup bundle. |
| Reports route | `ReportsScreen--WU-Yus_.js` 32.09 KB raw / 6.86 KB gzip | Low Risk | Route shell is acceptable; heavy work remains deferred. |
| Report charts | `ReportCharts-DSROZBVW.js` 364.19 KB raw / 105.83 KB gzip | Medium Risk | Large but lazy. Optimize only if report chart usage justifies it. |
| PDF/export stack | `jspdf`, `pdf`, `html2canvas`, `index.es/canvg`, `pdf.worker` chunks | High Risk | Large but action-gated. Preserve gating; do not rewrite without report tests. |
| Notification Center render timing | Prior bundle audit observed `NotificationCenter` loading on Home | Low Risk | Potential future optimization: render only after opened. Verify after current changes. |
| Daily + People shared route load | Daily tab renders `DailyBookScreen` and `ActivityScreen` together | Medium Risk | Could split Daily/People later, but navigation and shared filters need validation. |

## E. Maintenance Cost Hotspots

| Hotspot | Location | Evidence | Risk | Maintenance Cost |
| --- | --- | --- | --- | --- |
| `App.jsx` concentration | `src/App.jsx` | Large file owns auth, sync, app shell, setup, profile, quick add, reports/export orchestration | High Risk | Hard to reason about changes; high regression surface. |
| Dual primitive systems | `src/components/AppPrimitives.jsx`, `src/design-system/*` | Legacy `CurrencyInput`, `AppModal`, `EmptyState` coexist with Money OS forms, BottomSheet, EmptyState | Medium Risk | Developers must choose between two UI foundations. |
| Mixed primitives in migrated screens | DailyBook, Activity, Reports, Savings, Settings, SharedExpense | Same screen families use both legacy and Money OS primitives | Medium Risk | Visual and behavior consistency cost. |
| Rollback flags across screens | Home, Daily, People, Reports, Add Hub, Footer/Profile Hub | Multiple `window.__FBPLY_LEGACY_*` toggles | Medium Risk | Useful rollback path now, but doubles UI branches. |
| CSS split and overrides | `src/index.css`, `src/design-system/money-os.css` | 770 class selectors scanned, 37 candidate unused selectors, 27 duplicate class names across files | Medium Risk | Cleanup requires visual diff discipline. |
| SEO/legal route split | `src/lib/seoRoutes.js`, `src/App.jsx` `legalPages` | SEO public pages and legal pages are handled in separate systems | Medium Risk | Not broken, but route ownership is scattered. |
| Analytics event aliasing | `src/lib/analytics.js`, `src/App.jsx`, `StatementUploadSheet.jsx` | Direct events and feature aliases can map to same canonical event | Medium Risk | Duplicate suppression helps, but delayed or repeated calls can distort counts. |
| Product Health metric scope | `src/lib/analytics.js` `PRODUCT_HEALTH_METRICS` | Some tracked events are not ranked in dashboard metrics | Low Risk | Intentional for V5.1, but should be reviewed after validation. |

## Rollback Flag Inventory

| Flag | File | Branch / Behavior |
| --- | --- | --- |
| `window.__FBPLY_LEGACY_HOME__` | `src/screens/TodayScreen.jsx` | Switches Home between legacy and Money OS V2 presentation. |
| `window.__FBPLY_LEGACY_DAILY_BOOK__` | `src/screens/DailyBookScreen.jsx` | Switches Daily Book legacy layout. |
| `window.__FBPLY_LEGACY_PEOPLE__` | `src/screens/ActivityScreen.jsx` | Switches People/Activity presentation. |
| `window.__FBPLY_LEGACY_BORROW_LEND__` | `src/screens/ActivityScreen.jsx` | Included in People legacy experience gate. |
| `window.__FBPLY_LEGACY_SHARED_EXPENSES__` | `src/screens/ActivityScreen.jsx` | Included in People legacy experience gate. |
| `window.__FBPLY_LEGACY_REPORTS__` | `src/components/ReportsScreen.jsx` | Switches Reports legacy vs Money OS presentation. |
| `window.__FBPLY_LEGACY_ADD__` | `src/App.jsx` | Switches Add FAB/Add Hub behavior, including long-press legacy pattern. |
| `window.__FBPLY_LEGACY_FOOTER__` | `src/App.jsx` | Keeps legacy logged-in footer available. |
| `window.__FBPLY_LEGACY_PROFILE_HUB__` | `src/App.jsx` | Included in legacy footer/profile hub gate. |

## Design System Duplication Inventory

| Capability | Legacy Primitive | Money OS Primitive | Current Overlap |
| --- | --- | --- | --- |
| Empty state | `AppPrimitives.EmptyState` | `design-system.EmptyState` | Both used. Daily Book imports both. Savings uses legacy; Reports/Activity use Money OS. |
| Modal/sheet | `AppPrimitives.AppModal` | `design-system.BottomSheet` | App, Settings, Activity, Notifications use `AppModal`; Add Hub uses `BottomSheet`. |
| Money input | `AppPrimitives.CurrencyInput` | `design-system.AmountInput` | Most finance forms still use `CurrencyInput`; Money OS form primitive exists but is not broadly migrated. |
| Cards | Screen-local cards, `MoneyCard` | `MoneyCard`, `StatCard`, `ActionCard`, `InsightCard`, `TimelineCard` | Many migrated screens still have local card classes. |
| Forms | Plain labels/inputs and legacy currency wrapper | `TextInput`, `NotesInput`, `CategorySelector`, `DateSelector`, `AmountInput` | ProfileHub uses Money OS forms; settings/setup/quick add still mostly legacy/plain. |
| Branding | `BrandMark`, `HeaderLogo` | No direct Money OS replacement | Keep until a shared brand primitive exists. |

## CSS Candidate Inventory

Static scan results:

- Total class selectors scanned in `src/index.css` and `src/design-system/money-os.css`: 770
- Candidate selectors not directly referenced by JS/JSX source: 37
- Duplicate class names across global CSS and Money OS CSS: 27

Candidate unused selectors:

`action-required`, `critical`, `home-linkedin-button`, `linkedin-glyph`, `mos-add-hub-footer-actions`, `mos-badge--danger`, `mos-badge--success`, `mos-badge--warning`, `mos-button--lg`, `mos-button--sm`, `mos-card--danger`, `mos-card--flat`, `mos-card--success`, `mos-card--tint`, `mos-card--warning`, `mos-home-footer-strip`, `mos-home-header`, `mos-home-hero-metrics`, `mos-home-hero-value`, `mos-home-next-action-value`, `mos-icon-frame--danger`, `mos-icon-frame--success`, `mos-icon-frame--warning`, `mos-loader--lg`, `mos-loader--sm`, `mos-loader--xs`, `mos-report-legacy-button`, `notification-bell-button`, `notification-center-panel`, `notification-center-summary`, `skeleton-icon`, `skeleton-text-group`, `smart-notification-center`, `stable-select`, `today-careful`, `today-tight`, `trip-payment-form`.

Important caveat: several Money OS selectors are generated from tone/size props, so they are not automatically dead even when static string search misses them.

Duplicate class names across global CSS and Money OS CSS:

`daily-book-add-button`, `money-os-daily-book`, `money-os-home`, `money-os-people-hub`, `money-os-reports`, `mos-action-card`, `mos-add-hub-grid`, `mos-card`, `mos-card__copy`, `mos-card__detail`, `mos-eyebrow`, `mos-home-action-card-grid`, `mos-home-card-note`, `mos-insight-card__body`, `mos-loader`, `mos-loader__label`, `mos-loader__mark`, `mos-profile-hub`, `mos-profile-hub-grid`, `mos-profile-hub-section`, `mos-report-export-grid`, `mos-report-insight-grid`, `mos-report-library-grid`, `mos-section-header`, `mos-section-header__copy`, `mos-state`, `mos-state__visual`.

## Routing Inventory

| Area | Location | Risk | Finding |
| --- | --- | --- | --- |
| Public SEO routes | `src/lib/seoRoutes.js` | Medium Risk | 42 route metas. Many are likely dynamic/SEO-linked rather than direct app nav. |
| Public SEO renderer | `src/screens/PublicSeoScreen.jsx` | High Risk | Handles dynamic SEO pages and internal links. Avoid route pruning without crawl validation. |
| Legal pages | `src/App.jsx` `legalPages`, `src/screens/LegalScreen.jsx` | Medium Risk | Legal routes are separate from SEO route map but are live via footer/ProfileHub links. |
| In-app tabs | `activeTab` in `App.jsx` | Medium Risk | `history` tab renders both Daily Book and People/Activity, creating route-loading and analytics ambiguity. |
| Target navigation | `navigateToTarget(tab, targetId)` | Medium Risk | Used by Home, Reports prompts, Notifications, ProfileHub, Add Hub. Cleanup must preserve scroll targets. |

Routes without direct static href in simple scan:

`/personal-expense-tracker`, `/monthly-financial-report`, `/shared-expense-calculator`, FAQ child pages, report-template pages, sample-report child pages, calculator pages, and guide pages. These are not automatically unused because `PublicSeoScreen` builds links dynamically from route metadata.

## Screen Branch Inventory

| Screen / Area | Legacy Branch Present | Notes |
| --- | --- | --- |
| Home | Yes | Full legacy Home render retained behind flag. |
| Daily Book | Yes | Legacy Daily Book branch plus Money OS branch; imports both empty-state systems. |
| People / Activity | Yes | Legacy People branch retained; People and Daily share `history` tab. |
| Savings | Partial | No explicit rollback flag found, but legacy `CurrencyInput`/`EmptyState` remain in goal editor. |
| Reports | Yes | Legacy Reports branch retained; statement/report flows exist in both presentation modes. |
| Add Hub | Yes | Legacy Add mode remains inside `QuickAddSheet` and FAB behavior. |
| Profile / Settings | Partial | Settings use legacy `AppModal` and `CurrencyInput`; ProfileHub uses Money OS cards/forms. |
| Notifications | Legacy primitives | Uses `AppModal` and `EmptyState`; not Money OS migrated. |

## Analytics Inventory

| Issue | Location | Risk | Notes |
| --- | --- | --- | --- |
| Add Hub duplicate risk | `App.jsx`, `analytics.js` | Medium Risk | `trackEvent('add_hub_opened')` and `trackFeatureUsage('quick_add_opened')` alias to the same canonical event. Duplicate window suppresses immediate duplicate, but delayed calls could distort counts. |
| People view ambiguity | `App.jsx` activeTab mapping | Medium Risk | `history` tab maps to `people_viewed`, but it renders Daily Book plus Activity/People. |
| Goal update overcount risk | `App.jsx` `updateSavingsBucket` | Medium Risk | Fires on every goal field/progress update. Useful for retention, but may count typing/edit churn. |
| Statement event overlap | `StatementUploadSheet.jsx` | Low Risk | Canonical `statement_analysis_started/completed` coexist with older `statement_upload_*` events. Product Health focuses canonical metrics. |
| Product Health metric gaps | `analytics.js` `PRODUCT_HEALTH_METRICS` | Low Risk | `lend_created`, `settlement_completed`, `profile_viewed`, `sign_out_clicked`, Daily Book, notifications, feedback, and auth events are tracked but not ranked in Product Health metrics. |
| Legacy diagnostic event volume | `App.jsx` sync/auth events | Medium Risk | Sanitized and privacy-safe, but many non-product events live in the local product-health event log and debug stream. |
| Local-only retention | `analytics.js` local event log | Medium Risk | Active days and repeat behavior are local-device signals, not cross-device or cross-user cohort analytics. This is acceptable for V5.1/V5.2 but should be documented. |

## Recommended Cleanup Sequence

No cleanup during V5.3. Recommended order after validation:

1. Review 2-4 weeks of Product Health Dashboard evidence.
2. Remove only confirmed-unused CSS selectors with visual snapshots.
3. Retire rollback flags one screen at a time after acceptance is stable.
4. Consolidate legacy/Money OS empty states and form primitives.
5. Split large `App.jsx` surfaces only after behavior tests exist.
6. Consider bundle optimizations for reports/export only if usage evidence justifies the risk.

## Final Rule

Inventory before cleanup.
