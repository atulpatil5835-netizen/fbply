# FBPLY V11 PPSP Phase 1 Foundation Report

## Scope

Phase 1 was completed as a production-safe foundation pass. No routes, Supabase calls, auth flows, calculations, reports, exports, database schema, analytics, SEO behavior, or existing application flow were intentionally changed.

The implementation is additive:

- `standardization.js` defines the product-wide contracts.
- `index.css` now exposes semantic V11 CSS aliases that point at the existing theme variables.
- `README.md` documents the PPSP import path and migration rules.

Existing screens were not migrated in this phase.

## Files Added Or Updated

- Added `src/design-system/standardization.js`
- Added `src/design-system/PPSP_PHASE_1_FOUNDATION_REPORT.md`
- Updated `src/design-system/README.md`
- Updated `src/index.css` with semantic CSS aliases only

## Foundation Delivered

### Design Tokens

Created semantic token contracts for:

- background, surfaces, text, borders, accents
- spacing, radius, elevation, opacity, z-index
- duration, easing, hover, focus

The global CSS aliases map to the existing theme variables so current visuals remain stable.

### Typography

Defined product roles:

- Display XL
- Display L
- Heading XL
- Heading L
- Heading M
- Title
- Body
- Body Small
- Caption
- Label
- Button
- Numeric
- Money
- Monospace
- Notebook
- Handwriting Accent

Money and Numeric roles require tabular numbers. Money explicitly disallows handwriting.

### Font Strategy

No new font dependency or network request was introduced. The contract separates:

- Primary UI
- Notebook readable
- Notebook accent
- Monospace
- Numeric
- Money

Notebook handwriting is accent-only and not valid for financial values.

### Theme Engine V2

Created complete theme workspaces for existing product themes:

- Navy
- Emerald
- Midnight
- Sunset
- Minimal

Each workspace defines color palette, typography, elevation, density, motion, icon style, charts, notebook appearance, and component variants.

### Component Contracts

Documented state contracts for:

- Surface components
- Action components
- Form components
- Feedback components

Required states include loading, empty, error, disabled, selected, focused, hovered, pressed, reduced motion, compact, comfortable, and large.

### Icon System

Defined the standard icon system:

- Library: `lucide-react`
- Default stroke: `2`
- Sizes: 14, 16, 18, 20, 24
- Minimum interactive target: `44px`
- Icon-only controls require accessible labels and visible focus states

Audit finding: current feature usage ranges from 11px to 28px, so icon replacement should be migration-gated.

### Layout Grid

Defined mobile-first layout rules:

- Mobile: 0px
- Tablet: 640px
- Desktop: 960px
- Wide: 1200px

The grid contract includes gutters, section gaps, safe areas, app bottom clearance, and fixed surface spacing.

### Motion System V2

Defined semantic aliases for duration, easing, hover, and focus motion on top of the existing motion tokens.

Reduced-motion coverage exists in:

- `src/index.css`
- `src/design-system/money-os.css`
- `src/design-system/notebook/notebook.css`
- `src/design-system/motion.js`

### Storage And State Audit

Classified stored values as:

- Persistent Local
- Cloud Synced
- Cloud Synced Queue
- Derived
- Temporary

Temporary notebook drafts, quick capture review state, and open sheet state are documented as non-persistent.

No storage write paths were removed in Phase 1.

## Audit Snapshot

Static scan counts after Phase 1:

| Category | Matches |
| --- | ---: |
| Colors | 581 |
| Spacing | 998 |
| Radius | 337 |
| Shadow | 107 |
| Z-index | 17 |
| Motion | 582 |
| Typography | 993 |
| Storage | 250 |

Main hotspots:

- `src/index.css`: largest raw color, typography, layout, and motion surface
- `src/design-system/money-os.css`: reusable system CSS still contains many raw typography values
- `src/components/QuickToolsSheet.css`: local styling should be tokenized during migration
- `src/lib/financeColors.js`: domain color constants should eventually map to chart tokens
- Feature screens: icon sizes are not fully standardized yet

Because this is a live production product, Phase 1 did not mass-replace raw values inside feature surfaces. That migration should happen per screen with visual regression checks.

## Bundle Comparison

Measured on the current worktree.

| Asset | Before PPSP aliases | After PPSP aliases | Delta |
| --- | ---: | ---: | ---: |
| Main app JS | 403.26 kB / 106.77 kB gzip | 403.26 kB / 106.77 kB gzip | 0 |
| Main CSS | 246.13 kB / 37.49 kB gzip | 249.71 kB / 38.34 kB gzip | +3.58 kB / +0.85 kB gzip |

No dependency was added. `standardization.js` is direct-import only and is not exported from the production root barrel, so it does not add to the current runtime JS bundle.

## Verification

| Gate | Result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run build` | Pass |
| Theme verification | Pass: 5 theme workspaces available |
| Typography verification | Pass: required roles available |
| Money typography guard | Pass: money role disallows handwriting |
| Storage classification check | Pass: `fbply-expenses` classified as Cloud Synced |
| Keyboard audit | Pass for initial public entry focusables; static scan confirms broad focus and ARIA coverage |
| Reduced motion audit | Pass static coverage; migration should continue replacing raw motion values with tokens |
| Responsive audit | Pass browser smoke at 390, 768, and 1440 widths with no horizontal overflow on public entry |
| Console audit | Pass browser smoke: no warnings or errors captured on public entry |

Production preview smoke target:

- `http://127.0.0.1:4173/`
- Page title: `FBPly | Budget Planner, Expense Splitter & Reports`
- Root mounted: yes
- Console warnings/errors: none

## Scores

| Area | Score |
| --- | ---: |
| Product Standardisation | 78 / 100 |
| Design System | 84 / 100 |
| Typography | 82 / 100 |
| Theme Architecture | 83 / 100 |
| Component Consistency | 74 / 100 |
| Performance | 80 / 100 |
| Accessibility | 82 / 100 |
| Storage Scalability | 76 / 100 |

Scores reflect a strong foundation with visible legacy debt still intentionally left unmigrated.

## Top 30 Standardisation Improvements

1. Added a single PPSP product foundation contract.
2. Added semantic CSS aliases for surfaces, text, borders, accents, spacing, radius, shadow, opacity, z-index, typography, and motion.
3. Preserved current visual output by mapping aliases to existing theme variables.
4. Defined complete typography roles for future migration.
5. Added explicit Money typography with tabular numbers.
6. Added a hard rule preventing handwriting usage for financial values.
7. Defined a font strategy without extra network requests.
8. Defined existing themes as full workspaces.
9. Bridged product themes to notebook appearance preferences.
10. Defined density scales for compact, comfortable, and large UI.
11. Standardized icon sizes, stroke width, alignment, and touch target rules.
12. Defined a mobile-first layout grid.
13. Added safe-area and bottom-clearance rules to the layout contract.
14. Added semantic motion aliases for future component work.
15. Documented reduced-motion as a required component state.
16. Classified all known storage groups by persistence intent.
17. Documented temporary states that must not be persisted.
18. Added sync queue budget thresholds.
19. Added bundle and performance budgets.
20. Added release quality gates.
21. Added component state contracts for surfaces, actions, forms, and feedback.
22. Kept the PPSP contract direct-import only to avoid current runtime bundle cost.
23. Documented raw value hotspots for future migrations.
24. Documented icon inconsistency hotspots.
25. Verified theme workspaces compile.
26. Verified typography roles compile.
27. Verified lint passes.
28. Verified production build passes.
29. Verified public entry console is clean.
30. Verified public entry has no horizontal overflow at mobile, tablet, or desktop smoke sizes.

## Items Removed

None.

No files, routes, storage writes, APIs, business logic, or UI flows were removed. No dead file was removed because Phase 1 did not prove any candidate unused with enough certainty for a live production app.

## Items Merged

No source files were merged.

Conceptually, existing theme variables now have one semantic alias layer for future work:

- `--theme-*` remains the current implementation layer.
- `--mos-*` remains the Money OS compatibility layer.
- `--surface-*`, `--text-*`, `--border-*`, `--spacing-*`, `--radius-*`, `--shadow-*`, and typography variables are the V11 PPSP layer.

## Remaining Technical Debt

- `src/index.css` is still the largest standardization surface and should be split only during safe screen migrations.
- Many feature selectors still use raw font sizes, weights, spacing, and radii.
- Icon sizes are inconsistent across legacy feature files.
- `src/App.jsx` remains a large orchestration file with high hook, storage, analytics, and route responsibility.
- Route-level chunks exist, but vendor chart, PDF, and PDF.js chunks are still large.
- Local storage growth needs guardrails before very high-volume users accumulate long histories.
- Sync queues need explicit item-count and age budgets enforced in code.
- Component contracts are now documented, but not every reusable component implements every applicable state yet.
- Automated accessibility tooling is not wired into `npm run lint`.
- TypeScript checks are not available for the current JSX-heavy app surface.

## Scalability Notes For 100,000 Users

- Preserve local-first behavior, but bound local storage and sync queue growth.
- Keep heavy importers such as PDF, statement analysis, report export, and charts lazy-loaded.
- Avoid app-wide context expansions from new design providers.
- Migrate screen by screen, measuring render cost and bundle impact each time.
- Add pagination or bounded history windows before histories become unbounded local arrays.
- Keep temporary drafts out of persistence until an explicit save action.

## Rollback Readiness

Rollback is low risk:

1. Remove `src/design-system/standardization.js`.
2. Remove the PPSP section from `src/design-system/README.md`.
3. Remove the semantic alias block from `src/index.css`.
4. Remove this report file.

No data migration, schema rollback, route rollback, auth rollback, or Supabase rollback is required.

## Production Go / No-Go

GO for Phase 1 production foundation.

NO-GO for claiming the full product is visually standardized until the legacy raw-value hotspots are migrated screen by screen with visual regression checks.
