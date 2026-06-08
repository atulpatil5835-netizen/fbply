# FBPLY V5 Product Analytics Event Map

All product analytics events pass through `trackEvent(...)` in `src/lib/analytics.js`.
Each dispatched event contains only `event_name`, `timestamp`, `screen`, and `app_version`.

| Event | Trigger | Screen |
| --- | --- | --- |
| `app_opened` | App shell initializes on a non-public app route | `app` |
| `theme_changed` | User selects a different theme in Profile | `profile` |
| `home_viewed` | Home tab becomes active | `home` |
| `next_action_clicked` | User clicks the Home next action | `home` |
| `add_hub_opened` | Add hub opens | `add_hub` |
| `add_expense_selected` | User selects Expense from Add hub or direct add entry | `add_hub` |
| `add_income_selected` | User selects Income from Add hub | `add_hub` |
| `add_people_selected` | User selects Borrow/Lend or Shared money from Add hub | `add_hub` |
| `add_other_actions_selected` | User selects Transfer, Savings Goal, or Statement Analysis from Add hub | `add_hub` |
| `expense_created` | Expense save succeeds | `expenses` |
| `income_created` | Income save succeeds | `income` |
| `people_viewed` | People/Activity tab becomes active | `people` |
| `borrow_created` | Borrow entry save succeeds | `people` |
| `lend_created` | Lend entry save succeeds | `people` |
| `shared_group_created` | Shared group creation succeeds | `people` |
| `settlement_completed` | Shared or people settlement is marked settled | `people` |
| `savings_viewed` | Savings tab becomes active | `savings` |
| `goal_created` | Savings goal creation succeeds | `savings` |
| `goal_updated` | Existing savings goal fields or saved progress are updated | `savings` |
| `reports_viewed` | Reports tab becomes active | `reports` |
| `report_generated` | Report PDF generation succeeds | `reports` |
| `statement_analysis_started` | Statement file analysis starts | `reports` |
| `statement_analysis_completed` | Statement file analysis completes successfully | `reports` |
| `profile_viewed` | Profile screen or Profile settings opens | `profile` |
| `sign_out_clicked` | User clicks Sign out | `profile` |

Privacy rule: no amounts, income values, savings values, transaction text, report contents, filenames, person names, or user-entered text are included in analytics.
