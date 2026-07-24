# FBPLY Money OS Design System V2

Money OS V2 is an opt-in foundation layer for future FBPLY screen migrations. It centralizes visual tokens, loading, card DNA, buttons, bottom sheets, state components, and form primitives without touching routes, APIs, persistence, calculations, reports, or existing workflows.

FBPLY V10 Notebook Foundation is an additive notebook design layer for future migrations. It adds centralized notebook tokens, typography roles, theme objects, motion tokens, responsive rules, and presentation-only notebook components. It does not migrate existing pages.

## Rules

- Import from `src/design-system` only in screens that are being migrated intentionally.
- Keep business logic outside these components.
- Use `FLoader` for new loading states instead of adding local spinners.
- Prefer the shared card, button, state, and form primitives before creating screen-specific UI.
- Remove this folder to roll back the foundation; existing application screens do not depend on it.
- Import notebook primitives from `src/design-system/notebook` when a screen is intentionally migrated to the V10 notebook experience. The root `src/design-system` barrel remains unchanged for current Money OS screens.

## Exports

- Tokens: `moneyOSTokens`, `moneyOSCssVariables`, `moneyOSThemeClass`
- Loading: `FLoader`
- Cards: `MoneyCard`, `StatCard`, `ActionCard`, `InsightCard`, `TimelineCard`
- Status and actions: `StatusBadge`, `PrimaryButton`, `SecondaryButton`
- Shells and states: `MoneyOSProvider`, `BottomSheet`, `EmptyState`, `SuccessState`, `SectionHeader`, `PageHeader`
- Forms: `AmountInput`, `TextInput`, `CategorySelector`, `DateSelector`, `NotesInput`

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

Notebook themes available for Phase 2 migration: Classic Notebook, Brown Journal, Blue Register, Minimal White, and Vintage Diary.
