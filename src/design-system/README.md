# FBPLY Money OS Design System V2

Money OS V2 is an opt-in foundation layer for future FBPLY screen migrations. It centralizes visual tokens, loading, card DNA, buttons, bottom sheets, state components, and form primitives without touching routes, APIs, persistence, calculations, reports, or existing workflows.

## Rules

- Import from `src/design-system` only in screens that are being migrated intentionally.
- Keep business logic outside these components.
- Use `FLoader` for new loading states instead of adding local spinners.
- Prefer the shared card, button, state, and form primitives before creating screen-specific UI.
- Remove this folder to roll back the foundation; existing application screens do not depend on it.

## Exports

- Tokens: `moneyOSTokens`, `moneyOSCssVariables`, `moneyOSThemeClass`
- Loading: `FLoader`
- Cards: `MoneyCard`, `StatCard`, `ActionCard`, `InsightCard`, `TimelineCard`
- Status and actions: `StatusBadge`, `PrimaryButton`, `SecondaryButton`
- Shells and states: `MoneyOSProvider`, `BottomSheet`, `EmptyState`, `SuccessState`, `SectionHeader`, `PageHeader`
- Forms: `AmountInput`, `TextInput`, `CategorySelector`, `DateSelector`, `NotesInput`
