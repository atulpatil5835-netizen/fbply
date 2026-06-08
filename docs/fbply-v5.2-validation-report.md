# FBPLY V5.2 Validation Report

Date created: 2026-06-07  
Observation window: 2-4 weeks  
Decision gate: no new major feature development until this report is reviewed with real Product Health Dashboard evidence.

## Purpose

V5.2 is a validation and cleanup program. The goal is to use real behavior from the Product Health Dashboard before expanding the product.

This report must stay evidence-led:

- Use event counts and repeat behavior, not opinions.
- Create cleanup inventory only.
- Do not remove code during validation.
- Do not implement bundle optimizations during validation.
- Do not add user-facing features during validation.

## Data Sources

| Source | Use |
| --- | --- |
| Product Health Dashboard | Weekly behavior review, feature ranking, repeat signals |
| Analytics Event Map | Confirms the tracked event contract |
| Build output | Bundle and lazy-route observation baseline |
| Static code inventory | Dead code and cleanup candidates only |

Privacy note: analytics events contain only `event_name`, `timestamp`, `screen`, and `app_version`.

## Weekly Review Cadence

| Week | Dates | Founder Review Tasks |
| --- | --- | --- |
| Week 1 | 2026-06-07 to 2026-06-13 | Product Health Dashboard, Top Actions, Ignored Features |
| Week 2 | 2026-06-14 to 2026-06-20 | Repeat Behaviors, Goal Creation Rates, Report Usage |
| Week 3 | 2026-06-21 to 2026-06-27 | Next Action Engagement, Add Hub dominant action, People usage |
| Week 4 | 2026-06-28 to 2026-07-04 | Final ranking, cleanup candidates, optimization candidates, decision gate |

## Usage Findings

Current status: pending observation. No production conclusion should be made before the dashboard has at least 2 weeks of behavior data.

| Area | Question | Metric | Current Finding | Decision Signal |
| --- | --- | --- | --- | --- |
| Home | Do users click Next Action? | `next_action_clicked / home_viewed` | Pending | High rate means Home recommendation is useful. Low rate means the recommendation may be unclear or low-value. |
| Add Hub | What is the dominant action? | Highest of `add_expense_selected`, `add_income_selected`, `add_people_selected`, `add_other_actions_selected` | Pending | Dominant action should guide future Add Hub simplification. |
| People | Is the screen being used? | `people_viewed`, `borrow_created`, `shared_group_created`, `settlement_completed` | Pending | Usage plus creations means People is valuable. Views without actions means friction. |
| Savings | Are goals being created? | `goal_created` | Pending | Goal creation validates the future-goals direction. |
| Savings | Are goals being updated? | `goal_updated`, repeat goal updates | Pending | Repeat updates are a retention signal. |
| Reports | Are reports actually opened? | `reports_viewed` | Pending | Reports viewed confirms interest. |
| Reports | Are reports generated? | `report_generated / reports_viewed` | Pending | Views without generation suggest export/report friction. |
| Statements | Are statement uploads completed? | `statement_analysis_completed / statement_analysis_started` | Pending | Low completion suggests import friction or file support issues. |

## Feature Ranking

Ranking must be filled from Product Health Dashboard top actions after the observation window.

| Rank | Feature / Workflow | Evidence Metric | Current Rank |
| --- | --- | --- | --- |
| 1 | Home / Next Action | `home_viewed`, `next_action_clicked` | Pending |
| 2 | Add Hub / Expense | `add_hub_opened`, `add_expense_selected`, `expense_created` | Pending |
| 3 | Savings Goals | `savings_viewed`, `goal_created`, `goal_updated` | Pending |
| 4 | People / Borrow / Shared | `people_viewed`, `borrow_created`, `shared_group_created`, `settlement_completed` | Pending |
| 5 | Reports | `reports_viewed`, `report_generated` | Pending |
| 6 | Statement Analysis | `statement_analysis_started`, `statement_analysis_completed` | Pending |

## Product Health Review

To complete at the end of the observation period:

| Review Question | Answer |
| --- | --- |
| Most used feature | Pending Product Health Dashboard evidence |
| Least used feature | Pending Product Health Dashboard evidence |
| Most valuable workflow | Pending repeat behavior and creation evidence |
| Most ignored workflow | Pending ignored feature list and low-conversion paths |

## Removal Candidates

Inventory only. Do not remove during V5.2.

### Legacy Rollback Paths

| Candidate | Location | Validation Needed Before Removal |
| --- | --- | --- |
| Home legacy presentation flag | `src/screens/TodayScreen.jsx` uses `window.__FBPLY_LEGACY_HOME__` | 2-4 weeks with no need to revert Home |
| Daily Book legacy presentation flag | `src/screens/DailyBookScreen.jsx` uses `window.__FBPLY_LEGACY_DAILY_BOOK__` | Daily Book usage stable after Money OS migration |
| People legacy flags | `src/screens/ActivityScreen.jsx` uses `window.__FBPLY_LEGACY_PEOPLE__`, `window.__FBPLY_LEGACY_BORROW_LEND__`, `window.__FBPLY_LEGACY_SHARED_EXPENSES__` | People creation and settlement flows stable |
| Reports legacy presentation flag | `src/components/ReportsScreen.jsx` uses `window.__FBPLY_LEGACY_REPORTS__` | Report generation and statement analysis stable |
| Add Hub legacy flag | `src/App.jsx` uses `window.__FBPLY_LEGACY_ADD__` | Add Hub selection and creation rates stable |
| Footer / Profile Hub legacy flags | `src/App.jsx` uses `window.__FBPLY_LEGACY_FOOTER__`, `window.__FBPLY_LEGACY_PROFILE_HUB__` | No support/legal/profile regression |

### Legacy Components And Duplicated Primitives

| Candidate | Evidence | Action After Validation |
| --- | --- | --- |
| `AppPrimitives.jsx` legacy `EmptyState`, `CurrencyInput`, `AppModal` | Still mixed with Money OS primitives in migrated areas | Consolidate only after rollback flags are retired |
| Mixed empty states | Daily Book, Savings, Shared/People areas still mix legacy and Money OS empty states | Standardize on one primitive family |
| Screen-local cards vs Money OS cards | Several screens keep local card styles after migration | Consolidate repeated visual primitives after validation |
| Inline profile components in `App.jsx` | `ProfileScreen`, `ProfileMenuSheet`, `CommitmentEditorSheet` remain inline | Inventory for later split only, no migration during V5.2 |

### Styles Inventory

| Candidate | Evidence | Notes |
| --- | --- | --- |
| Legacy global CSS blocks | Prior bundle audit identifies global + legacy + Money OS CSS combined | Requires visual coverage before pruning |
| Rollback screen styles | Home, Daily, People, Reports, Add Hub rollback paths keep old styles alive | Remove only with rollback flag removal |
| Duplicated card/form styles | Money OS and legacy local styles coexist | Consolidate after validation, not during it |
| `.mos-report-legacy-button` | Present in `src/design-system/money-os.css` | Confirm usage before cleanup |

## Optimization Candidates

Observation only. Do not implement during V5.2.

Fresh build baseline from 2026-06-07:

| Area | Build Signal | Observation |
| --- | --- | --- |
| Startup | `index-CcB_YLWk.js` 855.13 KB, gzip 243.26 KB | Watch startup speed before any split work |
| Global CSS | `index-Dobxnwvs.css` 186.44 KB, gzip 29.67 KB | Later cleanup likely tied to legacy CSS removal |
| Product Health Dashboard | `ProductHealthDashboard-CF5IVx-z.js` 5.53 KB, gzip 2.27 KB | Lazy and lightweight; acceptable for founder-only internal use |
| Settings route | `SettingsScreen-drsuD-Hr.js` 11.11 KB, gzip 3.40 KB | Dashboard is not bundled into normal startup |
| Reports route | `ReportsScreen--WU-Yus_.js` 32.09 KB, gzip 6.86 KB | Route is reasonably lazy |
| Report charts | `ReportCharts-DSROZBVW.js` 364.19 KB, gzip 105.83 KB | Heavy; observe loading only when report visuals open |
| PDF/export stack | `jspdf`, `pdf`, `html2canvas`, `pdf.worker` chunks are large | Keep action-gated; observe report generation wait time |
| Statement import | `StatementUploadSheet` 16.21 KB gzip 4.82 KB, `statementImport` 17.28 KB gzip 6.63 KB | Watch statement completion rate before optimizing |

## Decision Gate

Before any new major development:

1. Review at least 2 weeks of Product Health Dashboard data.
2. Fill in feature ranking from actual top actions.
3. Identify ignored workflows from actual zero/low-use events.
4. Confirm whether Savings goals are created and updated repeatedly.
5. Confirm whether Reports are opened and generated.
6. Confirm whether statement analysis starts complete.
7. Decide whether cleanup should focus on rollback paths, duplicated primitives, or bundle split candidates.

## Future Phase: Next Best Action Engine

Status: gated. Do not begin until validation data confirms users interact with Home recommendations.

### Trigger

Begin only after Product Health Dashboard evidence shows meaningful Home recommendation engagement through:

- Next Action Click Rate
- Repeat Home views with Next Action interaction
- Clear usage signal that users respond to one recommended action

### Goal

Turn FBPLY from a tracker into a decision assistant without adding AI, chat, financial advice, or multiple competing suggestions.

### Product Rules

- Show one recommendation only.
- Show one card.
- Show one action.
- Show one reason.
- Do not show multiple suggestions.
- Do not present financial advice.
- Do not require AI.
- Do not add a chat interface.

### Recommendation Priority Order

| Priority | Recommendation Type |
| --- | --- |
| 1 | Overdue obligations |
| 2 | Upcoming obligations |
| 3 | Savings opportunities |
| 4 | Collection reminders |
| 5 | Spending warnings |

### Success Metrics

| Metric | Purpose |
| --- | --- |
| Next Action Click Rate | Confirms users notice and trust the recommendation card |
| Next Action Completion Rate | Confirms the recommendation leads to useful action |

### Guardrail

If Home recommendation engagement is weak during validation, do not build this phase. Improve the existing Home recommendation clarity first.

## Final Rule

Evidence before expansion.
