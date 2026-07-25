const PRODUCT_STANDARDIZATION_VERSION = 'fbply-v11-ppsp-phase-1'
const DEFAULT_THEME_WORKSPACE_ID = 'navy'
const DEFAULT_DENSITY = 'comfortable'

function freeze(value) {
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item) => freeze(item)))
  }

  if (value && typeof value === 'object') {
    if (Object.isFrozen(value)) {
      return value
    }

    Object.keys(value).forEach((key) => {
      value[key] = freeze(value[key])
    })

    return Object.freeze(value)
  }

  return value
}

export const productStandardizationVersion = PRODUCT_STANDARDIZATION_VERSION
export const defaultThemeWorkspaceId = DEFAULT_THEME_WORKSPACE_ID

export const productSemanticTokens = freeze({
  colors: {
    backgroundApp: 'var(--background-app)',
    backgroundPage: 'var(--background-page)',
    surfacePrimary: 'var(--surface-primary)',
    surfaceSecondary: 'var(--surface-secondary)',
    surfaceElevated: 'var(--surface-elevated)',
    surfaceMuted: 'var(--surface-muted)',
    surfaceTint: 'var(--surface-tint)',
    surfaceInverse: 'var(--surface-inverse)',
    textPrimary: 'var(--text-primary)',
    textSecondary: 'var(--text-secondary)',
    textMuted: 'var(--text-muted)',
    textInverse: 'var(--text-inverse)',
    borderDefault: 'var(--border-default)',
    borderSubtle: 'var(--border-subtle)',
    borderStrong: 'var(--border-strong)',
    borderFocus: 'var(--border-focus)',
    accentPrimary: 'var(--accent-primary)',
    accentInfo: 'var(--accent-info)',
    accentSuccess: 'var(--accent-success)',
    accentWarning: 'var(--accent-warning)',
    accentDanger: 'var(--accent-danger)',
  },
  spacing: {
    none: 'var(--spacing-0)',
    '2xs': 'var(--spacing-2xs)',
    xs: 'var(--spacing-xs)',
    sm: 'var(--spacing-sm)',
    md: 'var(--spacing-md)',
    lg: 'var(--spacing-lg)',
    xl: 'var(--spacing-xl)',
    '2xl': 'var(--spacing-2xl)',
    '3xl': 'var(--spacing-3xl)',
    section: 'var(--spacing-section)',
    pageXMobile: 'var(--spacing-page-x-mobile)',
    pageXDesktop: 'var(--spacing-page-x-desktop)',
  },
  radius: {
    none: 'var(--radius-none)',
    xs: 'var(--radius-xs)',
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    pill: 'var(--radius-pill)',
  },
  elevation: {
    none: 'var(--shadow-none)',
    soft: 'var(--shadow-soft)',
    card: 'var(--shadow-card)',
    elevated: 'var(--shadow-elevated)',
    overlay: 'var(--shadow-overlay)',
    focus: 'var(--shadow-focus)',
  },
  opacity: {
    disabled: 'var(--opacity-disabled)',
    muted: 'var(--opacity-muted)',
    overlay: 'var(--opacity-overlay)',
    scrim: 'var(--opacity-scrim)',
  },
  zIndex: {
    base: 'var(--z-base)',
    sticky: 'var(--z-sticky)',
    dropdown: 'var(--z-dropdown)',
    sheet: 'var(--z-sheet)',
    modal: 'var(--z-modal)',
    toast: 'var(--z-toast)',
  },
  motion: {
    instant: 'var(--duration-instant)',
    fast: 'var(--duration-fast)',
    normal: 'var(--duration-normal)',
    slow: 'var(--duration-slow)',
    page: 'var(--duration-page)',
    standard: 'var(--easing-standard)',
    decelerate: 'var(--easing-decelerate)',
    softOut: 'var(--easing-soft-out)',
    hover: 'var(--motion-hover)',
    focus: 'var(--motion-focus)',
  },
})

export const productFontStrategy = freeze({
  primaryUi: {
    cssVariable: 'var(--font-primary-ui)',
    stack: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    loading: 'system-first; no new external request in Phase 1',
    usage: 'Primary application chrome, forms, tables, reports, and readable body text.',
  },
  notebook: {
    readableVariable: 'var(--font-notebook-readable)',
    accentVariable: 'var(--font-notebook-accent)',
    loading: 'Use installed cursive fallback only for accents; do not load decorative fonts in Phase 1.',
    usage: 'Notebook surfaces and optional handwriting accent text.',
  },
  monospace: {
    cssVariable: 'var(--font-monospace)',
    loading: 'System monospace fallback only.',
    usage: 'Debug IDs, import previews, and compact technical values.',
  },
  numeric: {
    cssVariable: 'var(--font-primary-ui)',
    fontVariantNumeric: 'tabular-nums',
    usage: 'Counts, percentages, and ledger values that are not money.',
  },
  money: {
    cssVariable: 'var(--font-primary-ui)',
    fontVariantNumeric: 'tabular-nums',
    disallowHandwriting: true,
    usage: 'Financial values, totals, charts, reports, exports, and user-entered amounts.',
  },
})

export const productTypographyRoles = freeze({
  displayXL: {
    fontFamily: productFontStrategy.primaryUi.cssVariable,
    fontSize: 'var(--font-size-display-xl)',
    lineHeight: 'var(--line-height-display-xl)',
    fontWeight: 'var(--font-weight-black)',
    letterSpacing: 'var(--letter-spacing-default)',
    responsive: 'Use only for first-viewport product headers; downgrade to Display L on compact shells.',
  },
  displayL: {
    fontFamily: productFontStrategy.primaryUi.cssVariable,
    fontSize: 'var(--font-size-display-l)',
    lineHeight: 'var(--line-height-display-l)',
    fontWeight: 'var(--font-weight-extrabold)',
    letterSpacing: 'var(--letter-spacing-default)',
    responsive: 'Use for screen-level titles on mobile and secondary desktop display headings.',
  },
  headingXL: {
    fontFamily: productFontStrategy.primaryUi.cssVariable,
    fontSize: 'var(--font-size-heading-xl)',
    lineHeight: 'var(--line-height-heading-xl)',
    fontWeight: 'var(--font-weight-extrabold)',
    letterSpacing: 'var(--letter-spacing-default)',
    responsive: 'Use for page sections and important modal titles.',
  },
  headingL: {
    fontFamily: productFontStrategy.primaryUi.cssVariable,
    fontSize: 'var(--font-size-heading-l)',
    lineHeight: 'var(--line-height-heading-l)',
    fontWeight: 'var(--font-weight-bold)',
    letterSpacing: 'var(--letter-spacing-default)',
    responsive: 'Default dense-screen heading role.',
  },
  headingM: {
    fontFamily: productFontStrategy.primaryUi.cssVariable,
    fontSize: 'var(--font-size-heading-m)',
    lineHeight: 'var(--line-height-heading-m)',
    fontWeight: 'var(--font-weight-bold)',
    letterSpacing: 'var(--letter-spacing-default)',
    responsive: 'Use inside compact panels and repeated sections.',
  },
  title: {
    fontFamily: productFontStrategy.primaryUi.cssVariable,
    fontSize: 'var(--font-size-title)',
    lineHeight: 'var(--line-height-title)',
    fontWeight: 'var(--font-weight-bold)',
    letterSpacing: 'var(--letter-spacing-default)',
    responsive: 'Stable title role for cards, sheets, and popovers.',
  },
  body: {
    fontFamily: productFontStrategy.primaryUi.cssVariable,
    fontSize: 'var(--font-size-body)',
    lineHeight: 'var(--line-height-body)',
    fontWeight: 'var(--font-weight-regular)',
    letterSpacing: 'var(--letter-spacing-default)',
    responsive: 'Default readable text role. Do not use handwriting fonts for body copy.',
  },
  bodySmall: {
    fontFamily: productFontStrategy.primaryUi.cssVariable,
    fontSize: 'var(--font-size-body-small)',
    lineHeight: 'var(--line-height-body-small)',
    fontWeight: 'var(--font-weight-medium)',
    letterSpacing: 'var(--letter-spacing-default)',
    responsive: 'Use for dense supporting copy when body would crowd the layout.',
  },
  caption: {
    fontFamily: productFontStrategy.primaryUi.cssVariable,
    fontSize: 'var(--font-size-caption)',
    lineHeight: 'var(--line-height-caption)',
    fontWeight: 'var(--font-weight-medium)',
    letterSpacing: 'var(--letter-spacing-default)',
    responsive: 'Use for metadata, timestamps, and helper text.',
  },
  label: {
    fontFamily: productFontStrategy.primaryUi.cssVariable,
    fontSize: 'var(--font-size-label)',
    lineHeight: 'var(--line-height-label)',
    fontWeight: 'var(--font-weight-bold)',
    letterSpacing: 'var(--letter-spacing-default)',
    responsive: 'Use for form labels, badges, and compact control labels.',
  },
  button: {
    fontFamily: productFontStrategy.primaryUi.cssVariable,
    fontSize: 'var(--font-size-button)',
    lineHeight: 'var(--line-height-button)',
    fontWeight: 'var(--font-weight-bold)',
    letterSpacing: 'var(--letter-spacing-default)',
    responsive: 'Use inside all text buttons and segmented controls.',
  },
  numeric: {
    fontFamily: productFontStrategy.numeric.cssVariable,
    fontSize: 'var(--font-size-numeric)',
    lineHeight: 'var(--line-height-numeric)',
    fontWeight: 'var(--font-weight-bold)',
    letterSpacing: 'var(--letter-spacing-default)',
    fontVariantNumeric: 'tabular-nums',
    responsive: 'Use for counts, scores, days, and percentages.',
  },
  money: {
    fontFamily: productFontStrategy.money.cssVariable,
    fontSize: 'var(--font-size-money)',
    lineHeight: 'var(--line-height-money)',
    fontWeight: 'var(--font-weight-extrabold)',
    letterSpacing: 'var(--letter-spacing-default)',
    fontVariantNumeric: 'tabular-nums',
    disallowHandwriting: true,
    responsive: 'Use for every financial amount across UI, charts, reports, and exports.',
  },
  monospace: {
    fontFamily: productFontStrategy.monospace.cssVariable,
    fontSize: 'var(--font-size-monospace)',
    lineHeight: 'var(--line-height-monospace)',
    fontWeight: 'var(--font-weight-medium)',
    letterSpacing: 'var(--letter-spacing-default)',
    responsive: 'Use only where technical alignment matters.',
  },
  notebook: {
    fontFamily: productFontStrategy.notebook.readableVariable,
    fontSize: 'var(--font-size-notebook)',
    lineHeight: 'var(--line-height-notebook)',
    fontWeight: 'var(--font-weight-regular)',
    letterSpacing: 'var(--letter-spacing-default)',
    responsive: 'Readable notebook body role; handwriting remains accent-only.',
  },
  handwritingAccent: {
    fontFamily: productFontStrategy.notebook.accentVariable,
    fontSize: 'var(--font-size-handwriting-accent)',
    lineHeight: 'var(--line-height-handwriting-accent)',
    fontWeight: 'var(--font-weight-bold)',
    letterSpacing: 'var(--letter-spacing-default)',
    disallowFinancialValues: true,
    responsive: 'Use sparingly for notebook flavor, never for money, dates, totals, or reports.',
  },
})

export const densityScale = freeze({
  compact: {
    id: 'compact',
    controlHeight: '36px',
    touchTarget: '44px',
    horizontalPadding: productSemanticTokens.spacing.sm,
    sectionGap: productSemanticTokens.spacing.lg,
  },
  comfortable: {
    id: 'comfortable',
    controlHeight: '44px',
    touchTarget: '44px',
    horizontalPadding: productSemanticTokens.spacing.md,
    sectionGap: productSemanticTokens.spacing.xl,
  },
  large: {
    id: 'large',
    controlHeight: '52px',
    touchTarget: '52px',
    horizontalPadding: productSemanticTokens.spacing.lg,
    sectionGap: productSemanticTokens.spacing['2xl'],
  },
})

export const iconSystem = freeze({
  library: 'lucide-react',
  strokeWidth: 2,
  sizes: {
    xs: 14,
    sm: 16,
    md: 18,
    lg: 20,
    xl: 24,
  },
  touchTarget: '44px',
  alignment: 'centered inline-flex with aria-hidden decorative icons',
  interactiveStates: ['hovered', 'pressed', 'focused', 'disabled', 'selected'],
  guidance: [
    'Use lucide-react before custom SVG when an icon exists.',
    'Pair icon-only controls with aria-label and visible focus states.',
    'Keep feature icons at md by default and reserve xl for empty states or hero metrics.',
  ],
})

export const layoutGrid = freeze({
  breakpoints: {
    mobile: '0px',
    tablet: '640px',
    desktop: '960px',
    wide: '1200px',
  },
  page: {
    maxWidth: '1120px',
    mobileGutter: productSemanticTokens.spacing.pageXMobile,
    desktopGutter: productSemanticTokens.spacing.pageXDesktop,
    sectionGap: productSemanticTokens.spacing.section,
    safeAreaTop: 'env(safe-area-inset-top)',
    safeAreaBottom: 'env(safe-area-inset-bottom)',
  },
  grid: {
    mobileColumns: 4,
    tabletColumns: 8,
    desktopColumns: 12,
    gap: productSemanticTokens.spacing.lg,
  },
  fixedSurfaces: {
    bottomNavHeight: 'var(--bottom-nav-height)',
    bottomClearance: 'var(--app-bottom-clearance)',
  },
})

export const themeWorkspaceIds = freeze(['navy', 'emerald', 'midnight', 'sunset', 'minimal'])

export const themeWorkspaces = freeze({
  navy: {
    id: 'navy',
    label: 'Navy',
    colorPalette: {
      background: 'var(--theme-bg)',
      paper: 'var(--theme-card)',
      ink: 'var(--theme-text)',
      accent: 'var(--theme-accent)',
      success: 'var(--theme-success)',
      warning: 'var(--theme-warning)',
      danger: 'var(--theme-danger)',
    },
    typography: productTypographyRoles,
    elevation: productSemanticTokens.elevation,
    density: densityScale.comfortable,
    motion: productSemanticTokens.motion,
    iconStyle: iconSystem,
    charts: {
      primary: 'var(--theme-accent)',
      secondary: 'var(--theme-cyan)',
      positive: 'var(--theme-success)',
      caution: 'var(--theme-warning)',
      negative: 'var(--theme-danger)',
      grid: 'var(--chart-grid)',
    },
    notebookAppearance: {
      preferredTheme: 'classic',
      paper: 'var(--nb-paper)',
      ink: 'var(--nb-ink)',
      lines: 'var(--nb-lines)',
    },
    componentVariants: {
      card: 'quiet-raised',
      button: 'solid-primary',
      sheet: 'elevated-surface',
      input: 'bordered-surface',
    },
  },
  emerald: {
    id: 'emerald',
    label: 'Emerald',
    colorPalette: {
      background: 'var(--theme-bg)',
      paper: 'var(--theme-card)',
      ink: 'var(--theme-text)',
      accent: 'var(--theme-accent)',
      success: 'var(--theme-success)',
      warning: 'var(--theme-warning)',
      danger: 'var(--theme-danger)',
    },
    typography: productTypographyRoles,
    elevation: productSemanticTokens.elevation,
    density: densityScale.comfortable,
    motion: productSemanticTokens.motion,
    iconStyle: iconSystem,
    charts: {
      primary: 'var(--theme-accent)',
      secondary: 'var(--theme-cyan)',
      positive: 'var(--theme-success)',
      caution: 'var(--theme-warning)',
      negative: 'var(--theme-danger)',
      grid: 'var(--chart-grid)',
    },
    notebookAppearance: {
      preferredTheme: 'brownJournal',
      paper: 'var(--nb-paper)',
      ink: 'var(--nb-ink)',
      lines: 'var(--nb-lines)',
    },
    componentVariants: {
      card: 'quiet-raised',
      button: 'solid-primary',
      sheet: 'elevated-surface',
      input: 'bordered-surface',
    },
  },
  midnight: {
    id: 'midnight',
    label: 'Midnight',
    colorPalette: {
      background: 'var(--theme-bg)',
      paper: 'var(--theme-card)',
      ink: 'var(--theme-text)',
      accent: 'var(--theme-accent)',
      success: 'var(--theme-success)',
      warning: 'var(--theme-warning)',
      danger: 'var(--theme-danger)',
    },
    typography: productTypographyRoles,
    elevation: productSemanticTokens.elevation,
    density: densityScale.comfortable,
    motion: productSemanticTokens.motion,
    iconStyle: iconSystem,
    charts: {
      primary: 'var(--theme-accent)',
      secondary: 'var(--theme-cyan)',
      positive: 'var(--theme-success)',
      caution: 'var(--theme-warning)',
      negative: 'var(--theme-danger)',
      grid: 'var(--chart-grid)',
    },
    notebookAppearance: {
      preferredTheme: 'blueRegister',
      paper: 'var(--nb-paper)',
      ink: 'var(--nb-ink)',
      lines: 'var(--nb-lines)',
    },
    componentVariants: {
      card: 'quiet-raised',
      button: 'solid-primary',
      sheet: 'elevated-surface',
      input: 'bordered-surface',
    },
  },
  sunset: {
    id: 'sunset',
    label: 'Sunset',
    colorPalette: {
      background: 'var(--theme-bg)',
      paper: 'var(--theme-card)',
      ink: 'var(--theme-text)',
      accent: 'var(--theme-accent)',
      success: 'var(--theme-success)',
      warning: 'var(--theme-warning)',
      danger: 'var(--theme-danger)',
    },
    typography: productTypographyRoles,
    elevation: productSemanticTokens.elevation,
    density: densityScale.comfortable,
    motion: productSemanticTokens.motion,
    iconStyle: iconSystem,
    charts: {
      primary: 'var(--theme-accent)',
      secondary: 'var(--theme-cyan)',
      positive: 'var(--theme-success)',
      caution: 'var(--theme-warning)',
      negative: 'var(--theme-danger)',
      grid: 'var(--chart-grid)',
    },
    notebookAppearance: {
      preferredTheme: 'vintageDiary',
      paper: 'var(--nb-paper)',
      ink: 'var(--nb-ink)',
      lines: 'var(--nb-lines)',
    },
    componentVariants: {
      card: 'quiet-raised',
      button: 'solid-primary',
      sheet: 'elevated-surface',
      input: 'bordered-surface',
    },
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    colorPalette: {
      background: 'var(--theme-bg)',
      paper: 'var(--theme-card)',
      ink: 'var(--theme-text)',
      accent: 'var(--theme-accent)',
      success: 'var(--theme-success)',
      warning: 'var(--theme-warning)',
      danger: 'var(--theme-danger)',
    },
    typography: productTypographyRoles,
    elevation: productSemanticTokens.elevation,
    density: densityScale.compact,
    motion: productSemanticTokens.motion,
    iconStyle: iconSystem,
    charts: {
      primary: 'var(--theme-accent)',
      secondary: 'var(--theme-cyan)',
      positive: 'var(--theme-success)',
      caution: 'var(--theme-warning)',
      negative: 'var(--theme-danger)',
      grid: 'var(--chart-grid)',
    },
    notebookAppearance: {
      preferredTheme: 'minimalWhite',
      paper: 'var(--nb-paper)',
      ink: 'var(--nb-ink)',
      lines: 'var(--nb-lines)',
    },
    componentVariants: {
      card: 'flat-bordered',
      button: 'solid-primary',
      sheet: 'plain-surface',
      input: 'bordered-surface',
    },
  },
})

export const componentContractStates = freeze([
  'loading',
  'empty',
  'error',
  'disabled',
  'selected',
  'focused',
  'hovered',
  'pressed',
  'reducedMotion',
  'compact',
  'comfortable',
  'large',
])

export const componentContracts = freeze({
  surface: {
    appliesTo: ['MoneyCard', 'StatCard', 'ActionCard', 'NotebookPaper', 'NotebookSection'],
    requiredStates: ['loading', 'empty', 'error', 'disabled', 'selected', 'focused'],
    requiredTokens: ['surfacePrimary', 'borderDefault', 'radiusMd', 'shadowCard'],
  },
  action: {
    appliesTo: ['PrimaryButton', 'SecondaryButton', 'icon buttons', 'segmented controls'],
    requiredStates: ['loading', 'disabled', 'focused', 'hovered', 'pressed', 'selected'],
    requiredTokens: ['accentPrimary', 'textInverse', 'motionHover', 'shadowFocus'],
  },
  form: {
    appliesTo: ['AmountInput', 'TextInput', 'DateSelector', 'CategorySelector', 'NotesInput'],
    requiredStates: ['empty', 'error', 'disabled', 'focused', 'compact', 'comfortable', 'large'],
    requiredTokens: ['surfacePrimary', 'borderDefault', 'borderFocus', 'textPrimary'],
  },
  feedback: {
    appliesTo: ['EmptyState', 'SuccessState', 'FLoader', 'NotificationCenter'],
    requiredStates: ['loading', 'empty', 'error', 'reducedMotion'],
    requiredTokens: ['accentInfo', 'accentSuccess', 'accentDanger', 'motionStandard'],
  },
})

export const storageClassifications = freeze([
  {
    keys: ['fbply-profile', 'fbply-setup-complete'],
    classification: 'Persistent Local',
    owner: 'App setup and profile bootstrapping',
    guidance: 'Keep local-first behavior; mirror through profile sync when authenticated.',
  },
  {
    keys: [
      'fbply-expenses',
      'fbply-savings-buckets',
      'fbply-recurring-schedules',
      'fbply-shared-groups',
      'fbply-money-book',
      'fbply-report-history',
      'fbply-statement-category-mappings',
      'fbply-voice-memory',
    ],
    classification: 'Cloud Synced',
    owner: 'Financial records and learned mappings',
    guidance: 'Do not persist temporary drafts here; keep normalization before write.',
  },
  {
    prefixes: [
      'fbply-expense-sync-',
      'fbply-savings-sync-',
      'fbply-commitments-sync-',
      'fbply-shared-groups-sync-',
      'fbply-money-book-sync-',
      'fbply-report-history-sync-',
      'fbply-statement-mappings-sync-',
      'fbply-voice-memory-sync-',
    ],
    classification: 'Cloud Synced Queue',
    owner: 'Offline sync queues',
    guidance: 'Bound queue growth and flush only through existing sync helpers.',
  },
  {
    keys: ['fbply-money-theme', 'fbply-low-energy', 'fbply-haptics', 'fbply-touch-sounds'],
    classification: 'Persistent Local',
    owner: 'Device preferences',
    guidance: 'Preferences may remain local and should not contain sensitive data.',
  },
  {
    keys: [
      'fbply-onboarding-complete',
      'fbply-walkthrough-complete',
      'fbply-anonymous-started',
      'fbply-cookie-consent',
      'fbply-export-unlock-until',
    ],
    classification: 'Persistent Local',
    owner: 'Product state and consent',
    guidance: 'Keep values primitive, auditable, and easy to clear.',
  },
  {
    prefixes: ['fbply-backup-migration-completed-v1-'],
    classification: 'Derived',
    owner: 'One-time migration bookkeeping',
    guidance: 'Only write after successful migration completion.',
  },
  {
    keys: ['notebook draft text', 'quick capture review state', 'open sheet state'],
    classification: 'Temporary',
    owner: 'Presentation and input surfaces',
    guidance: 'Never write temporary drafts to storage until the user explicitly saves.',
  },
])

const exactStorageClassifications = new Map(
  storageClassifications.flatMap((group) => {
    return (group.keys || []).map((key) => [key, group])
  }),
)

export function classifyStoredValue(key) {
  if (exactStorageClassifications.has(key)) {
    return exactStorageClassifications.get(key)
  }

  return storageClassifications.find((group) => {
    return (group.prefixes || []).some((prefix) => String(key).startsWith(prefix))
  }) || null
}

export const storageLifecyclePolicies = freeze({
  persistentLocal: {
    lifecycleId: 'persistent-local',
    classifications: ['Persistent Local'],
    retention: 'Keep until the user clears browser storage, resets app data, or replaces the value through existing app flows.',
    cleanupTrigger: 'User-initiated browser/app clearing only.',
    schemaChange: 'none',
    writePath: 'Existing safeStorageSet or safeStorageSetQueued helpers only.',
  },
  cloudSynced: {
    lifecycleId: 'cloud-synced',
    classifications: ['Cloud Synced'],
    retention: 'Keep as the durable financial record until the user edits, deletes, or clears the record.',
    cleanupTrigger: 'Existing delete/update flows and authenticated sync reconciliation.',
    schemaChange: 'none',
    writePath: 'Existing local-first sync helpers only.',
  },
  cloudSyncedQueue: {
    lifecycleId: 'cloud-synced-queue',
    classifications: ['Cloud Synced Queue'],
    retention: 'Temporary offline queue; retain only until the queued operation is flushed or superseded.',
    cleanupTrigger: 'Successful queue flush through existing sync helpers.',
    schemaChange: 'none',
    writePath: 'Existing queued sync helpers only; keep within storage performance budgets.',
  },
  derived: {
    lifecycleId: 'derived',
    classifications: ['Derived'],
    retention: 'Keep derived bookkeeping only while it prevents duplicate migration work.',
    cleanupTrigger: 'Versioned migration retirement or explicit reset.',
    schemaChange: 'none',
    writePath: 'Existing migration bookkeeping only.',
  },
  temporary: {
    lifecycleId: 'temporary',
    classifications: ['Temporary'],
    retention: 'Memory-only for the active interaction.',
    cleanupTrigger: 'Unmount, cancel, close, or successful save.',
    schemaChange: 'none',
    writePath: 'Do not persist temporary drafts in Wave 1.',
  },
})

const storageLifecycleByClassification = new Map(
  Object.values(storageLifecyclePolicies).flatMap((policy) => (
    policy.classifications.map((classification) => [classification, policy])
  )),
)

export function getStorageLifecycle(key) {
  const classification = classifyStoredValue(key)

  if (!classification) {
    return null
  }

  return {
    ...classification,
    lifecycle: storageLifecycleByClassification.get(classification.classification) || null,
  }
}

export const performanceBudgets = freeze({
  initialAppChunk: {
    warningRawKb: 420,
    hardRawKb: 460,
    warningGzipKb: 112,
    hardGzipKb: 125,
  },
  css: {
    warningRawKb: 260,
    hardRawKb: 300,
    warningGzipKb: 40,
    hardGzipKb: 48,
  },
  routeChunk: {
    warningGzipKb: 18,
    hardGzipKb: 24,
  },
  interaction: {
    inputResponseMs: 100,
    longTaskMs: 50,
    routeTransitionMs: 300,
  },
  storage: {
    localStorageWarningMb: 3,
    localStorageHardMb: 5,
    syncQueueWarningItems: 250,
    syncQueueHardItems: 500,
  },
})

export const qualityGates = freeze({
  build: {
    command: 'npm run build',
    required: true,
  },
  lint: {
    command: 'npm run lint',
    required: true,
  },
  typeSafety: {
    command: 'eslint . plus migration-time TypeScript checks when TS surfaces are introduced',
    required: true,
  },
  accessibility: {
    checks: ['keyboard navigation', 'visible focus', 'aria labels', 'contrast', 'touch targets'],
    required: true,
  },
  performance: {
    checks: ['bundle budget', 'large render audit', 'no new runtime-heavy styling dependency'],
    required: true,
  },
  responsive: {
    checks: ['mobile', 'tablet', 'desktop', 'safe areas'],
    required: true,
  },
  motion: {
    checks: ['prefers-reduced-motion', 'tokenized duration', 'no continuous decorative animation'],
    required: true,
  },
  storage: {
    checks: ['stored-value classification', 'lifecycle metadata present', 'temporary state not persisted', 'bounded queues'],
    required: true,
  },
  rollback: {
    checks: ['additive design-system files removable', 'no route or schema dependency'],
    required: true,
  },
})

export const productStandardization = freeze({
  version: PRODUCT_STANDARDIZATION_VERSION,
  tokens: productSemanticTokens,
  typography: productTypographyRoles,
  fonts: productFontStrategy,
  themes: themeWorkspaces,
  density: densityScale,
  icons: iconSystem,
  layout: layoutGrid,
  components: componentContracts,
  storage: storageClassifications,
  storageLifecycle: storageLifecyclePolicies,
  performance: performanceBudgets,
  qualityGates,
})

export function getThemeWorkspace(themeId = DEFAULT_THEME_WORKSPACE_ID) {
  return themeWorkspaces[themeId] || themeWorkspaces[DEFAULT_THEME_WORKSPACE_ID]
}

export function normalizeDensity(density = DEFAULT_DENSITY) {
  return densityScale[density] ? density : DEFAULT_DENSITY
}

export function getTypographyRole(role = 'body') {
  return productTypographyRoles[role] || productTypographyRoles.body
}
