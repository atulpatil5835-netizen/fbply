import { addMoney, normalizeMoney, sumMoney } from './money.js'
import { normalizeCommitments } from './ruleEngine.js'

const DAY_MS = 24 * 60 * 60 * 1000
const NEXT_ACTION_SYSTEM = 'v7.8-next-action'
const UPCOMING_DAYS = 7
const GOAL_DEADLINE_DAYS = 14

const DESTINATIONS = Object.freeze({
  addExpense: { kind: 'sheet', sheet: 'expense' },
  bills: { kind: 'tab', tab: 'profile', targetId: 'profile-bills-section' },
  dailyBook: { kind: 'tab', tab: 'home', targetId: 'daily-book-section' },
  moneyBook: { kind: 'tab', tab: 'history', targetId: 'money-book-section' },
  savings: { kind: 'tab', tab: 'planner', targetId: 'savings-goals-section' },
  shared: { kind: 'tab', tab: 'history', targetId: 'shared-expenses-section' },
})

function pad(value) {
  return String(value).padStart(2, '0')
}

function dateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return dateKey(new Date())
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function normalizeDateKey(value, fallback = '') {
  if (value instanceof Date) {
    return dateKey(value)
  }

  const clean = String(value || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : fallback
}

function startOfDay(key) {
  const parsed = new Date(`${normalizeDateKey(key, dateKey())}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? new Date(`${dateKey()}T00:00:00`) : parsed
}

function daysUntil(date, now = new Date()) {
  const clean = normalizeDateKey(date)

  if (!clean) {
    return Number.POSITIVE_INFINITY
  }

  return Math.round((startOfDay(clean).getTime() - startOfDay(dateKey(now)).getTime()) / DAY_MS)
}

function clamp(value, min, max) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return min
  }

  return Math.min(Math.max(number, min), max)
}

function hasPositiveAmount(value) {
  return normalizeMoney(value) > 0
}

function isEmiLike(value = '') {
  return /\b(emi|loan|installment|instalment|finance|bnpl)\b/i.test(String(value || ''))
}

function pendingStatus(item = {}) {
  const status = String(item.status || item.state || '').toLowerCase()
  return !['settled', 'completed', 'paid', 'received', 'closed', 'done'].includes(status)
}

function dueAmount(entry = {}) {
  return addMoney(entry.amount, entry.interest || entry.vyaj)
}

function actionCandidate({
  id,
  type,
  title,
  action,
  reason,
  destination,
  priority,
  completionRule,
  amount,
  amountRequired = false,
  sourceId = '',
  dueDate = '',
  confirmed = false,
  direct = true,
  userCreated = true,
  tone = 'tint',
  iconKey = 'sparkles',
  badge = '',
  now = new Date(),
}) {
  const candidateDaysUntil = daysUntil(dueDate, now)

  return {
    system: NEXT_ACTION_SYSTEM,
    id,
    type,
    title,
    action,
    reason,
    destination,
    priority,
    completionRule,
    amount,
    amountRequired,
    sourceId,
    dueDate,
    daysUntil: Number.isFinite(candidateDaysUntil) ? candidateDaysUntil : Number.POSITIVE_INFINITY,
    dueToday: normalizeDateKey(dueDate) === dateKey(now),
    confirmed: Boolean(confirmed),
    direct: Boolean(direct),
    userCreated: Boolean(userCreated),
    tone,
    iconKey,
    badge,
  }
}

function noActionFallback() {
  return actionCandidate({
    id: 'no-action-needed',
    type: 'no_action_needed',
    title: "You're on track.",
    action: 'View activity',
    reason: 'No urgent obligation, collection, savings, or spending warning needs attention today.',
    destination: DESTINATIONS.dailyBook,
    priority: 0,
    completionRule: { type: 'viewed_activity', metric: 'activity_viewed', comparison: 'view' },
    confirmed: true,
    direct: true,
    userCreated: false,
    tone: 'success',
    iconKey: 'check',
    badge: 'On track',
  })
}

function normalizeMoneyBookEntry(entry = {}, index = 0) {
  const kind = entry.kind === 'taken' || entry.type === 'taken' || entry.direction === 'taken'
    ? 'taken'
    : 'given'

  return {
    id: String(entry.id || `money-book-${index}`),
    kind,
    amount: normalizeMoney(entry.amount),
    interest: normalizeMoney(entry.interest || entry.vyaj),
    dueDate: normalizeDateKey(entry.dueDate || entry.due || entry.due_date),
    status: String(entry.status || '').toLowerCase() || 'pending',
    createdAt: entry.createdAt || entry.date || '',
    updatedAt: entry.updatedAt || entry.settledAt || entry.createdAt || '',
  }
}

function normalizeGoal(bucket = {}, index = 0) {
  const target = normalizeMoney(bucket.target || bucket.targetAmount)
  const saved = normalizeMoney(bucket.saved || bucket.currentSavings || bucket.balance)

  return {
    id: String(bucket.id || `goal-${index}`),
    target,
    saved,
    deadline: normalizeDateKey(bucket.deadline || bucket.dueDate || bucket.targetDate),
    active: target > 0 && saved < target,
    amountNeeded: Math.max(target - saved, 0),
    monthlyContribution: normalizeMoney(bucket.monthlyContribution),
    createdAt: bucket.createdAt || '',
  }
}

function eventAmount(event = {}) {
  return normalizeMoney(event.amount)
}

function candidateKey(candidate) {
  return [
    candidate.type,
    candidate.destination?.kind,
    candidate.destination?.tab,
    candidate.destination?.targetId,
    candidate.dueDate,
    candidate.sourceId || candidate.id,
  ].join('|')
}

function shouldKeepCandidate(candidate) {
  if (!candidate?.destination || !candidate.title || !candidate.action || !candidate.reason) {
    return false
  }

  if (candidate.amountRequired && !hasPositiveAmount(candidate.amount)) {
    return false
  }

  return Number.isFinite(Number(candidate.priority))
}

function sortCandidates(first, second) {
  if (second.priority !== first.priority) {
    return second.priority - first.priority
  }

  if (Number(second.confirmed) !== Number(first.confirmed)) {
    return Number(second.confirmed) - Number(first.confirmed)
  }

  if (Number(second.dueToday) !== Number(first.dueToday)) {
    return Number(second.dueToday) - Number(first.dueToday)
  }

  if (first.daysUntil !== second.daysUntil) {
    return first.daysUntil - second.daysUntil
  }

  if (Number(second.direct) !== Number(first.direct)) {
    return Number(second.direct) - Number(first.direct)
  }

  if (Number(second.userCreated) !== Number(first.userCreated)) {
    return Number(second.userCreated) - Number(first.userCreated)
  }

  return String(first.id).localeCompare(String(second.id))
}

function topCandidate(candidates = []) {
  const seen = new Set()

  return candidates
    .filter(shouldKeepCandidate)
    .filter((candidate) => {
      const key = candidateKey(candidate)

      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
    .sort(sortCandidates)[0] || noActionFallback()
}

function buildOverdueCandidates({ financialCalendarEvents = [], moneyBookEntries = [], savingsBuckets = [], now = new Date() }) {
  const today = dateKey(now)
  const candidates = []

  financialCalendarEvents
    .filter((event) => event && event.direction === 'outgoing' && normalizeDateKey(event.dueDate) < today)
    .filter((event) => event.source !== 'money-book-pending' && event.source !== 'shared-settlement-liability')
    .forEach((event) => {
      const lateBy = Math.abs(daysUntil(event.dueDate, now))
      const emi = event.type === 'EMI' || isEmiLike(event.title)

      candidates.push(actionCandidate({
        id: `overdue-calendar-${event.id || event.scheduleId || event.dueDate}`,
        sourceId: event.id || event.scheduleId || '',
        type: 'overdue_obligation',
        title: emi ? 'Review overdue EMI' : 'Review overdue bill',
        action: 'Open bills',
        reason: 'A saved obligation appears past its due date.',
        destination: DESTINATIONS.bills,
        priority: 100 + clamp(lateBy, 0, 9),
        completionRule: { type: 'bill_reviewed', metric: 'bill_reviewed', comparison: 'view' },
        amount: eventAmount(event),
        amountRequired: true,
        dueDate: event.dueDate,
        now,
        confirmed: true,
        tone: 'warning',
        iconKey: emi ? 'creditCard' : 'receipt',
        badge: 'Review',
      }))
    })

  moneyBookEntries
    .map(normalizeMoneyBookEntry)
    .filter((entry) => entry.kind === 'taken' && pendingStatus(entry) && hasPositiveAmount(dueAmount(entry)))
    .filter((entry) => entry.dueDate && entry.dueDate < today)
    .forEach((entry) => {
      const lateBy = Math.abs(daysUntil(entry.dueDate, now))

      candidates.push(actionCandidate({
        id: `overdue-repayment-${entry.id}`,
        sourceId: entry.id,
        type: 'overdue_obligation',
        title: 'Review overdue payment',
        action: 'Open Money Book',
        reason: 'A saved repayment appears past its due date.',
        destination: DESTINATIONS.moneyBook,
        priority: 100 + clamp(lateBy, 0, 9),
        completionRule: { type: 'settlement_completed', metric: 'people_pending_total', comparison: 'decrease' },
        amount: dueAmount(entry),
        amountRequired: true,
        dueDate: entry.dueDate,
        now,
        confirmed: true,
        tone: 'warning',
        iconKey: 'creditCard',
        badge: 'Overdue',
      }))
    })

  savingsBuckets
    .map(normalizeGoal)
    .filter((goal) => goal.active && goal.deadline && goal.deadline < today)
    .forEach((goal) => {
      const lateBy = Math.abs(daysUntil(goal.deadline, now))

      candidates.push(actionCandidate({
        id: `overdue-goal-${goal.id}`,
        sourceId: goal.id,
        type: 'overdue_obligation',
        title: 'Review goal timeline',
        action: 'Open Savings',
        reason: 'A goal deadline has passed and the target is not complete.',
        destination: DESTINATIONS.savings,
        priority: 100 + clamp(lateBy, 0, 9),
        completionRule: { type: 'goal_updated', metric: 'savings_signature', comparison: 'changed' },
        amount: goal.amountNeeded,
        amountRequired: true,
        dueDate: goal.deadline,
        now,
        confirmed: true,
        tone: 'warning',
        iconKey: 'target',
        badge: 'Timeline',
      }))
    })

  return candidates
}

function buildUpcomingCandidates({
  financialCalendarEvents = [],
  moneyBookEntries = [],
  moneyBookSummary = {},
  sharedSummary = {},
  now = new Date(),
}) {
  const candidates = []

  financialCalendarEvents
    .filter((event) => event && event.direction === 'outgoing' && eventAmount(event) > 0)
    .filter((event) => {
      const gap = daysUntil(event.dueDate, now)
      return gap >= 0 && gap <= UPCOMING_DAYS
    })
    .filter((event) => event.source !== 'money-book-pending' && !String(event.source || '').includes('settlement'))
    .forEach((event) => {
      const gap = daysUntil(event.dueDate, now)
      const emi = event.type === 'EMI' || isEmiLike(event.title)

      candidates.push(actionCandidate({
        id: `${emi ? 'upcoming-emi' : 'upcoming-bill'}-${event.id || event.scheduleId || event.dueDate}`,
        sourceId: event.id || event.scheduleId || '',
        type: emi ? 'upcoming_emi' : 'upcoming_bill',
        title: emi ? 'Review upcoming EMI' : 'Review upcoming bill',
        action: 'Open bills',
        reason: emi ? 'An EMI-like commitment is due soon.' : 'A recurring bill is due soon.',
        destination: DESTINATIONS.bills,
        priority: (emi ? 89 : 86) - clamp(gap, 0, UPCOMING_DAYS),
        completionRule: { type: 'bill_reviewed', metric: 'bill_reviewed', comparison: 'view' },
        amount: eventAmount(event),
        amountRequired: true,
        dueDate: event.dueDate,
        now,
        confirmed: true,
        tone: 'tint',
        iconKey: emi ? 'creditCard' : 'receipt',
        badge: gap === 0 ? 'Today' : 'Due soon',
      }))
    })

  moneyBookEntries
    .map(normalizeMoneyBookEntry)
    .filter((entry) => entry.kind === 'taken' && pendingStatus(entry) && hasPositiveAmount(dueAmount(entry)))
    .filter((entry) => {
      if (!entry.dueDate) {
        return false
      }

      const gap = daysUntil(entry.dueDate, now)
      return gap >= 0 && gap <= UPCOMING_DAYS
    })
    .forEach((entry) => {
      const gap = daysUntil(entry.dueDate, now)

      candidates.push(actionCandidate({
        id: `upcoming-repayment-${entry.id}`,
        sourceId: entry.id,
        type: 'upcoming_repayment',
        title: 'Review repayment',
        action: 'Open Money Book',
        reason: 'A saved repayment is open or due soon.',
        destination: DESTINATIONS.moneyBook,
        priority: 88 - clamp(gap, 0, UPCOMING_DAYS),
        completionRule: { type: 'settlement_completed', metric: 'people_pending_total', comparison: 'decrease' },
        amount: dueAmount(entry),
        amountRequired: true,
        dueDate: entry.dueDate,
        now,
        confirmed: true,
        tone: 'tint',
        iconKey: 'wallet',
        badge: gap === 0 ? 'Today' : 'Due soon',
      }))
    })

  if (normalizeMoney(moneyBookSummary.needToPay) > 0) {
    candidates.push(actionCandidate({
      id: 'upcoming-repayment-money-book-open',
      type: 'upcoming_repayment',
      title: 'Review repayment',
      action: 'Open Money Book',
      reason: 'A saved repayment is open or due soon.',
      destination: DESTINATIONS.moneyBook,
      priority: 81,
      completionRule: { type: 'settlement_completed', metric: 'people_pending_total', comparison: 'decrease' },
      amount: moneyBookSummary.needToPay,
      amountRequired: true,
      confirmed: true,
      tone: 'tint',
      iconKey: 'wallet',
      badge: 'Pending',
    }))
  }

  if (normalizeMoney(sharedSummary.pendingLiability) > 0) {
    candidates.push(actionCandidate({
      id: 'upcoming-repayment-shared-liability',
      type: 'upcoming_repayment',
      title: 'Review repayment',
      action: 'Open People',
      reason: 'A saved shared payment is still pending.',
      destination: DESTINATIONS.shared,
      priority: 80,
      completionRule: { type: 'settlement_completed', metric: 'people_pending_total', comparison: 'decrease' },
      amount: sharedSummary.pendingLiability,
      amountRequired: true,
      confirmed: true,
      tone: 'tint',
      iconKey: 'wallet',
      badge: 'Pending',
    }))
  }

  return candidates
}

function buildSavingsCandidates({ savingsBuckets = [], financialState = {}, safeToSpend = {}, now = new Date() }) {
  const goals = savingsBuckets.map(normalizeGoal)
  const safeRoom = Math.max(
    normalizeMoney(financialState.safeToSpend, { allowNegative: true }),
    normalizeMoney(financialState.breathingRoom, { allowNegative: true }),
    normalizeMoney(financialState.remainingFlexibility, { allowNegative: true }),
    normalizeMoney(safeToSpend.comfortablyUsable, { allowNegative: true }),
  )
  const candidates = []

  goals
    .filter((goal) => goal.active && goal.deadline)
    .filter((goal) => {
      const gap = daysUntil(goal.deadline, now)
      return gap >= 0 && gap <= GOAL_DEADLINE_DAYS
    })
    .forEach((goal) => {
      const gap = daysUntil(goal.deadline, now)

      candidates.push(actionCandidate({
        id: `goal-deadline-${goal.id}`,
        sourceId: goal.id,
        type: 'goal_deadline',
        title: 'Review goal timeline',
        action: 'Open Savings',
        reason: 'A goal deadline is near and the target is not complete.',
        destination: DESTINATIONS.savings,
        priority: 69 - clamp(Math.floor(gap / 2), 0, 7),
        completionRule: { type: 'goal_updated', metric: 'savings_signature', comparison: 'changed' },
        amount: goal.amountNeeded,
        amountRequired: true,
        dueDate: goal.deadline,
        now,
        confirmed: true,
        tone: 'tint',
        iconKey: 'target',
        badge: 'Goal',
      }))
    })

  const openGoal = goals.find((goal) => goal.active)

  if (openGoal && safeRoom > 0) {
    candidates.push(actionCandidate({
      id: `savings-contribution-${openGoal.id}`,
      sourceId: openGoal.id,
      type: 'savings_contribution',
      title: 'Add to goal',
      action: 'Open Savings',
      reason: 'A goal is active and no higher-priority obligation needs attention.',
      destination: DESTINATIONS.savings,
      priority: 60,
      completionRule: { type: 'goal_updated', metric: 'savings_signature', comparison: 'changed' },
      amount: openGoal.amountNeeded,
      amountRequired: true,
      confirmed: true,
      tone: 'success',
      iconKey: 'target',
      badge: 'Goal',
    }))
  }

  return candidates
}

function buildCollectionCandidates({ moneyBookEntries = [], moneyBookSummary = {}, sharedSummary = {} }) {
  const candidates = []
  const openGivenTotal = sumMoney(
    moneyBookEntries
      .map(normalizeMoneyBookEntry)
      .filter((entry) => entry.kind === 'given' && pendingStatus(entry)),
    dueAmount,
  )
  const moneyToCollect = Math.max(normalizeMoney(moneyBookSummary.needToReceive), openGivenTotal)

  if (moneyToCollect > 0) {
    candidates.push(actionCandidate({
      id: 'collection-money-book',
      type: 'money_to_collect',
      title: 'Collect pending money',
      action: 'Open People',
      reason: 'Saved borrow or lend money is still pending.',
      destination: DESTINATIONS.moneyBook,
      priority: 49,
      completionRule: { type: 'settlement_completed', metric: 'people_pending_total', comparison: 'decrease' },
      amount: moneyToCollect,
      amountRequired: true,
      confirmed: true,
      tone: 'success',
      iconKey: 'wallet',
      badge: 'Pending',
    }))
  }

  if (normalizeMoney(sharedSummary.pendingRecoverable) > 0) {
    candidates.push(actionCandidate({
      id: 'collection-shared',
      type: 'money_to_collect',
      title: 'Collect pending money',
      action: 'Open People',
      reason: 'Saved shared money is still pending.',
      destination: DESTINATIONS.shared,
      priority: 48,
      completionRule: { type: 'settlement_completed', metric: 'people_pending_total', comparison: 'decrease' },
      amount: sharedSummary.pendingRecoverable,
      amountRequired: true,
      confirmed: true,
      tone: 'success',
      iconKey: 'wallet',
      badge: 'Pending',
    }))
  }

  return candidates
}

function buildSpendingCandidates({ financialState = {}, smartHomeInsights = {} }) {
  const usagePercent = Number(financialState.usagePercent)
  const pressureTone = String(financialState.pressureTone || smartHomeInsights.pressureTone || '').toLowerCase()
  const safeRoom = normalizeMoney(financialState.safeToSpend ?? financialState.breathingRoom, { allowNegative: true })
  const pressure = ['slight-pressure', 'pressure', 'tight', 'warning', 'danger'].includes(pressureTone)
  const usageWarning = Number.isFinite(usagePercent) && usagePercent >= 76

  if (!pressure && !usageWarning && safeRoom >= 0) {
    return []
  }

  return [
    actionCandidate({
      id: 'spending-warning',
      type: 'spending_warning',
      title: 'Review spending',
      action: 'Open Daily Book',
      reason: 'Recent spending or monthly pressure needs attention.',
      destination: DESTINATIONS.dailyBook,
      priority: usagePercent >= 85 || safeRoom < 0 ? 29 : 24,
      completionRule: { type: 'expense_reviewed', metric: 'activity_viewed', comparison: 'view' },
      confirmed: true,
      direct: true,
      userCreated: false,
      tone: 'warning',
      iconKey: 'receipt',
      badge: 'Review',
    }),
  ]
}

function buildStarterCandidates({ expenses = [], savingsBuckets = [], reportHistory = [] }) {
  const hasExpenses = Array.isArray(expenses) && expenses.some((expense) => hasPositiveAmount(expense.amount))
  const goals = savingsBuckets.map(normalizeGoal)
  const hasOpenGoal = goals.some((goal) => goal.active)
  const hasAnyGoal = goals.length > 0
  const hasReports = Array.isArray(reportHistory) && reportHistory.length > 0

  if (!hasExpenses) {
    return [
      actionCandidate({
        id: 'starter-first-expense',
        type: 'starter_action',
        title: 'Add first expense',
        action: 'Add expense',
        reason: 'FBPLY needs real activity before it can recommend confidently.',
        destination: DESTINATIONS.addExpense,
        priority: 9,
        completionRule: { type: 'expense_created', metric: 'expense_count', comparison: 'increase' },
        confirmed: true,
        direct: true,
        userCreated: false,
        tone: 'tint',
        iconKey: 'plus',
        badge: 'Start',
      }),
    ]
  }

  if (!hasOpenGoal && !hasAnyGoal && (hasExpenses || hasReports)) {
    return [
      actionCandidate({
        id: 'starter-savings-goal',
        type: 'starter_action',
        title: 'Add a savings goal',
        action: 'Open Savings',
        reason: 'A saved goal helps FBPLY guide the next money move.',
        destination: DESTINATIONS.savings,
        priority: 8,
        completionRule: { type: 'goal_created', metric: 'goal_count', comparison: 'increase' },
        confirmed: true,
        direct: true,
        userCreated: false,
        tone: 'tint',
        iconKey: 'target',
        badge: 'Setup',
      }),
    ]
  }

  return []
}

export function ensureNextActionRollbackFlag() {
  if (typeof window === 'undefined') {
    return
  }

  if (typeof window.__FBPLY_LEGACY_NEXT_ACTION__ === 'undefined') {
    window.__FBPLY_LEGACY_NEXT_ACTION__ = false
  }
}

export function isLegacyNextActionEnabled() {
  return typeof window !== 'undefined' && Boolean(window.__FBPLY_LEGACY_NEXT_ACTION__)
}

export function buildNextBestAction({
  profile = {},
  financialState = {},
  safeToSpend = {},
  expenses = [],
  savingsBuckets = [],
  recommendation = null,
  sharedSummary = {},
  sharedGroups = [],
  moneyBookEntries = [],
  moneyBookSummary = {},
  financialCalendarEvents = [],
  moneyReminders = [],
  reportHistory = [],
  smartHomeInsights = {},
  now = new Date(),
} = {}) {
  if (isLegacyNextActionEnabled()) {
    return null
  }

  const commitments = normalizeCommitments(profile)
  const candidates = [
    ...buildOverdueCandidates({ financialCalendarEvents, moneyBookEntries, savingsBuckets, now }),
    ...buildUpcomingCandidates({ financialCalendarEvents, moneyBookEntries, moneyBookSummary, sharedSummary, now }),
    ...buildSavingsCandidates({ savingsBuckets, financialState, safeToSpend, recommendation, now }),
    ...buildCollectionCandidates({ moneyBookEntries, moneyBookSummary, sharedSummary, sharedGroups }),
    ...buildSpendingCandidates({ financialState, smartHomeInsights, moneyReminders }),
    ...buildStarterCandidates({ expenses, savingsBuckets, reportHistory, commitments }),
  ]

  return topCandidate(candidates)
}

export function getNextActionCompletionMetrics({
  expenses = [],
  savingsBuckets = [],
  moneyBookSummary = {},
  sharedSummary = {},
} = {}) {
  const goals = savingsBuckets.map(normalizeGoal)
  const activeGoals = goals.filter((goal) => goal.active)

  return {
    expense_count: Array.isArray(expenses) ? expenses.length : 0,
    goal_count: activeGoals.length,
    savings_signature: activeGoals
      .map((goal) => `${goal.id}:${goal.saved}:${goal.target}:${goal.deadline}`)
      .sort()
      .join('|'),
    people_pending_total: addMoney(
      moneyBookSummary.needToReceive,
      moneyBookSummary.needToPay,
      sharedSummary.pendingRecoverable,
      sharedSummary.pendingLiability,
    ),
    bill_reviewed: 0,
    activity_viewed: 0,
  }
}

export function hasNextActionCompletion(rule = {}, baselineMetrics = {}, currentMetrics = {}) {
  if (!rule || rule.comparison === 'view') {
    return false
  }

  const metric = rule.metric
  const baseline = baselineMetrics?.[metric]
  const current = currentMetrics?.[metric]

  if (rule.comparison === 'increase') {
    return Number(current || 0) > Number(baseline || 0)
  }

  if (rule.comparison === 'decrease') {
    return Number(current || 0) < Number(baseline || 0)
  }

  if (rule.comparison === 'changed') {
    return String(current ?? '') !== String(baseline ?? '')
  }

  return false
}
