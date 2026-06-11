import { aggregateExpenses } from './categoryIntelligence.js'
import { addMoney, normalizeMoney, sumMoney } from './money.js'

const DAY_MS = 24 * 60 * 60 * 1000
const RECENT_ACTIVITY_DAYS = 35
const MONEY_SCORE_SYSTEM = 'v7.6-money-health'
const BUILDING_LABEL = 'Building your Money Health'

const FACTOR_WEIGHTS = Object.freeze({
  billCoverage: 0.3,
  spendingStability: 0.2,
  savingsConsistency: 0.2,
  repaymentStatus: 0.15,
  collectionStatus: 0.15,
})

const DISPLAY_LABELS = Object.freeze([
  { key: 'excellent', label: 'Excellent', min: 80, tone: 'success' },
  { key: 'healthy', label: 'Healthy', min: 65, tone: 'success' },
  { key: 'moderate', label: 'Moderate', min: 50, tone: 'tint' },
  { key: 'attention_needed', label: 'Attention Needed', min: 25, tone: 'warning' },
  { key: 'critical', label: 'Critical', min: 0, tone: 'danger' },
])

function safeAmount(value, options = {}) {
  return normalizeMoney(value, options)
}

function clamp(value, min = 0, max = 100) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return min
  }

  return Math.min(Math.max(number, min), max)
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function roundScore(value) {
  return Math.round(clamp(value))
}

function todayKey(now = new Date()) {
  return new Date(now).toISOString().slice(0, 10)
}

function normalizeDateKey(value) {
  const clean = String(value || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : ''
}

function daysSince(value, now = new Date()) {
  const clean = normalizeDateKey(value)

  if (!clean) {
    return Number.POSITIVE_INFINITY
  }

  const date = new Date(`${clean}T00:00:00`)
  const anchor = new Date(`${todayKey(now)}T00:00:00`)
  return Math.floor((anchor.getTime() - date.getTime()) / DAY_MS)
}

function isRecent(value, now = new Date(), days = RECENT_ACTIVITY_DAYS) {
  const age = daysSince(value, now)
  return age >= 0 && age <= days
}

function isBeforeToday(value, now = new Date()) {
  const clean = normalizeDateKey(value)
  return Boolean(clean) && clean < todayKey(now)
}

function hasRecentUpdate(item = {}, now = new Date()) {
  return [item.updatedAt, item.createdAt, item.settledAt, item.receivedAt, item.date]
    .filter(Boolean)
    .some((date) => isRecent(date, now))
}

function moneyBookDue(entry = {}) {
  return addMoney(entry.amount, entry.interest)
}

function normalizeMoneyBookEntry(entry = {}, index = 0) {
  const kind = entry.kind === 'taken' || entry.type === 'taken' || entry.direction === 'taken' ? 'taken' : 'given'
  const date = normalizeDateKey(entry.date || entry.entryDate || entry.createdAt) || todayKey()
  const status = entry.status === 'settled' || entry.status === 'completed' || entry.status === 'paid'
    ? 'settled'
    : 'pending'

  return {
    id: entry.id || `money-book-${index}`,
    kind,
    amount: safeAmount(entry.amount),
    interest: safeAmount(entry.interest || entry.vyaj),
    status,
    date,
    dueDate: normalizeDateKey(entry.dueDate || entry.due || entry.due_date),
    settledAt: status === 'settled' ? entry.settledAt || entry.completedAt || entry.receivedAt || '' : '',
    updatedAt: entry.updatedAt || entry.createdAt || entry.settledAt || '',
    createdAt: entry.createdAt || '',
  }
}

function normalizeMoneyBookEntries(entries = [], summary = {}) {
  const source = Array.isArray(entries) && entries.length > 0
    ? entries
    : Array.isArray(summary.visibleEntries)
      ? summary.visibleEntries
      : []

  return source
    .map(normalizeMoneyBookEntry)
    .filter((entry) => entry.amount > 0)
}

function labelForScore(score) {
  return DISPLAY_LABELS.find((item) => score >= item.min) || DISPLAY_LABELS[DISPLAY_LABELS.length - 1]
}

function cap(max, reason, factor) {
  return { max, reason, factor }
}

function buildBillCoverageFactor(financialState = {}) {
  const income = safeAmount(financialState.income)
  const committed = safeAmount(financialState.committed)
  const fixedTotal = Math.max(
    safeAmount(financialState.fixedTotal),
    safeAmount(financialState.fixedExpensesTotal),
  )
  const emiAmount = Math.max(
    safeAmount(financialState.emiAmount),
    safeAmount(financialState.existingEmiTotal),
  )
  const knownBills = committed > 0 ||
    fixedTotal > 0 ||
    emiAmount > 0 ||
    (Array.isArray(financialState.commitments) && financialState.commitments.length > 0)

  if (!knownBills && income <= 0) {
    return null
  }

  const safeRoom = safeAmount(financialState.safeToSpend ?? financialState.breathingRoom, { allowNegative: true })
  const flexibility = safeAmount(financialState.flexibility ?? financialState.remainingFlexibility, { allowNegative: true })
  const usagePercent = Number.isFinite(Number(financialState.usagePercent))
    ? finiteNumber(financialState.usagePercent)
    : income > 0
      ? (Math.max(committed, fixedTotal) / income) * 100
      : 100
  const emiLoad = Number.isFinite(Number(financialState.emiLoad))
    ? finiteNumber(financialState.emiLoad)
    : income > 0
      ? (emiAmount / income) * 100
      : emiAmount > 0
        ? 50
        : 0
  const roomBonus = safeRoom >= 0 ? 8 : -22
  const pressurePenalty = financialState.pressureTone === 'slight-pressure' ? 10 : 0
  const score = roundScore(100 - usagePercent * 0.55 - emiLoad * 0.35 + roomBonus - pressurePenalty)
  const uncovered = knownBills && (safeRoom < -0.01 || flexibility < -0.01)

  return {
    key: 'billCoverage',
    label: 'Bill coverage',
    weight: FACTOR_WEIGHTS.billCoverage,
    score,
    meaningful: income > 0 || knownBills,
    group: 'core',
    cap: uncovered ? cap(60, 'Bills need more room this month.', 'billCoverage') : null,
    positiveReason: 'Bills covered and savings protected.',
    negativeReason: 'Bills need more room this month.',
  }
}

function buildSpendingStabilityFactor(expenses = [], financialState = {}, now = new Date()) {
  const spendingEntries = expenses.filter((expense) => {
    const amount = safeAmount(expense.amount)
    const direction = String(expense.direction || '').toLowerCase()
    const category = String(expense.category || expense.label || '').toLowerCase()

    return amount > 0 && direction !== 'incoming' && category !== 'income'
  })

  if (spendingEntries.length === 0) {
    return null
  }

  const recentEntries = spendingEntries.filter((expense) => isRecent(expense.date || expense.createdAt, now))
  const spending = aggregateExpenses(spendingEntries)
  const topShare = spending.categories[0]?.share || 0
  const categorySpread = clamp((spending.categories.length / 4) * 100)
  const usagePercent = finiteNumber(financialState.usagePercent, 0)
  const lowConfidencePenalty = clamp(spending.lowConfidenceShare * 24, 0, 24)
  const sparse = recentEntries.length < 3 || spending.dataConfidence === 'low'
  const score = roundScore(
    100 -
      topShare * 42 +
      categorySpread * 0.16 -
      Math.max(usagePercent - 72, 0) * 0.65 -
      lowConfidencePenalty -
      (sparse ? 8 : 0),
  )

  return {
    key: 'spendingStability',
    label: 'Spending stability',
    weight: FACTOR_WEIGHTS.spendingStability,
    score,
    meaningful: recentEntries.length >= 2 || spendingEntries.length >= 3,
    group: 'core',
    cap: sparse ? cap(75, 'Recent spending data is still building.', 'spendingStability') : null,
    recentCount: recentEntries.length,
    positiveReason: 'Spending is staying readable this month.',
    negativeReason: 'Spending needs a calmer pattern this month.',
  }
}

function buildSavingsConsistencyFactor({ savingsBuckets = [], recommendation = null } = {}) {
  const bucketGoals = savingsBuckets
    .map((bucket) => ({
      saved: safeAmount(bucket.saved ?? bucket.currentAmount),
      target: safeAmount(bucket.target ?? bucket.targetAmount),
      monthlyContribution: safeAmount(bucket.monthlyContribution),
    }))
    .filter((bucket) => bucket.target > 0)
  const plannerTarget = safeAmount(recommendation?.targetAmount)
  const plannerGoal = plannerTarget > 0
    ? [{
        saved: safeAmount(recommendation?.currentSavings),
        target: plannerTarget,
        monthlyContribution: 0,
      }]
    : []
  const goals = [...bucketGoals, ...plannerGoal]

  if (goals.length === 0) {
    return null
  }

  const saved = sumMoney(goals, (goal) => goal.saved)
  const target = sumMoney(goals, (goal) => goal.target)
  const monthlyContribution = sumMoney(goals, (goal) => goal.monthlyContribution)
  const progress = target > 0 ? clamp((saved / target) * 100) : 0
  const contributionRatio = target > 0 ? clamp((monthlyContribution / target) * 100, 0, 20) : 0
  const contributionScore = monthlyContribution > 0
    ? clamp(48 + contributionRatio * 2.2, 48, 92)
    : saved > 0
      ? 44
      : 24
  const score = roundScore(progress * 0.72 + contributionScore * 0.24 + Math.min(goals.length, 3) * 2)

  return {
    key: 'savingsConsistency',
    label: 'Savings consistency',
    weight: FACTOR_WEIGHTS.savingsConsistency,
    score,
    meaningful: target > 0,
    group: 'support',
    cap: null,
    positiveReason: progress >= 65 ? 'Savings consistency improved.' : 'Savings goals show visible progress.',
    negativeReason: 'Savings goals need steadier progress.',
  }
}

function buildRepaymentStatusFactor({
  financialState = {},
  moneyBookSummary = {},
  moneyBookEntries = [],
  now = new Date(),
} = {}) {
  const entries = normalizeMoneyBookEntries(moneyBookEntries, moneyBookSummary)
  const pendingTaken = entries.filter((entry) => entry.kind === 'taken' && entry.status !== 'settled')
  const settledTaken = entries.filter((entry) => entry.kind === 'taken' && entry.status === 'settled')
  const payable = Math.max(safeAmount(moneyBookSummary.needToPay), sumMoney(pendingTaken, moneyBookDue))
  const borrowed = Math.max(safeAmount(moneyBookSummary.totalBorrowed), sumMoney(entries.filter((entry) => entry.kind === 'taken'), moneyBookDue))
  const settledThisMonth = safeAmount(moneyBookSummary.settledThisMonth) ||
    sumMoney(settledTaken.filter((entry) => isRecent(entry.settledAt, now)), moneyBookDue)
  const activity = payable > 0 || borrowed > 0 || settledThisMonth > 0 || pendingTaken.length > 0 || settledTaken.length > 0

  if (!activity) {
    return null
  }

  const income = safeAmount(financialState.income)
  const room = safeAmount(financialState.safeToSpend ?? financialState.breathingRoom, { allowNegative: true })
  const base = income > 0 ? income : room > 0 ? room : Math.max(payable, 1)
  const payableRatio = base > 0 ? (payable / base) * 100 : payable > 0 ? 60 : 0
  const overdue = pendingTaken.some((entry) => entry.dueDate && isBeforeToday(entry.dueDate, now))
  const score = roundScore(
    (payable <= 0 && settledThisMonth > 0 ? 92 : 100) -
      payableRatio * 1.05 -
      pendingTaken.length * 8 +
      (settledThisMonth > 0 ? 12 : 0) -
      (overdue ? 18 : 0),
  )

  return {
    key: 'repaymentStatus',
    label: 'Repayment status',
    weight: FACTOR_WEIGHTS.repaymentStatus,
    score,
    meaningful: activity,
    group: 'support',
    cap: overdue ? cap(70, 'Pending repayments need attention.', 'repaymentStatus') : null,
    positiveReason: payable <= 0 ? 'Repayments look settled right now.' : 'Pending repayments are visible.',
    negativeReason: 'Pending repayments need attention.',
    hasRecentActivity: settledThisMonth > 0 || entries.some((entry) => hasRecentUpdate(entry, now)),
  }
}

function buildCollectionStatusFactor({
  financialState = {},
  moneyBookSummary = {},
  moneyBookEntries = [],
  sharedSummary = {},
  sharedGroups = [],
  now = new Date(),
} = {}) {
  const entries = normalizeMoneyBookEntries(moneyBookEntries, moneyBookSummary)
  const givenEntries = entries.filter((entry) => entry.kind === 'given')
  const pendingGiven = givenEntries.filter((entry) => entry.status !== 'settled')
  const pendingRecoverable = addMoney(safeAmount(sharedSummary.pendingRecoverable), safeAmount(moneyBookSummary.needToReceive))
  const receivedRecoveries = addMoney(safeAmount(sharedSummary.receivedRecoveries), safeAmount(moneyBookSummary.settledThisMonth))
  const hasSharedActivity = safeAmount(sharedSummary.activeGroups) > 0 ||
    pendingRecoverable > 0 ||
    receivedRecoveries > 0 ||
    sharedGroups.length > 0
  const hasGivenActivity = givenEntries.length > 0 || safeAmount(moneyBookSummary.totalGiven) > 0

  if (!hasSharedActivity && !hasGivenActivity) {
    return null
  }

  const income = safeAmount(financialState.income)
  const room = safeAmount(financialState.safeToSpend ?? financialState.breathingRoom)
  const base = income > 0 ? income : room > 0 ? room : Math.max(pendingRecoverable, 1)
  const recoverableRatio = base > 0 ? (pendingRecoverable / base) * 100 : pendingRecoverable > 0 ? 45 : 0
  const oldOpenCount = pendingGiven.filter((entry) => {
    const anchor = entry.dueDate || entry.date
    return daysSince(anchor, now) > 30
  }).length + sharedGroups.filter((group) => {
    const pending = safeAmount(group.pendingRecoverable)
    return pending > 0 && daysSince(group.date || group.createdAt, now) > 30
  }).length
  const score = roundScore(
    (pendingRecoverable <= 0 ? 88 : 100) -
      recoverableRatio * 0.85 -
      oldOpenCount * 10 +
      (receivedRecoveries > 0 ? 8 : 0),
  )

  return {
    key: 'collectionStatus',
    label: 'Collection status',
    weight: FACTOR_WEIGHTS.collectionStatus,
    score,
    meaningful: hasSharedActivity || hasGivenActivity,
    group: 'support',
    cap: null,
    positiveReason: pendingRecoverable <= 0 ? 'Shared expenses look settled right now.' : 'Shared expense recovery is visible.',
    negativeReason: 'Shared expense recovery is still open.',
    hasRecentActivity: receivedRecoveries > 0 ||
      givenEntries.some((entry) => hasRecentUpdate(entry, now)) ||
      sharedGroups.some((group) => hasRecentUpdate(group, now)),
  }
}

function buildLearningResult(reason = 'FBPLY needs more recent activity to score this safely.', factors = []) {
  return {
    system: MONEY_SCORE_SYSTEM,
    status: 'building',
    confidenceState: 'insufficient',
    score: null,
    scorePercent: null,
    labelKey: 'building',
    label: BUILDING_LABEL,
    tone: 'tint',
    badge: 'Building',
    explanation: reason,
    primaryFactor: 'confidence',
    factors,
    caps: [],
  }
}

function pickExplanation({ factors = [], appliedCaps = [] } = {}) {
  const strongestCap = appliedCaps[0]

  if (strongestCap) {
    return strongestCap.reason
  }

  const weakest = [...factors].sort((a, b) => a.score - b.score)[0]

  if (weakest && weakest.score < 55) {
    return weakest.negativeReason
  }

  const bill = factors.find((factor) => factor.key === 'billCoverage')
  const savings = factors.find((factor) => factor.key === 'savingsConsistency')

  if (bill?.score >= 65 && savings?.score >= 55) {
    return 'Bills covered and savings protected.'
  }

  const strongest = [...factors].sort((a, b) => b.score - a.score)[0]
  return strongest?.positiveReason || 'Money flow is readable this month.'
}

function primaryFactorFor({ factors = [], appliedCaps = [] } = {}) {
  if (appliedCaps[0]?.factor) {
    return appliedCaps[0].factor
  }

  const weakest = [...factors].sort((a, b) => a.score - b.score)[0]

  if (weakest?.score < 55) {
    return weakest.key
  }

  return [...factors].sort((a, b) => b.score - a.score)[0]?.key || 'moneyHealth'
}

export function ensureMoneyScoreRollbackFlag() {
  if (typeof window === 'undefined') {
    return
  }

  if (typeof window.__FBPLY_LEGACY_MONEY_SCORE__ === 'undefined') {
    window.__FBPLY_LEGACY_MONEY_SCORE__ = false
  }
}

export function isLegacyMoneyScoreEnabled() {
  return typeof window !== 'undefined' && Boolean(window.__FBPLY_LEGACY_MONEY_SCORE__)
}

export function buildMoneyScore({
  expenses = [],
  financialState = {},
  savingsBuckets = [],
  recommendation = null,
  moneyBookSummary = {},
  moneyBookEntries = [],
  sharedSummary = {},
  sharedGroups = [],
  now = new Date(),
} = {}) {
  const factors = [
    buildBillCoverageFactor(financialState),
    buildSpendingStabilityFactor(expenses, financialState, now),
    buildSavingsConsistencyFactor({ savingsBuckets, recommendation }),
    buildRepaymentStatusFactor({ financialState, moneyBookSummary, moneyBookEntries, now }),
    buildCollectionStatusFactor({
      financialState,
      moneyBookSummary,
      moneyBookEntries,
      sharedSummary,
      sharedGroups,
      now,
    }),
  ].filter(Boolean)
  const meaningfulFactors = factors.filter((factor) => factor.meaningful)
  const hasCore = meaningfulFactors.some((factor) => factor.group === 'core')
  const hasSupport = meaningfulFactors.some((factor) => factor.group === 'support')
  const recentExpenseCount = expenses.filter((expense) => isRecent(expense.date || expense.createdAt, now)).length
  const hasRecentMoneyActivity = meaningfulFactors.some((factor) => factor.hasRecentActivity) ||
    recentExpenseCount > 0 ||
    savingsBuckets.some((bucket) => hasRecentUpdate(bucket, now)) ||
    moneyBookEntries.some((entry) => hasRecentUpdate(entry, now)) ||
    sharedGroups.some((group) => hasRecentUpdate(group, now))
  const setupIncomplete = safeAmount(financialState.income) <= 0 && meaningfulFactors.length < 3

  if (meaningfulFactors.length < 2 || !hasCore || !hasSupport) {
    return buildLearningResult('FBPLY needs more recent activity to score this safely.', meaningfulFactors)
  }

  if (!hasRecentMoneyActivity && setupIncomplete) {
    return buildLearningResult('FBPLY needs more recent activity to score this safely.', meaningfulFactors)
  }

  const totalWeight = meaningfulFactors.reduce((total, factor) => total + factor.weight, 0)
  const rawScore = meaningfulFactors.reduce((total, factor) => total + factor.score * factor.weight, 0) / Math.max(totalWeight, 0.01)
  const confidenceCaps = meaningfulFactors.length === 2
    ? [cap(80, 'More real activity will make this signal steadier.', 'confidence')]
    : []
  const caps = meaningfulFactors
    .map((factor) => factor.cap)
    .filter(Boolean)
    .concat(confidenceCaps)
    .sort((a, b) => a.max - b.max)
  const cappedScore = caps.reduce((score, item) => Math.min(score, item.max), rawScore)
  const score = roundScore(cappedScore)
  const display = labelForScore(score)
  const explanation = pickExplanation({ factors: meaningfulFactors, appliedCaps: caps })

  return {
    system: MONEY_SCORE_SYSTEM,
    status: 'ready',
    confidenceState: 'sufficient',
    score,
    scorePercent: score,
    labelKey: display.key,
    label: display.label,
    tone: display.tone,
    badge: 'Ready',
    explanation,
    primaryFactor: primaryFactorFor({ factors: meaningfulFactors, appliedCaps: caps }),
    factors: meaningfulFactors.map((factor) => ({
      key: factor.key,
      label: factor.label,
      score: factor.score,
      weight: factor.weight,
      group: factor.group,
    })),
    caps,
  }
}

export const MONEY_HEALTH_BUILDING_LABEL = BUILDING_LABEL
