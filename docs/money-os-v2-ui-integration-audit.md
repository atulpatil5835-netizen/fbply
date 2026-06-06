# FBPLY Money OS V2 UI Integration Audit

Date: 2026-06-06

## Scope Guard

This is an integration audit only. No existing screen should be redesigned during Phase 1. No routes, data fetching, auth, state management, reports, calculations, Supabase code, or persistence behavior should change.

Money OS V2 should remain opt-in and screen migration should be incremental. The current screen files do not import `src/design-system` yet.

## Current Product Surface Map

| Product area | Current implementation |
| --- | --- |
| Home | `src/screens/TodayScreen.jsx`, rendered when `activeTab === 'home'` in `src/App.jsx` |
| Daily Book | `src/screens/DailyBookScreen.jsx`, rendered at top of the History tab |
| Borrow/Lend | `MoneyBookPanel`, `MoneyBookEntryCard`, and `MoneyBookEntryModal` inside `src/screens/ActivityScreen.jsx` |
| Shared Expenses | `src/screens/SharedExpenseScreen.jsx`, mounted inside `ActivityScreen` |
| Trips | Shared expense groups/payments in `SharedExpenseScreen`, plus Home active-trip cards and report export flows |
| Savings Goals | `src/screens/GoalsScreen.jsx` and `src/components/SavingsBucketsManager.jsx` |
| Reports | `src/components/ReportsScreen.jsx`, `src/components/ReportCharts.jsx` |
| Statement Analysis | `src/components/StatementUploadSheet.jsx`, lazy-loaded from Reports |
| Profile | `ProfileScreen`, `ProfileMenuSheet`, `CommitmentEditorSheet`, `VoiceExpenseBox`, and quick profile forms in `src/App.jsx`; `src/screens/SettingsScreen.jsx`; `src/components/ProfileSettingsControls.jsx`; `src/components/RecurringScheduleManager.jsx` |

## Component Mapping Legend

| Current UI pattern | Money OS V2 target |
| --- | --- |
| Screen heading / section heading rows | `PageHeader`, `SectionHeader` |
| Generic card, panel, summary block | `MoneyCard` |
| Numeric summary card | `StatCard` |
| Clickable navigation/discovery card | `ActionCard` |
| Insight/advisory/story card | `InsightCard` |
| Timeline rows and dated activity groups | `TimelineCard` or `MoneyCard` with timeline content |
| Status labels, pills, chips, confidence labels | `StatusBadge` |
| Existing `primary-button` | `PrimaryButton` |
| Existing `ghost-button`, secondary text buttons | `SecondaryButton` or icon button pattern |
| Modal/sheet using `AppModal` or custom backdrop/sheet | `BottomSheet` |
| Existing `EmptyState` and empty custom panels | `EmptyState` |
| Inline success/error confirmation messages | `SuccessState` for completion blocks; `StatusBadge` for compact state |
| `CurrencyInput` | `AmountInput` |
| `plain-input` text field | `TextInput` |
| `month-select` / category selects | `CategorySelector` or native select wrapped in V2 field shell |
| Date input | `DateSelector` |
| Note or multiline input | `NotesInput` |
| Skeleton cards, custom statement skeletons, coin loader | `FLoader` |

## Screen Audits

### 1. Home

Implementation: `src/screens/TodayScreen.jsx`

Existing UI inventory and V2 mapping:

| Existing element | Current classes / location | V2 mapping |
| --- | --- | --- |
| Smart page header | `today-v2-header`, `today-header-copy`, `today-header-actions` | `PageHeader` with `StatusBadge` action |
| Status pill | `today-status-pill` | `StatusBadge` |
| Available money hero | `today-available-card premium-money-hero` | `MoneyCard` or hero-flavored `StatCard` |
| Protected / used metrics | `hero-money-metrics` | `StatCard` pair inside card content |
| Activation checklist | `activation-checklist-card`, `activation-step-list` | `MoneyCard`; rows can become `ActionCard`; completed labels become `StatusBadge` |
| Activation CTA | `primary-button activation-primary-action` | `PrimaryButton` |
| Intent shortcuts | `intent-shortcut-panel`, `intent-shortcut-grid` buttons | `ActionCard` grid |
| Action chips | `today-action-chips` buttons | `SecondaryButton` or compact action chip primitive later |
| Financial pulse strip | `financial-pulse-strip`, `pulse-chip` | `TimelineCard` or horizontal `ActionCard`; live count becomes `StatusBadge` |
| Future snapshot | `future-snapshot-section`, `future-snapshot-grid`, `future-event-row` | `MoneyCard`, `StatCard`, `TimelineCard` |
| Money story | `today-insight-card daily-money-story` | `InsightCard` |
| Month replay | `month-replay-card`, `month-replay-grid` | `MoneyCard` with expandable details; inner values as `StatCard` style |
| Latest report | `latest-report-card` | `ActionCard` or `MoneyCard` plus `SecondaryButton` |
| Money feed | `today-feed-section`, `today-feed-item` | `TimelineCard` |
| Active trips preview | `premium-trip-section`, `trip-status-card` | `ActionCard` or `MoneyCard`; progress/status as `StatusBadge` |
| Habit strip | `today-habit-strip` | `StatusBadge` group |

Existing buttons: primary activation CTA, intent buttons, action chips, pulse chips, latest-report `text-action-button`, active-trip `text-action-button`, `trip-status-card` buttons.

Existing badges: `today-status-pill`, `reminder-state-pill active`, `pulse-chip` tone classes, incoming/outgoing labels, habit strip tags.

Existing loaders: none inside `TodayScreen`; Home uses `ScreenFallback` in `App.jsx` while lazy-loading.

Existing inputs: none in Home.

Existing empty states: no formal empty state; absence hides sections. Activation guide acts as a first-run state.

Existing success states: none in Home.

Safe migration difficulty: High.

Risks:
- Home is the densest cross-module composition and links into Savings, Trips, Borrow/Lend, Reports, Profile, and Quick Add.
- Many elements are conditionally hidden rather than rendered as empty states. Replacing wrappers can alter perceived onboarding.
- Several buttons trigger analytics and navigation callbacks; migration must preserve every handler and event payload.

Dependencies:
- Stable `StatusBadge`, `ActionCard`, `TimelineCard`, and `StatCard` patterns from simpler screens first.
- Trip and Money Book visual language should be settled before Home previews adopt it.
- App-level `FLoader` migration should happen before replacing Home fallback.

Recommended move:
- Migrate last among primary content screens.
- Start only with passive containers: header, status pill, money story, latest report.
- Leave action chips, activation guide, and pulse rail until the same components are proven in Daily Book, Activity, and Reports.

### 2. Daily Book

Implementation: `src/screens/DailyBookScreen.jsx`

Existing UI inventory and V2 mapping:

| Existing element | Current classes / location | V2 mapping |
| --- | --- | --- |
| Page heading | `screen-heading daily-book-heading` | `PageHeader` |
| Add Expense button | `primary-button small-button daily-book-add-button` | `PrimaryButton` |
| Summary panel | `daily-book-summary-panel` | `MoneyCard` or `StatCard` |
| Date pill | `daily-book-date-pill` | `StatusBadge` |
| Range filters | `activity-filter-row daily-book-filter-row` | segmented control pattern using V2 buttons or future V2 segmented primitive |
| Custom range form | `daily-book-custom-range` date inputs + `ghost-button` | `DateSelector`, `SecondaryButton` |
| Insight cards | `daily-book-insight-card` | `StatCard` |
| History panel | `daily-book-history-panel` | `MoneyCard` |
| Empty range state | existing `EmptyState` | V2 `EmptyState` |
| Day groups | `daily-book-day-group` | `TimelineCard` or `MoneyCard` sections |
| Expense rows | `daily-book-expense-row` | `TimelineCard` item rows |

Existing buttons: Add Expense, filter buttons, Apply custom range.

Existing badges: active filter state, date pill, insight tone classes.

Existing loaders: none inside screen; History tab lazy fallback uses `ScreenFallback`.

Existing inputs: two native date inputs for custom range.

Existing empty states: `EmptyState` for no expenses in selected range.

Existing success states: none.

Safe migration difficulty: Low.

Risks:
- Filter row active state must preserve `aria-pressed`.
- Empty-state CTA must keep existing tracking and `openAddSheet('expense')` behavior.
- Date range inputs must preserve current string state and no automatic validation changes.

Dependencies:
- V2 form fields should support controlled date inputs.
- V2 `EmptyState` should match current action shape cleanly.

Recommended move:
- First content screen migration candidate.
- Migrate heading, summary panel, insight cards, empty state, and buttons.
- Leave grouped row markup for a second pass if needed.

### 3. Borrow/Lend

Implementation: `MoneyBookPanel`, `MoneyBookEntryCard`, `MoneyBookEntryModal` in `src/screens/ActivityScreen.jsx`

Existing UI inventory and V2 mapping:

| Existing element | Current classes / location | V2 mapping |
| --- | --- | --- |
| Money Book section header | `money-book-header` | `SectionHeader` |
| Add Entry button | `primary-button small-button` | `PrimaryButton` |
| Summary grid | `money-book-summary-grid`, `history-summary-card` | `StatCard` |
| Empty entry CTA | `money-book-empty` button | `EmptyState` or `ActionCard` |
| Entry card | `money-book-entry pending/settled given/taken` | `MoneyCard` |
| Direction label | `money-book-direction` | `StatusBadge` |
| Settled/pending amount text | `money-book-entry-amount` | `StatusBadge` for status, text content preserved |
| Row actions | `text-action-button`, `icon-button mini-icon-button` | `SecondaryButton`, icon button pattern |
| Entry modal | `AppModal`, `editor-sheet money-book-modal` | `BottomSheet` |
| Given/Taken toggle | `segmented-control money-book-kind-toggle` | keep as segmented control until V2 adds one, or compose V2 buttons |
| Person, date, due date, note fields | `plain-input` | `TextInput`, `DateSelector`, `NotesInput` |
| Amount/interest | `CurrencyInput` | `AmountInput` |
| Form errors | `field-helper`, `form-message` | V2 field errors; compact status/error surface |

Existing buttons: Add Entry, empty CTA, Settle/Reopen, edit, delete, modal close, given/taken toggle, Cancel, Save.

Existing badges: Given/Taken direction, pending/settled class state, summary tones.

Existing loaders: none.

Existing inputs: text, amount, date, interest, due date, note.

Existing empty states: custom clickable `money-book-empty`.

Existing success states: none; save closes modal.

Safe migration difficulty: Medium-Low.

Risks:
- Entry modal validation calls `focusInvalidField`; field wrappers must keep focusable invalid inputs discoverable.
- Settle/Reopen is business-sensitive. Button swap must preserve exact `onToggleSettled(entry.id)` behavior.
- Current empty state is a button, not a static state. V2 mapping must remain keyboard-accessible and clickable.

Dependencies:
- `BottomSheet` should be proven in a low-risk modal before replacing `AppModal` here.
- V2 form primitives must support validation classes and helpers.

Recommended move:
- Migrate after Daily Book.
- Start with summary cards and entry cards.
- Migrate modal only after form primitives are visually and accessibility-tested.

### 4. Shared Expenses

Implementation: `src/screens/SharedExpenseScreen.jsx`, mounted by `ActivityScreen`

Existing UI inventory and V2 mapping:

| Existing element | Current classes / location | V2 mapping |
| --- | --- | --- |
| Section heading | `screen-heading compact-heading` | `SectionHeader` |
| Group creation form | `shared-form` | `MoneyCard` + V2 form primitives |
| Identity note | `shared-identity-note` | `InsightCard` or `MoneyCard` with icon |
| Group/trip name input | `plain-input` | `TextInput` |
| Owner name input | `plain-input` | `TextInput` |
| Participants input | `plain-input` | `TextInput` or future tag input |
| Create group button | `primary-button full` | `PrimaryButton` |
| Form messages | `form-message`, `form-message-error` | `SuccessState` for success, field/error message for errors |
| Metrics strip | `shared-metrics-strip` | `StatCard` grid |
| Empty shared list | existing `EmptyState` | V2 `EmptyState` |
| Shared group card | `shared-card` | `MoneyCard` |
| Participant chips | `participant-chip-row` | `StatusBadge` group |
| Download/delete actions | `icon-button mini-icon-button` | icon button pattern |
| Participant payment rows | `participant-expense-row` forms | `MoneyCard` row or V2 form row |
| Purpose input | `plain-input` | `TextInput` |
| Payment amount | `CurrencyInput` | `AmountInput` |
| Participant Add button | `primary-button participant-add-button` | `PrimaryButton` |
| Payment list | `trip-payment-list`, `trip-payment-row` | `TimelineCard` |
| Shared card summary | `shared-card-summary` | `StatCard` grid |
| Settlement list | `settlement-list`, `settlement-item`, `settlement-status` | `TimelineCard` rows + `StatusBadge` |

Existing buttons: Create group, empty-state focus CTA, download PNG, remove group, per-participant Add, Mark received/paid.

Existing badges: participant chips, settlement status, received class, metrics strip labels.

Existing loaders: none; PNG generation only updates message after async completion.

Existing inputs: text fields for group/owner/participants/purpose; amount fields for payments.

Existing empty states: `EmptyState` for no groups; inline `settlement-empty` for no settlements.

Existing success states: inline success `form-message` for group created, payment added, PNG ready.

Safe migration difficulty: Medium.

Risks:
- Trips and Shared Expenses are the same data model. Visual migration must not imply a separate trip entity.
- Form validation is nested per participant and uses draft keys. Wrappers must not disrupt per-row state.
- PNG export action is asynchronous but not a loader today; replacing feedback should not add extra data work.

Dependencies:
- Borrow/Lend modal/form migration should validate the form primitive strategy first.
- Trip naming and settlement status badge semantics should be defined before migrating settlement rows.

Recommended move:
- Migrate after Borrow/Lend.
- Start with static group cards, metrics strip, and empty state.
- Migrate nested participant payment forms after the simple group form is stable.

### 5. Trips

Implementation: no dedicated route. Trips are shared expense groups in `SharedExpenseScreen`, surfaced in `TodayScreen` active trips, `NotificationCenter`, and report export prompts.

Existing UI inventory and V2 mapping:

| Existing element | Current classes / location | V2 mapping |
| --- | --- | --- |
| Trip/group creation | `shared-form` | `MoneyCard` + V2 form primitives |
| Trip group card | `shared-card` | `MoneyCard` |
| Participant chips | `participant-chip-row` | `StatusBadge` |
| Payment rows | `trip-payment-list`, `trip-payment-row` | `TimelineCard` |
| Settlement rows | `settlement-item`, `settlement-status` | `TimelineCard` + `StatusBadge` |
| Home active-trip preview | `premium-trip-section`, `trip-status-card` | `ActionCard` or `MoneyCard` |
| Report prompts for missing trip/payment | `report-export-guidance` | `InsightCard` + `PrimaryButton`/`SecondaryButton` |
| Notification active trip card | `notification-card`, `notification-type` | `ActionCard` + `StatusBadge` |

Existing buttons: trip group creation, trip card open, download PNG, remove group, mark settlement, report prompt action.

Existing badges: participant chips, pending/paid settlement labels, Home trip pending/settled text, notification type.

Existing loaders: none specific to trip calculations.

Existing inputs: same as Shared Expenses.

Existing empty states: shared-group empty state; settlement-empty inline state; report prompt when no trip exists for export.

Existing success states: group created, payment added, PNG ready; settlement transitions use status labels.

Safe migration difficulty: Medium.

Risks:
- Trip UI must follow Shared Expense migration, because it reuses the same source of truth.
- Report export prompts depend on route-target navigation into the Activity shared section.
- Home trip cards should not migrate before shared card/status semantics are established.

Dependencies:
- Shared Expenses V2 card/status mapping.
- Reports export guidance mapping.
- Home action-card pattern.

Recommended move:
- Do not migrate Trips separately before Shared Expenses.
- Treat Trips as a named variant of Shared Expense UI.
- Migrate Home trip preview only after Shared Expenses and report prompt styles are complete.

### 6. Savings Goals

Implementation: `src/screens/GoalsScreen.jsx`, `src/components/SavingsBucketsManager.jsx`

Existing UI inventory and V2 mapping:

| Existing element | Current classes / location | V2 mapping |
| --- | --- | --- |
| Page heading | `screen-heading goals-heading` | `PageHeader` |
| Buy safely section title | `planner-section-title` | `SectionHeader` |
| Planner reality card | `planner-reality-card` | `MoneyCard` + `StatCard` rows |
| Money pressure pill | `simulation-pill` | `StatusBadge` |
| Goal flow card | `planner-goal-card goal-flow-card` | `MoneyCard` |
| Goal step rows | `goal-step-row`, `goal-step-index` | `MoneyCard` content or future stepper primitive |
| Goal type buttons | `goal-type-strip` | `ActionCard`/segmented control |
| Price/savings inputs | `CurrencyInput` | `AmountInput` |
| Timeline buttons | `timeline-control compact-timeline-control` | segmented control pattern |
| Optional details button | `ghost-button small-button` | `SecondaryButton` |
| Goal name input | `input-with-icon planner-search` | `TextInput` with icon support |
| Empty recommendation | `planner-empty-card` | `EmptyState` or `InsightCard` |
| Recommendation summary | `planner-summary-card` | `InsightCard` or `MoneyCard` |
| Details panel | `planner-details-panel` | `MoneyCard` with native details retained |
| Finance structure, waiting, simulation, guidance, ownership path cards | multiple planner cards | `MoneyCard`, `InsightCard`, `StatCard` |
| Savings manager header | `section-heading-row` | `SectionHeader` |
| Add goal button | `ghost-button small-button` | `SecondaryButton` |
| Bucket editor | `bucket-editor` | `MoneyCard` + V2 fields |
| Bucket card | `bucket-card` | `StatCard`/`MoneyCard` |
| Bucket progress | `bucket-progress` | keep native progress markup inside `MoneyCard` |
| Bucket empty state | existing `EmptyState` | V2 `EmptyState` |

Existing buttons: goal type buttons, timeline buttons, optional details, add goal, remove goal.

Existing badges: `simulation-pill`, step index, mini labels, bucket progress state.

Existing loaders: none; planner calculation is synchronous.

Existing inputs: Amount, current savings, optional goal name, bucket name, saved/target/monthly contribution, due day, deadline.

Existing empty states: planner empty card, bucket `EmptyState`.

Existing success states: none.

Safe migration difficulty: Medium.

Risks:
- Planner flow has progressive disclosure based on `hasPlannerPrice`; component swaps must keep hidden/revealed behavior.
- Bucket editor updates state on every keystroke. V2 fields must not debounce or normalize differently.
- `SavingsBucketsManager` is reused inside Profile, so migrating it affects two product areas.

Dependencies:
- AmountInput and TextInput must be stable.
- Shared `StatusBadge` tone names should cover planner pressure states.

Recommended move:
- Migrate after Daily Book and Borrow/Lend form primitives are validated.
- Start with `SavingsBucketsManager` because it is smaller and reusable.
- Then migrate planner cards and summary states.

### 7. Reports

Implementation: `src/components/ReportsScreen.jsx`, `src/components/ReportCharts.jsx`

Existing UI inventory and V2 mapping:

| Existing element | Current classes / location | V2 mapping |
| --- | --- | --- |
| Page heading | `screen-heading` | `PageHeader` |
| Analyze button | `report-import-button` | `PrimaryButton` or compact action button |
| Month selector | `month-select compact-month-select` | V2 select field |
| Statement discovery card | `statement-discovery-card` | `ActionCard` |
| Professional export panel | `professional-export-panel` | `MoneyCard` |
| Template selector | `report-template-select`, `month-select` | V2 select field |
| Report output value tags | `report-value-grid` | `StatusBadge` group |
| Export buttons | `action-button` | `PrimaryButton`/`SecondaryButton`; loading prop can replace Preparing text |
| Report export guidance | `report-export-guidance` | `InsightCard` + V2 buttons |
| Report history locker | `report-history-locker`, `report-history-row` | `MoneyCard` + `TimelineCard` rows |
| Report history empty card | `report-history-empty-card` | `EmptyState` or `ActionCard` |
| Advisory card | `report-advisory-card` | `InsightCard` |
| Story card | `report-story-card`, `report-story-row` | `InsightCard` or `TimelineCard` |
| Details panel | `report-details-panel` | `MoneyCard` with native details retained |
| Snapshot card | `report-snapshot-card` | `MoneyCard` + `StatCard` grid |
| Report section cards | `report-section-card` variants | `MoneyCard` |
| Direction/shared/money-book report cards | report section variants | `StatCard` grids inside `MoneyCard` |
| Chart cards | `chart-card report-mix-card`, `report-trend-card` | `MoneyCard`; chart content stays unchanged |
| Chart empty state | `report-empty-chart` | V2 `EmptyState` compact variant |
| Report confidence labels | `report-confidence` | `StatusBadge` |
| Category legend buttons | `legend-grid compact-legend` | segmented/action button pattern |
| App report fallback | `ReportsFallback` skeleton cards in `App.jsx` | `FLoader` or V2 loading surface |

Existing buttons: Analyze, statement discovery action, monthly/trip/settlement export, report prompt action/later, redownload/delete, details toggles, chart legend buttons, bottom export PDF/CSV.

Existing badges: report confidence, history count, report value grid tags, export preparing text, category legend active state.

Existing loaders: `ReportsFallback`, `ChartDetailsFallback`, `StatementUploadFallback`, export button Preparing text.

Existing inputs: month selector, template selector.

Existing empty states: report history empty card, chart empty states, story fallback row.

Existing success states: no formal success state; report history row appears after generation; export unlock status lives in `RewardedExportModal` in `App.jsx`.

Safe migration difficulty: Medium-High.

Risks:
- Reports mix many lazy boundaries, export states, and report-type prompts.
- Export buttons are disabled by `isExportingPdf`; V2 loading buttons must preserve disabled behavior and type-specific labels.
- Chart cards use `recharts`; wrapping must not resize charts unpredictably.

Dependencies:
- `FLoader` migration for lazy fallbacks.
- `MoneyCard` chart containment should be tested with desktop/mobile chart layout.
- Trip and Shared Expense status mapping should exist before migrating shared/trip report sections.

Recommended move:
- Migrate after Daily Book, Borrow/Lend, Shared, and Savings.
- Start with passive cards: advisory, story, history empty, report sections.
- Migrate export panel and loading buttons after report export states are verified.

### 8. Statement Analysis

Implementation: `src/components/StatementUploadSheet.jsx`, lazy-loaded from Reports

Existing UI inventory and V2 mapping:

| Existing element | Current classes / location | V2 mapping |
| --- | --- | --- |
| Custom modal | `statement-upload-backdrop`, `statement-upload-sheet` | `BottomSheet` |
| Sheet header | `statement-sheet-header` | `SectionHeader` inside `BottomSheet` |
| Close button | `icon-button` | icon button pattern |
| Privacy note | `privacy-note-card` | `InsightCard` |
| Analysis period select | `statement-window-select`, `month-select` | V2 select field |
| Upload option grid | `statement-option-grid` buttons | `ActionCard` grid |
| Advanced options | `statement-advanced-options`, `statement-mode-row` | `MoneyCard` + segmented control |
| Hidden file input | `visually-hidden-file-input` | keep native input unchanged |
| Parsing skeleton | `StatementParsingSkeleton`, `skeleton-line`, `statement-skeleton-row` | `FLoader` plus optional skeleton later |
| Error message | `form-message` | compact error surface |
| Import status | `statement-import-status` | `SuccessState` or `StatusBadge` depending density |
| Password form | `password-sheet`, `plain-input`, action row | `MoneyCard`, `TextInput`, `PrimaryButton`, `SecondaryButton` |
| Result summary | `statement-result-card`, `statement-result-summary` | `MoneyCard`, `StatCard` |
| File list | `statement-file-list` | `TimelineCard` rows |
| Statement report summary | `statement-intelligence-card` | `InsightCard` + `StatCard` grid |
| Statement bars | `statement-chart-block`, `statement-bar-row` | `MoneyCard` with native bars retained |
| Timeline row | `statement-timeline-row` | `StatusBadge` group |
| Preview transaction rows | `statement-preview-list` article rows | `TimelineCard` or dense editable `MoneyCard` rows |
| Description/date/category/direction controls | `plain-input`, `month-select` | `TextInput`, `DateSelector`, `CategorySelector` |
| Preview actions | `primary-button`, `ghost-button` | `PrimaryButton`, `SecondaryButton` |
| Needs Review labels | inline `<small>Needs Review</small>` | `StatusBadge` warning |

Existing buttons: close, Upload PDF, Upload CSV, Multiple, mode buttons, password Continue/Cancel, Confirm preview, Generate statement report.

Existing badges: confidence percentage, Needs Review, timeline month chips, import status.

Existing loaders: custom skeleton during lazy sheet fallback and parsing.

Existing inputs: hidden file input, password, transaction description, transaction date, direction select, category select, analysis window select.

Existing empty states: statement report fallback when no readable rows; chart empty text inside `StatementBars`.

Existing success states: import status after confirm preview; report generation closes sheet and enters report export flow.

Safe migration difficulty: High.

Risks:
- The sheet is data-heavy and has async dynamic imports for parsing.
- File input behavior must remain native and untouched.
- Password handling must remain in-memory only.
- Preview rows are dense editable rows; card wrappers can easily harm mobile usability.

Dependencies:
- Reports export/loading migration.
- `BottomSheet` must be proven elsewhere.
- V2 form fields must work in dense row layouts.

Recommended move:
- Migrate late.
- Begin with sheet shell, privacy note, upload option cards, and parsing loader.
- Leave transaction preview row layout for a dedicated dense-form pass.

### 9. Profile

Implementation: `ProfileScreen`, `ProfileMenuSheet`, `CommitmentEditorSheet`, `VoiceExpenseBox`, and `ProfileExpenseQuickAdd` in `src/App.jsx`; `src/screens/SettingsScreen.jsx`; `src/components/ProfileSettingsControls.jsx`; `src/components/RecurringScheduleManager.jsx`; `src/components/FinanceDonut.jsx`

Existing UI inventory and V2 mapping:

| Existing element | Current classes / location | V2 mapping |
| --- | --- | --- |
| Profile page heading | `screen-heading compact-heading` | `PageHeader` |
| Profile menu trigger | `profile-menu-trigger` | icon button pattern |
| Profile hero | `profile-hero-card` | `MoneyCard` or `InsightCard` |
| Pressure pill | `simulation-pill` | `StatusBadge` |
| Donut cards | `finance-donut-card` | `MoneyCard`; donut graphic stays inside |
| Voice box | `voice-box voice-compact` | `MoneyCard`/`BottomSheet` pattern later |
| Voice state badge | `voice-state-badge` | `StatusBadge` |
| Last voice save row | `voice-undo-row` | `SuccessState` compact or inline success + secondary action |
| Voice transcript review | `voice-transcript-review` | `MoneyCard` + `NotesInput` |
| Voice draft card | `voice-draft compact-voice-draft` | `MoneyCard` |
| Profile quick expense card | `profile-quick-expense-card` | `MoneyCard` + V2 form primitives |
| Quick chips | `quick-chip-row` | compact `ActionCard`/button chips |
| Name/note fields | `plain-input` | `TextInput`, `NotesInput` |
| Category picker wrapper | `CategoryPicker` | keep until V2 category selector can support icon categories |
| Amount field | `CurrencyInput` | `AmountInput` |
| Profile menu sheet | `AppModal`, `profile-menu-sheet` | `BottomSheet` |
| Settings sheet | `SettingsScreen` `AppModal`, `settings-sheet` | `BottomSheet` |
| Profile/settings account card | `profile-menu-account`, `settings-account` | `MoneyCard` |
| Name/income/currency/salary inputs | `plain-input`, `CurrencyInput`, `month-select` | `TextInput`, `AmountInput`, V2 select field |
| Planning style | `preference-card` buttons | `ActionCard` or segmented control |
| Commitments editor | `commitment-row` | `MoneyCard` row + V2 fields |
| No commitments note | `section-note` | `EmptyState` compact |
| Recurring manager | `recurring-form`, `recurring-row` | `MoneyCard`, V2 fields, `StatusBadge` for paused/direction |
| Commitment editor sheet | `AppModal` | `BottomSheet` |
| Sign out button | `sign-out-button` | `SecondaryButton` with danger styling later |

Existing buttons: profile menu trigger, edit monthly bills, voice mic/review/fallback/clear/save/undo, quick chips, profile expense submit, modal close, planning preference, commitment add/remove, recurring save/reset/toggle/delete, sign out.

Existing badges: pressure pill, voice state badge, voice confidence/low-confidence labels, recurring direction and paused state, mini labels.

Existing loaders: voice processing state text; no formal loader. Profile tab is not lazy-loaded in the same way as other screens.

Existing inputs: name, income, currency, salary day, expense name/category/amount/note, voice transcript, voice draft amount/date/category/note, commitments, recurring schedule fields.

Existing empty states: no commitments note, savings bucket empty state via `SavingsBucketsManager`, app error empty state in `AppErrorBoundary`.

Existing success states: voice save undo row, feedback success message, auth/setup success transitions but no reusable success component.

Safe migration difficulty: Medium-High.

Risks:
- Large portions live in `App.jsx`, so migration has higher merge/conflict risk.
- `SavingsBucketsManager` is shared with Savings; migrate it once, test both screens.
- `CategoryPicker` is specialized and should not be replaced by generic `CategorySelector` until V2 supports icon-rich category UX.
- Voice flow has many states; keep behavior and status copy unchanged.

Dependencies:
- Savings bucket migration.
- BottomSheet and form primitive confidence from Borrow/Lend/Settings.
- Future V2 icon button and segmented-control primitives would reduce ad hoc work.

Recommended move:
- Migrate after Savings and before Home, or split into small safe passes.
- Start with `SettingsScreen` because it is smaller than `ProfileScreen`.
- Migrate `FinanceDonut` wrappers and commitment rows only after card spacing is validated.

## Cross-App Loading Audit

| Current loading surface | Location | V2 mapping |
| --- | --- | --- |
| Splash coin loader | `SplashScreen` in `src/App.jsx`; `.coin-loader`, `.coin` in `src/index.css` | `FLoader` with full-page usage, after brand acceptance |
| Lazy screen fallback | `ScreenFallback` in `src/App.jsx` | `FLoader` plus `PageHeader` shell |
| Reports fallback | `ReportsFallback` in `src/App.jsx` | `FLoader` or V2 skeleton policy |
| Statement upload lazy fallback | `StatementUploadFallback` in `ReportsScreen.jsx` | `FLoader` inside `BottomSheet` shell |
| Statement parsing skeleton | `StatementParsingSkeleton` in `StatementUploadSheet.jsx` | `FLoader`, optionally followed by a V2 skeleton component in a later phase |
| Chart details fallback | `ChartDetailsFallback` in `ReportsScreen.jsx` | `FLoader` or chart-card loading variant |
| Export preparing labels | `ReportsScreen.jsx` and `RewardedExportModal` | `PrimaryButton`/`SecondaryButton` `loading` state |
| Voice processing copy | `VoiceExpenseBox` | `StatusBadge` plus optional `FLoader` inline only if it does not change current flow |

Recommendation: migrate loading before screen visuals, but keep it scoped to existing loading boundaries. Do not introduce polling, extra fetches, or new async state.

## Recommended Migration Order

1. Global loading boundaries: replace app lazy fallbacks and statement/report skeleton fallbacks with `FLoader` only where no layout behavior changes.
2. Daily Book: lowest risk, isolated data surface, already uses old `EmptyState`.
3. Borrow/Lend summary and cards: contained inside Activity, moderate form complexity.
4. Borrow/Lend modal form: validates `BottomSheet` and V2 form primitives.
5. Shared Expenses static cards, metrics, and empty state.
6. Shared Expenses nested payment forms and settlement statuses.
7. Trips as Shared Expense variant: Home trip preview and report trip prompts only after shared status language is stable.
8. Savings Buckets Manager: reusable in Savings and Profile.
9. Savings Goals planner cards and recommendation cards.
10. Reports passive cards and history/empty states.
11. Reports export panel and loading buttons.
12. Statement Analysis shell/upload choices/parsing loader.
13. Statement Analysis editable preview rows.
14. Settings screen and profile menu sheets.
15. Profile tab cards, quick expense, commitments, recurring, and voice states.
16. Home final integration: adopt proven components for hero, action cards, pulse, feed, trip preview, and activation guide.

## Phase 2 Safety Checklist

- Migrate one screen or panel per PR/commit.
- Keep existing props, callbacks, state setters, analytics calls, and tracking payloads unchanged.
- Avoid replacing `CategoryPicker` until Money OS has feature parity for icon category picking.
- Keep native `details`, file inputs, and chart internals unless a V2 primitive has matching behavior.
- Run `npm run lint` and `npm run build` after each migration.
- For form migrations, manually test invalid field focus, helper text, submit success, cancel/close, and keyboard operation.
- For Reports and Statement Analysis, manually test export disabled/loading states, password-protected PDF flow, and preview edits.
- For Trips, verify group creation, payment add, settlement mark, PNG download, Home trip preview, and trip/settlement report prompts.

## Acceptance Status For This Audit

- Migration roadmap generated: yes.
- Safe migration order documented: yes.
- Screen behavior changed: no.
- Money OS imports added to existing screens: no.
- Routes/state/data/auth modified: no.
