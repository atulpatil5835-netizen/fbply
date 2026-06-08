# FBPLY Next Best Action Engine Specification

Date created: 2026-06-07  
Status: future phase specification only  
Trigger: begin only after validation data confirms users interact with Home recommendations.

## Purpose

The Next Best Action Engine should turn FBPLY from a tracker into a simple decision assistant without adding AI, chat, financial advice, or multiple competing suggestions.

This specification does not implement anything. It does not change UI, business logic, analytics, APIs, routes, database schemas, calculations, or product behavior.

## Product Rule

One recommendation only.

Never show multiple competing recommendations, carousels, ranked lists, or alternative actions. If several candidates exist, the engine must rank them internally and output only the winning card.

## Output Contract

The future engine should produce one object for Home:

| Field | Purpose | Rule |
| --- | --- | --- |
| `id` | Stable internal candidate key | No personal text required. |
| `type` | Recommendation category | Must come from the approved catalog. |
| `title` | Card headline | Plain action language, no jargon. |
| `action` | The one CTA | Must map to an existing screen or workflow. |
| `reason` | Why this appears | One sentence only. |
| `destination` | Existing app destination | Reuse existing tabs, sheets, or anchors only. |
| `priority` | Internal rank | Used only for choosing one winner. |
| `completionRule` | How completion is recognized | Must reuse existing product actions/events where possible. |

Do not output multiple reasons. Do not expose the priority score to users.

## Recommendation Catalog

Approved recommendation types for the first engine version:

| Type | Example Title | Action | Reason | Existing Data Sources | Completion Signal |
| --- | --- | --- | --- | --- | --- |
| Overdue obligation | Review overdue payment | Open bills | A saved obligation appears past its due date. | `financialCalendarEvents`, `recurringSchedules`, `profile` commitments, savings goal deadlines, settlement states where due status is explicit | Existing payment/settlement/goal update action, when available |
| Upcoming EMI | Review upcoming EMI | Open bills | An EMI-like commitment is due soon. | `profile` commitments via `normalizeCommitments`, `financialCalendarEvents`, `moneyReminders` | Expense/payment entry or profile bill review |
| Upcoming repayment | Review repayment | Open Money Book | A saved repayment is open or due soon. | `moneyBookSummary.needToPay`, money book entries, shared settlement liabilities | `settlement_completed` or money book settlement toggle |
| Upcoming bill | Review upcoming bill | Open bills | A recurring bill is due soon. | `recurringSchedules`, `profile` commitments, `financialCalendarEvents` | Expense/payment entry or bill review |
| Money to collect | Collect pending money | Open People | Saved shared or borrow/lend money is still pending. | `sharedSummary.pendingRecoverable`, `moneyBookSummary.needToReceive`, reconciled shared groups | `settlement_completed` or money book settlement toggle |
| Savings contribution | Add to goal | Open Savings | A goal is active and no higher-priority obligation needs attention. | `savingsBuckets`, `financialState.safeToSpend`, existing planner `recommendation` when present | `goal_updated` or goal transfer saved |
| Goal deadline | Review goal timeline | Open Savings | A goal deadline is near and the target is not complete. | `savingsBuckets` with `deadline`, `saved`, and `target` | `goal_updated` |
| Spending warning | Review spending | Open Daily Book | Recent spending or monthly pressure needs attention. | `financialState.usagePercent`, `financialState.safeToSpend`, `buildSmartHomeInsights`, recent expenses | Expense review, report generation, or no completion event in V1 |
| Starter action | Add first expense | Add expense | FBPLY needs real activity before it can recommend confidently. | Empty or sparse `expenses`, no goals, no reports | `expense_created`, `goal_created`, or first setup action |
| No action needed | Continue current pace | View activity | No overdue, upcoming, savings, collection, or spending warning is stronger today. | Absence of eligible higher-priority candidates | Click only, unless the user takes a later tracked action |

Amounts may be shown in the product only when they already exist in local app state. Future analytics must never include amounts.

## Ranking Rules

The engine must use hard priority bands. Lower bands must never outrank higher bands.

| Rank | Category | Priority Band |
| --- | --- | --- |
| 1 | Overdue obligations | 100-109 |
| 2 | Upcoming obligations | 80-89 |
| 3 | Savings opportunities | 60-69 |
| 4 | Collection reminders | 40-49 |
| 5 | Spending warnings | 20-29 |
| 6 | Starter / no-action fallback | 0-9 |

Tie-breakers inside the same band:

1. Confirmed status beats inferred status.
2. Due today beats due later.
3. Earlier due date beats later due date.
4. Existing direct action beats a generic review destination.
5. User-created records beat derived pattern warnings.
6. Deterministic stable sort by candidate `id` breaks final ties.

The engine must be deterministic for the same input data. It should not rotate recommendations randomly.

## Data Sources

The engine must reuse existing in-memory app data only.

Allowed data sources:

| Source | Existing Shape / Builder | Use |
| --- | --- | --- |
| Profile | `profile`, `normalizeCommitments(profile)` | Income presence, salary day, bills, EMI-like commitments, due days |
| Recurring schedules | `recurringSchedules`, `buildFinancialCalendarEvents` | Upcoming bills, salary, recurring obligations |
| Financial state | `calculateFinancialState`, `buildSafeToSpend` outputs | Spending pressure, safe room, usage percent |
| Expenses and activity | `financialEntries`, `todayTransactions`, `expenses` | Spending warning, starter state, recent activity |
| Savings goals | `savingsBuckets` | Goal progress, active target, deadline, contribution destination |
| Planner recommendation | Existing `recommendation` object from `buildRecommendation` | Optional existing purchase/goal context only; do not create new calculations |
| Shared expenses | `sharedGroups`, `reconcileSharedGroup`, `sharedSummary` | Pending collection, pending shared liabilities |
| Money Book | `moneyBookEntries`, `moneyBookSummary` | Money to collect, money to repay, open settlements |
| Reports | `reportHistory` | Starter state only; not a recommendation priority in V1 |
| Current Home helpers | `moneyReminders`, `upcomingMoney`, `smartHomeInsights`, `financialCalendarEvents` | Candidate generation and reasons |

Not allowed:

- New API calls
- New database fields
- New Supabase tables
- New external services
- AI inference
- Chat context
- Bank account scraping
- User-entered transaction text in analytics
- Any financial amount in analytics

## Candidate Generation Rules

1. Build all eligible candidates from existing Home inputs.
2. Drop candidates with missing destinations.
3. Drop candidates with zero or invalid amounts when an amount is required for the action.
4. Drop settled, completed, paused, or inactive records.
5. Drop inferred overdue candidates unless the due state is explicit enough to avoid accusing the user incorrectly.
6. Assign a priority band from the ranking table.
7. Apply tie-breakers.
8. Return only the top candidate.
9. If no candidate remains, return the no-action fallback.

## Recommendation Language Rules

Use:

- Review
- Open
- Add
- Collect
- Continue
- Due soon
- Pending
- Goal
- Saved

Avoid:

- Optimize
- Maximize
- Portfolio
- Returns
- Tax saving
- Credit score
- Guaranteed
- Best loan
- Investment opportunity
- You must

If the engine is unsure, use review language. Example: "Review upcoming EMI" is safer than "Pay EMI now" unless payment status is confirmed.

## No Action Needed State

When no meaningful action is needed, show:

| Field | Value |
| --- | --- |
| Title | Continue current pace |
| Action | View activity |
| Reason | No urgent obligation, collection, savings, or spending warning needs attention today. |
| Destination | Existing Daily Book / Activity surface |
| Priority | 0 |

This keeps Home calm without inventing urgency.

## Edge Cases

| Edge Case | Expected Behavior |
| --- | --- |
| No income, no expenses, no goals | Show starter action, usually "Add first expense". |
| Income exists but no expenses | Show starter action or upcoming obligation if due soon. |
| Multiple obligations due today | Show one candidate using tie-breakers; do not show a list. |
| EMI-like commitment has no due day | Treat as review-only and lower priority inside upcoming obligations. |
| Recurring item is paused | Do not recommend it. |
| Savings goal is fully funded | Do not recommend contribution; optionally show no-action fallback if nothing else exists. |
| Savings goal deadline passed | Show only as overdue if target is incomplete and deadline is explicit. |
| Pending collection and upcoming EMI both exist | Upcoming EMI wins because upcoming obligations rank above collection reminders. |
| Savings opportunity and money to collect both exist | Savings opportunity wins by product priority unless the collection item is also an overdue obligation. |
| Spending pressure and unpaid obligation both exist | Obligation wins; spending warning is last priority. |
| Same candidate appears from multiple sources | Deduplicate by normalized type, destination, due date, and source id. |
| Existing data is stale or offline | Use local data as-is; do not fetch or block. |
| Due status is inferred from old activity only | Avoid overdue wording; use "Review" wording. |
| User clicks but does not complete | Count click, not completion. |
| User completes through another path | Completion may count if the existing completion event happens within a defined window after click. |

## Recommendations That Must Never Appear

The engine must never recommend:

- Investment advice
- Tax advice
- Loan products
- Credit card products
- Debt consolidation products
- Insurance products
- Stock, mutual fund, crypto, gold, or trading actions
- Borrowing more money
- Taking a new EMI
- Increasing credit limits
- Gambling or speculative actions
- Medical, legal, or tax decisions
- Skipping required payments
- Hiding or delaying obligations in a way that could harm the user
- Any action based on external offers or paid placement
- Any recommendation requiring data FBPLY does not already have
- Any recommendation that claims certainty about future outcomes

The engine may help users review their own saved obligations, goals, spending, and collections. It must not tell users what financial product to buy.

## Future Analytics Requirements

No analytics changes are part of this specification phase.

When the engine is implemented later, measurement should remain privacy-friendly and event-based.

Required success metrics:

| Metric | Definition | Notes |
| --- | --- | --- |
| Next Action Click Rate | `next_action_clicked / home_viewed` | Already aligned with current validation dashboard. |
| Next Action Completion Rate | `next_action_completed / next_action_clicked` | Future implementation requirement. Completion must not include amount, name, goal title, or transaction text. |

Future event requirements:

| Event | Trigger | Screen | Privacy Rule |
| --- | --- | --- | --- |
| `next_action_clicked` | User taps the one recommendation card or CTA | `home` | Existing event. No amounts or user text. |
| `next_action_completed` | User completes the destination action after clicking the recommendation | `home` | Future event. No amounts or user text. |

Optional future diagnostic events should use event names only and keep the same analytics payload contract: `event_name`, `timestamp`, `screen`, and `app_version`.

Do not add analytics payload fields such as amount, person, goal name, merchant, note, due date, account, category detail, or recommendation reason.

## Validation Gate

Do not build this engine until validation data shows that users interact with the current Home recommendation.

Minimum evidence before implementation:

1. Home is viewed repeatedly.
2. `next_action_clicked / home_viewed` shows meaningful engagement.
3. Users complete at least some actions after clicking Home recommendations, or completion tracking is explicitly added for the future phase.
4. The founder reviews whether Home recommendations are useful enough to become a product direction.

If validation is weak, improve current Home clarity before building the engine.

## Final Rule

One recommendation only. Never multiple competing recommendations.
