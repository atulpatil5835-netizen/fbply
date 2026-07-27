# FBPLY Money OS Design System V2

Money OS V2 is an opt-in foundation layer for future FBPLY screen migrations. It centralizes visual tokens, loading, card DNA, buttons, bottom sheets, state components, and form primitives without touching routes, APIs, persistence, calculations, reports, or existing workflows.

FBPLY V10 Notebook Foundation is an additive notebook design layer for future migrations. It adds centralized notebook tokens, typography roles, theme objects, motion tokens, responsive rules, and presentation-only notebook components. It does not migrate existing pages.

FBPLY V11 PPSP Phase 1 adds product-wide standardisation contracts for semantic tokens, typography roles, font policy, theme workspaces, icon usage, layout grid, component states, storage classifications, performance budgets, and release gates. The contract lives in `src/design-system/standardization.js`; semantic CSS aliases are defined in `src/index.css` and map to the existing theme variables without changing current screens.

## Rules

- Import from `src/design-system` only in screens that are being migrated intentionally.
- Keep business logic outside these components.
- Use `FLoader` for new loading states instead of adding local spinners.
- Prefer the shared card, button, state, and form primitives before creating screen-specific UI.
- Remove this folder to roll back the foundation; existing application screens do not depend on it.
- Import notebook primitives from `src/design-system/notebook` when a screen is intentionally migrated to the V10 notebook experience. The root `src/design-system` barrel remains unchanged for current Money OS screens.
- Import PPSP contracts directly from `src/design-system/standardization.js` for new foundation-aware work. The root barrel intentionally avoids pulling this audit-sized contract into current production screens.
- Use semantic tokens such as `--surface-primary`, `--text-primary`, `--border-default`, `--spacing-md`, `--radius-md`, `--shadow-card`, `--duration-normal`, and the typography role variables instead of adding new raw values.
- Financial values must use the Money or Numeric typography roles with tabular numbers. Handwriting accents are presentation-only and must not be used for amounts, totals, reports, or exports.

## Exports

- Tokens: `moneyOSTokens`, `moneyOSCssVariables`, `moneyOSThemeClass`
- Loading: `FLoader`
- Cards: `MoneyCard`, `StatCard`, `ActionCard`, `InsightCard`, `TimelineCard`
- Status and actions: `StatusBadge`, `PrimaryButton`, `SecondaryButton`
- Shells and states: `MoneyOSProvider`, `BottomSheet`, `EmptyState`, `SuccessState`, `SectionHeader`, `PageHeader`
- Forms: `AmountInput`, `TextInput`, `CategorySelector`, `DateSelector`, `NotesInput`

## V11 PPSP Foundation

- Contract: `productStandardization`, `productStandardizationVersion`
- Tokens: `productSemanticTokens`
- Typography: `productTypographyRoles`, `getTypographyRole`
- Fonts: `productFontStrategy`
- Themes: `themeWorkspaces`, `themeWorkspaceIds`, `getThemeWorkspace`
- Density: `densityScale`, `normalizeDensity`
- Icons: `iconSystem`
- Layout: `layoutGrid`
- Components: `componentContracts`, `componentContractStates`
- Storage: `storageClassifications`, `storageLifecyclePolicies`, `classifyStoredValue`, `getStorageLifecycle`
- Release controls: `performanceBudgets`, `qualityGates`

PPSP Phase 1 is intentionally additive. It standardizes the product foundation and documents migration contracts, but it does not migrate existing pages, change theme selection behavior, alter Supabase/auth/API code, or rewrite business logic.

## V10 Notebook Foundation

- Tokens: `notebookTokens`, `notebookCssVariables`, `notebookResponsiveRules`, `notebookBreakpoints`
- Public imports: `src/design-system/notebook` for styled primitives, `src/design-system/notebook/core.js` for headless architecture exports
- Themes: `notebookThemeOptions`, `defaultNotebookTheme`, `normalizeNotebookTheme`, `loadNotebookTheme`, `loadNotebookThemeCssVariables`, `getNotebookThemeCssVariables`
- Typography: `notebookTypographyRoles`, `notebookTypographyClassNames`, `notebookFontStacks`, `notebookFontStrategy`, `getNotebookTypographyClass`
- Motion: `notebookMotion`, `notebookMotionCssVariables`, `notebookMotionIntents`
- Render targets: `notebookRenderTargets`, `notebookRendererContract`, `normalizeNotebookRenderTarget`
- Components: `NotebookContainer`, `NotebookPaper`, `NotebookPage`, `NotebookHeader`, `NotebookSection`, `NotebookLine`, `NotebookDivider`, `NotebookFooter`, `NotebookText`, `NotebookAmount`, `NotebookHandwritingAccent`
- Shell: `NotebookShell`, `NotebookShellHeader`, `NotebookWritingArea`, `NotebookShellEmptyPrompt`
- Interaction: `NotebookInteraction`, `NotebookInputSurface`, `NotebookCursor`, `NotebookLineRenderer`
- Draft and intent: `createDraftSession`, `useDraftSession`, `createDraftState`, `createDraftIntent`, `createDraftPipeline`, `createDraftValidator`, `createIntentResult`, `createIntentContext`, `createIntentAdapter`

Notebook themes available for Phase 2 migration: Default Clean, Notebook, Brown Journal, Blue Register, and Vintage Diary.
