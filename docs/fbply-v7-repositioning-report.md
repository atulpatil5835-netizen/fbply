# FBPLY V7 Repositioning Report

Date created: 2026-06-08  
Status: audit, planning, and prototype mapping only  
Rule: reposition before rebuilding. Preserve existing value. Reduce friction. Increase daily usage.

## Scope Guard

This report does not remove features, change business logic, change calculations, change APIs, change Supabase schemas, change analytics dispatch behavior, or change routes.

The recommended V7 transition is a product-architecture and navigation repositioning layer over the existing app. Existing workflows should remain reachable during the transition.

## Source Basis

Current implementation observations:

| Area | Current implementation signal |
| --- | --- |
| App navigation | `src/App.jsx` bottom nav currently exposes Today, Daily, Savings, and Reports. Profile exists as app chrome/settings and as an internal tab target, but not as a bottom nav item. |
| Home / Today | `src/screens/TodayScreen.jsx` already shows Available, Protected, Next Action, recent activity, monthly context, active trips, future snapshot, and monthly story concepts. |
| Daily | `src/screens/DailyBookScreen.jsx` is focused on expense history, daily totals, filters, and Add Expense. |
| People | `src/screens/ActivityScreen.jsx` contains the People hub, borrow/lend money book, shared expense/trip split workflows, settlements, and the unified activity timeline. |
| Reports | `src/components/ReportsScreen.jsx` contains monthly report generation, report history, money mix/trend data, statement analysis entry, and export actions. |
| Savings | `src/screens/GoalsScreen.jsx` and `src/components/SavingsBucketsManager.jsx` contain purchase planning and savings bucket management. |
| Statement Analysis | `src/components/StatementUploadSheet.jsx` is lazy-loaded from Reports and also reachable through Add Hub/Profile Hub paths. |
| Trip Split | Shared expense groups are implemented through `src/screens/SharedExpenseScreen.jsx` inside Activity/People, with report/export links elsewhere. |
| Optional login foundation | Local storage caches already hold core app data, while Supabase sync modules run after an authenticated user is available. The current phase flow still routes users to auth when Supabase is configured. |
| Analytics | `src/lib/analytics.js` stores privacy-light events with event name, timestamp, screen, and app version only. Product health already measures Add Hub, creation, reports, statement analysis, and next action engagement. |

## Prototype Mapping Summary

| V7 tab | Product promise | Existing surfaces to preserve |
| --- | --- | --- |
| DAILY | Fast money entry and daily tracking | Today/Home, Daily Book, Add Hub expense/income, Recent Activity, Available amount, Next Action |
| INSIGHTS | Help users understand money | Money Score, Money Flow, Monthly Story, Reports, report history, current report insights |
| TOOLS | Utilities and advanced features | Trip Split, Calculator, Savings, Borrow/Lend, Statement Analysis, export utilities |
| PROFILE | Identity, settings, backup | Profile data, theme, recurring bills, account state, optional login/backup, support/legal/settings |

---

## A. Current Navigation Problems

### A1. Current Structure Assessment

| Current structure | Problem | Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- | --- |
| Home / Today | It already behaves like a daily companion but is labeled separately from Daily, creating two daily entry surfaces. | Reposition Home as the V7 Daily hero instead of keeping Home as an abstract dashboard. | Users start with the most frequent action instead of deciding whether Home or Daily is the right place. | Reduces mental split between Today and Daily without changing underlying components. | Neutral if existing lazy boundaries remain. | Creates one clear daily entry root for future habits, reminders, and action cards. |
| Daily | Daily Book is useful but secondary to the Today hero, so expense entry is not consistently amount-first. | Promote Daily Book content under the Daily tab after the first-viewport entry/status layer. | Expense tracking feels immediate while history remains available. | Keeps existing DailyBookScreen logic intact but changes its conceptual ownership. | Neutral; can preserve current lazy-loaded screen. | Allows later Daily subviews without adding more top-level tabs. |
| People | People, Borrow/Lend, Trip Split, settlements, and unified activity are currently inside the Daily/History tab. | Move People money utilities into Tools while showing due/pending items on Daily. | Users find trip and borrow/lend tools by utility intent, while daily obligations still surface when relevant. | Clarifies ActivityScreen ownership and reduces overloaded "history" meaning. | Positive if advanced People sections stay action-gated or below first viewport. | Makes room for more people-money utilities without turning Daily into a suite. |
| Reports | Reports is both an insight destination and an export utility. Statement Analysis is also inside Reports. | Make Reports part of Insights, with export/report-generation utilities also discoverable from Tools. | Users understand Reports as explanation, not a separate finance-suite island. | Keeps ReportsScreen as the implementation base while improving IA. | Neutral if charts/PDF/statement imports remain lazy/action-gated. | Scales to more insight formats without adding report-specific nav sprawl. |
| Savings | Savings has a dedicated tab, but daily usage likely depends more on status/progress than full management. | Move full Savings management into Tools and promote goal progress into Daily/Insights. | Savings remains visible where it matters but no longer competes with daily entry. | One less top-level mental category; existing GoalsScreen remains reusable. | Neutral; full manager can remain lazy. | Better supports multiple goal types without top-level tab pressure. |
| Statement Analysis | High-value advanced workflow is hidden as a Reports action and Add Hub option. | Keep it in Reports, move discovery into Tools, and never force it into Daily first viewport. | Users who need it can find it; daily users are not distracted by upload-heavy work. | Preserves StatementUploadSheet and report export flow. | Positive if upload/parser stays action-gated. | Lets future advanced import/review tools live together. |
| Trip Split | Trip split appears as shared expenses inside People/Activity, plus Home cards and reports. | Promote Trip Split as a Tools utility while keeping Daily reminders and report exports. | Users looking for "split a trip" no longer need to understand People/Activity first. | Keeps shared group logic intact and clarifies entry point. | Neutral; do not preload trip-heavy screens unnecessarily. | Scales to rent, group dinner, settlement, and family split variants. |
| Profile | Profile/settings is important for identity, themes, backup, and future optional login, but not a clear tab. | Promote Profile to Tab 4 and use app chrome only for quick access if needed. | Backup and identity feel trustworthy instead of hidden. | Gives auth, themes, support, and settings one owner. | Neutral; Profile can lazy-load. | Provides a stable home for account, backup, privacy, and theme expansion. |

### A2. Core Navigation Diagnosis

| Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- |
| Shift from feature categories to user intent: "enter money", "understand money", "use a tool", "manage identity". | Lower cognitive load; the app feels like a daily companion instead of a finance suite. | Simplifies naming decisions and reduces duplicated feature discovery cards. | Mostly neutral; depends on preserving lazy boundaries. | Creates durable buckets for future capabilities. |
| Treat the first viewport as daily behavior, not product marketing. | Users can add an expense faster and see status immediately. | Consolidates Home/Daily priorities. | Positive if advanced modules stay below the fold or lazy. | Supports daily retention loops. |
| Keep every advanced workflow reachable through Tools and contextual shortcuts. | Existing power users do not lose capabilities. | Allows gradual moves without deleting screens. | Neutral to positive if Tools is a router/grid, not a preloaded mega-screen. | Lets FBPLY add utilities without crowding Daily. |

---

## B. Proposed Navigation

### B1. Four-Tab Structure

| Tab | Purpose | First screen responsibility | Existing source mapping | Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TAB 1 - DAILY | Fast money entry and daily tracking | Amount-first entry, Expense/Income, Available amount, Recent Activity, Next Action | TodayScreen, DailyBookScreen, QuickAddSheet, Add Hub, financial activity feed | Promote as default app landing. Reuse Home/Today as the hero and fold Daily Book below. | Faster daily use and less confusion between Home and Daily. | Aligns two existing daily surfaces under one owner. | Keep Today and Daily chunks lazy/conditional to avoid a heavier first paint. | Daily can later support habits, streaks, reminders, and offline-first entry. |
| TAB 2 - INSIGHTS | Help users understand money | Money Score, Money Flow, Monthly Story, Reports | homeIntelligence, financeVisuals, reportInsights, ReportsScreen, ReportCharts | Reposition Reports as the detailed layer under Insights. | Users learn what is happening before exporting PDFs. | Reuses existing insight/report builders. | Charts and PDF exports must remain lazy/action-gated. | New insights can be added without creating top-level nav items. |
| TAB 3 - TOOLS | Utilities and advanced features | Tool grid grouped by People Money, Plan & Save, Review & Export | SharedExpenseScreen, GoalsScreen, StatementUploadSheet, ProfileHub links, public calculators | Create a Tools hub that links into existing workflows and anchors. | Users can find trip split, savings, borrow/lend, calculator, and statement analysis by task. | Centralizes feature discovery without changing feature internals. | Tools hub should render lightweight cards only; load tool bodies on action. | Scales well as utilities grow. |
| TAB 4 - PROFILE | Identity, settings, backup | Local profile state, optional login/backup, themes, recurring bills, support/settings | ProfileScreen, SettingsScreen, ProfileHub, ProfileSettingsControls, RecurringScheduleManager | Promote Profile to top-level nav and make backup messaging explicit. | Users understand where data ownership, account, and personalization live. | Gives auth/settings/theme one product owner. | Profile can be lazy-loaded; no need to block Daily startup. | Supports cloud backup, privacy, theme, and account expansion. |

### B2. Current-to-V7 Mapping

| Current area | V7 destination | Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- | --- |
| Home | DAILY hero | KEEP and RENAME conceptually. | Home becomes the daily action surface. | Avoids rebuilding TodayScreen from scratch. | Neutral if same component remains. | Allows daily-first product evolution. |
| Daily | DAILY history/body | PROMOTE under Daily, below amount-first hero. | Daily history remains close to entry. | Keeps DailyBookScreen logic intact. | Neutral. | Supports future filters and daily summaries. |
| People | TOOLS, with Daily reminders | MOVE. | People-money actions are easier to find by intent. | Reduces History tab overload. | Positive if hidden until selected. | Supports more people-money use cases. |
| Reports | INSIGHTS, with Tools export links | MOVE and KEEP. | Reports become explanation and evidence, not just export. | Reuses ReportsScreen while clarifying purpose. | Neutral with lazy charts/export. | Supports richer insight library. |
| Savings | TOOLS management plus Daily/Insights progress | MOVE and PROMOTE. | Users see goal progress without losing management. | Keeps GoalsScreen and SavingsBucketsManager. | Neutral. | Supports multiple saving/planning utilities. |
| Statement Analysis | TOOLS entry plus INSIGHTS report output | KEEP and MOVE discovery. | Users can find upload/review from Tools and understand output in Insights. | Preserves existing StatementUploadSheet and report flow. | Positive if parser remains action-loaded. | Supports future import/review tools. |
| Trip Split | TOOLS primary utility plus Daily/Insights status | KEEP, MOVE, PROMOTE. | Trip split becomes discoverable; active settlement still appears daily. | Reuses shared group logic. | Neutral if action-loaded. | Scales to more group-money flows. |
| Profile | PROFILE tab | PROMOTE. | Backup/settings become easier to trust and find. | Centralizes identity/settings. | Neutral if lazy. | Supports optional login and cloud backup. |

### B3. Implementation Constraint For Future Prototype

| Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- |
| Prototype with labels, grouping, and existing anchors before moving code. | Users experience the new mental model while behavior remains familiar. | Limits risk by preserving existing activeTab keys, callbacks, and screen components at first. | Avoids accidental bundle growth from new wrappers. | Provides validation data before deeper restructuring. |
| Do not change public SEO routes or private app routes during repositioning. | Existing links and user expectations remain stable. | Prevents routing churn. | Neutral. | Future route changes can be planned only after product validation. |

---

## C. Daily Hero Strategy

### C1. First Viewport Recommendation

Proposed Daily first viewport order:

1. Amount-first entry surface.
2. Expense / Income mode control, with Expense as the default.
3. Available amount.
4. Next Action.
5. Recent activity.

| Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- |
| Make Daily the default landing tab and focus the first viewport on amount entry. | Reduces taps and gives the user an immediate "I can add money now" feeling. | Reuses existing QuickExpenseEntry, QuickIncomeEntry, and save handlers. | Positive if only the entry shell and daily status render first. | Gives FBPLY a clear daily habit loop. |
| Default to Expense while keeping Income one tap away. | Matches the most frequent daily behavior while preserving income entry. | Avoids duplicating Add Hub logic by using existing mode handling. | Neutral. | Supports future quick modes without new tabs. |
| Place Available amount next to entry, not buried in monthly context. | Users understand the effect of tracking without opening Insights. | Reuses `safeToSpend` output. | Neutral. | Keeps daily status extensible for reminders and budget pressure. |
| Keep one Next Action card in the first viewport. | Users get one clear suggestion, not a suite of competing tasks. | Aligns with the existing next-best-action specification and current TodayScreen pattern. | Neutral; one card is cheap. | Scales because candidate ranking can evolve internally without changing the viewport. |
| Put Recent Activity directly below the first viewport. | The save confirmation loop is visible; users can trust that the entry was recorded. | Reuses money feed / Daily Book row patterns. | Positive if only recent rows render first and extended history stays collapsed. | Supports undo/edit/review later without crowding entry. |

### C2. Expense Entry Friction

| Metric | Current likely path | V7 target | Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Taps to add expense | From global FAB: tap Add, tap Expense, enter amount/details, save. From Daily: tap Daily if needed, tap Add Expense, enter amount/details, save. Some Home next actions can open expense directly. | From Daily first viewport: amount field ready, optional category, save. Target: 0 taps before amount entry when already on Daily; 1 tap to save after valid input. | Measure separately for "already on Daily" and "from another tab". | Makes daily logging feel fast enough for repeated use. | Uses existing saveExpenseRecord/addExpense validation. | Positive if entry is not wrapped in heavy modal work. | Creates a measurable daily habit KPI. |
| Time to add expense | Not directly tracked today; can be estimated through manual testing and existing event sequence. | Target median under 10 seconds for amount-only/common-category save in prototype testing. | Define timer from entry surface open to successful expense creation, but do not add analytics in this audit. | Gives the team a concrete usability target. | Requires only test protocol now; future analytics can be privacy-safe. | No runtime impact during audit. | Allows regression checks as entry UI evolves. |
| Expense vs Income selection | Expense and income are options in Add Hub. | Expense default; Income segmented control. | Use mode control, not separate top-level destinations. | Reduces choice delay while preserving income. | Keeps one entry surface. | Neutral. | Supports future transfer/other modes if validated. |

### C3. Daily Content Ownership

| Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- |
| Daily owns entry, recent activity, daily history, and urgent money actions. | Users know where to go every day. | Gives Daily a crisp boundary and reduces cross-screen shortcuts. | Positive if advanced content is collapsed. | Daily can scale through progressive disclosure. |
| Daily does not own full Reports, Statement Analysis, or long-form planning. | Prevents the first tab from becoming a suite again. | Keeps heavy workflows in Insights/Tools. | Positive because upload, charts, and PDF remain off the first path. | Maintains a sustainable tab hierarchy. |

---

## D. Insights Strategy

### D1. Money Score

Best score model: use the existing `buildFinancialHealthScore` foundation as the V7 Money Score model, with confidence gating.

Why:

- It already uses app-owned data: expenses, financial state, savings buckets, planner recommendation, and money book summary.
- It avoids external financial advice.
- It returns a "Learning" state when there is not enough real activity.
- It is compatible with a Daily Money Companion because it rewards usable habits, not financial product ownership.

Recommended V7 score language:

| Score state | User-facing meaning |
| --- | --- |
| Learning | Not enough data yet. Add activity to make the score trustworthy. |
| Building | Foundation exists, but one or two habits can improve clarity. |
| Steady | Money behavior is readable and mostly calm. |
| Strong | Current money system looks consistent. |

| Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- |
| Position Money Score at the top of Insights, not the Daily first viewport. | Users can understand money when they choose to reflect, without turning daily entry into judgment. | Reuses current health score logic. | Neutral; score is already derived from in-memory state. | Score factors can evolve without disturbing Daily entry. |
| Show compact score status on Daily only when useful, such as "Learning" or "Steady". | Prevents score anxiety while keeping status visible. | Requires presentation gating, not new calculations. | Neutral. | Supports personalization later. |
| Do not frame Money Score as credit score, investment score, or financial advice. | Reduces trust and compliance risk. | Keeps language safer and simpler. | Neutral. | Scales across markets and user profiles. |

### D2. Money Flow

Best visual summary: a simple money movement summary using existing income, spent/fixed, protected, and safe room concepts. Do not design charts yet.

| Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- |
| Put Visual Money Flow directly below Money Score in Insights. | Users see why the score/state exists. | Can reuse `buildDirectionData`, `buildFlexibleSpendingDistribution`, and financial state values. | Neutral if visual is lightweight and chart details stay lazy. | Supports future flow comparison without redesigning navigation. |
| Use Money Flow to answer "where did money go?" rather than "what chart can we show?" | Improves comprehension over decoration. | Keeps insight builders user-outcome focused. | Positive if it avoids heavy chart preload. | Leaves room for later chart design after validation. |
| Keep a compact flow preview in Daily secondary context, not first viewport. | Daily remains fast but connected to understanding. | Reuses same data in a smaller presentation. | Neutral. | Helps cross-sell Insights naturally. |

### D3. Monthly Story

Best monthly story format: a short narrative stack.

Recommended structure:

1. What happened: income, expenses, top category, or active settlement.
2. What changed: weekly/monthly change, largest category movement, or goal progress.
3. What to do next: one safe review action or no-action-needed state.

| Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- |
| Place Monthly Story in Insights below Money Flow and above Reports. | Users get a readable summary before opening report generation/export. | Reuses TodayScreen monthly replay and reportInsights story items. | Neutral. | Allows richer story modules without changing Reports. |
| Keep Reports as the evidence/detail layer under the story. | Users can move from explanation to export. | Preserves ReportsScreen and report history. | Neutral with lazy charts/PDF. | Reports can grow without becoming the primary tab concept. |
| Limit the story to 3 highlights by default. | Prevents insight overload. | Keeps report story logic bounded. | Positive for render and comprehension. | More highlights can remain behind details. |

---

## E. Tools Strategy

### E1. Tools Hub Grouping

Recommended Tools groups:

| Group | Tools |
| --- | --- |
| People Money | Trip Split, Borrow/Lend |
| Plan & Save | Savings, Calculator |
| Review & Export | Statement Analysis, report/export shortcuts |

### E2. Tool Placement Recommendations

| Tool | Current placement | Recommendation | V7 placement | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Trip Split | Shared expenses inside Activity/People, with Home active trip cards and Reports export. | KEEP, MOVE, PROMOTE. | Tools primary card under People Money; Daily shows active settlement reminders; Insights/Reports keep trip report outputs. | Easier discovery for trip users without losing existing status/report value. | Reuses shared group and settlement logic. | Neutral if trip screen loads only after selection. | Supports future shared rent, group dinner, and settlement variants. |
| Calculator | Public SEO calculators exist conceptually; no dominant private app tab is visible in current app nav. | PROMOTE cautiously. | Tools card under Plan & Save, initially as a link/entry to existing calculator-style logic if available. | Users looking for quick estimates can find them without creating records. | Avoids inventing new calculation logic during repositioning. | Positive if calculator is lightweight and does not preload report/chart code. | Tools can host future calculators without nav expansion. |
| Savings | Dedicated Savings tab plus setup/profile/home links. | MOVE and PROMOTE status. | Tools management surface under Plan & Save; Daily/Insights show progress and next action. | Full savings capability remains, but daily usage sees only relevant progress. | Keeps GoalsScreen and SavingsBucketsManager intact. | Neutral if management remains lazy. | Supports multiple goal/planner tools without top-level tab pressure. |
| Borrow/Lend | Money Book inside Activity/People and Add Hub. | MOVE and COLLAPSE under People Money. | Tools People Money group, with Daily pending receive/repay reminders. | Users find it as a utility, while urgent items surface daily. | Clarifies ActivityScreen role and keeps save/settle handlers unchanged. | Positive if Money Book details load only on open. | Scales to contacts, reminders, and settlement history later. |
| Statement Analysis | Reports card/sheet, Add Hub, ProfileHub. | KEEP, MOVE, COLLAPSE advanced details. | Tools Review & Export card opens existing StatementUploadSheet; generated output remains in Insights/Reports. | Advanced upload workflow becomes findable without crowding Daily. | Preserves parser, mappings, report generation, and warnings. | Positive if parser/PDF worker remains action-gated. | Supports future import/review tools. |

### E3. Tools Guardrails

| Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- |
| Tools should be a lightweight launcher, not a page that renders every tool at once. | Users get a clean utility shelf. | Keeps feature code owned by existing screens. | Protects startup and tab-switch performance. | Scales to more tools without heavy first render. |
| Keep Add Hub for creation and Tools for utility discovery. | Users can still add fast from anywhere while finding advanced tasks deliberately. | Avoids overloading the floating add button. | Neutral. | Maintains two clear interaction patterns: create now vs open a tool. |

---

## F. Optional Login Strategy

### F1. Current Auth/Sync State

Current behavior:

- Supabase client is created only when URL and anon key are available.
- Local storage is the first cache for profile, expenses, savings buckets, recurring schedules, shared groups, money book, report history, statement mappings, and voice memory.
- When Supabase is configured, the phase flow routes users through auth unless setup is complete and Supabase is not ready.
- On login/session, cloud loaders sync profile, commitments, savings, expenses, shared groups, money book, report history, statement mappings, and voice memory.
- Existing cloud tables use authenticated user ownership through `user_id` and RLS policies.

### F2. Proposed Transition: Mandatory Login -> Use First, Backup Later

| Recommendation | Supabase impact | Data migration impact | Analytics impact | Sync impact | Rollback strategy | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Let users enter the app in local mode after welcome/setup even when Supabase is configured. | No schema change. Supabase remains available but is not required before use. | Existing local caches become the source of truth until backup. | No analytics change in this audit. Future events can be privacy-only, such as backup prompt viewed/started/completed. | Do not run cloud sync without `authUser.id`. | Keep current AuthScreen and phase path behind a feature flag or environment switch. | Removes signup friction and allows immediate value. | Requires clearer phase ownership but avoids data model rewrites. | Positive: fewer initial auth/session waits for first-use users. | Enables offline-first and anonymous-first growth. |
| Move login copy from "required access" to "backup and sync your data". | No schema change. | No data migration until the user chooses backup. | Existing profile/auth events can remain; future backup events should not include amounts or text. | Sync begins only after auth success. | Revert copy/phase flag to mandatory auth if needed. | Users understand why login matters without being blocked. | Centralizes auth messaging in Profile/backup. | Neutral. | Supports optional account upgrades later. |
| On backup start, show a local data inventory and confirm merge behavior. | No schema change. | Critical: prevent silent overwrite when cloud data already exists. Current loaders often prefer cloud rows if present, so V7 must define keep local, merge, or replace before backup. | Future analytics can count backup flow steps only, not data values. | Sync should not apply cloud-over-local until the user confirms. | Roll back by disabling optional backup entry point and returning to current auth gate. | Protects trust and prevents surprise data loss. | Adds a merge decision layer but keeps existing sync modules reusable. | Slightly more work during backup only, not daily use. | Required for multi-device and returning-user scale. |
| Keep local IDs and existing migration-run keys when uploading guest data. | No table change if current IDs are accepted by existing upsert flows. | Reduces duplicate cloud records and keeps report/history references stable. | No analytics detail needed. | Existing per-domain migration functions can remain the upload path. | Feature flag can prevent upload and keep data local. | Preserves continuity after backup. | Avoids parallel data models. | Neutral during normal use; upload cost happens once. | Supports future account recovery and sync. |
| Preserve RLS and authenticated `user_id` ownership. | No Supabase policy change recommended for V7 repositioning. | Guest data should not be written to Supabase until auth exists. | No analytics impact. | Existing queues should remain per user after login. | Revert to mandatory login without database migration. | Keeps privacy/security expectations clear. | Avoids broad backend changes. | Positive: no anonymous cloud writes. | Scales with current user-owned table model. |
| Keep analytics privacy-light. | No Supabase impact. | No data migration impact. | Current analytics event payload shape should remain amount-free and text-free. Future timing metrics should include duration buckets only if approved. | Sync unaffected. | Revert by removing optional-login events from the map if not validated. | Users are not tracked by sensitive finance details. | Keeps Product Health Dashboard consistent. | Positive; small event payloads. | Scales safely across more funnels. |
| Introduce optional login in a reversible phase order. | No schema change. | Start with new users/local-only; handle existing cloud accounts only after merge policy is tested. | Compare activation and creation rates before and after. | Keep current sync loaders unchanged until merge UX is defined. | Mandatory-auth fallback remains available. | Reduces risk while testing friction reduction. | Keeps refactor small. | Positive for first-use speed. | Allows staged rollout. |

### F3. Optional Login Rollback Plan

| Step | Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- |
| 1 | Keep current mandatory AuthScreen path available behind a feature flag or environment switch. | Users can be returned to known login behavior if backup flow fails. | Small branching cost during transition. | Neutral. | Supports staged rollout. |
| 2 | Do not migrate database schemas for optional login V7. | Reduces risk of irreversible rollout. | Backend stays stable. | Neutral. | Allows later schema decisions based on real usage. |
| 3 | Store guest data in existing local cache keys. | Users do not experience a separate "guest database". | Reuses existing persistence code. | Positive for simplicity. | Supports later upload using existing migration code. |
| 4 | Block cloud overwrite until merge policy is explicit. | Protects existing local work. | Requires a small coordination layer before sync. | Backup may take longer, but daily use is unaffected. | Required for multi-device scale. |

---

## G. Visual Understanding Strategy

No chart design is recommended in this phase. This section defines locations and purpose only.

### G1. Placement Recommendations

| Visual element | Recommended placement | Purpose | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- | --- |
| Money Score | Insights top. Optional compact status chip on Daily. | Summarize money health/readiness using app-owned activity. | Gives users a calm understanding layer without slowing entry. | Reuses current financial health score logic. | Neutral; derived from existing state. | Can gain factor explanations later. |
| Visual Money Flow | Insights directly under Money Score; compact secondary context in Daily. | Explain income, fixed/spent, protected, and available movement. | Helps users understand where money went. | Reuses existing finance visual builders. | Positive if lightweight and not chart-heavy initially. | Can later support monthly comparisons. |
| Progress indicators | Daily activation/progress, savings progress, trip settlement, statement parsing/review, report generation, backup/sync. | Show completion and confidence for user-controlled workflows. | Builds trust that actions are saved or in progress. | Standardizes status/progress treatment across modules. | Positive if CSS-based and lightweight. | Supports more async/review workflows. |
| Premium motion | Add/save confirmation, amount status change, sheet transitions, backup progress, statement parsing, report ready state. | Make important state changes feel polished, not decorative. | Improves perceived quality and confidence. | Reuse existing motion dependency; avoid bespoke animation systems. | Must respect reduced-motion and avoid blocking input. | Motion tokens can scale across screens. |

### G2. Visual Strategy Guardrails

| Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- |
| Use visual hierarchy to explain money, not to decorate the app. | Users understand status faster. | Keeps design decisions tied to product outcomes. | Positive if it avoids heavy visuals. | Scales beyond one-off screens. |
| Avoid adding new chart types before the navigation repositioning is validated. | Users are not distracted by new visuals while the core model changes. | Prevents chart churn. | Positive; fewer heavy components. | Later chart work can be evidence-based. |
| Keep motion optional, short, and state-driven. | Users get polish without delay or discomfort. | Maintains one motion language. | Positive if animations are CSS/Framer-light and non-blocking. | Supports premium feel across future workflows. |

---

## H. Migration Risk Assessment

### H1. Risk Table

| Risk | Severity | Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- | --- |
| Users perceive Savings or Reports as removed when tabs change. | High | Keep contextual cards, Tools entries, and Insights sections visible during transition. | Preserves trust and existing habits. | Requires temporary duplicate entry points. | Neutral if links are lightweight. | Lets usage data decide final prominence. |
| Optional login overwrites local guest data with existing cloud data. | High | Define merge/replace/keep-local policy before enabling Backup Later for existing accounts. | Prevents data loss and trust damage. | Adds a necessary sync decision layer. | Backup flow may be slower, but daily use is unaffected. | Required for multi-device scale. |
| Tools tab becomes a heavy mega-screen. | Medium | Render only lightweight launcher cards and lazy-load tool bodies. | Keeps Tools easy to scan. | Preserves current screen ownership. | Positive for first render and tab switch. | Scales to more utilities. |
| Daily first viewport becomes crowded with insights/tools. | Medium | Keep amount entry, available amount, next action, and recent activity only; move explanation to Insights. | Reduces friction and distraction. | Clarifies Daily ownership. | Positive for first paint. | Supports long-term daily habit. |
| Analytics screen names drift after renaming tabs. | Medium | Preserve existing event names during prototype and map new labels in reporting docs later. | Product metrics remain comparable. | Avoids analytics refactor during IA validation. | Neutral. | Allows phased metric migration. |
| Money Score is misunderstood as credit/financial advice. | Medium | Use "Money Score" with Learning/Building/Steady/Strong language and factor transparency. | Reduces anxiety and misinterpretation. | Keeps language safe and stable. | Neutral. | Scales across regions without external data claims. |
| Statement Analysis discovery increases parser load. | Medium | Tools should open the existing sheet only on user action. | Users can find it without slowing normal app use. | Preserves parser ownership. | Positive if PDF worker remains lazy. | Supports more import tools later. |
| Profile becomes duplicated between top settings and bottom tab. | Low-Medium | During prototype, Profile can be both accessible and measured; later choose one primary access point. | Users can find settings during transition. | Temporary duplication, then consolidation. | Neutral. | Profile can scale into account/backup hub. |
| Repositioning fights legacy rollback paths. | Medium | Reposition with mapping and labels before retiring rollback branches. | Users get stable behavior. | Avoids cleanup/reposition coupling. | Neutral. | Reduces future refactor risk. |
| Public calculators and private Tools create route confusion. | Low-Medium | Keep public SEO routes unchanged; private Tools may link to calculator logic without route changes. | Existing public links remain valid. | Avoids SEO churn. | Neutral. | Supports public acquisition and private retention separately. |

### H2. Recommended Migration Order

| Phase | Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- |
| V7.0 | Validate labels and information architecture in design/prototype only. | Users are not exposed to risky behavior changes yet. | Creates shared product direction. | No runtime impact. | Establishes a stable structure. |
| V7.1 | Prototype Daily first viewport using existing entry/status logic. | Directly reduces daily friction. | Reuses existing add/save paths. | Should improve perceived speed if kept light. | Builds daily usage loop. |
| V7.2 | Prototype Insights by reordering existing score, flow, story, and Reports concepts. | Users understand before exporting. | Reuses existing intelligence/report modules. | Keep charts/export lazy. | Scales insight library. |
| V7.3 | Prototype Tools as a launcher to existing workflows. | Preserves all advanced utility value. | Avoids moving business logic. | Lightweight if launcher-only. | Scales to additional tools. |
| V7.4 | Prototype Profile as backup/settings identity hub. | Makes data ownership understandable. | Centralizes account/theme/support. | Lazy-load profile/settings. | Enables optional login. |
| V7.5 | Test optional login behind a reversible flag after merge policy is defined. | Reduces onboarding friction without risking data. | Adds controlled auth phase branch. | Faster first use; backup cost only on demand. | Supports local-first growth. |

## Final Rule Alignment

| Rule | V7 application |
| --- | --- |
| Reposition before rebuilding | Use existing screens, handlers, data, analytics, and sync modules as the first prototype substrate. |
| Preserve existing value | Every current capability remains reachable through Daily, Insights, Tools, Profile, or contextual shortcuts. |
| Reduce friction | Daily becomes amount-first and expense-first, with Available and Next Action immediately visible. |
| Increase daily usage | The app opens to a repeatable daily loop: enter money, see status, review recent activity, act on one next step. |
