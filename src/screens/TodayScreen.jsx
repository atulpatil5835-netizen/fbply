import { useEffect, useMemo } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChartPie,
  CheckCircle2,
  CreditCard,
  FileText,
  PiggyBank,
  Plane,
  Receipt,
  Sparkles,
  Store,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { getFinanceColor } from '../lib/financeColors'
import { reconcileSharedGroup } from '../lib/financialActivity'
import { getGreeting } from '../lib/financeVisuals'
import { normalizeMoney, sumMoney } from '../lib/money'
import { normalizeCommitments, rupees } from '../lib/ruleEngine'
import { trackEvent, trackFeatureUsage } from '../lib/analytics'
import {
  EmptyState,
  InsightCard,
  MoneyCard,
  MoneyOSProvider,
  PrimaryButton,
  SectionHeader,
  StatCard,
  StatusBadge,
} from '../design-system'

const HOME_PRESENTATION_VERSION =
  typeof window !== 'undefined' && window.__FBPLY_LEGACY_HOME__ ? 'legacy' : 'money-os-v2'

function buildDailyMoneyStatus(state, safeToSpend) {
  const safeAmount = normalizeMoney(safeToSpend?.comfortablyUsable)

  if (!normalizeMoney(state.income)) {
    return {
      title: 'Add income to see your safe spending.',
      detail: 'Once income is added, FBPly can guide the month more clearly.',
      tone: 'learning',
    }
  }

  if (state.pressureTone === 'slight-pressure') {
    return {
      title: 'This month feels slightly tight.',
      detail: safeAmount > 0
        ? `${rupees(safeAmount)} still looks usable with care.`
        : 'Keep today light and protect the basics first.',
      tone: 'tight',
    }
  }

  if (state.pressureTone === 'warm') {
    return {
      title: 'Go a little easy this week.',
      detail: safeAmount > 0
        ? `${rupees(safeAmount)} is safer for flexible spends right now.`
        : 'A small pause can keep the month comfortable.',
      tone: 'careful',
    }
  }

  if (state.pressureTone === 'balanced') {
    return {
      title: "You're still in a safe zone.",
      detail: 'Normal spending looks okay, just keep tracking small spends.',
      tone: 'steady',
    }
  }

  return {
    title: "You're doing good this month.",
    detail: 'You have healthy spending room today.',
    tone: 'good',
  }
}

function buildSingleTodayInsight({ smartHomeInsights = [], whatChangedInsights = [], calmSummaries = [], financialState }) {
  const firstSmart = smartHomeInsights.find((insight) => insight?.title || insight?.detail)

  if (firstSmart) {
    return {
      title: firstSmart.title || 'Money note',
      detail: firstSmart.detail || firstSmart.kicker || 'Your money picture is getting clearer.',
      tone: firstSmart.tone || 'balanced',
    }
  }

  const simpleDetail = whatChangedInsights[0] || calmSummaries[0]

  if (simpleDetail) {
    return {
      title: 'Small money note',
      detail: simpleDetail,
      tone: financialState?.pressureTone || 'balanced',
    }
  }

  return {
    title: 'Start tracking to unlock smarter notes.',
    detail: 'Add a few expenses and FBPly will keep the insights short and useful.',
    tone: 'learning',
  }
}

function trackHomeInteraction(action, detail = {}) {
  if (action !== 'next_action_clicked' && String(action || '').startsWith('next_action')) {
    trackEvent('next_action_clicked', {
      screen: 'home',
    })
  }

  trackEvent(action, {
    surface: 'today',
    ...detail,
  })
}

function navigateFromHome(setActiveTab, tab, action, detail = {}) {
  trackHomeInteraction(action, detail)
  setActiveTab?.(tab)
}

function isEmiCommitmentName(name) {
  return /\b(emi|loan|installment|instalment|finance|bnpl)\b/i.test(String(name || ''))
}

function isSubscriptionCommitmentName(name) {
  return /\b(subscription|netflix|prime|spotify|internet|wifi|mobile|phone|cloud|software)\b/i.test(String(name || ''))
}

function todayDayNumber() {
  return new Date().getDate()
}

function isDueToday(dueDay) {
  return Number(dueDay || 1) === todayDayNumber()
}

function buildTodaysImportantItems({ profile = {}, moneyBookSummary = {}, sharedSummary = {} } = {}) {
  const items = []
  const salaryDay = Number(profile.salaryDay || 1)

  if (normalizeMoney(profile.income) > 0 && isDueToday(salaryDay)) {
    items.push({
      key: 'salary',
      label: 'Salary incoming',
      value: rupees(profile.income),
      tone: 'incoming',
      icon: Wallet,
    })
  }

  normalizeCommitments(profile).forEach((commitment) => {
    if (!isDueToday(commitment.dueDay) || normalizeMoney(commitment.amount) <= 0) {
      return
    }

    if (isEmiCommitmentName(commitment.name)) {
      items.push({
        key: `emi-${commitment.id || commitment.name}`,
        label: `${commitment.name || 'EMI'} due`,
        value: rupees(commitment.amount),
        tone: 'outgoing',
        icon: CreditCard,
      })
      return
    }

    if (isSubscriptionCommitmentName(commitment.name)) {
      items.push({
        key: `subscription-${commitment.id || commitment.name}`,
        label: `${commitment.name || 'Subscription'} due`,
        value: rupees(commitment.amount),
        tone: 'outgoing',
        icon: Receipt,
      })
    }
  })

  if (normalizeMoney(sharedSummary.pendingRecoverable) > 0) {
    items.push({
      key: 'shared-recoverable',
      label: 'Pending settlement',
      value: rupees(sharedSummary.pendingRecoverable),
      tone: 'incoming',
      icon: Plane,
    })
  }

  if (normalizeMoney(sharedSummary.pendingLiability) > 0) {
    items.push({
      key: 'shared-liability',
      label: 'Shared payment due',
      value: rupees(sharedSummary.pendingLiability),
      tone: 'outgoing',
      icon: Plane,
    })
  }

  if (normalizeMoney(moneyBookSummary.needToReceive) > 0) {
    items.push({
      key: 'money-book-receive',
      label: 'Money to collect',
      value: rupees(moneyBookSummary.needToReceive),
      tone: 'incoming',
      icon: Wallet,
    })
  }

  if (normalizeMoney(moneyBookSummary.needToPay) > 0) {
    items.push({
      key: 'money-book-pay',
      label: 'Money to repay',
      value: rupees(moneyBookSummary.needToPay),
      tone: 'outgoing',
      icon: Wallet,
    })
  }

  return items.slice(0, 5)
}

function daysUntil(value) {
  const date = new Date(`${String(value || '').slice(0, 10)}T12:00:00`)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Math.round((date.getTime() - today.getTime()) / 86400000)
}

function shortDueLabel(value) {
  const days = daysUntil(value)

  if (days === null) {
    return 'Soon'
  }

  if (days < 0) {
    return 'Overdue'
  }

  if (days === 0) {
    return 'Today'
  }

  if (days === 1) {
    return 'Tomorrow'
  }

  return `${days} days`
}

function decisionName(value, fallback = 'payment') {
  const clean = String(value || fallback)
    .replace(/\sdue$/i, '')
    .trim()
    .replace(/\s+/g, ' ')

  if (!clean) {
    return fallback
  }

  return clean
    .split(' ')
    .map((part) => {
      if (/^(emi|bnpl|sip|pdf|csv)$/i.test(part)) {
        return part.toUpperCase()
      }

      if (/^[A-Z]{2,}$/.test(part)) {
        return part
      }

      return `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`
    })
    .join(' ')
}

function decisionDueText(value = 'Soon') {
  if (value === 'Today') {
    return 'today'
  }

  if (value === 'Tomorrow') {
    return 'tomorrow'
  }

  if (value === 'Overdue') {
    return 'overdue'
  }

  if (/^\d+ days$/.test(String(value))) {
    return `in ${value}`
  }

  return String(value || 'soon').toLowerCase()
}

function moneyDecisionTitle(item = {}) {
  const name = decisionName(item.title || item.type)

  if (/salary/i.test(name)) {
    return `Check ${name.replace(/\sIncoming$/i, '')}`
  }

  if (item.tone === 'incoming') {
    return `Collect ${name}`
  }

  return `Pay ${name}`
}

function moneyDecisionDetail(item = {}) {
  const dueText = decisionDueText(item.dueLabel)
  const amountLabel = item.amountLabel || item.detail

  if (!amountLabel) {
    return `Due ${dueText}`
  }

  if (item.tone === 'incoming') {
    return `${amountLabel} expected ${dueText}`
  }

  return `${amountLabel} due ${dueText}`
}

function reportGeneratedLabel(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Recently'
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

function moneyFeedType(transaction = {}) {
  if (transaction.source === 'commitment') {
    return 'recurring'
  }

  if (transaction.source === 'profile' || transaction.impactType === 'income') {
    return 'income'
  }

  if (transaction.source === 'shared-payment') {
    return 'shared-expense'
  }

  if (transaction.source === 'shared-settlement') {
    return transaction.direction === 'incoming' ? 'settlement-received' : 'settlement-paid'
  }

  if (transaction.source === 'money-book-settlement') {
    return transaction.direction === 'incoming' ? 'borrow-returned' : 'borrow-repaid'
  }

  if (transaction.source === 'money-book') {
    return 'borrow-lend'
  }

  if (transaction.category === 'Savings' || transaction.impactType === 'transfer') {
    return 'goal-contribution'
  }

  return 'expense'
}

function moneyFeedLabel(type) {
  return {
    income: 'Income Added',
    expense: 'Expense Added',
    'goal-contribution': 'Goal Contribution',
    'borrow-returned': 'Borrow Returned',
    'borrow-repaid': 'Borrow Repaid',
    'borrow-lend': 'Borrow/Lend Added',
    'shared-expense': 'Shared Expense Added',
    'settlement-received': 'Settlement Received',
    'settlement-paid': 'Settlement Paid',
    recurring: 'Recurring Entries Grouped',
  }[type] || 'Money Move'
}

function moneyFeedIcon(type) {
  return {
    income: Wallet,
    expense: Receipt,
    'goal-contribution': PiggyBank,
    'borrow-returned': Wallet,
    'borrow-repaid': Wallet,
    'borrow-lend': CreditCard,
    'shared-expense': Plane,
    'settlement-received': Plane,
    'settlement-paid': Plane,
    recurring: CalendarDays,
  }[type] || Receipt
}

function moneyFeedPriority(type) {
  if (type === 'recurring') {
    return 0
  }

  if (type === 'income') {
    return 1
  }

  return 2
}

function buildMoneyFeedItems(transactions = []) {
  const recurringEntries = transactions.filter((transaction) => moneyFeedType(transaction) === 'recurring')
  const actualEntries = transactions
    .filter((transaction) => transaction.sourceModule !== 'Planner')
    .filter((transaction) => moneyFeedType(transaction) !== 'recurring')
    .map((transaction) => {
      const type = moneyFeedType(transaction)
      return {
        key: transaction.id,
        type,
        label: moneyFeedLabel(type),
        title: transaction.title,
        detail: transaction.note || transaction.category,
        amount: transaction.amount,
        tone: transaction.tone,
        dateTime: transaction.dateTime,
        priority: moneyFeedPriority(type),
        icon: moneyFeedIcon(type),
        color: transaction.color,
        category: transaction.category,
        sourceModule: transaction.sourceModule,
      }
    })

  if (recurringEntries.length > 0) {
    actualEntries.push({
      key: 'recurring-group',
      type: 'recurring',
      label: moneyFeedLabel('recurring'),
      title: `${recurringEntries.length} monthly item${recurringEntries.length === 1 ? '' : 's'}`,
      detail: 'Monthly bills and income are listed together.',
      amount: sumMoney(recurringEntries, (transaction) => transaction.amount),
      tone: 'transfer',
      dateTime: recurringEntries[0]?.dateTime || new Date().toISOString(),
      priority: moneyFeedPriority('recurring'),
      icon: moneyFeedIcon('recurring'),
      color: getFinanceColor('Recurring'),
    })
  }

  return actualEntries
    .sort((a, b) => (b.priority - a.priority) || String(b.dateTime).localeCompare(String(a.dateTime)))
    .slice(0, 8)
}

const merchantPatterns = [
  { pattern: /\bzomato\b/i, name: 'Zomato', icon: 'Z', color: '#E23744' },
  { pattern: /\bswiggy\b/i, name: 'Swiggy', icon: 'S', color: '#FC8019' },
  { pattern: /\bamazon\b/i, name: 'Amazon', icon: 'A', color: '#2563EB' },
  { pattern: /\bnetflix\b/i, name: 'Netflix', icon: 'N', color: '#E50914' },
  { pattern: /\bspotify\b/i, name: 'Spotify', icon: 'S', color: '#1DB954' },
  { pattern: /\b(indian oil|iocl|petrol|fuel)\b/i, name: 'Indian Oil', icon: 'I', color: '#F97316' },
  { pattern: /\b(uber|ola)\b/i, name: 'Ride', icon: 'R', color: '#111827' },
  { pattern: /\b(jio|airtel|vi mobile|phone)\b/i, name: 'Mobile', icon: 'M', color: '#0EA5E9' },
]

function merchantMetaFor(item = {}) {
  const haystack = `${item.title || ''} ${item.detail || ''} ${item.category || ''}`
  const match = merchantPatterns.find((merchant) => merchant.pattern.test(haystack))
  const fallbackName = item.sourceModule === 'Profile' && item.type === 'income'
    ? 'Income'
    : item.category || item.sourceModule || 'Money'
  const name = match?.name || fallbackName

  return {
    name,
    icon: match?.icon || String(name).charAt(0).toUpperCase() || 'M',
    color: match?.color || item.color || getFinanceColor(name),
  }
}

function buildActiveGoalCards(buckets = []) {
  return buckets
    .map((bucket) => {
      const saved = normalizeMoney(bucket.saved)
      const target = normalizeMoney(bucket.target)
      const progress = target > 0 ? Math.min(Math.round((saved / target) * 100), 100) : 0

      return {
        ...bucket,
        saved,
        target,
        progress,
      }
    })
    .filter((bucket) => bucket.target > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 2)
}

function buildActiveTripCards(groups = [], profile = {}) {
  return groups
    .map((group) => reconcileSharedGroup(group, profile))
    .filter((group) => normalizeMoney(group.amount) > 0 || normalizeMoney(group.pendingRecoverable) > 0 || normalizeMoney(group.pendingLiability) > 0)
    .map((group) => {
      const pending = normalizeMoney(group.pendingRecoverable) + normalizeMoney(group.pendingLiability)
      const total = Math.max(normalizeMoney(group.amount), pending, 1)
      const pendingPercent = Math.min(Math.round((pending / total) * 100), 100)

      return {
        ...group,
        pending,
        pendingPercent,
        settledPercent: Math.max(100 - pendingPercent, 0),
        memberCount: Array.isArray(group.people) ? group.people.length : 0,
      }
    })
    .slice(0, 2)
}

function buildGoalPulse(activeGoals = []) {
  const goal = activeGoals[0]

  if (!goal) {
    return null
  }

  return {
    key: `goal-${goal.id}`,
    title: `${goal.name || 'Goal'} is ${goal.progress}% funded`,
    detail: `${rupees(goal.saved)} saved`,
    tone: 'transfer',
    icon: Target,
    tab: 'planner',
    analytics: 'pulse_goal',
  }
}

function buildReportPulse(latestReport) {
  if (!latestReport) {
    return null
  }

  return {
    key: `report-${latestReport.reportId}`,
    title: latestReport.name || 'Latest report ready',
    detail: `${latestReport.period || 'Current period'} - ${reportGeneratedLabel(latestReport.generatedAt)}`,
    tone: 'transfer',
    icon: FileText,
    tab: 'reports',
    analytics: 'pulse_report',
  }
}

function buildFinancialPulseItems({ moneyReminders = [], importantItems = [], activeGoals = [], activeTrips = [], latestReport, moneyFeed = [] } = {}) {
  const reminderItems = moneyReminders.slice(0, 3).map((reminder) => ({
    key: reminder.reminderId || reminder.id,
    title: reminder.title,
    detail: reminder.dueLabel || reminder.message || reminder.type,
    tone: eventTone(reminder),
    icon: calendarEventIcon(reminder),
    tab: 'profile',
    analytics: 'pulse_reminder',
  }))
  const important = importantItems.slice(0, 2).map((item) => ({
    key: `important-${item.key}`,
    title: item.label,
    detail: item.value,
    tone: item.tone,
    icon: item.icon,
    tab: item.key?.includes('shared') ? 'history' : 'profile',
    analytics: 'pulse_important',
  }))
  const trip = activeTrips[0]
    ? {
      key: `trip-${activeTrips[0].id}`,
      title: `${activeTrips[0].name || 'Trip'} settlement pending`,
      detail: `${activeTrips[0].pendingPercent}% pending`,
      tone: activeTrips[0].pendingRecoverable > activeTrips[0].pendingLiability ? 'incoming' : 'outgoing',
      icon: Plane,
      tab: 'history',
      analytics: 'pulse_trip',
    }
    : null
  const feedItem = moneyFeed[0]
    ? {
      key: `feed-${moneyFeed[0].key}`,
      title: moneyFeed[0].label,
      detail: `${moneyFeed[0].tone === 'incoming' ? '+' : moneyFeed[0].tone === 'outgoing' ? '-' : ''}${rupees(moneyFeed[0].amount)}`,
      tone: moneyFeed[0].tone,
      icon: moneyFeed[0].icon,
      tab: 'history',
      analytics: 'pulse_feed',
    }
    : null

  return [
    ...reminderItems,
    ...important,
    trip,
    buildGoalPulse(activeGoals),
    buildReportPulse(latestReport),
    feedItem,
  ].filter(Boolean).slice(0, 6)
}

function buildSmartHeaderContext({ profile = {}, safeToSpend = {}, activeGoals = [], status } = {}) {
  const available = rupees(safeToSpend.comfortablyUsable)

  const leadingGoal = activeGoals[0]

  if (leadingGoal) {
    return {
      eyebrow: getGreeting(profile.name),
      title: `${available} available`,
      detail: `${leadingGoal.name || 'Goal'} ${leadingGoal.progress}% complete`,
    }
  }

  return {
    eyebrow: getGreeting(profile.name),
    title: 'Available this month',
    detail: status?.detail || 'Your money picture is ready.',
  }
}

function buildFutureSnapshot(financialCalendarEvents = [], upcomingMoney = {}) {
  const upcomingEvents = financialCalendarEvents
    .map((event) => ({ ...event, days: daysUntil(event.dueDate) }))
    .filter((event) => event.days !== null && event.days >= 0 && event.days <= 30)
    .sort((a, b) => a.days - b.days)
    .slice(0, 4)

  return {
    next7: upcomingMoney.next7 || {},
    next30: upcomingMoney.next30 || {},
    events: upcomingEvents,
  }
}

function categoryFromTransaction(transaction = {}) {
  if (transaction.category && transaction.category !== 'Other') {
    return transaction.category
  }

  return transaction.sourceModule || 'Other'
}

function buildMonthlyReplay({ transactions = [], savingsBuckets = [], sharedSummary = {}, moneyBookSummary = {} } = {}) {
  const income = sumMoney(transactions.filter((transaction) => transaction.tone === 'incoming'), (transaction) => transaction.amount)
  const outgoingTransactions = transactions.filter((transaction) => transaction.tone === 'outgoing')
  const expenses = sumMoney(outgoingTransactions, (transaction) => transaction.amount)
  const categoryTotals = new Map()

  outgoingTransactions.forEach((transaction) => {
    const category = categoryFromTransaction(transaction)
    categoryTotals.set(category, sumMoney([categoryTotals.get(category) || 0, transaction.amount]))
  })

  const topCategory = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])[0]
  const biggestPurchase = outgoingTransactions.slice().sort((a, b) => normalizeMoney(b.amount) - normalizeMoney(a.amount))[0]
  const goalTarget = sumMoney(savingsBuckets, (bucket) => bucket.target)
  const goalSaved = sumMoney(savingsBuckets, (bucket) => bucket.saved)
  const goalProgress = goalTarget > 0 ? Math.min(Math.round((goalSaved / goalTarget) * 100), 100) : 0
  const settlementAmount = normalizeMoney(sharedSummary.pendingRecoverable) + normalizeMoney(sharedSummary.pendingLiability) + normalizeMoney(moneyBookSummary.pendingSettlements)

  return {
    income,
    expenses,
    topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
    biggestPurchase,
    goalProgress,
    settlementAmount,
  }
}

function moneyStorySentence({ insight, replay, activeTrips }) {
  if (insight?.detail && !/^add a few/i.test(insight.detail)) {
    return insight.detail
  }

  if (replay.topCategory) {
    return `${replay.topCategory.name} is the main spending area this month at ${rupees(replay.topCategory.amount)}.`
  }

  if (activeTrips.length > 0) {
    return `${activeTrips[0].name || 'Your trip'} has ${activeTrips[0].pendingPercent}% settlement still pending.`
  }

  if (replay.goalProgress > 0) {
    return `Your goals are ${replay.goalProgress}% funded across active targets.`
  }

  return insight?.detail || 'Add a few money moves and FBPly will turn them into a clearer daily story.'
}

function formatActivityTime(value) {
  const parsed = new Date(value || Date.now())

  if (Number.isNaN(parsed.getTime())) {
    return 'Now'
  }

  return parsed.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function buildTrackedDayCount(expenses = []) {
  return new Set(
    expenses
      .map((expense) => String(expense.date || expense.createdAt || '').slice(0, 10))
      .filter(Boolean),
  ).size
}

function calendarEventIcon(event = {}) {
  if (event.type === 'Salary' || event.direction === 'incoming') {
    return Wallet
  }

  if (event.type === 'Goal') {
    return Target
  }

  if (event.type === 'EMI') {
    return CreditCard
  }

  return Receipt
}

function eventTone(event = {}) {
  if (event.direction === 'incoming') {
    return 'incoming'
  }

  if (event.direction === 'transfer') {
    return 'transfer'
  }

  return 'outgoing'
}

function moneyOSTone(tone = '') {
  if (['good', 'balanced', 'steady', 'incoming', 'success', 'transfer'].includes(tone)) {
    return 'success'
  }

  if (['warm', 'careful', 'slight-pressure', 'warning'].includes(tone)) {
    return 'warning'
  }

  if (['tight', 'outgoing', 'danger'].includes(tone)) {
    return 'danger'
  }

  return 'neutral'
}

function moneyOSCardTone(tone = '') {
  const mappedTone = moneyOSTone(tone)

  return mappedTone === 'neutral' ? 'neutral' : mappedTone
}

function signedAmountForTone(tone, amount) {
  const prefix = tone === 'incoming' ? '+' : tone === 'outgoing' ? '-' : ''
  return `${prefix}${rupees(amount)}`
}

function hasUpcomingMoney(upcomingMoney = {}) {
  return normalizeMoney(upcomingMoney.next7?.inflow) > 0
    || normalizeMoney(upcomingMoney.next7?.outflow) > 0
    || normalizeMoney(upcomingMoney.next30?.inflow) > 0
    || normalizeMoney(upcomingMoney.next30?.outflow) > 0
}

function hasStatementReport(reportHistory = []) {
  return reportHistory.some((report) => {
    const reportText = `${report?.type || ''} ${report?.reportType || ''} ${report?.name || ''}`.toLowerCase()
    return reportText.includes('statement')
  })
}

function buildActivationItems({ expenses = [], savingsBuckets = [], reportHistory = [] } = {}) {
  return [
    {
      key: 'first_expense',
      title: 'Add first expense',
      detail: 'Start the money timeline with one real spend.',
      cta: 'Add expense',
      completed: expenses.length > 0,
      icon: Receipt,
      feature: 'expense_saved',
      target: 'expense',
    },
    {
      key: 'first_goal',
      title: 'Create first goal',
      detail: 'Protect a target before flexible spending grows.',
      cta: 'Create goal',
      completed: savingsBuckets.length > 0,
      icon: PiggyBank,
      feature: 'goal_created',
      tab: 'planner',
      targetId: 'savings-goals-section',
      target: 'goal',
    },
    {
      key: 'first_report',
      title: 'Generate first report',
      detail: 'Turn activity into a share-ready monthly view.',
      cta: 'Open reports',
      completed: reportHistory.length > 0,
      icon: FileText,
      feature: 'reports',
      tab: 'reports',
      targetId: 'reports-export-section',
      target: 'report',
    },
    {
      key: 'statement_analysis',
      title: 'Try statement analysis',
      detail: 'Review statement rows before creating a report.',
      cta: 'Analyze statement',
      completed: hasStatementReport(reportHistory),
      icon: ChartPie,
      feature: 'statement_analysis_opened',
      tab: 'reports',
      targetId: 'reports-export-section',
      target: 'statement',
    },
  ]
}

const intentShortcuts = [
  {
    key: 'track_spending',
    label: 'Track Spending',
    detail: 'Add an expense',
    icon: Receipt,
    feature: 'quick_add_opened',
    target: 'expense',
  },
  {
    key: 'save_money',
    label: 'Save Money',
    detail: 'Create a goal',
    icon: PiggyBank,
    feature: 'goal_created',
    tab: 'planner',
    targetId: 'savings-goals-section',
    target: 'goal',
  },
  {
    key: 'split_trip',
    label: 'Split Trip',
    detail: 'Open shared money',
    icon: Plane,
    feature: 'trip_created',
    tab: 'history',
    targetId: 'shared-expenses-section',
    target: 'trip',
  },
  {
    key: 'analyze_statement',
    label: 'Analyze Statement',
    detail: 'Open reports',
    icon: ChartPie,
    feature: 'reports',
    tab: 'reports',
    targetId: 'reports-export-section',
    target: 'statement',
  },
  {
    key: 'generate_report',
    label: 'Generate Report',
    detail: 'Monthly PDF',
    icon: FileText,
    feature: 'reports',
    tab: 'reports',
    targetId: 'reports-export-section',
    target: 'report',
  },
]

export default function TodayScreen({
  profile,
  financialState,
  smartHomeInsights,
  safeToSpend,
  calmSummaries,
  whatChangedInsights,
  todayTransactions = [],
  expenses = [],
  sharedGroups = [],
  sharedSummary = {},
  moneyBookSummary = {},
  savingsBuckets = [],
  moneyReminders = [],
  upcomingMoney = {},
  financialCalendarEvents = [],
  reportHistory = [],
  redownloadReport,
  setActiveTab,
  navigateToTarget,
  openAddSheet,
}) {
  const status = buildDailyMoneyStatus(financialState, safeToSpend)
  const statusLabel = financialState.pressure || safeToSpend.flexibilityLevel || 'Ready'
  const moneyFeed = useMemo(() => buildMoneyFeedItems(todayTransactions), [todayTransactions])
  const importantItems = useMemo(
    () => buildTodaysImportantItems({ profile, moneyBookSummary, sharedSummary }),
    [moneyBookSummary, profile, sharedSummary],
  )
  const activeGoals = useMemo(() => buildActiveGoalCards(savingsBuckets), [savingsBuckets])
  const activeTrips = useMemo(() => buildActiveTripCards(sharedGroups, profile), [profile, sharedGroups])
  const latestReport = useMemo(
    () => (Array.isArray(reportHistory) ? reportHistory[0] : null),
    [reportHistory],
  )
  const futureSnapshot = useMemo(
    () => buildFutureSnapshot(financialCalendarEvents, upcomingMoney),
    [financialCalendarEvents, upcomingMoney],
  )
  const financialPulse = useMemo(
    () => buildFinancialPulseItems({
      moneyReminders,
      importantItems,
      activeGoals,
      activeTrips,
      latestReport,
      moneyFeed,
    }),
    [activeGoals, activeTrips, importantItems, latestReport, moneyFeed, moneyReminders],
  )
  const monthlyReplay = useMemo(
    () => buildMonthlyReplay({ transactions: todayTransactions, savingsBuckets, sharedSummary, moneyBookSummary }),
    [moneyBookSummary, savingsBuckets, sharedSummary, todayTransactions],
  )
  const smartHeader = useMemo(
    () => buildSmartHeaderContext({ profile, safeToSpend, activeGoals, status }),
    [activeGoals, profile, safeToSpend, status],
  )
  const insight = buildSingleTodayInsight({
    smartHomeInsights,
    whatChangedInsights,
    calmSummaries,
    financialState,
  })
  const storySentence = moneyStorySentence({ insight, replay: monthlyReplay, activeTrips })
  const trackedDays = buildTrackedDayCount(expenses)
  const activationItems = useMemo(
    () => buildActivationItems({ expenses, savingsBuckets, reportHistory }),
    [expenses, reportHistory, savingsBuckets],
  )
  const completedActivationCount = activationItems.filter((item) => item.completed).length
  const totalActivationCount = activationItems.length
  const nextActivationItem = activationItems.find((item) => !item.completed)
  const activationProgress = Math.round((completedActivationCount / totalActivationCount) * 100)
  const showActivationGuide = completedActivationCount < totalActivationCount
  const showIntentShortcuts = completedActivationCount < 2
  const actionChips = [
    { label: 'Savings', icon: Target, tab: 'planner', targetId: 'savings-goals-section' },
    { label: 'Trip', icon: Plane, tab: 'history', targetId: 'shared-expenses-section' },
    { label: 'Borrow', icon: Wallet, tab: 'history', targetId: 'money-book-section' },
    { label: 'Lend', icon: CreditCard, tab: 'history', targetId: 'money-book-section' },
    { label: 'EMI', icon: CalendarDays, tab: 'profile', targetId: 'profile-bills-section' },
    { label: 'Reports', icon: ChartPie, tab: 'reports', targetId: 'reports-export-section' },
  ]
  const hasFutureSnapshot = hasUpcomingMoney(upcomingMoney) || futureSnapshot.events.length > 0
  const upcomingCommitments = useMemo(
    () => [
      ...importantItems.map((item) => ({
        key: `important-${item.key}`,
        title: item.label,
        detail: item.value,
        amountLabel: item.value,
        dueLabel: 'Today',
        tone: item.tone,
        icon: item.icon,
        meta: 'Today',
        type: item.key,
      })),
      ...futureSnapshot.events.map((event) => ({
        key: `event-${event.id}`,
        title: event.title,
        detail: event.amount > 0 ? rupees(event.amount) : event.type,
        amountLabel: event.amount > 0 ? rupees(event.amount) : '',
        dueLabel: shortDueLabel(event.dueDate),
        tone: eventTone(event),
        icon: calendarEventIcon(event),
        meta: shortDueLabel(event.dueDate),
        type: event.type,
      })),
    ].slice(0, 6),
    [futureSnapshot.events, importantItems],
  )
  const navigateToExistingTarget = (target = {}) => {
    if (target.target === 'expense') {
      openAddSheet?.('expense')
      return
    }

    if (navigateToTarget && target.tab) {
      navigateToTarget(target.tab, target.targetId)
      return
    }

    if (target.tab) {
      setActiveTab?.(target.tab)
    }
  }
  const handleActivationClick = (item, source = 'checklist') => {
    if (source === 'next_action') {
      trackEvent('next_action_clicked', {
        screen: 'home',
      })
    }

    trackEvent('activation_checklist_cta_clicked', {
      surface: 'today',
      source,
      step: item.key,
      target: item.target,
      completed_count: completedActivationCount,
      total_count: totalActivationCount,
    })
    trackFeatureUsage('activation_checklist', {
      surface: 'today',
      source,
      step: item.key,
    })
    navigateToExistingTarget(item, source)
  }
  const handleIntentShortcut = (shortcut) => {
    trackEvent('intent_shortcut_clicked', {
      surface: 'today',
      intent: shortcut.key,
      target: shortcut.target,
    })
    trackEvent('feature_discovery_click', {
      surface: 'today',
      feature: shortcut.target,
      source: 'intent_shortcut',
    })
    trackFeatureUsage('intent_shortcut', {
      surface: 'today',
      intent: shortcut.key,
    })
    trackFeatureUsage(shortcut.feature, {
      surface: 'today',
      source: 'intent_shortcut',
    })
    navigateToExistingTarget(shortcut, 'intent_shortcut')
  }
  const openLatestReport = () => {
    if (!latestReport) {
      return
    }

    trackHomeInteraction('report_open', {
      report_type: latestReport.type,
      report_id: latestReport.reportId,
    })
    redownloadReport?.(latestReport)
  }
  const nextBestAction = upcomingCommitments[0]
    ? {
        title: moneyDecisionTitle(upcomingCommitments[0]),
        detail: moneyDecisionDetail(upcomingCommitments[0]),
        icon: upcomingCommitments[0].icon,
        tone: moneyOSCardTone(upcomingCommitments[0].tone),
        badge: '',
      }
    : nextActivationItem
      ? {
          title: nextActivationItem.cta,
          detail: 'Finish setup',
          icon: nextActivationItem.icon,
          tone: 'tint',
          badge: 'Start',
          onClick: () => handleActivationClick(nextActivationItem, 'next_action'),
        }
      : activeGoals[0]
        ? {
            title: activeGoals[0].title,
            detail: activeGoals[0].detail || 'Keep this goal moving',
            icon: Target,
            tone: 'success',
            badge: 'Goal',
            onClick: () => navigateFromHome(setActiveTab, 'planner', 'next_action_goal', { target: activeGoals[0].key }),
          }
        : {
            title: 'Add today expense',
            detail: 'Keep the month current',
            icon: Receipt,
            tone: 'tint',
            badge: 'Add',
            onClick: () => {
              trackHomeInteraction('next_action_clicked')
              openAddSheet?.('expense')
            },
          }

  useEffect(() => {
    if (!showActivationGuide) {
      return
    }

    trackEvent('activation_checklist_viewed', {
      surface: 'today',
      completed_count: completedActivationCount,
      total_count: totalActivationCount,
    })
  }, [completedActivationCount, showActivationGuide, totalActivationCount])

  if (HOME_PRESENTATION_VERSION === 'legacy') {
    return (
    <section className={`screen-content today-screen today-${status.tone}`}>
      <div className="today-v2-header">
        <div className="today-header-copy">
          <p className="eyebrow">{smartHeader.eyebrow}</p>
          <h1>{smartHeader.title}</h1>
          {smartHeader.detail && <p className="smart-header-context">{smartHeader.detail}</p>}
        </div>
        <div className="today-header-actions">
          <span className={`today-status-pill ${financialState.pressureTone === 'slight-pressure' ? 'warm' : financialState.pressureTone}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      <article className="today-available-card premium-money-hero">
        <div>
          <span>Available this month</span>
          <strong>{rupees(safeToSpend.comfortablyUsable)}</strong>
          <p>{status.detail}</p>
        </div>
        <div className="hero-money-metrics" aria-label="Money status summary">
          <span>
            <small>Protected</small>
            <b>{rupees(safeToSpend.protectedAmount)}</b>
          </span>
          <span>
            <small>Used</small>
            <b>{financialState.usagePercent || 0}%</b>
          </span>
        </div>
      </article>

      {showActivationGuide && (
        <section className="activation-checklist-card" aria-label="Getting Started">
          <div className="activation-checklist-header">
            <div>
              <p className="eyebrow">Getting Started</p>
              <h2>{completedActivationCount}/{totalActivationCount} complete</h2>
            </div>
            <span>{activationProgress}%</span>
          </div>
          <div className="activation-progress-bar" aria-label={`${activationProgress}% complete`}>
            <span style={{ width: `${activationProgress}%` }} />
          </div>
          <div className="activation-step-list">
            {activationItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  className={item.completed ? 'completed' : ''}
                  type="button"
                  key={item.key}
                  onClick={() => handleActivationClick(item, 'step_row')}
                  disabled={item.completed}
                >
                  <span className="activation-step-icon">
                    {item.completed ? <CheckCircle2 size={17} /> : <Icon size={17} />}
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <b>{item.completed ? 'Done' : 'Start'}</b>
                </button>
              )
            })}
          </div>
          {nextActivationItem && (
            <button
              className="primary-button activation-primary-action"
              type="button"
              onClick={() => handleActivationClick(nextActivationItem, 'primary_cta')}
            >
              {nextActivationItem.cta}
            </button>
          )}
        </section>
      )}

      {showIntentShortcuts && (
        <section className="intent-shortcut-panel" aria-label="Start with your intent">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Start Here</p>
              <h2>Choose what you want to do first</h2>
            </div>
          </div>
          <div className="intent-shortcut-grid">
            {intentShortcuts.map((shortcut) => {
              const Icon = shortcut.icon
              return (
                <button
                  type="button"
                  key={shortcut.key}
                  onClick={() => handleIntentShortcut(shortcut)}
                >
                  <Icon size={17} />
                  <span>
                    <strong>{shortcut.label}</strong>
                    <small>{shortcut.detail}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <div className="today-action-chips" aria-label="Action center">
        {actionChips.map((chip) => {
          const Icon = chip.icon
          return (
            <button
              type="button"
              key={chip.label}
              onClick={() => {
                trackHomeInteraction('home_action', { target: chip.label, section: chip.targetId })
                if (navigateToTarget) {
                  navigateToTarget(chip.tab, chip.targetId)
                  return
                }
                navigateFromHome(setActiveTab, chip.tab, 'home_action', { target: chip.label })
              }}
            >
              <Icon size={16} />
              <span>{chip.label}</span>
            </button>
          )
        })}
      </div>

      {financialPulse.length > 0 && (
        <section className="financial-pulse-strip" aria-label="Financial Pulse">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Financial Pulse</p>
              <h2>What needs attention</h2>
            </div>
            <span className="reminder-state-pill active">{financialPulse.length} live</span>
          </div>
          <div className="pulse-rail">
            {financialPulse.map((item) => {
              const Icon = item.icon
              return (
                <button
                  className={`pulse-chip ${item.tone}`}
                  type="button"
                  key={item.key}
                  onClick={() => navigateFromHome(setActiveTab, item.tab, 'pulse_interaction', { pulse_type: item.analytics })}
                >
                  <Icon size={15} />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {hasFutureSnapshot && (
        <section className="future-snapshot-section" aria-label="Future Snapshot" onClickCapture={() => trackHomeInteraction('future_snapshot_open')}>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Future Snapshot</p>
              <h2>Next 7 and 30 days</h2>
            </div>
          </div>
          <div className="future-snapshot-grid">
            <article>
              <span>Next 7 Days</span>
              <strong className="incoming"><ArrowDownLeft size={15} /> {rupees(futureSnapshot.next7.inflow || 0)}</strong>
              <strong className="outgoing"><ArrowUpRight size={15} /> {rupees(futureSnapshot.next7.outflow || 0)}</strong>
            </article>
            <article>
              <span>Next 30 Days</span>
              <strong className="incoming"><ArrowDownLeft size={15} /> {rupees(futureSnapshot.next30.inflow || 0)}</strong>
              <strong className="outgoing"><ArrowUpRight size={15} /> {rupees(futureSnapshot.next30.outflow || 0)}</strong>
            </article>
          </div>
          {futureSnapshot.events.length > 0 && (
            <div className="future-event-list">
              {futureSnapshot.events.map((event) => {
                const Icon = calendarEventIcon(event)
                return (
                  <article className={`future-event-row ${eventTone(event)}`} key={event.id}>
                    <Icon size={15} />
                    <div>
                      <strong>{event.title}</strong>
                      <small>{shortDueLabel(event.dueDate)} - {event.type}</small>
                    </div>
                    {event.amount > 0 && <b>{rupees(event.amount)}</b>}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      <article className={`today-insight-card daily-money-story ${insight.tone}`}>
        <span className="soft-icon">
          <Sparkles size={17} />
        </span>
        <div>
          <p className="eyebrow">Money Story Of The Day</p>
          <h2>{storySentence}</h2>
        </div>
      </article>

      <section className="month-replay-card" aria-label="Month Replay">
        <details onToggle={(event) => {
          if (event.currentTarget.open) {
            trackHomeInteraction('replay_open')
          }
        }}>
          <summary>
            <div>
              <p className="eyebrow">Month Replay</p>
              <h2>Your month as a short story</h2>
            </div>
            <TrendingUp size={18} />
          </summary>
          <div className="month-replay-grid">
            <article>
              <span>Income</span>
              <strong>{rupees(monthlyReplay.income)}</strong>
            </article>
            <article>
              <span>Expenses</span>
              <strong>{rupees(monthlyReplay.expenses)}</strong>
            </article>
            <article>
              <span>Top Category</span>
              <strong>{monthlyReplay.topCategory?.name || 'Review'}</strong>
              {monthlyReplay.topCategory && <small>{rupees(monthlyReplay.topCategory.amount)}</small>}
            </article>
            <article>
              <span>Goal Progress</span>
              <strong>{monthlyReplay.goalProgress}%</strong>
            </article>
            {monthlyReplay.biggestPurchase && (
              <article className="wide">
                <span>Biggest Purchase</span>
                <strong>{monthlyReplay.biggestPurchase.title}</strong>
                <small>{rupees(monthlyReplay.biggestPurchase.amount)}</small>
              </article>
            )}
            {monthlyReplay.settlementAmount > 0 && (
              <article className="wide">
                <span>Settlement Activity</span>
                <strong>{rupees(monthlyReplay.settlementAmount)}</strong>
                <small>Pending or active shared/borrow-lend money</small>
              </article>
            )}
          </div>
        </details>
      </section>

      {latestReport && (
        <section className="latest-report-card" aria-label="Latest generated report">
          <span className="soft-icon"><FileText size={17} /></span>
          <div>
            <p className="eyebrow">Latest Report</p>
            <h2>{latestReport.name}</h2>
            <p>{latestReport.reportId} - {latestReport.period}</p>
          </div>
          <button className="text-action-button" type="button" onClick={openLatestReport}>
            Open
          </button>
        </section>
      )}

      <section className="today-feed-section money-feed-section" aria-label="Money Feed">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Money Feed</p>
            <h2>Recent money moves</h2>
          </div>
          <span>{moneyFeed.length} item{moneyFeed.length === 1 ? '' : 's'}</span>
        </div>
        {moneyFeed.length > 0 && (
          <div className="today-feed-list">
            {moneyFeed.map((item) => {
              const Icon = item.icon
              const amountPrefix = item.tone === 'incoming' ? '+' : item.tone === 'outgoing' ? '-' : ''
              const merchant = merchantMetaFor(item)

              return (
                <article className={`today-feed-item ${item.tone}`} key={item.key}>
                  <span className="today-feed-icon" style={{ color: merchant.color }}>
                    <Icon size={17} />
                  </span>
                  <div>
                    <span className="money-feed-type">
                      <Store size={12} />
                      {merchant.name} - {item.label}
                    </span>
                    <strong>{amountPrefix}{rupees(item.amount)}</strong>
                    <p>{item.title}</p>
                    {item.detail && <small>{item.detail}</small>}
                  </div>
                  <time dateTime={item.dateTime}>{formatActivityTime(item.dateTime)}</time>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {activeTrips.length > 0 && (
        <section className="today-compact-section premium-trip-section" aria-label="Active trips">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">Active Trips</p>
              <h2>Shared money</h2>
            </div>
            <button
              className="text-action-button"
              type="button"
              onClick={() => navigateFromHome(setActiveTab, 'history', 'trip_card_open')}
            >
              View
            </button>
          </div>
          <div className="trip-card-list">
            {activeTrips.map((trip) => {
              const incoming = normalizeMoney(trip.pendingRecoverable)
              const outgoing = normalizeMoney(trip.pendingLiability)
              const label = incoming > 0 ? 'You are owed' : outgoing > 0 ? 'You owe' : 'Shared total'
              const amount = incoming > 0 ? incoming : outgoing > 0 ? outgoing : trip.amount

              return (
                <button
                  className="trip-status-card"
                  type="button"
                  key={trip.id}
                  onClick={() => navigateFromHome(setActiveTab, 'history', 'trip_card_open', { trip_id: trip.id })}
                >
                  <div>
                    <strong>{trip.name || 'Shared trip'}</strong>
                    <small>{trip.memberCount || 0} members - {rupees(trip.amount)} total</small>
                  </div>
                  <span>{label}: {rupees(amount)}</span>
                  <i aria-hidden="true">
                    <b style={{ width: `${trip.settledPercent}%` }} />
                  </i>
                  <small>{trip.settledPercent}% settled - {trip.pendingPercent}% pending</small>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <div className="today-habit-strip">
        <span>{trackedDays > 0 ? `${trackedDays} tracked day${trackedDays === 1 ? '' : 's'}` : 'Ready for today'}</span>
        <span>{rupees(safeToSpend.protectedAmount)} protected</span>
      </div>

    </section>
    )
  }

  return (
    <MoneyOSProvider as="section" className={`screen-content today-screen today-${status.tone} money-os-home`}>
      <section className="mos-home-priority-grid mos-home-v4-grid" aria-label="Primary money status">
        <StatCard
          label="Available"
          value={rupees(safeToSpend.comfortablyUsable)}
          detail={status.title}
          icon={Wallet}
          tone={moneyOSCardTone(status.tone)}
          elevated
          className="mos-home-hero-card"
        />

        <StatCard
          label="Protected"
          value={rupees(safeToSpend.protectedAmount)}
          icon={PiggyBank}
          tone="success"
          className="mos-home-protected-card"
        />

        <MoneyCard
          as={nextBestAction.onClick ? 'button' : 'section'}
          type={nextBestAction.onClick ? 'button' : undefined}
          eyebrow="Next Action"
          title={nextBestAction.title}
          detail={nextBestAction.detail}
          meta={nextBestAction.badge}
          icon={nextBestAction.icon}
          tone={nextBestAction.tone}
          className="mos-home-next-action-card"
          interactive={Boolean(nextBestAction.onClick)}
          onClick={nextBestAction.onClick}
        />
      </section>

      <details className="mos-home-secondary-details mos-home-v4-more">
        <summary>
          <span>
            <strong>Monthly Context</strong>
          </span>
          <StatusBadge>Review</StatusBadge>
        </summary>
        <div className="mos-home-secondary-stack">
      {showActivationGuide && (
        <section className="mos-home-section" aria-label="Getting Started">
          <SectionHeader
            title={`${completedActivationCount}/${totalActivationCount} complete`}
            actions={<StatusBadge tone="success">{activationProgress}%</StatusBadge>}
          />
          <div className="mos-home-progress-bar" aria-label={`${activationProgress}% complete`}>
            <span style={{ width: `${activationProgress}%` }} />
          </div>
          <div className="mos-home-action-card-grid">
            {activationItems.map((item) => {
              const Icon = item.completed ? CheckCircle2 : item.icon
              return (
                <MoneyCard
                  as="button"
                  className="mos-home-card-button"
                  type="button"
                  title={item.title}
                  detail={item.detail}
                  icon={Icon}
                  tone={item.completed ? 'success' : 'neutral'}
                  key={item.key}
                  onClick={() => handleActivationClick(item, 'step_row')}
                  disabled={item.completed}
                  interactive={!item.completed}
                  actions={<StatusBadge tone={item.completed ? 'success' : 'neutral'}>{item.completed ? 'Done' : 'Start'}</StatusBadge>}
                />
              )
            })}
          </div>
          {nextActivationItem && (
            <PrimaryButton
              className="mos-home-primary-action"
              onClick={() => handleActivationClick(nextActivationItem, 'primary_cta')}
              icon={nextActivationItem.icon}
            >
              {nextActivationItem.cta}
            </PrimaryButton>
          )}
        </section>
      )}

      {showIntentShortcuts && (
        <section className="mos-home-section" aria-label="Start with your intent">
          <SectionHeader eyebrow="Start Here" title="Choose what you want to do first" />
          <div className="mos-home-action-card-grid">
            {intentShortcuts.map((shortcut) => (
              <MoneyCard
                as="button"
                className="mos-home-card-button"
                type="button"
                title={shortcut.label}
                detail={shortcut.detail}
                icon={shortcut.icon}
                key={shortcut.key}
                onClick={() => handleIntentShortcut(shortcut)}
                interactive
                actions={<StatusBadge>{shortcut.target}</StatusBadge>}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mos-home-section" aria-label="Action center">
        <SectionHeader eyebrow="Action Center" title="Move money work forward" />
        <div className="mos-home-action-grid">
          {actionChips.map((chip) => (
            <PrimaryButton
              className="mos-home-action-button"
              size="sm"
              icon={chip.icon}
              key={chip.label}
              onClick={() => {
                trackHomeInteraction('home_action', { target: chip.label, section: chip.targetId })
                if (navigateToTarget) {
                  navigateToTarget(chip.tab, chip.targetId)
                  return
                }
                navigateFromHome(setActiveTab, chip.tab, 'home_action', { target: chip.label })
              }}
            >
              {chip.label}
            </PrimaryButton>
          ))}
        </div>
      </section>

      <section className="mos-home-section" aria-label="Upcoming Commitments">
        <SectionHeader
          eyebrow="Upcoming Commitments"
          title="Money that needs attention"
          detail="Collect, repay, and upcoming reminders in one place."
          actions={<StatusBadge>{upcomingCommitments.length} item{upcomingCommitments.length === 1 ? '' : 's'}</StatusBadge>}
        />
        {upcomingCommitments.length === 0 ? (
          <EmptyState
            title="No commitments need attention"
            detail="Bills, repayments, settlements, and reminders will appear here when they are due."
            icon={CalendarDays}
            className="mos-home-empty-state"
          />
        ) : (
          <div className="mos-home-card-list">
            {upcomingCommitments.map((item) => (
              <MoneyCard
                title={item.title}
                detail={item.detail}
                icon={item.icon}
                tone={moneyOSCardTone(item.tone)}
                key={item.key}
                actions={<StatusBadge tone={moneyOSTone(item.tone)}>{item.meta}</StatusBadge>}
                className="mos-home-row-card"
              />
            ))}
          </div>
        )}
      </section>

      {activeTrips.length > 0 && (
        <section className="mos-home-section" aria-label="Active trips">
          <SectionHeader
            eyebrow="Active Trips"
            title="Shared money"
            actions={(
              <PrimaryButton
                size="sm"
                className="mos-home-action-button"
                icon={Plane}
                onClick={() => navigateFromHome(setActiveTab, 'history', 'trip_card_open')}
              >
                View
              </PrimaryButton>
            )}
          />
          <div className="mos-home-card-list">
            {activeTrips.map((trip) => {
              const incoming = normalizeMoney(trip.pendingRecoverable)
              const outgoing = normalizeMoney(trip.pendingLiability)
              const label = incoming > 0 ? 'You are owed' : outgoing > 0 ? 'You owe' : 'Shared total'
              const amount = incoming > 0 ? incoming : outgoing > 0 ? outgoing : trip.amount
              const tripTone = incoming > 0 ? 'incoming' : outgoing > 0 ? 'outgoing' : 'transfer'

              return (
                <MoneyCard
                  as="button"
                  className="mos-home-card-button mos-home-trip-card"
                  type="button"
                  title={trip.name || 'Shared trip'}
                  detail={`${trip.memberCount || 0} members - ${rupees(trip.amount)} total`}
                  icon={Plane}
                  tone={moneyOSCardTone(tripTone)}
                  key={trip.id}
                  onClick={() => navigateFromHome(setActiveTab, 'history', 'trip_card_open', { trip_id: trip.id })}
                  interactive
                  actions={<StatusBadge tone={moneyOSTone(tripTone)}>{label}: {rupees(amount)}</StatusBadge>}
                >
                  <div className="mos-home-progress-bar" aria-label={`${trip.settledPercent}% settled`}>
                    <span style={{ width: `${trip.settledPercent}%` }} />
                  </div>
                  <p className="mos-home-card-note">{trip.settledPercent}% settled - {trip.pendingPercent}% pending</p>
                </MoneyCard>
              )
            })}
          </div>
        </section>
      )}

      <section className="mos-home-section" aria-label="Recent Activity">
        <SectionHeader
          eyebrow="Recent Activity"
          title="Latest money moves"
          detail="Recent activity from expenses, income, goals, shared money, and borrow/lend."
          actions={<StatusBadge>{moneyFeed.length} item{moneyFeed.length === 1 ? '' : 's'}</StatusBadge>}
        />
        {moneyFeed.length === 0 ? (
          <EmptyState
            title="No recent money moves"
            detail="Add a money move and it will appear here."
            icon={Receipt}
            action={{ label: 'Add expense', onClick: () => openAddSheet?.('expense') }}
            className="mos-home-empty-state"
          />
        ) : (
          <div className="mos-home-card-list">
            {moneyFeed.map((item) => {
              const merchant = merchantMetaFor(item)

              return (
                <MoneyCard
                  title={item.title}
                  detail={item.detail || item.category}
                  icon={item.icon}
                  tone={moneyOSCardTone(item.tone)}
                  key={item.key}
                  actions={<StatusBadge tone={moneyOSTone(item.tone)}>{signedAmountForTone(item.tone, item.amount)}</StatusBadge>}
                  className="mos-home-row-card"
                >
                  <div className="mos-home-feed-meta">
                    <span>
                      <Store size={12} />
                      {merchant.name} - {item.label}
                    </span>
                    <time dateTime={item.dateTime}>{formatActivityTime(item.dateTime)}</time>
                  </div>
                </MoneyCard>
              )
            })}
          </div>
        )}
      </section>

      <details className="mos-home-secondary-details">
        <summary>
          <span>
            <strong>Money context</strong>
          </span>
          <StatusBadge>Review</StatusBadge>
        </summary>
        <div className="mos-home-secondary-stack">
          <InsightCard
            title="Money Story Of The Day"
            insight={storySentence}
            icon={Sparkles}
            tone={moneyOSCardTone(insight.tone)}
          />

          {financialPulse.length > 0 && (
            <section className="mos-home-section" aria-label="Financial Pulse">
              <SectionHeader
                eyebrow="Financial Pulse"
                title="What needs attention"
                actions={<StatusBadge tone="success">{financialPulse.length} live</StatusBadge>}
              />
              <div className="mos-home-action-card-grid">
                {financialPulse.map((item) => (
                  <MoneyCard
                    as="button"
                    className="mos-home-card-button"
                    type="button"
                    title={item.title}
                    detail={item.detail}
                    icon={item.icon}
                    tone={moneyOSCardTone(item.tone)}
                    key={item.key}
                    onClick={() => navigateFromHome(setActiveTab, item.tab, 'pulse_interaction', { pulse_type: item.analytics })}
                    interactive
                  />
                ))}
              </div>
            </section>
          )}

          {hasFutureSnapshot && (
            <section className="mos-home-section" aria-label="Future Snapshot" onClickCapture={() => trackHomeInteraction('future_snapshot_open')}>
              <SectionHeader eyebrow="Future Snapshot" title="Next 7 and 30 days" />
              <div className="mos-home-stat-grid">
                <StatCard
                  label="Next 7 Days In"
                  value={rupees(futureSnapshot.next7.inflow || 0)}
                  detail={`Out: ${rupees(futureSnapshot.next7.outflow || 0)}`}
                  icon={ArrowDownLeft}
                  tone="success"
                />
                <StatCard
                  label="Next 30 Days In"
                  value={rupees(futureSnapshot.next30.inflow || 0)}
                  detail={`Out: ${rupees(futureSnapshot.next30.outflow || 0)}`}
                  icon={ArrowUpRight}
                  tone="warning"
                />
              </div>
              {futureSnapshot.events.length > 0 && (
                <div className="mos-home-card-list">
                  {futureSnapshot.events.map((event) => (
                    <MoneyCard
                      title={event.title}
                      detail={`${shortDueLabel(event.dueDate)} - ${event.type}`}
                      icon={calendarEventIcon(event)}
                      tone={moneyOSCardTone(eventTone(event))}
                      key={event.id}
                      actions={event.amount > 0 ? <StatusBadge tone={moneyOSTone(eventTone(event))}>{rupees(event.amount)}</StatusBadge> : null}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {latestReport && (
            <MoneyCard
              title={latestReport.name}
              detail={`${latestReport.reportId} - ${latestReport.period}`}
              eyebrow="Latest Report"
              icon={FileText}
              tone="tint"
              actions={(
                <PrimaryButton size="sm" className="mos-home-action-button" icon={FileText} onClick={openLatestReport}>
                  Open
                </PrimaryButton>
              )}
            />
          )}

          <details className="mos-home-nested-details" onToggle={(event) => {
            if (event.currentTarget.open) {
              trackHomeInteraction('replay_open')
            }
          }}>
            <summary>
              <span>
                <span className="mos-eyebrow">Month Replay</span>
                <strong>Your month as a short story</strong>
              </span>
              <TrendingUp size={18} />
            </summary>
            <div className="mos-home-stat-grid">
              <StatCard label="Income" value={rupees(monthlyReplay.income)} icon={Wallet} tone="success" />
              <StatCard label="Expenses" value={rupees(monthlyReplay.expenses)} icon={Receipt} tone="danger" />
              <StatCard
                label="Top Category"
                value={monthlyReplay.topCategory?.name || 'Review'}
                detail={monthlyReplay.topCategory ? rupees(monthlyReplay.topCategory.amount) : ''}
                icon={ChartPie}
              />
              <StatCard label="Goal Progress" value={`${monthlyReplay.goalProgress}%`} icon={Target} tone="success" />
              {monthlyReplay.biggestPurchase && (
                <StatCard
                  label="Biggest Purchase"
                  value={monthlyReplay.biggestPurchase.title}
                  detail={rupees(monthlyReplay.biggestPurchase.amount)}
                  icon={Receipt}
                  tone="warning"
                />
              )}
              {monthlyReplay.settlementAmount > 0 && (
                <StatCard
                  label="Settlement Activity"
                  value={rupees(monthlyReplay.settlementAmount)}
                  detail="Pending or active shared/borrow-lend money"
                  icon={Plane}
                  tone="warning"
                />
              )}
            </div>
          </details>
        </div>
      </details>
        </div>
      </details>

    </MoneyOSProvider>
  )
}
