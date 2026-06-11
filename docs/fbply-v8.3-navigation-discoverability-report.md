# FBPLY V8.3 Navigation & Discoverability Report

## A. Navigation Findings

- Daily, Insights, Tools, and Profile already existed in the bottom navigation, but content spacing treated the nav like an overlay instead of permanent app chrome.
- The bottom navigation needed one shared clearance model for desktop, mobile, and safe-area devices.
- Mobile reach was good because the nav was already at the bottom, but the page could still scroll behind it near the end of long screens.

## B. Discoverability Findings

- Quick Tools were visible, but Savings, Borrow/Lend, Shared Expenses, and Statement Analysis were split across deeper sections.
- Major capabilities could take more than five seconds to identify from the Tools Hub first viewport.
- Reports have a clear home in Insights, but secondary access in Tools remains useful for export and review workflows.

Feature visibility decisions:

| Feature | Decision | Home |
| --- | --- | --- |
| Quick Tools | SHOW | Tools first view |
| Savings | SHOW | Tools first view and Planner detail |
| Borrow/Lend | SHOW | Tools first view and Activity detail |
| Shared Expenses | SHOW | Tools first view and Activity detail |
| Statement Analysis | SHOW | Tools first view and import sheet |
| Reports | SHOW | Insights primary, Tools review/export secondary |

## C. Duplicate Features Found

- Profile duplicated navigation to Reports, Savings, Statement Analysis, Planner, and Shared Expenses even though those functions already have stronger homes in Insights, Tools, Planner, and Activity.
- Legal links appeared as primary Profile actions even though they are not routine account actions.
- Theme appeared as a Profile action and inside Settings. This is acceptable as a Profile status/shortcut, but Settings remains the full preference home.
- Support and feedback both appeared in Profile surfaces. Support remains a Profile-level action; feedback remains in the support/about area.

## D. Profile Cleanup Opportunities

- Profile was carrying operational tools that made it feel like a miscellaneous storage area.
- The preferred Profile identity is Account & Preferences: name, backup status, theme, support, and about.
- Low-frequency profile tools should remain available but collapsed behind an advanced disclosure.

## E. Legal Placement Review

- Privacy Policy, Terms, Disclaimer, and About should remain accessible and keyboard reachable.
- They should not compete with account and preference actions in the primary Profile grid.
- A compact legal footer/sheet area is the right home for these links.

## F. Mobile UX Findings

- Bottom navigation is the best thumb-reach pattern for the current four-hub structure.
- Tools needed a denser first viewport so users see the core action set immediately at 390px width.
- Disclosure summaries need single-line truncation to avoid mobile overflow.
- The app should reserve bottom padding equal to the navigation height plus safe-area spacing.

## G. Implemented Improvements

- Added shared bottom navigation clearance variables and wired app padding, legal footer spacing, and bottom nav positioning to them.
- Kept bottom navigation fixed, safe-area aware, and viewport-width constrained to prevent horizontal overflow.
- Removed transform-based entrance animation from the app shell so fixed navigation stays anchored to the viewport.
- Reframed Tools as a Top Tools first view with Calculator, Split, GST, EMI, Savings, Borrow/Lend, Shared, and Statement.
- Collapsed the less frequent percentage calculator into More quick calculations without removing it.
- Refined Profile to Account & Preferences with Account, Backup Status, Theme, Support, and About.
- Moved legal links into a compact Profile legal footer.
- Collapsed low-frequency ProfileScreen tools behind Advanced profile tools while keeping them available.
- Removed duplicate ProfileHub shortcuts to Reports, Savings, Statement Analysis, Planner, and shared splitting, since those are now discoverable in their stronger homes.

## H. Remaining Frictions

- Reports still have both Insights and Tools access. This is intentional for now because Insights is the content home and Tools is the export/review access point.
- Some advanced Profile content remains large once expanded because it preserves existing functionality.
- The Tools Hub still contains explanatory lower sections after the Top Tools grid. They are helpful, but V8.4 could make the relationship between quick access and detailed sections even clearer.

## I. Recommended V8.4 Scope

- Consolidate repeated tool cards into clearer "quick access" and "details" groupings without removing any tool.
- Review whether Reports should have a single primary CTA plus a secondary export affordance.
- Consider a compact Profile advanced sheet pattern if the expanded details remain visually heavy.
- Add a navigation smoke checklist to regression QA for 390px, safe-area devices, and long-scroll screens.
