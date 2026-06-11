import { normalizeMoney } from './money.js'

const SMART_FEEDBACK_SYSTEM = 'v8.2-smart-feedback'

const HEALTH_RANK = Object.freeze({
  critical: 1,
  attention_needed: 2,
  moderate: 3,
  healthy: 4,
  excellent: 5,
})

const DESTINATIONS = Object.freeze({
  insights: { kind: 'tab', tab: 'reports', targetId: 'v82-smart-feedback-insights' },
  savings: { kind: 'tab', tab: 'planner', targetId: 'savings-goals-section' },
  bills: { kind: 'tab', tab: 'profile', targetId: 'profile-bills-section' },
  people: { kind: 'tab', tab: 'history', targetId: 'money-book-section' },
  dailyBook: { kind: 'tab', tab: 'home', targetId: 'daily-book-section' },
})

function message({
  type,
  title,
  detail,
  tone = 'tint',
  iconKey = 'check',
  label = 'Progress',
  destination = DESTINATIONS.insights,
}) {
  return {
    system: SMART_FEEDBACK_SYSTEM,
    id: `${SMART_FEEDBACK_SYSTEM}:${type}`,
    type,
    title,
    detail,
    tone,
    iconKey,
    label,
    destination,
  }
}

function safeAmount(value, options = {}) {
  return normalizeMoney(value, options)
}

function scoreValue(health = {}) {
  const score = Number(health.score)
  return Number.isFinite(score) ? score : null
}

function healthRank(health = {}) {
  return HEALTH_RANK[health.labelKey] || 0
}

function hasReadyMoneyHealth(health = {}) {
  return health?.system === 'v7.6-money-health' && health.status === 'ready'
}

function buildMoneyHealthImprovement({ financialHealth = {}, previousFinancialHealth = null } = {}) {
  const explanation = String(financialHealth.explanation || '')

  if (hasReadyMoneyHealth(financialHealth) && /\b(improved|improving|stronger)\b/i.test(explanation)) {
    return message({
      type: 'money_health_improvement',
      title: 'Money Health improvement is visible',
      detail: explanation,
      tone: 'success',
      iconKey: 'shieldCheck',
      label: 'Health',
      destination: DESTINATIONS.insights,
    })
  }

  if (!hasReadyMoneyHealth(financialHealth) || !hasReadyMoneyHealth(previousFinancialHealth)) {
    return null
  }

  const previousRank = healthRank(previousFinancialHealth)
  const currentRank = healthRank(financialHealth)
  const previousScore = scoreValue(previousFinancialHealth)
  const currentScore = scoreValue(financialHealth)
  const scoreImproved = previousScore !== null && currentScore !== null && currentScore - previousScore >= 8

  if (currentRank <= previousRank && !scoreImproved) {
    return null
  }

  return message({
    type: 'money_health_improvement',
    title: 'Money Health improved',
    detail: currentRank > previousRank
      ? `Moved from ${previousFinancialHealth.label} to ${financialHealth.label} after the latest update.`
      : 'Your Money Health moved up after the latest update.',
    tone: 'success',
    iconKey: 'shieldCheck',
    label: 'Health',
    destination: DESTINATIONS.insights,
  })
}

function normalizeGoal(bucket = {}, index = 0) {
  const target = safeAmount(bucket.target ?? bucket.targetAmount)
  const saved = safeAmount(bucket.saved ?? bucket.currentSavings ?? bucket.balance)

  if (target <= 0 || saved <= 0) {
    return null
  }

  return {
    id: String(bucket.id || `goal-${index}`),
    progress: Math.min(Math.round((saved / target) * 100), 100),
  }
}

function normalizePlannerGoal(recommendation = null) {
  const target = safeAmount(recommendation?.targetAmount)
  const saved = safeAmount(recommendation?.currentSavings)

  if (target <= 0 || saved <= 0) {
    return null
  }

  return {
    id: 'planner-goal',
    progress: Math.min(Math.round((saved / target) * 100), 100),
  }
}

function milestoneForProgress(progress) {
  if (progress >= 100) {
    return 100
  }

  if (progress >= 75) {
    return 75
  }

  if (progress >= 50) {
    return 50
  }

  if (progress >= 25) {
    return 25
  }

  return 0
}

function buildGoalProgressMilestone({ savingsBuckets = [], recommendation = null } = {}) {
  const buckets = Array.isArray(savingsBuckets) ? savingsBuckets : []
  const goals = [
    ...buckets.map(normalizeGoal),
    normalizePlannerGoal(recommendation),
  ].filter(Boolean)

  const bestGoal = goals
    .map((goal) => ({ ...goal, milestone: milestoneForProgress(goal.progress) }))
    .filter((goal) => goal.milestone > 0)
    .sort((first, second) => second.milestone - first.milestone || second.progress - first.progress)[0]

  if (!bestGoal) {
    return null
  }

  return message({
    type: 'goal_progress_milestone',
    title: bestGoal.milestone >= 100 ? 'A goal is fully funded' : 'A goal is past a milestone',
    detail: bestGoal.milestone >= 100
      ? 'One saved goal has reached its target in your current data.'
      : `One saved goal is past the ${bestGoal.milestone}% mark.`,
    tone: 'success',
    iconKey: 'target',
    label: 'Goal',
    destination: DESTINATIONS.savings,
  })
}

function factorScore(financialHealth = {}, key) {
  const factor = Array.isArray(financialHealth.factors)
    ? financialHealth.factors.find((item) => item.key === key)
    : null
  const score = Number(factor?.score)
  return Number.isFinite(score) ? score : null
}

function buildBillsCovered({ financialState = {}, financialHealth = {} } = {}) {
  const billScore = factorScore(financialHealth, 'billCoverage')
  const commitments = Array.isArray(financialState.commitments) ? financialState.commitments : []
  const hasKnownBills =
    commitments.length > 0 ||
    safeAmount(financialState.fixedTotal) > 0 ||
    safeAmount(financialState.fixedExpensesTotal) > 0 ||
    safeAmount(financialState.emiAmount) > 0
  const hasRoom = safeAmount(financialState.safeToSpend ?? financialState.breathingRoom, { allowNegative: true }) >= 0

  if (!hasKnownBills || safeAmount(financialState.income) <= 0 || (billScore !== null ? billScore < 65 : !hasRoom)) {
    return null
  }

  return message({
    type: 'bills_covered',
    title: 'Saved bills look covered',
    detail: "Income, saved bills, and current spending still leave room in this month's picture.",
    tone: 'success',
    iconKey: 'receipt',
    label: 'Bills',
    destination: DESTINATIONS.bills,
  })
}

function settledTakenThisMonth(moneyBookSummary = {}) {
  const entries = Array.isArray(moneyBookSummary.visibleEntries) ? moneyBookSummary.visibleEntries : []

  return entries.some((entry) => (
    entry?.kind === 'taken' &&
    entry.status === 'settled' &&
    safeAmount(entry.amount) > 0 &&
    entry.settledAt
  ))
}

function buildDebtImprovement({ moneyBookSummary = {} } = {}) {
  const hasRepaymentSettled = settledTakenThisMonth(moneyBookSummary)
  const borrowedIsSettled = safeAmount(moneyBookSummary.totalBorrowed) > 0 && safeAmount(moneyBookSummary.needToPay) <= 0

  if (!hasRepaymentSettled && !borrowedIsSettled) {
    return null
  }

  return message({
    type: 'debt_improvement',
    title: 'Repayment progress is visible',
    detail: hasRepaymentSettled
      ? 'A borrowed-money entry is marked settled in the current month.'
      : 'Borrowed-money entries for this month do not show a pending repayment.',
    tone: 'success',
    iconKey: 'wallet',
    label: 'Debt',
    destination: DESTINATIONS.people,
  })
}

function buildSpendingImprovement({ smartHomeInsights = [] } = {}) {
  const insights = Array.isArray(smartHomeInsights) ? smartHomeInsights : []
  const spendingInsight = insights.find((item) => (
    item?.kind === 'weekly' &&
    item.tone === 'good' &&
    /\bless\b/i.test(String(item.title || ''))
  ))

  if (!spendingInsight) {
    return null
  }

  return message({
    type: 'spending_improvement',
    title: 'Spending is easing',
    detail: 'Recent tracked spending is lower than the comparison period FBPLY already analyzed.',
    tone: 'success',
    iconKey: 'chartPie',
    label: 'Spending',
    destination: DESTINATIONS.dailyBook,
  })
}

function buildPositiveMonthlyProgress({ transactionSummary = {}, financialState = {} } = {}) {
  const count = Number(transactionSummary.count) || 0
  const safeRoom = safeAmount(financialState.safeToSpend ?? financialState.breathingRoom, { allowNegative: true })

  if (count < 3 || safeRoom < 0) {
    return null
  }

  return message({
    type: 'positive_monthly_progress',
    title: 'This month is readable',
    detail: 'Your current entries give FBPLY enough context to explain the month without guessing.',
    tone: 'tint',
    iconKey: 'sparkles',
    label: 'Month',
    destination: DESTINATIONS.insights,
  })
}

function buildNeutralOnTrack({ nextBestAction = null } = {}) {
  if (nextBestAction?.type === 'no_action_needed') {
    return message({
      type: 'neutral_on_track',
      title: 'No urgent item is showing',
      detail: 'FBPLY does not see an urgent saved obligation, collection, goal, or spending warning right now.',
      tone: 'tint',
      iconKey: 'check',
      label: 'On track',
      destination: DESTINATIONS.insights,
    })
  }

  return message({
    type: 'neutral_on_track',
    title: 'Feedback is staying calm',
    detail: 'Keep saved income, bills, goals, and entries current so FBPLY can stay factual.',
    tone: 'tint',
    iconKey: 'check',
    label: 'On track',
    destination: DESTINATIONS.insights,
  })
}

export function ensureSmartFeedbackRollbackFlag() {
  if (typeof window === 'undefined') {
    return
  }

  if (typeof window.__FBPLY_LEGACY_SMART_FEEDBACK__ === 'undefined') {
    window.__FBPLY_LEGACY_SMART_FEEDBACK__ = false
  }
}

export function isLegacySmartFeedbackEnabled() {
  return typeof window !== 'undefined' && Boolean(window.__FBPLY_LEGACY_SMART_FEEDBACK__)
}

export function buildSmartFeedback({
  financialHealth = {},
  previousFinancialHealth = null,
  financialState = {},
  savingsBuckets = [],
  recommendation = null,
  moneyBookSummary = {},
  smartHomeInsights = [],
  transactionSummary = {},
  nextBestAction = null,
} = {}) {
  if (isLegacySmartFeedbackEnabled()) {
    return null
  }

  return buildMoneyHealthImprovement({ financialHealth, previousFinancialHealth }) ||
    buildGoalProgressMilestone({ savingsBuckets, recommendation }) ||
    buildBillsCovered({ financialState, financialHealth }) ||
    buildDebtImprovement({ moneyBookSummary }) ||
    buildSpendingImprovement({ smartHomeInsights }) ||
    buildPositiveMonthlyProgress({ transactionSummary, financialState }) ||
    buildNeutralOnTrack({ nextBestAction })
}
