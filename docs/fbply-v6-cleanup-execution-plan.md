# FBPLY V6 Cleanup Execution Plan

Date created: 2026-06-07  
Status: execution order only  
Rule: optimize cleanup order. Do not execute cleanup.

## Purpose

This plan converts the completed V5.2, V5.3, and V5.4 audits into a safe cleanup sequence. It does not remove code, delete rollback paths, optimize bundles, change routes, change UI, change business logic, change analytics, or modify dependencies.

## Inputs

| Input | Role |
| --- | --- |
| `docs/fbply-v5.2-validation-report.md` | Validation gate, observation window, removal candidates, bundle observation baseline |
| `docs/fbply-v5.3-technical-debt-audit.md` | Technical debt inventory, safe/validated/high-risk removal candidates |
| `docs/fbply-v5.4-production-readiness-report.md` | Production readiness order, rollback retirement sequence, dependency and bundle roadmap |

## Global Gates

Do not start cleanup until:

1. At least 2 weeks of Product Health Dashboard evidence has been reviewed.
2. Top actions, ignored features, repeat behaviors, goal creation, report usage, and Next Action engagement are documented.
3. Current app behavior has a manual verification checklist for Home, Add Hub, Daily Book, People, Savings, Reports, Profile, and public/legal pages.
4. Each cleanup item is small enough to revert independently.

## Phase C1: Safe Rollback Retirement Candidates

Goal: remove legacy presentation paths one at a time after validation proves the Money OS path is stable.

| Order | Item | Risk Level | Dependency Chain | Rollback Strategy | Expected Maintenance Benefit | Expected Performance Benefit |
| --- | --- | --- | --- | --- | --- | --- |
| C1.1 | Footer/Profile Hub rollback flags: `window.__FBPLY_LEGACY_FOOTER__`, `window.__FBPLY_LEGACY_PROFILE_HUB__` in `src/App.jsx` | Medium | Bottom nav, Settings/Profile entry, ProfileHub, legal pages, support links, founder dashboard access | Keep change isolated to footer/profile branch removal. Revert the single cleanup commit if support/legal/profile access regresses. | Removes duplicated logged-in footer/profile decision path and clarifies Settings/Profile ownership. | Small startup/render benefit from fewer branches in app shell. |
| C1.2 | Add Hub rollback flag: `window.__FBPLY_LEGACY_ADD__` in `src/App.jsx` and `QuickAddFab` | Medium | Add FAB, Add Hub sheet, expense/income/people/other selections, long-press behavior, `add_hub_opened` analytics | Preserve current Add Hub behavior in a pre-cleanup tag/commit. Revert if quick add, long press/context menu, or creation flows regress. | Reduces interaction branching around the central add button and simplifies Add Hub analytics interpretation. | Small render and event-handler simplification; no major bundle effect expected. |
| C1.3 | Daily Book rollback flag: `window.__FBPLY_LEGACY_DAILY_BOOK__` in `src/screens/DailyBookScreen.jsx` | Medium | Daily Book summary, filters, custom range, empty state, add-expense CTA, Daily Book analytics | Remove only after Daily Book screenshots and filter/add-expense checks pass. Revert the Daily Book cleanup commit if history or filters regress. | Eliminates a full legacy screen branch and reduces mixed empty-state usage. | Modest route chunk reduction and less CSS kept alive by legacy Daily Book styles. |
| C1.4 | Home rollback flag: `window.__FBPLY_LEGACY_HOME__` and `HOME_PRESENTATION_VERSION` in `src/screens/TodayScreen.jsx` | Medium | Home first viewport, Next Action, activation checklist, smart insights, savings/trip/report shortcuts | Retire only after Home Next Action engagement is stable. Revert if first viewport, recommendation, or navigation targets regress. | Removes the most visible legacy presentation branch and makes Home future-work safer. | Modest Home route chunk reduction; potential CSS cleanup unlock. |
| C1.5 | People rollback flags: `window.__FBPLY_LEGACY_PEOPLE__`, `window.__FBPLY_LEGACY_BORROW_LEND__`, `window.__FBPLY_LEGACY_SHARED_EXPENSES__` in `src/screens/ActivityScreen.jsx` | High | Activity timeline, Money Book, SharedExpenseScreen, shared group creation, borrow/lend, settlements, `settlement_completed` | Split into sub-commits if needed: People shell, Money Book, Shared Expenses. Revert immediately if settlement direction, edit/delete, or group balances regress. | Removes a large branch from one of the densest workflows and clarifies People/Activity ownership. | Medium route chunk and CSS cleanup potential, but only after settlement validation. |
| C1.6 | Reports rollback flag: `window.__FBPLY_LEGACY_REPORTS__` in `src/components/ReportsScreen.jsx` | High | Report library, report generation, report history, ReportCharts, StatementUploadSheet, PDF/CSV export | Require report-generation and statement-analysis test checklist before removal. Revert if monthly/trip/settlement/statement exports regress. | Removes duplicated report presentation logic and reduces future report UI complexity. | Medium route chunk/CSS cleanup potential; heavy export dependencies remain action-gated. |

Phase C1 rule: do not retire People or Reports rollback paths until their validation metrics are stable and their manual regression checklists are complete.

## Phase C2: Legacy Component Consolidation Candidates

Goal: consolidate duplicated UI primitives only after rollback branches are retired enough that component cleanup will not fight old screens.

| Order | Item | Risk Level | Dependency Chain | Rollback Strategy | Expected Maintenance Benefit | Expected Performance Benefit |
| --- | --- | --- | --- | --- | --- | --- |
| C2.1 | Empty state consolidation: `AppPrimitives.EmptyState` to Money OS `EmptyState` where already migrated | Medium | Daily Book, Savings, Shared Expenses, Notification Center, app error/empty states | Migrate screen by screen. Revert individual screen commit if empty-state CTA, icon, or copy/layout regresses. | Standardizes first-use and empty workflows; reduces duplicate state styling. | Small CSS/component reduction after old selectors are pruned. |
| C2.2 | Success state consolidation in Savings/Shared flows | Medium | `SavingsBucketsManager`, `SharedExpenseScreen`, Money OS `SuccessState`, goal/shared creation success flows | Keep current success behavior snapshot. Revert if create/edit success feedback changes or actions disappear. | Makes future goal/shared flow messaging consistent. | Small CSS cleanup unlock; little JS impact. |
| C2.3 | Modal/sheet strategy: evaluate `AppPrimitives.AppModal` versus Money OS `BottomSheet` or a shared modal primitive | Medium | App modals, Settings, Activity money book modal, NotificationCenter, Add Hub sheet, body scroll lock, escape close | Do not bulk replace. Create one modal migration at a time and revert if focus, scroll lock, close behavior, or mobile layout regresses. | Reduces duplicated modal patterns and accessibility review surface. | Small JS/CSS benefit after repeated modal styles are removed. |
| C2.4 | Brand primitives: define whether `BrandMark` / `HeaderLogo` remain legacy or become shared app primitives | Medium | App shell, Settings, LegalScreen, PublicSeoScreen, public SEO branding | Treat as a naming/ownership cleanup first. Revert if public/legal header branding changes. | Clarifies whether branding belongs in legacy primitives or a neutral shared layer. | Minimal performance impact. |
| C2.5 | Screen-local card patterns to Money OS cards | Medium | Home, People, Reports, Savings, ProfileHub; `MoneyCard`, `StatCard`, `ActionCard`, `InsightCard` | Migrate after visual snapshots. Revert per screen if layout density, tap targets, or hierarchy changes. | Reduces custom card CSS and visual drift across screens. | Medium CSS cleanup potential once repeated screen-local styles are removed. |
| C2.6 | Currency input migration: `AppPrimitives.CurrencyInput` to Money OS `AmountInput` only after tests exist | High | App quick add, setup, Settings, Goals, Activity, Shared Expenses, RecurringScheduleManager, ProfileSettingsControls, Savings | Require money-entry regression tests first. Revert per form if parsing, focus, validation, keyboard, or saved values change. | High eventual benefit: one money-entry primitive across the app. | Low direct bundle benefit, but high defect-reduction benefit. |

Phase C2 rule: do not attempt full `AppPrimitives.jsx` removal in one pass. It is a final outcome, not a first task.

## Phase C3: Unused CSS Cleanup Candidates

Goal: prune confirmed-unused styles after the related rollback/component branches are retired.

| Order | Item | Risk Level | Dependency Chain | Rollback Strategy | Expected Maintenance Benefit | Expected Performance Benefit |
| --- | --- | --- | --- | --- | --- | --- |
| C3.1 | Single confirmed dead selector: `.mos-report-legacy-button` | Low | Reports styles in `src/design-system/money-os.css`; Reports rollback validation | Remove in one CSS-only commit after confirming no dynamic class construction. Revert CSS commit if Reports button styling regresses. | Removes known legacy-style residue. | Tiny CSS reduction. |
| C3.2 | Old home/footer LinkedIn selectors: `.home-linkedin-button`, `.linkedin-glyph` | Low | Footer/Profile Hub cleanup, public/profile link rendering | Remove only after footer/profile screenshots. Revert CSS commit if founder/support link styling regresses. | Reduces stale footer styling. | Tiny CSS reduction. |
| C3.3 | Old notification selectors: `.notification-bell-button`, `.notification-center-panel`, `.notification-center-summary`, `.smart-notification-center` | Low | NotificationCenter, top notification button, modal empty state | Remove after notification open/empty/read-state screenshots. Revert CSS commit if notification UI changes. | Reduces old notification naming and stale style search noise. | Small CSS reduction. |
| C3.4 | Old skeleton helpers: `.skeleton-icon`, `.skeleton-text-group` | Low | Loading fallbacks, route suspense states, skeleton cards | Remove after loading-state visual checks. Revert CSS commit if any fallback layout loses structure. | Removes unused loading-style variants. | Tiny CSS reduction. |
| C3.5 | Legacy utility/form selectors: `.action-required`, `.critical`, `.stable-select`, `.trip-payment-form` | Low-Medium | Legacy forms, shared trip/payment forms, any dynamic class usage | Remove only after dynamic class scan and form screenshots. Revert if form validation or trip/shared form layout changes. | Reduces stale form-style vocabulary. | Small CSS reduction. |
| C3.6 | Unused Money OS tone/size selectors from static scan | Medium | Money OS component props: badges, buttons, cards, icon frames, loader sizes | Do not remove from static scan alone. Remove only after prop usage audit. Revert if tone/size variants fail in migrated screens. | Prevents design-system CSS from carrying unsupported variants. | Small CSS reduction, but risk of false positives. |
| C3.7 | Duplicate class names across `src/index.css` and `src/design-system/money-os.css` | Medium | Money OS migrated screens, compact overrides, global app shell styles | Consolidate one selector family at a time. Revert family commit if visual hierarchy changes. | Reduces CSS override ambiguity and future styling regressions. | Medium CSS reduction and faster style reasoning; modest runtime impact. |
| C3.8 | Rollback screen styles for retired Home/Daily/People/Reports/Add Hub branches | Medium-High | Completion of C1 rollback retirements and C2 primitive consolidation | Remove only after matching rollback branch is gone. Revert branch-specific CSS commit if screen visual diff fails. | High maintenance benefit because deleted branches stop keeping old style blocks alive. | Medium CSS size reduction, depending on branch. |

Phase C3 rule: CSS cleanup follows code-branch retirement. Do not delete selectors that are still needed by a rollback path.

## Phase C4: Bundle Optimization Candidates

Goal: define optimization order only. Do not split, rewrite, or replace bundles yet.

| Order | Item | Risk Level | Dependency Chain | Rollback Strategy | Expected Maintenance Benefit | Expected Performance Benefit |
| --- | --- | --- | --- | --- | --- | --- |
| C4.1 | Measure fresh bundle baseline after C1-C3 | Low | `npm run build`, existing `dist/assets`, CSS/route chunks | Keep pre-cleanup bundle report. If a cleanup increases startup size unexpectedly, revert the responsible cleanup commit. | Creates objective checkpoint before optimization. | No direct performance change; improves decision quality. |
| C4.2 | Main app shell split planning for `src/App.jsx` | High | Auth, sync, setup, app shell, quick add, profile, export orchestration, route state | Do not split until behavior tests exist. If later implemented, split one domain at a time and revert domain commit on regression. | Major maintainability opportunity by reducing the 286 KB central file ownership surface. | Potential startup chunk reduction from moving rarely used setup/profile/export paths out of main shell. |
| C4.3 | Global CSS bundle review after C3 | Medium | `src/index.css`, `src/design-system/money-os.css`, rollback styles, duplicated selectors | Keep CSS size snapshots before/after each cleanup group. Revert any group that breaks visual checks. | Reduces styling ambiguity and long-term CSS cost. | Medium CSS payload reduction; previous CSS baseline was about 182 KB raw / 29 KB gzip. |
| C4.4 | Reports chart boundary review | Medium | `ReportCharts`, `recharts`, Reports route, report generation/opening behavior | Preserve lazy boundary. Revert if chart loading or report details regress. | Keeps chart complexity isolated from Reports shell. | Potential improvement only if chart loading is further deferred or reduced. |
| C4.5 | PDF/export stack gate review | High | `reportPdf`, `jspdf`, `html2canvas`, canvg/export chunks, report history, native share | Do not replace. Verify dependencies remain action-gated. Revert if export/share output changes. | Clarifies that export complexity is intentionally isolated. | Protects startup by preserving lazy/action-gated loading; replacement may be considered only with report tests. |
| C4.6 | Statement import gate review | High | `StatementUploadSheet`, `statementImport`, `pdfjs-dist`, PDF worker, statement report generation | Do not replace. Verify parser and worker remain action-gated. Revert if statement analysis start/complete flow changes. | Keeps parsing complexity isolated from normal app usage. | Protects startup and route loading by preserving action-gated loading. |
| C4.7 | Public SEO route renderer review | Medium-High | `PublicSeoScreen`, `seoRoutes`, legal pages, canonical metadata, dynamic public links | Do not prune routes without crawl validation. Revert if public route or canonical behavior changes. | Clarifies SEO route ownership and reduces future route confusion. | Limited app-startup impact because public SEO screen is lazy; possible public route chunk improvement later. |
| C4.8 | Daily/People route boundary review | Medium | `activeTab === 'history'`, DailyBookScreen, ActivityScreen, People analytics | Defer until People validation is complete. Revert if tab navigation, scroll targets, or `people_viewed`/Daily behavior changes. | Reduces route/analytics ambiguity between Daily Book and People. | Possible route-load improvement if Daily and People become separable later. |

Phase C4 rule: optimize based on measured evidence after cleanup, not before. Large lazy chunks are not automatically a problem if they stay action-gated.

## Phase C5: Dependency Cleanup Candidates

Goal: review dependencies in the safest order. Do not remove packages during this plan.

| Order | Item | Risk Level | Dependency Chain | Rollback Strategy | Expected Maintenance Benefit | Expected Performance Benefit |
| --- | --- | --- | --- | --- | --- | --- |
| C5.1 | Dev-only type packages: `@types/react`, `@types/react-dom` | Low | Editor tooling, possible future TypeScript migration, package install state | If later removed, run install, lint, build, and editor type check expectation. Restore packages if tooling regresses. | Reduces package list noise if project remains JS-only. | No runtime bundle impact. Small install/dependency surface reduction. |
| C5.2 | Tailwind package review: `tailwindcss` with `@tailwindcss/vite` | Medium | `vite.config.js`, Tailwind Vite plugin, CSS build pipeline | Do not remove unless build proves plugin does not require it. Restore immediately if Vite/CSS build fails. | Clarifies CSS tooling dependency ownership. | No runtime effect expected; possible install size reduction only. |
| C5.3 | Capacitor package classification: `@capacitor/android`, `@capacitor/cli`, `@capacitor/core`, `@capacitor/filesystem`, `@capacitor/share` | High | Android scripts, native sync/build, native share/export paths | Keep unless Android release support is retired. Restore package set if Android prepare/debug/bundle fails. | Documents native dependency boundary and prevents accidental removal. | No web bundle gain for CLI/android packages; native share packages are action-gated. |
| C5.4 | Report/chart packages: `jspdf`, `pdfjs-dist`, `recharts` | High | Report export, statement import, ReportCharts, PDF worker, user-facing report output | Do not remove. If later replaced, keep old implementation behind a rollback branch until export/parser tests pass. | Potential long-term simplification only if usage data justifies replacement. | Possible large lazy chunk reduction, but high correctness risk. |
| C5.5 | Motion package: `framer-motion` | Medium | App shell motion, Money OS motion expectations, screen transitions | Keep until a no-regression motion strategy exists. Restore if transitions, mount/unmount, or layout behavior regresses. | Clarifies motion dependency ownership. | Possible runtime/bundle benefit only if replaced broadly; not a near-term cleanup. |
| C5.6 | Supabase dependency: `@supabase/supabase-js` | High | Auth, sync, feedback, cloud persistence, multiple sync modules | Not a cleanup candidate while auth/sync exists. Restore immediately if any cloud/auth flow breaks. | None as removal; documentation prevents unsafe cleanup. | No safe performance benefit without architecture change. |

Phase C5 rule: dependency cleanup comes last because package removal can break build, native release, export, parsing, auth, or tooling in ways that are wider than UI cleanup.

## Do Not Execute In V6 Cleanup Planning

Do not include these in the first cleanup execution wave:

| Item | Reason |
| --- | --- |
| Legacy shared group data compatibility in `financialActivity.js` | Protects older saved shared-group data. |
| Legacy EMI compatibility in `ruleEngine.js` | Protects older profile/calculation data. |
| SEO route pruning | Requires crawl/search evidence and canonical validation. |
| Supabase/auth/sync refactors | Outside cleanup-only scope and high behavioral risk. |
| Full `AppPrimitives.jsx` deletion | Must be achieved only after all live usages are migrated. |
| Report PDF/export replacement | Needs dedicated report regression suite. |
| Statement parser replacement | Needs file parsing coverage and completion-rate evidence. |
| New Next Best Action Engine | Gated future feature, not cleanup. |

## Recommended Execution Cadence

| Cleanup Wave | Contents | Exit Criteria |
| --- | --- | --- |
| Wave 1 | C1.1-C1.3 plus C3.1-C3.4 if confirmed | Footer/Profile, Add Hub, Daily Book stable; snapshots pass; no product metrics regression. |
| Wave 2 | C1.4 plus Home-specific CSS only | Home first viewport and Next Action stable; `next_action_clicked` still fires once. |
| Wave 3 | C1.5 after People validation | Borrow/lend, shared group, settlement creation/completion, edit/delete stable. |
| Wave 4 | C1.6 after Reports validation | Reports viewed/generated, statement started/completed, export/share/history stable. |
| Wave 5 | C2.1-C2.5 and remaining C3 groups | Visual primitives consolidated screen by screen; CSS duplicates reduced. |
| Wave 6 | C4/C5 review only | Fresh bundle/dependency report created; no optimization until evidence justifies it. |

## Final Rule

Optimize cleanup order. Do not execute cleanup.
