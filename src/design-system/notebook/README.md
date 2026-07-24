# FBPLY V10 Notebook Architecture

The Notebook Design System is an opt-in foundation for future FBPLY V10 screens. It must stay removable without affecting authentication, routes, Supabase, reports, history, analytics, exports, or existing layouts.

## Folder Responsibilities

- `index.js`: public styled entry point. Imports `notebook.css` and exports the public core API.
- `core.js`: public headless entry point. Exports tokens, theme loaders, typography, motion contracts, renderer contracts, and presentation components without importing CSS.
- `components.jsx`: presentation-only React primitives. No business logic, data fetching, persistence, routing, analytics, or Supabase imports.
- `shell.jsx`: premium notebook shell presentation layer. It composes paper, header, date placeholder, writing area, prompt, and footer without data ownership.
- `interaction.jsx`: no-persistence writing interaction layer. It composes the shell with native input, cursor hint, and line-alignment primitives.
- `draft/`: architecture-only draft and intent contracts. It owns temporary session lifecycle, state factories, generic validation contracts, adapter contracts, and a no-op-capable pipeline.
- `tokens.js`: base notebook scale, colors, margins, radius, elevation, responsive rules, and CSS variables.
- `themes.js`: public lazy theme API. It exposes metadata and dynamic loaders without statically importing every theme.
- `themes/`: individual theme definitions. Importing one theme should not import sibling themes.
- `fonts.js`: typography loading strategy and fallback stacks.
- `motion.js`: reusable motion definitions only. No animation implementation lives here.
- `renderers.js`: future screen, PDF, print, image, and export render-target contract.
- `internal/`: private implementation helpers. Do not import from this folder outside the notebook package.

## Public API

Approved consumer imports:

```js
import { NotebookPage, NotebookSection } from '../design-system/notebook'
import { notebookTokens, loadNotebookTheme } from '../design-system/notebook/core.js'
```

Do not deep-import from `themes/`, `internal/`, `components.jsx`, `tokens.js`, or other implementation files. Those files are package-owned and can change during hardening without migration notice.

`exports.js` is retained as a compatibility shim for the Phase 1 foundation and should not be used for new imports.

## Token Philosophy

Tokens describe notebook primitives rather than screen features. Values are centralized around spacing, paper, ink, ruled lines, margins, radius, elevation, typography, motion, and responsive behavior. Business concepts such as reports, expenses, history, authentication, and Supabase records do not belong in tokens.

Shell sizing, writing-surface heights, paper texture scale, and depth intensity are tokenized through `notebookTokens.shell` and exposed as `--nb-shell-*` variables.

## Theme Philosophy

Themes are metadata-first and lazy-load ready. `themes.js` exports `notebookThemeOptions`, `normalizeNotebookTheme`, `loadNotebookTheme`, and `loadNotebookThemeCssVariables`. Full color definitions live in one file per theme so unused themes do not enter bundles unless imported or dynamically loaded.

Theme inheritance is supported through `extendNotebookTheme(baseTheme, extension)` for future theme families. Current themes declare their intended base through `extends` metadata while staying independent for lazy loading.

## Typography Philosophy

Readable body text and financial values use system-first sans-serif stacks. Amount typography always uses tabular numerals and never uses handwriting fonts. Handwriting is optional, CSS-only, and limited to accent notes so first paint is not blocked by a decorative font.

## Motion Philosophy

`motion.js` defines paper, write, ink, page, line, hover, focus, and fade timing. Phase 2A adds a single non-continuous shell paper entrance animation using `--nb-motion-page`. Reduced-motion users receive the static shell.

## Renderer Strategy

Notebook primitives should eventually share one content model across screen, PDF, print, image, and export renderers. `renderers.js` defines target metadata and constraints only. Renderer implementations must remain separate from Supabase, routes, analytics, and business calculations.

## Architecture Audit

- Single responsibility: each module owns one concern after hardening.
- Separation of concerns: components do not import theme definitions, business logic, routing, Supabase, reports, history, exports, or analytics.
- Public vs internal API: public imports are limited to `notebook` and `notebook/core.js`; helper files are private by convention.
- Import graph: core exports are one-way; theme definitions are dynamically loaded; no circular dependencies are expected.
- Tree shaking: headless imports avoid CSS; components avoid full theme objects; individual themes are split by file.
- Code splitting: full themes are dynamic import candidates; future selector/search/export features should live outside notebook core.
- Rollback: remove `src/design-system/notebook` and the documentation references; existing production screens do not depend on this package.

Phase 2D production integration guidance lives in `PHASE_2D_PRODUCTION_INTEGRATION_AUDIT.md`. Public Notebook integration is not approved by that audit; only disabled-by-default internal preview work is considered safe.

## Premium Notebook Shell

`NotebookShell` is presentation-only. It renders:

- Paper container with premium depth and subtle CSS texture
- Left notebook margin and ruled writing surface
- Reusable title/subtitle/date-placeholder header
- Empty writing area with a prompt
- Footer slot
- Mobile-first responsive spacing

It does not render expenses, forms, editing controls, reports, exports, floating tools, search, history, settings, voice, OCR, AI, or database-backed content.

## Notebook Interaction Engine

`NotebookInteraction` validates the writing experience without owning data. It renders:

- `NotebookShell`
- `NotebookLineRenderer`
- `NotebookCursor`
- `NotebookInputSurface`

The engine uses an uncontrolled native `textarea`, so the draft exists only in the mounted browser element. It does not write to localStorage, Supabase, URL state, analytics, reports, history, or exports. Unmounting the component removes the draft. To protect that guarantee, `NotebookInteraction` ignores controlled `value`, `defaultValue`, `onChange`, and `onInput` entries passed through `inputProps`; use the explicit `defaultValue` prop only for a temporary initial draft.

Native browser behavior owns caret blinking, selection, arrow keys, Enter, Backspace, wrapping, scrolling, spellcheck, and mobile keyboard behavior. `NotebookCursor` provides a screen-reader hint only; it does not draw a custom cursor.

Lower-level primitives can be reused in a future real expense workflow, but any persistence, parsing, categorization, or calculations must live outside the notebook package.

## Draft & Intent Engine

The Phase 2C engine sits between notebook interaction and a future business engine. It is headless and architecture-only:

- `createDraftState`, `updateDraftState`, `clearDraftState`: immutable draft state helpers
- `createDraftSession`, `useDraftSession`: in-memory draft lifecycle; `destroy()` clears the mounted draft
- `createDraftIntent`, `createIntentResult`, `createIntentContext`: generic intent contracts
- `createDraftValidator`, `runDraftValidators`: validation contracts only
- `createIntentAdapter`, `resolveIntentWithAdapter`: future adapter contract with lazy-load support
- `createDraftPipeline`, `runDraftPipeline`: orchestration shell for validators and adapters

The engine does not parse text, detect amounts, detect currencies, categorize, tag, save, route, track analytics, call APIs, or write browser storage. Built-in adapters intentionally resolve nothing. Future voice, OCR, scanner, AI, templates, quick actions, smart suggestions, receipt import, and manual entry adapters should plug into the adapter contract without changing notebook primitives.

Approved imports remain `src/design-system/notebook` and `src/design-system/notebook/core.js`. Do not deep-import from `draft/` implementation files.

## Performance Notes

- Notebook lines should stay simple and composition-based for future virtualization.
- Future 10000+ line histories should render through virtualized lists outside the primitive components.
- Avoid passing freshly created large arrays or object literals through notebook rows during future migrations.
- Keep notebook core free of report, PDF, OCR, AI, voice, and search code.
- Theme selectors, OCR, AI, voice, search, PDF, history, reports, and settings remain future lazy-loading candidates.
- Draft adapters should lazy-load future heavy capabilities outside notebook core.

## Accessibility Notes

- Components preserve semantic element override support through `as` props.
- Header and section primitives create stable labelled regions when titles are provided.
- Focus states are visible and scoped to notebook surfaces.
- Amount text uses high-readability tabular numerals.
- Reduced-motion protection disables the Phase 2A shell entrance animation and any future notebook animation hooks.
- Future interactive controls must provide keyboard operation, visible labels or `aria-label`, and touch targets of at least 44px.
- The Phase 2B writing input uses native textarea semantics, `aria-label`, `aria-describedby`, visible focus states, tabular-number-ready typography, and browser-native keyboard selection.

## Mobile Notes

Notebook spacing is mobile-first with tablet and desktop variables. Future migrations must verify small phones, large phones, landscape, tablet widths, safe areas, and soft-keyboard overlap at the screen level rather than inside the primitives.

## Error Resilience Notes

Notebook components degrade to static semantic markup. Future rendering, syncing, export, and offline failures should be handled by screen-level error boundaries or workflow-specific recovery UI, not by primitive components.
