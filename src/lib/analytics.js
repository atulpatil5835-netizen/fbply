const MAX_DEBUG_EVENTS = 200
const MAX_PRODUCT_HEALTH_EVENTS = 500
const DUPLICATE_WINDOW_MS = 500
const APP_VERSION = String(import.meta.env.VITE_APP_VERSION || '0.0.0')
const PRODUCT_HEALTH_STORAGE_KEY = 'fbply-product-health-events-v1'

const PUBLIC_PAGE_EVENT_BY_TYPE = {
  landing: 'landing_page_viewed',
  guide: 'guide_viewed',
  faq: 'faq_viewed',
  faqHub: 'faq_viewed',
  calculator: 'calculator_viewed',
  sample: 'sample_report_viewed',
  sampleHub: 'sample_report_viewed',
  authoritySample: 'sample_report_viewed',
  template: 'template_viewed',
  authorityTemplate: 'template_viewed',
}

const PRODUCT_EVENT_SCREENS = {
  app_opened: 'app',
  theme_changed: 'profile',
  daily_viewed: 'daily',
  home_viewed: 'home',
  insights_viewed: 'insights',
  money_health_viewed: 'insights',
  money_health_improved: 'insights',
  money_health_declined: 'insights',
  tools_viewed: 'tools',
  next_action_clicked: 'home',
  add_hub_opened: 'add_hub',
  quick_expense_entry_opened: 'daily',
  add_expense_selected: 'add_hub',
  add_income_selected: 'add_hub',
  add_people_selected: 'add_hub',
  add_other_actions_selected: 'add_hub',
  quick_expense_created: 'expenses',
  quick_income_created: 'income',
  expense_created: 'expenses',
  income_created: 'income',
  people_viewed: 'people',
  borrow_created: 'people',
  lend_created: 'people',
  shared_group_created: 'people',
  settlement_completed: 'people',
  savings_viewed: 'savings',
  goal_created: 'savings',
  goal_updated: 'savings',
  reports_viewed: 'reports',
  report_generated: 'reports',
  statement_analysis_started: 'reports',
  statement_analysis_completed: 'reports',
  profile_viewed: 'profile',
  sign_out_clicked: 'profile',
}

const FEATURE_EVENT_ALIASES = {
  quick_add_opened: 'add_hub_opened',
  expense_saved: 'expense_created',
  income_saved: 'income_created',
  trip_created: 'shared_group_created',
  goal_created: 'goal_created',
  reports: 'reports_viewed',
  profile: 'profile_viewed',
  planner: 'savings_viewed',
  home: 'home_viewed',
}

const SCREEN_ALIASES = {
  app: 'app',
  app_chrome: 'app',
  auth: 'auth',
  activation: 'home',
  today: 'home',
  home: 'home',
  daily: 'daily',
  insights: 'insights',
  tools: 'tools',
  history: 'people',
  people: 'people',
  money_book: 'people',
  shared_expenses: 'people',
  goals: 'savings',
  planner: 'savings',
  savings: 'savings',
  setup: 'savings',
  reports: 'reports',
  statement_analysis: 'reports',
  quick_add: 'add_hub',
  add_hub: 'add_hub',
  profile: 'profile',
  public_seo: 'public',
}

const PRODUCT_HEALTH_METRICS = [
  { event: 'app_opened', label: 'App opened', group: 'App Usage', screen: 'app' },
  { event: 'daily_viewed', label: 'Daily viewed', group: 'Daily', screen: 'daily' },
  { event: 'insights_viewed', label: 'Insights viewed', group: 'Insights', screen: 'insights' },
  { event: 'tools_viewed', label: 'Tools viewed', group: 'Tools', screen: 'tools' },
  { event: 'home_viewed', label: 'Home viewed', group: 'Home', screen: 'home' },
  { event: 'next_action_clicked', label: 'Next action clicked', group: 'Home', screen: 'home' },
  { event: 'quick_expense_entry_opened', label: 'Quick expense entry opened', group: 'Daily', screen: 'daily' },
  { event: 'add_hub_opened', label: 'Add hub opened', group: 'Add Hub', screen: 'add_hub' },
  { event: 'add_expense_selected', label: 'Expense selected', group: 'Add Hub', screen: 'add_hub' },
  { event: 'add_income_selected', label: 'Income selected', group: 'Add Hub', screen: 'add_hub' },
  { event: 'add_people_selected', label: 'People selected', group: 'Add Hub', screen: 'add_hub' },
  { event: 'add_other_actions_selected', label: 'Other actions selected', group: 'Add Hub', screen: 'add_hub' },
  { event: 'quick_expense_created', label: 'Quick expense created', group: 'Creation Metrics', screen: 'expenses' },
  { event: 'quick_income_created', label: 'Quick income created', group: 'Creation Metrics', screen: 'income' },
  { event: 'expense_created', label: 'Expense created', group: 'Creation Metrics', screen: 'expenses' },
  { event: 'income_created', label: 'Income created', group: 'Creation Metrics', screen: 'income' },
  { event: 'goal_created', label: 'Goal created', group: 'Creation Metrics', screen: 'savings' },
  { event: 'borrow_created', label: 'Borrow created', group: 'Creation Metrics', screen: 'people' },
  { event: 'shared_group_created', label: 'Shared group created', group: 'Creation Metrics', screen: 'people' },
  { event: 'reports_viewed', label: 'Reports viewed', group: 'Reports', screen: 'reports' },
  { event: 'report_generated', label: 'Report generated', group: 'Reports', screen: 'reports' },
  { event: 'statement_analysis_started', label: 'Statement analysis started', group: 'Reports', screen: 'reports' },
  { event: 'statement_analysis_completed', label: 'Statement analysis completed', group: 'Reports', screen: 'reports' },
  { event: 'goal_updated', label: 'Goal updated', group: 'Retention Signals', screen: 'savings' },
]

const debugState = {
  events: [],
  counts: {},
  screens: {},
}

const recentEventKeys = new Map()
let productHealthEvents = null
let productHealthPersistQueued = false

function normalizeEventName(action = '') {
  return String(action || '')
    .trim()
    .replace(/^fbply_/, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'event'
}

function normalizeScreen(screen = 'app') {
  const cleanScreen = normalizeEventName(screen)
  return SCREEN_ALIASES[cleanScreen] || cleanScreen || 'app'
}

function resolveScreen(eventName, payload = {}) {
  if (PRODUCT_EVENT_SCREENS[eventName]) {
    return PRODUCT_EVENT_SCREENS[eventName]
  }

  return normalizeScreen(payload.screen || payload.surface || 'app')
}

function buildAnalyticsEvent(action, payload = {}) {
  const eventName = normalizeEventName(action)

  return {
    event_name: eventName,
    timestamp: new Date().toISOString(),
    screen: resolveScreen(eventName, payload),
    app_version: APP_VERSION,
  }
}

function isProductHealthEvent(event) {
  if (!event || typeof event !== 'object') {
    return false
  }

  const keys = Object.keys(event).sort()

  return keys.join('|') === 'app_version|event_name|screen|timestamp'
    && typeof event.event_name === 'string'
    && typeof event.timestamp === 'string'
    && typeof event.screen === 'string'
    && typeof event.app_version === 'string'
}

function increment(target, key) {
  if (!key) {
    return
  }

  target[key] = (target[key] || 0) + 1
}

function pruneDuplicateCache(now) {
  recentEventKeys.forEach((timestamp, key) => {
    if (now - timestamp > DUPLICATE_WINDOW_MS * 4) {
      recentEventKeys.delete(key)
    }
  })
}

function shouldSkipDuplicate(event) {
  const now = Date.now()
  const key = `${event.event_name}:${event.screen}`
  const lastSeen = recentEventKeys.get(key)

  recentEventKeys.set(key, now)
  pruneDuplicateCache(now)

  return typeof lastSeen === 'number' && now - lastSeen < DUPLICATE_WINDOW_MS
}

function recordDebugEvent(event) {
  debugState.events = [event, ...debugState.events].slice(0, MAX_DEBUG_EVENTS)
  increment(debugState.counts, event.event_name)
  increment(debugState.screens, event.screen)
}

function readStoredProductHealthEvents() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return []
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(PRODUCT_HEALTH_STORAGE_KEY) || '[]')

    return Array.isArray(parsed)
      ? parsed.filter(isProductHealthEvent).slice(0, MAX_PRODUCT_HEALTH_EVENTS)
      : []
  } catch {
    return []
  }
}

function getStoredProductHealthEvents() {
  if (!productHealthEvents) {
    productHealthEvents = readStoredProductHealthEvents()
  }

  return productHealthEvents
}

function flushProductHealthEvents() {
  productHealthPersistQueued = false

  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  try {
    window.localStorage.setItem(
      PRODUCT_HEALTH_STORAGE_KEY,
      JSON.stringify(getStoredProductHealthEvents().slice(0, MAX_PRODUCT_HEALTH_EVENTS)),
    )
  } catch {
    // Product health is internal-only and should never affect the app.
  }
}

function queueProductHealthPersist() {
  if (productHealthPersistQueued || typeof window === 'undefined') {
    return
  }

  productHealthPersistQueued = true

  try {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(flushProductHealthEvents, { timeout: 1500 })
      return
    }

    window.setTimeout(flushProductHealthEvents, 0)
  } catch {
    flushProductHealthEvents()
  }
}

function recordProductHealthEvent(event) {
  if (!isProductHealthEvent(event)) {
    return
  }

  const current = getStoredProductHealthEvents()
  productHealthEvents = [event, ...current].slice(0, MAX_PRODUCT_HEALTH_EVENTS)
  queueProductHealthPersist()
}

function dispatchEvent(event) {
  if (typeof window === 'undefined') {
    return
  }

  const send = () => {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', event.event_name, event)
      }
    } catch {
      // Analytics must never interrupt the product experience.
    }
  }

  try {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(send, { timeout: 1000 })
      return
    }

    window.setTimeout(send, 0)
  } catch {
    send()
  }
}

function shouldExposeDebugDashboard() {
  if (typeof window === 'undefined') {
    return false
  }

  return import.meta.env.DEV || ['localhost', '127.0.0.1'].includes(window.location.hostname)
}

function buildSummary() {
  return {
    eventCounts: { ...debugState.counts },
    screenViews: { ...debugState.screens },
    recentEvents: debugState.events.slice(0, 25),
  }
}

function eventDateKey(event) {
  const date = new Date(event.timestamp)

  if (Number.isNaN(date.getTime())) {
    return String(event.timestamp || '').slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

function productHealthEventKey(event) {
  return `${event.timestamp}|${event.event_name}|${event.screen}|${event.app_version}`
}

function getProductHealthEvents() {
  const seen = new Set()

  return [...debugState.events, ...getStoredProductHealthEvents()]
    .filter(isProductHealthEvent)
    .filter((event) => {
      const key = productHealthEventKey(event)

      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
    .sort((first, second) => String(second.timestamp).localeCompare(String(first.timestamp)))
    .slice(0, MAX_PRODUCT_HEALTH_EVENTS)
}

function percent(numerator, denominator) {
  if (!denominator) {
    return 0
  }

  return Math.round((numerator / denominator) * 100)
}

function buildInvestmentAreas(counts) {
  const creationTotal =
    (counts.expense_created || 0)
    + (counts.income_created || 0)
    + (counts.goal_created || 0)
    + (counts.borrow_created || 0)
    + (counts.shared_group_created || 0)
  const areas = []

  if ((counts.home_viewed || 0) > 0 && !(counts.next_action_clicked || 0)) {
    areas.push({
      title: 'Home next action needs proof',
      detail: 'Home is being seen, but the primary recommendation is not being clicked yet.',
      tone: 'warning',
    })
  }

  if ((counts.add_hub_opened || 0) > 0 && creationTotal === 0) {
    areas.push({
      title: 'Add hub is not converting',
      detail: 'Users reach the hub, but creation events have not followed in this sample.',
      tone: 'warning',
    })
  }

  if ((counts.reports_viewed || 0) > 0 && !(counts.report_generated || 0)) {
    areas.push({
      title: 'Reports need a clearer path',
      detail: 'Reports are viewed without report generation in the current event stream.',
      tone: 'warning',
    })
  }

  if ((counts.statement_analysis_started || 0) > (counts.statement_analysis_completed || 0)) {
    areas.push({
      title: 'Statement analysis drop-off',
      detail: 'Started analyses are higher than completed analyses.',
      tone: 'danger',
    })
  }

  if ((counts.goal_created || 0) > 0 && (counts.goal_updated || 0) > 1) {
    areas.push({
      title: 'Savings goals show retention',
      detail: 'Repeat goal updates suggest savings deserves continued investment.',
      tone: 'success',
    })
  }

  if ((counts.report_generated || 0) > 1) {
    areas.push({
      title: 'Reports are repeating',
      detail: 'Multiple generated reports indicate a validation signal for reporting.',
      tone: 'success',
    })
  }

  if (areas.length === 0) {
    areas.push({
      title: 'Keep collecting signal',
      detail: 'The current event stream is still light. Watch ignored features and repeat actions first.',
      tone: 'neutral',
    })
  }

  return areas.slice(0, 5)
}

function buildProductHealthSummary() {
  const events = getProductHealthEvents()
  const counts = events.reduce((eventCounts, event) => {
    increment(eventCounts, event.event_name)
    return eventCounts
  }, {})
  const activeDays = new Set(events.map(eventDateKey).filter(Boolean))
  const appOpenDays = new Set(events.filter((event) => event.event_name === 'app_opened').map(eventDateKey).filter(Boolean))
  const metricRows = PRODUCT_HEALTH_METRICS.map((metric) => ({
    ...metric,
    count: counts[metric.event] || 0,
  }))
  const groups = metricRows.reduce((groupMap, metric) => {
    const current = groupMap[metric.group] || { group: metric.group, total: 0, events: [] }
    current.total += metric.count
    current.events.push(metric)
    groupMap[metric.group] = current
    return groupMap
  }, {})
  const creationTotal =
    (counts.expense_created || 0)
    + (counts.income_created || 0)
    + (counts.goal_created || 0)
    + (counts.borrow_created || 0)
    + (counts.shared_group_created || 0)
  const addHubSelections =
    (counts.add_expense_selected || 0)
    + (counts.add_income_selected || 0)
    + (counts.add_people_selected || 0)
    + (counts.add_other_actions_selected || 0)
  const engagementEvents = new Set([
    'next_action_clicked',
    'expense_created',
    'income_created',
    'goal_created',
    'goal_updated',
    'borrow_created',
    'shared_group_created',
    'report_generated',
    'statement_analysis_completed',
  ])

  return {
    generatedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    totalEvents: events.length,
    activeDays: activeDays.size,
    appOpenDays: appOpenDays.size,
    appOpens: counts.app_opened || 0,
    eventCounts: counts,
    groups: Object.values(groups),
    metrics: metricRows,
    topActions: metricRows
      .filter((metric) => metric.count > 0)
      .sort((first, second) => second.count - first.count)
      .slice(0, 8),
    ignoredFeatures: metricRows.filter((metric) => metric.count === 0).slice(0, 8),
    engagementActions: metricRows
      .filter((metric) => engagementEvents.has(metric.event) && metric.count > 0)
      .sort((first, second) => second.count - first.count)
      .slice(0, 6),
    retentionSignals: [
      {
        label: 'Opening app multiple days',
        value: appOpenDays.size > 1 ? `${appOpenDays.size} days` : `${appOpenDays.size || 0} day`,
        active: appOpenDays.size > 1,
      },
      {
        label: 'Repeat goal updates',
        value: `${counts.goal_updated || 0} updates`,
        active: (counts.goal_updated || 0) > 1,
      },
      {
        label: 'Repeat report generation',
        value: `${counts.report_generated || 0} reports`,
        active: (counts.report_generated || 0) > 1,
      },
    ],
    rates: {
      nextActionClickRate: percent(counts.next_action_clicked || 0, counts.home_viewed || 0),
      addHubSelectionRate: percent(addHubSelections, counts.add_hub_opened || 0),
      creationPerHubOpenRate: percent(creationTotal, counts.add_hub_opened || 0),
      statementCompletionRate: percent(counts.statement_analysis_completed || 0, counts.statement_analysis_started || 0),
      reportGenerationRate: percent(counts.report_generated || 0, counts.reports_viewed || 0),
    },
    investmentAreas: buildInvestmentAreas(counts),
    recentEvents: events.slice(0, 25),
  }
}

function resetDebugState() {
  debugState.events = []
  debugState.counts = {}
  debugState.screens = {}
  recentEventKeys.clear()
}

function exposeDebugDashboard() {
  if (!shouldExposeDebugDashboard()) {
    return
  }

  window.__FBPLY_ANALYTICS__ = {
    events: () => [...debugState.events],
    summary: buildSummary,
    productHealth: buildProductHealthSummary,
    reset: resetDebugState,
  }
}

export function trackEvent(action, payload = {}) {
  const event = buildAnalyticsEvent(action, payload)

  if (shouldSkipDuplicate(event)) {
    return
  }

  recordDebugEvent(event)
  recordProductHealthEvent(event)
  dispatchEvent(event)

  if (typeof window !== 'undefined') {
    exposeDebugDashboard()
  }
}

export function trackPublicPageView(path, pageType) {
  const action = PUBLIC_PAGE_EVENT_BY_TYPE[pageType] || 'public_page_viewed'
  trackEvent(action, {
    screen: 'public',
    path,
  })
}

export function trackFeatureUsage(feature, payload = {}) {
  trackEvent(FEATURE_EVENT_ALIASES[feature] || feature || 'feature_used', payload)
}

export function trackActivation(action, payload = {}) {
  trackEvent(action, {
    screen: 'home',
    ...payload,
  })
}

export function getAnalyticsSummary() {
  return buildSummary()
}

export function getProductHealthSummary() {
  return buildProductHealthSummary()
}

if (typeof window !== 'undefined') {
  exposeDebugDashboard()
}
