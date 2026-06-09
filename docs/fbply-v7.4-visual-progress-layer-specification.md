# FBPLY V7.4 Visual Progress Layer Specification

Status: specification only  
Scope: product architecture, visual system rules, placement guidance, and future integration notes  
Do not implement in this phase: UI changes, calculation changes, analytics changes, API changes, Supabase changes, route changes, or business logic changes

## Purpose

The Visual Progress Layer should help users understand what is improving, what remains open, and what is ready. It should make FBPLY feel clearer and more premium without turning personal finance into a game.

Progress should answer practical questions:

- How much of the month is left?
- How much room is still available?
- How close is this goal?
- What money is still pending between people?
- Is a report ready enough to generate?
- Where am I in setup?

Progress must not create pressure, shame, streak addiction, leaderboards, badges, rewards, artificial scores, or manipulative urgency.

## A. Progress Inventory

| Progress item | Primary surface | Basis | Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Month progress | Daily | Calendar day within selected/current month | SHOW | Gives time context for spending and remaining month. | Low if based on date utilities only. | Very low; date math only. | Scales across currencies and user types. |
| Remaining month visibility | Daily | Days left, upcoming commitments, safe room | SHOW | Helps users understand what still needs to fit. | Medium because it must align with existing calendar/reminder logic. | Low if derived from already-built reminders. | Scales into recurring bills and future planning. |
| Spending visibility | Daily, Insights | Month-to-date spending and available room | SHOW | Makes current month easier to understand without judgment. | Low-medium because copy and thresholds need consistent ownership. | Low if no new chart dependency is added. | Scales into category and statement review later. |
| Savings goal completion | Tools, Daily preview, Insights | Saved vs target | SHOW | Shows tangible progress toward user-chosen goals. | Low because savings already has progress data. | Very low; simple percentage and bar. | Scales to multiple goal types. |
| Savings remaining amount | Tools, Daily preview | Target minus saved | SHOW | Makes the next step concrete. | Low. | Very low. | Scales to milestones and reminders. |
| Savings next milestone | Tools, Daily preview | Next small reachable amount or contribution | COLLAPSE | Motivates without overwhelming the main screen. | Medium because milestone rules need guardrails. | Low. | Scales to recurring savings later. |
| Borrow repayment completion | Tools, Daily if due | Settled vs pending user-payable money book entries | SHOW when active, HIDE when absent | Clarifies what the user still owes. | Medium because money book states must stay consistent. | Low. | Scales to due dates and reminders. |
| Collection completion | Tools, Daily if due | Settled vs pending receivable money book entries | SHOW when active, HIDE when absent | Clarifies money expected back. | Medium. | Low. | Scales across people-money workflows. |
| Shared settlement completion | Tools, Daily active trips, Reports | Settled vs pending shared settlement rows | SHOW when active | Makes trip/group closure understandable. | Medium because settlements have direction and status. | Low. | Scales to multiple group types. |
| Remaining shared balances | Tools, Reports | Pending recoverable and liability amounts | SHOW when active | Helps users know what remains unresolved. | Low-medium. | Low. | Scales into settlement reports. |
| Month completeness | Insights, Reports | Coverage of current month data | COLLAPSE | Helps users understand report confidence without blocking exports. | Medium because completeness must avoid fake precision. | Low. | Scales to statement/import confidence. |
| Report readiness | Insights, Reports | Minimum meaningful data for report generation | SHOW as compact readiness | Reduces blank or low-value reports. | Medium because readiness rules need product ownership. | Low. | Scales to monthly, trip, settlement, and statement reports. |
| Setup progress | Onboarding only | Current setup step | KEEP, simplify | Helps orientation during setup. | Low. | Very low. | Scales only if setup stays short. |
| Activation checklist progress | Daily secondary | First-use actions completed | COLLAPSE after early use | Helps new users discover value, then gets out of the way. | Medium because it depends on activation item ownership. | Low. | Should not scale into gamification. |

## B. Daily Progress

Daily progress should show the month as a living context, not as a performance target.

| Item | Placement | Visual style | Percentage visibility | Recommendation | User value | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Month progress | Daily first screen, below quick entry or beside Available | Thin horizontal bar with "X days left" copy | SHOW percent only in aria label or small secondary text | SHOW | Connects today's entry to the month timeline. | Helps users pace without feeling scored. | Low; uses calendar date only. | Very low. | Works for any month and locale. |
| Remaining month visibility | Daily first screen, near Available/Protected | Compact indicator row: "Days left", "Upcoming", "Available" | HIDE percent; show days and amount/context instead | SHOW | Makes the remaining month concrete. | Helps planning before spending. | Medium; must reuse existing upcoming money/calendar logic. | Low. | Can absorb recurring bills and reminders. |
| Spending visibility | Daily secondary section and Insights preview | Small bar comparing spent/fixed/available, not a large chart | COLLAPSE percent unless user opens detail | SHOW | Shows where money has gone this month. | Improves understanding without making Daily heavy. | Medium; copy must avoid "over/under performance" language. | Low if CSS-only bars. | Scales to categories and statement rows. |
| Daily activation progress | Daily lower secondary section | Checklist with compact bar only for new users | SHOW until useful, then COLLAPSE/HIDE | COLLAPSE | Helps first-use discovery. | Supports onboarding without permanent pressure. | Medium; needs criteria for hiding. | Low. | Should not add endless tasks. |

Daily rules:

- Do not show "you are behind" unless a real obligation is uncovered.
- Prefer "12 days left" over "60% complete" in primary Daily surfaces.
- Show progress only when it helps a decision today.
- Keep Daily bars thin and calm. No celebratory animation loops.

## C. Savings Progress

Savings progress is the strongest fit for visible completion because it is tied to user-selected goals.

| Item | Placement | Visual style | Percentage visibility | Recommendation | User value | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Goal completion progress | Savings manager in Tools; compact preview on Daily/Insights | Horizontal bar inside each goal card | SHOW | SHOW | Makes goal state immediately readable. | Encourages clarity from user-owned goals. | Low; data already exists. | Very low. | Scales to multiple goals. |
| Aggregate savings progress | Top of Savings manager | Compact summary bar and saved/remaining numbers | SHOW | SHOW | Gives a quick overview across all active goals. | Reduces need to inspect every goal. | Low. | Very low. | Scales until many goals need grouping. |
| Remaining amount | Goal card and summary | Text metric, not a separate bar | SHOW amount, not percent | SHOW | Shows what is left to fund. | Makes action concrete. | Low. | Very low. | Works across currencies. |
| Next milestone | Goal card details or summary helper | Small text chip: "Next: add Rs X" | HIDE percent | COLLAPSE | Gives an achievable next step. | Motivates without pressure. | Medium; milestone rules must be conservative. | Low. | Can later connect to recurring savings. |
| Deadline progress | Only when deadline exists | Compact date status, no countdown panic | HIDE percent by default | COLLAPSE | Helps time-bound goals. | Prevents surprise deadlines. | Medium; needs date handling. | Very low. | Scales to reminders. |

Savings rules:

- Show progress only for goals the user created.
- Do not infer a goal from leftover money.
- Do not use "streak" or "level" language.
- If target is missing, show "Set target" rather than 0%.

## D. Borrow/Lend Progress

Borrow/Lend progress should focus on closure and clarity between people. It should not judge debt.

| Item | Placement | Visual style | Percentage visibility | Recommendation | User value | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Repayment completion | People/Borrow-Lend section in Tools; Daily if due | Compact bar or segmented indicator: settled vs pending | COLLAPSE percent; show "X open" and amount | SHOW when active | Clarifies what the user still needs to repay. | Reduces missed obligations. | Medium; depends on accurate status. | Low. | Scales to due dates and reminders. |
| Collection completion | People/Borrow-Lend section in Tools; Daily if due | Compact bar or count chip: received vs pending | COLLAPSE percent; show amount and count | SHOW when active | Clarifies what the user expects back. | Reduces forgotten receivables. | Medium. | Low. | Scales to contacts and recurring lending. |
| Individual entry status | Money Book entry card | Status badge: Pending, Settled, Reopened | HIDE percent | SHOW | Makes each record's state obvious. | Helps quick review. | Low. | Very low. | Scales to more entry states. |
| Empty state | Money Book when no entries | No progress bar | HIDE | HIDE | Avoids implying perfect behavior when no data exists. | Keeps empty state calm. | Low. | Very low. | Prevents false completion. |

Borrow/Lend rules:

- Absence of borrow/lend data is not 100% progress.
- Do not use debt-shaming labels.
- Prefer "1 open" or "Rs X pending" over "failed" or "incomplete".
- Settlement actions should update status, not trigger celebration mechanics.

## E. Shared Expense Progress

Shared expense progress should explain group closure: what has been paid, what remains open, and whether the group can be considered settled.

| Item | Placement | Visual style | Percentage visibility | Recommendation | User value | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Group settlement completion | Shared group card in Tools; active trip preview on Daily | Horizontal settled/pending bar | SHOW only as secondary text, such as "80% settled" | SHOW when group has settlements | Shows whether a group is nearly closed. | Helps users finish shared trips. | Medium; settlement math must remain trusted. | Low. | Scales to many group types. |
| Remaining balances | Shared group details and Reports | Amount chips: to receive, to pay, pending | HIDE percent | SHOW | Makes the next action clear. | Reduces confusion about who owes whom. | Low-medium. | Low. | Scales into settlement reports. |
| Settlement row status | Settlement list | Status badge: Pending, Received, Paid | HIDE percent | SHOW | Makes each row actionable. | Helps group reconciliation. | Low. | Very low. | Scales to audit/history. |
| Fully settled group | Shared group card | Calm success status, no animation loop | HIDE percent after completion | COLLAPSE | Communicates closure without gamification. | Gives confidence and reduces clutter. | Low. | Very low. | Scales to archived groups later. |
| No shared groups | Shared empty state | No progress | HIDE | HIDE | Avoids fake progress. | Keeps Tools simple. | Low. | Very low. | Prevents misleading ratings. |

Shared expense rules:

- Do not show settlement progress until at least one payment creates a real settlement context.
- Direction matters: pending receive and pending pay are different.
- Completion should mean saved settlement rows are marked paid/received or have no remaining amount.
- Keep group progress practical, not celebratory.

## F. Reports Progress

Reports progress should communicate readiness and confidence, not force report generation.

| Item | Placement | Visual style | Percentage visibility | Recommendation | User value | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Month completeness | Insights reports drawer | Compact readiness row: tracked days, categories, people-money included | COLLAPSE percent | COLLAPSE | Explains how complete the monthly view is. | Prevents over-trusting sparse reports. | Medium; must define completeness carefully. | Low. | Scales to better report confidence. |
| Report readiness | Reports section and export area | Status badge: Ready, Learning, Needs review | HIDE percent | SHOW | Helps users know if export will be useful. | Reduces blank report frustration. | Medium. | Low. | Scales to monthly/trip/settlement/statement reports. |
| Statement review readiness | Statement analysis sheet/results | Review count and confidence copy | SHOW confidence only when parser already provides it | SHOW in statement workflow | Helps users verify imported rows. | Builds trust in reports. | Medium; parser confidence already exists. | Low if no new chart. | Scales to import tools. |
| Export preparation | Report buttons during generation | Button loading state only | HIDE percent | SHOW when active | Confirms action is in progress. | Reduces repeated clicks. | Low. | Very low. | Scales to native sharing/export. |
| Report history completeness | Report history card | Count and type badges | HIDE percent | SHOW | Shows generated artifacts. | Helps retrieval. | Low. | Low. | Scales to report library. |

Reports rules:

- Report readiness must never block export unless existing requirements already block it.
- Do not invent a "report score".
- Sparse data should say "Learning" or "Needs more activity", not "bad report".
- Keep heavy chart dependencies action-gated.

## G. Onboarding Progress

Existing onboarding has two layers:

1. Setup progress: a 7-step setup flow with a step indicator.
2. Post-setup walkthrough/activation checklist: guide steps and activation progress on Daily.

| Item | Current role | Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- | --- |
| Setup step indicator | Shows where the user is in initial setup. | KEEP | Reduces uncertainty during setup. | Low. | Very low. | Good only if setup remains short. |
| Seven setup steps | Captures income, commitments, EMI, optional goal, preference, review. | SIMPLIFY copy, not structure in this spec | Keeps setup understandable. | Low-medium if copy only later. | No impact in this spec. | Can scale if optional steps remain skippable. |
| Skip buttons | Let users avoid incomplete data pressure. | KEEP | Reduces friction and avoids forced disclosure. | Low. | Very low. | Important for local-first use. |
| Setup review screen | Summarizes entered data. | KEEP | Builds confidence before app entry. | Low. | Very low. | Scales to backup confirmation later. |
| Walkthrough steps | Teaches navigation after setup. | SIMPLIFY | Prevents overlay fatigue. | Medium if steps reference old labels. | Low. | Should not grow beyond 3-4 steps. |
| Activation checklist progress | Shows first-use completion on Daily. | COLLAPSE after enough activity | Useful early, clutter later. | Medium; needs hide criteria. | Low. | Must not become gamification. |
| Percentage on activation | Shows complete percent. | COLLAPSE or replace with count | Reduces pressure. | Low. | Very low. | Better for long-term calm. |

Onboarding rules:

- Keep setup progress because it orients users.
- Simplify walkthrough because V7 already has clearer Daily, Insights, Tools, Profile labels.
- Remove or hide activation progress once the user has completed enough core actions.
- Never add badges, streaks, trophies, or celebratory reward loops.

## H. Visual Language

The progress layer should feel quiet, premium, and operational. It should be a finance clarity language, not a game layer.

### Progress Bars

Use for:

- Month progress.
- Savings goals.
- Shared settlement completion.
- Activation/setup only during onboarding.

Rules:

- Thin bars, calm color, no rainbow fills.
- Always pair with a plain-language label.
- No pulsing or looping animation.
- Do not show bars for missing data.

Impact:

| Dimension | Impact |
| --- | --- |
| User impact | Familiar and scannable without feeling like a game. |
| Maintenance impact | Low if implemented as one shared primitive later. |
| Performance impact | Very low with CSS only. |
| Scaling impact | High if labels and variants stay constrained. |

### Rings

Use sparingly.

Recommended usage:

- COLLAPSE for Money Score or high-level Insights only if future design needs a compact circular status.
- HIDE for Daily spending, borrow/lend, shared expenses, and reports.

Rules:

- Rings can feel like scores, so avoid them for obligations.
- If used, never imply credit score or financial status.

Impact:

| Dimension | Impact |
| --- | --- |
| User impact | Can be premium but risks false-score perception. |
| Maintenance impact | Medium because ring semantics need strict ownership. |
| Performance impact | Low if CSS/SVG only. |
| Scaling impact | Medium; overuse weakens clarity. |

### Compact Indicators

Use for:

- Days left.
- X open settlements.
- Ready/Learning/Needs review.
- X reports saved.
- X groups active.

Rules:

- Prefer compact indicators when exact progress would be misleading.
- Use badges for state, not achievement.

Impact:

| Dimension | Impact |
| --- | --- |
| User impact | Gives quick state without clutter. |
| Maintenance impact | Low; aligns with existing StatusBadge patterns. |
| Performance impact | Very low. |
| Scaling impact | High across all V7 tabs. |

### Percentage Visibility

| Progress type | Percentage recommendation | Reason |
| --- | --- | --- |
| Month progress | COLLAPSE | Days left is more useful and less pressuring. |
| Spending visibility | COLLAPSE | Percent can feel judgmental without context. |
| Savings goal completion | SHOW | User chose the goal and percent is intuitive. |
| Borrow/lend repayment | COLLAPSE | Counts and amounts are clearer than percent. |
| Collection progress | COLLAPSE | Pending amount matters more than percent. |
| Shared settlement completion | SHOW secondary only | Helpful for trip closure, but not primary. |
| Report readiness | HIDE | Readiness should be a state, not a score. |
| Setup progress | SHOW step count, HIDE percent | Step count is clearer than percent. |
| Activation checklist | COLLAPSE/HIDE | Avoid long-term pressure. |

## I. Mobile Placement

Mobile progress must be more compact than desktop. The first viewport should still prioritize quick money entry and available amount.

| Surface | Mobile placement | Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- | --- |
| Daily month progress | Under quick entry or Available, one thin row | SHOW | Gives context without pushing entry down too far. | Low. | Very low. | Scales well. |
| Daily spending visibility | In "More Daily Details" or Insights preview | COLLAPSE | Keeps first viewport clean. | Low. | Low. | Scales to charts later. |
| Savings progress | Goal cards in Tools; compact one-goal preview if promoted | SHOW | Useful and readable on mobile. | Low. | Very low. | Scales with card stacking. |
| Borrow/lend progress | People priority card and Money Book details | SHOW when active | Shows what is pending without extra navigation. | Medium. | Low. | Scales to due reminders. |
| Shared expense progress | Active trip card and shared group detail | SHOW when active | Helps close group balances. | Medium. | Low. | Scales to multiple groups if collapsed. |
| Report readiness | Reports drawer header and export section | SHOW compact state | Explains readiness before export. | Medium. | Low. | Scales across report types. |
| Setup progress | Top of setup screen | KEEP | Helps orientation. | Low. | Very low. | Works if setup stays concise. |
| Activation checklist | Below core Daily content; hidden after early use | COLLAPSE/HIDE | Avoids clutter. | Medium. | Low. | Prevents gamified expansion. |

Mobile rules:

- Do not use wide multi-metric progress rows in the first viewport.
- Prefer one primary indicator per card.
- Details can expand, but collapsed state must still explain the most important remaining item.
- No horizontal progress component should cause overflow.

## J. Future Integration With Money Score

Visual Progress should feed understanding around Money Score, but it should not become Money Score.

| Integration point | Recommendation | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- |
| Money Score explanation | Use progress facts as reasons, such as "All upcoming bills are covered" or "One settlement is still open." | Makes score explainable. | Medium; reason selection needs ownership. | Low. | High. |
| Money Score factors | Use progress categories as factor summaries: coverage, savings, repayment, collection, stability. | Helps users understand why the score changed. | Medium. | Low. | High. |
| Score display | Keep score state separate from progress bars. | Prevents artificial scoring pressure. | Low. | Very low. | High. |
| Learning state | Use missing progress data to explain why score is Learning. | Reduces confusion for new users. | Low-medium. | Low. | High. |
| Improvement messaging | Reference real progress changes only. | Encourages understanding, not chasing points. | Medium. | Low. | High. |

Money Score integration rules:

- Progress can explain a score, but must not inflate it.
- Do not add artificial progress just to make Money Score look better.
- If a progress signal is missing, say it is missing instead of assuming 100%.
- Prefer one reason at a time.

## Final Guardrails

| Rule | Meaning | User impact | Maintenance impact | Performance impact | Scaling impact |
| --- | --- | --- | --- | --- | --- |
| Truthful | Show only progress derived from real app state. | Builds trust. | Requires clear data ownership. | Low. | Essential. |
| Explainable | Every progress signal needs a plain-language reason. | Reduces anxiety. | Medium copy governance. | Low. | Essential. |
| Lightweight | Use CSS bars, badges, and text before charts. | Keeps screens fast and calm. | Low. | Very low. | Strong. |
| Premium | Calm spacing, restrained motion, consistent labels. | Makes finance feel clear and cared for. | Medium design-system ownership. | Low. | Strong. |
| Non-gamified | No streaks, trophies, points, badges, or levels. | Prevents pressure. | Low if enforced early. | Very low. | Essential. |
| Non-manipulative | Do not create urgency unless a real due item exists. | Protects user trust. | Medium product review. | Low. | Essential. |

Final rule: progress should help users understand improvement, not create pressure.
