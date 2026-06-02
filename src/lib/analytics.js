const EVENT_PREFIX = 'fbply_'
const MAX_DEBUG_EVENTS = 200
const SENSITIVE_KEY_PATTERN = /(email|password|name|person|participant|note|transcript|description|token|secret|file_name|filename)/i
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
const KNOWN_FEATURES = [
  'home',
  'history',
  'planner',
  'reports',
  'profile',
  'quick_add_opened',
  'settings_opened',
  'activation_checklist',
  'feature_discovery_card',
  'intent_shortcut',
  'expense_saved',
  'income_saved',
  'goal_created',
  'goal_transfer_saved',
  'trip_created',
  'shared_payment_added',
  'borrow_lend_saved',
  'statement_analysis_opened',
  'statement_upload_picker_opened',
  'statement_preview_confirmed',
  'report_template_selected',
  'report_details_opened',
  'report_prompt_action',
  'calculator_used',
]

const debugState = {
  events: [],
  counts: {},
  pages: {},
  features: {},
  calculators: {},
  reports: {},
  exports: {},
  auth: {
    signup_open: 0,
    signup_success: 0,
    login_open: 0,
    login_success: 0,
    auth_abandon: 0,
  },
  funnel: {
    seo_page: 0,
    signup: 0,
    first_action: 0,
    report_generation: 0,
    export: 0,
  },
}

function normalizeEventName(action = '') {
  const cleanAction = String(action || '').trim().replace(/^fbply_/, '')
  return `${EVENT_PREFIX}${cleanAction || 'event'}`
}

function isSafeValue(value) {
  return ['string', 'number', 'boolean'].includes(typeof value) || value === null
}

function sanitizeValue(value) {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    return value.slice(0, 120)
  }

  return undefined
}

function sanitizePayload(payload = {}) {
  return Object.entries(payload).reduce((safePayload, [key, value]) => {
    if (SENSITIVE_KEY_PATTERN.test(key) || !isSafeValue(value)) {
      return safePayload
    }

    const safeValue = sanitizeValue(value)

    if (safeValue !== undefined) {
      safePayload[key] = safeValue
    }

    return safePayload
  }, {})
}

function increment(target, key) {
  if (!key) {
    return
  }

  target[key] = (target[key] || 0) + 1
}

function updateFunnel(action, payload) {
  if (payload.surface === 'public_seo' || action.endsWith('_viewed')) {
    debugState.funnel.seo_page += 1
  }

  if (action === 'signup_success') {
    debugState.funnel.signup += 1
  }

  if (action.startsWith('first_')) {
    debugState.funnel.first_action += 1
  }

  if (action === 'report_generated') {
    debugState.funnel.report_generation += 1
  }

  if (action === 'report_exported' || action === 'csv_exported' || action === 'report_shared') {
    debugState.funnel.export += 1
  }
}

function recordDebugEvent(action, payload) {
  const timestamp = new Date().toISOString()
  const event = {
    action,
    timestamp,
    ...payload,
  }

  debugState.events = [event, ...debugState.events].slice(0, MAX_DEBUG_EVENTS)
  increment(debugState.counts, action)

  if (payload.path) {
    increment(debugState.pages, payload.path)
  }

  if (payload.feature) {
    increment(debugState.features, payload.feature)
  }

  if (payload.calculator_type) {
    increment(debugState.calculators, payload.calculator_type)
  }

  if (payload.report_type) {
    increment(debugState.reports, payload.report_type)
  }

  if (action.includes('export') || action.includes('shared')) {
    increment(debugState.exports, payload.report_type || payload.export_type || action)
  }

  if (Object.hasOwn(debugState.auth, action)) {
    debugState.auth[action] += 1
  }

  updateFunnel(action, payload)
}

function getAttribution() {
  if (typeof window === 'undefined') {
    return {}
  }

  const params = new URLSearchParams(window.location.search || '')
  let referrer_host

  try {
    referrer_host = document.referrer ? new URL(document.referrer).host : ''
  } catch {
    referrer_host = ''
  }

  return {
    referrer_host,
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
  }
}

function shouldExposeDebugDashboard() {
  if (typeof window === 'undefined') {
    return false
  }

  return import.meta.env.DEV || ['localhost', '127.0.0.1'].includes(window.location.hostname)
}

function buildSummary() {
  const leastUsedFeatures = Object.entries(debugState.features)
    .sort((first, second) => first[1] - second[1])
    .slice(0, 10)
  const deadFeatureCandidates = KNOWN_FEATURES.filter((feature) => !debugState.features[feature])

  return {
    topPages: debugState.pages,
    topFeatures: debugState.features,
    leastUsedFeatures,
    deadFeatureCandidates,
    topCalculators: debugState.calculators,
    reportUsage: debugState.reports,
    exportUsage: debugState.exports,
    signupConversion: {
      signupOpen: debugState.auth.signup_open,
      signupSuccess: debugState.auth.signup_success,
      loginOpen: debugState.auth.login_open,
      loginSuccess: debugState.auth.login_success,
      authAbandon: debugState.auth.auth_abandon,
      signupSuccessRate:
        debugState.auth.signup_open > 0
          ? Number((debugState.auth.signup_success / debugState.auth.signup_open).toFixed(3))
          : 0,
    },
    funnel: debugState.funnel,
    eventCounts: debugState.counts,
    recentEvents: debugState.events.slice(0, 25),
  }
}

function exposeDebugDashboard() {
  if (!shouldExposeDebugDashboard()) {
    return
  }

  window.__FBPLY_ANALYTICS__ = {
    events: () => [...debugState.events],
    summary: buildSummary,
    reset: () => {
      debugState.events = []
      debugState.counts = {}
      debugState.pages = {}
      debugState.features = {}
      debugState.calculators = {}
      debugState.reports = {}
      debugState.exports = {}
      Object.keys(debugState.auth).forEach((key) => {
        debugState.auth[key] = 0
      })
      Object.keys(debugState.funnel).forEach((key) => {
        debugState.funnel[key] = 0
      })
    },
  }
}

export function trackEvent(action, payload = {}) {
  const cleanAction = String(action || '').trim().replace(/^fbply_/, '') || 'event'
  const eventName = normalizeEventName(cleanAction)
  const safePayload = sanitizePayload(payload)

  recordDebugEvent(cleanAction, safePayload)

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, safePayload)
  }

  if (typeof window !== 'undefined') {
    exposeDebugDashboard()
  }
}

export function trackPublicPageView(path, pageType, payload = {}) {
  const action = PUBLIC_PAGE_EVENT_BY_TYPE[pageType] || 'public_page_viewed'
  trackEvent(action, {
    surface: 'public_seo',
    page_type: pageType || 'unknown',
    path,
    ...getAttribution(),
    ...payload,
  })
}

export function trackFeatureUsage(feature, payload = {}) {
  trackEvent('feature_used', {
    surface: 'app',
    feature,
    ...payload,
  })
}

export function trackActivation(action, payload = {}) {
  trackEvent(action, {
    surface: 'activation',
    activation_step: action,
    ...payload,
  })
}

export function getAnalyticsSummary() {
  return buildSummary()
}

if (typeof window !== 'undefined') {
  exposeDebugDashboard()
}
