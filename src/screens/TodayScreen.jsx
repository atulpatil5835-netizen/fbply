import { useCallback, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChartPie,
  Check,
  CheckCheck,
  ChevronDown,
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
  X,
} from 'lucide-react'
import { getFinanceColor } from '../lib/financeColors'
import { reconcileSharedGroup } from '../lib/financialActivity'
import { getGreeting } from '../lib/financeVisuals'
import { normalizeMoney, sumMoney } from '../lib/money'
import { normalizeCommitments, rupees } from '../lib/ruleEngine'

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
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return
  }

  window.gtag('event', `fbply_${action}`, {
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

const notificationPriorityRank = {
  High: 0,
  Medium: 1,
  Low: 2,
}

function notificationPriorityForReminder(reminder = {}) {
  if (reminder.urgency === 'today' || reminder.dueLabel === 'Today' || reminder.dueLabel === 'Tomorrow') {
    return reminder.direction === 'outgoing' || reminder.type === 'Settlement' ? 'High' : 'Medium'
  }

  if (reminder.urgency === 'soon') {
    return 'Medium'
  }

  return 'Low'
}

function notificationTypeForReminder(reminder = {}) {
  if (reminder.type === 'EMI' || reminder.type === 'Settlement' || reminder.direction === 'outgoing') {
    return reminder.urgency === 'today' ? 'CRITICAL' : 'ACTION REQUIRED'
  }

  if (reminder.type === 'Salary') {
    return 'INSIGHT'
  }

  return reminder.type === 'Goal' ? 'INSIGHT' : 'ACTION REQUIRED'
}

function notificationTabForReminder(reminder = {}) {
  if (reminder.type === 'Goal') {
    return 'planner'
  }

  if (reminder.type === 'Settlement' || reminder.type === 'Borrow/Lend') {
    return 'history'
  }

  return 'profile'
}

function buildSmartNotifications({
  moneyReminders = [],
  activeGoals = [],
  activeTrips = [],
  latestReport,
  monthlyReplay = {},
  moneyFeed = [],
} = {}) {
  const notifications = moneyReminders.map((reminder) => ({
    id: `money-${reminder.reminderId || reminder.id}`,
    type: notificationTypeForReminder(reminder),
    priority: notificationPriorityForReminder(reminder),
    title: reminder.dueLabel === 'Open'
      ? reminder.title
      : `${reminder.title} ${String(reminder.dueLabel || 'soon').toLowerCase()}`,
    message: reminder.message || `${reminder.type || 'Money'} needs attention.`,
    amount: reminder.amount,
    tone: eventTone(reminder),
    tab: notificationTabForReminder(reminder),
    icon: calendarEventIcon(reminder),
  }))

  if (activeTrips[0]?.pending > 0) {
    notifications.push({
      id: `trip-${activeTrips[0].id}`,
      type: 'ACTION REQUIRED',
      priority: 'Medium',
      title: `${activeTrips[0].name || 'Trip'} settlement pending`,
      message: `${rupees(activeTrips[0].pending)} is still unsettled across this trip.`,
      amount: activeTrips[0].pending,
      tone: 'transfer',
      tab: 'history',
      icon: Plane,
    })
  }

  const goalNearFinish = activeGoals.find((goal) => goal.progress >= 70)

  if (goalNearFinish) {
    notifications.push({
      id: `goal-${goalNearFinish.id}`,
      type: 'INSIGHT',
      priority: goalNearFinish.progress >= 90 ? 'High' : 'Medium',
      title: `${goalNearFinish.name || 'Goal'} is ${goalNearFinish.progress}% complete`,
      message: `${rupees(goalNearFinish.saved)} saved toward ${rupees(goalNearFinish.target)}.`,
      amount: goalNearFinish.saved,
      tone: 'transfer',
      tab: 'planner',
      icon: Target,
    })
  }

  if (latestReport) {
    notifications.push({
      id: `report-${latestReport.reportId}`,
      type: 'REPORT',
      priority: 'Low',
      title: latestReport.name || 'Latest report ready',
      message: `${latestReport.period || 'Current period'} report is ready to open again.`,
      tone: 'transfer',
      tab: 'reports',
      icon: FileText,
      report: latestReport,
    })
  }

  const latestStatement = moneyFeed.find((item) => /statement/i.test(`${item.title || ''} ${item.detail || ''} ${item.sourceModule || ''}`))

  if (latestStatement) {
    notifications.push({
      id: `statement-${latestStatement.key}`,
      type: 'REPORT',
      priority: 'Medium',
      title: 'Statement analysis complete',
      message: latestStatement.title || 'A statement upload is available in your money feed.',
      tone: 'transfer',
      tab: 'reports',
      icon: FileText,
    })
  }

  if (monthlyReplay.expenses > 0 && monthlyReplay.topCategory) {
    notifications.push({
      id: `replay-${monthlyReplay.topCategory.name}`,
      type: 'INSIGHT',
      priority: 'Low',
      title: `${monthlyReplay.topCategory.name} leads this month`,
      message: `${rupees(monthlyReplay.topCategory.amount)} tracked in your top spending area.`,
      amount: monthlyReplay.topCategory.amount,
      tone: 'outgoing',
      tab: 'history',
      icon: TrendingUp,
    })
  }

  return notifications
    .sort((a, b) => (
      notificationPriorityRank[a.priority] - notificationPriorityRank[b.priority]
      || String(a.title).localeCompare(String(b.title))
    ))
    .slice(0, 8)
}

function buildSmartHeaderContext({ profile = {}, safeToSpend = {}, topNotification, activeGoals = [], status } = {}) {
  const available = rupees(safeToSpend.comfortablyUsable)

  if (topNotification) {
    return {
      eyebrow: getGreeting(profile.name),
      title: `${available} available`,
      detail: topNotification.title,
    }
  }

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

function hasUpcomingMoney(upcomingMoney = {}) {
  return normalizeMoney(upcomingMoney.next7?.inflow) > 0
    || normalizeMoney(upcomingMoney.next7?.outflow) > 0
    || normalizeMoney(upcomingMoney.next30?.inflow) > 0
    || normalizeMoney(upcomingMoney.next30?.outflow) > 0
}

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
}) {
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false)
  const [readNotificationIds, setReadNotificationIds] = useState([])
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState([])
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
  const smartNotifications = useMemo(
    () => buildSmartNotifications({
      moneyReminders,
      activeGoals,
      activeTrips,
      latestReport,
      monthlyReplay,
      moneyFeed,
    }),
    [activeGoals, activeTrips, latestReport, moneyFeed, moneyReminders, monthlyReplay],
  )
  const visibleNotifications = useMemo(
    () => smartNotifications.filter((notification) => !dismissedNotificationIds.includes(notification.id)),
    [dismissedNotificationIds, smartNotifications],
  )
  const readNotificationHistory = useMemo(
    () => smartNotifications
      .filter((notification) => (
        readNotificationIds.includes(notification.id)
        || dismissedNotificationIds.includes(notification.id)
      ))
      .slice(0, 5),
    [dismissedNotificationIds, readNotificationIds, smartNotifications],
  )
  const unreadCount = visibleNotifications.filter((notification) => !readNotificationIds.includes(notification.id)).length
  const topNotification = visibleNotifications[0]
  const smartHeader = useMemo(
    () => buildSmartHeaderContext({ profile, safeToSpend, topNotification, activeGoals, status }),
    [activeGoals, profile, safeToSpend, status, topNotification],
  )
  const insight = buildSingleTodayInsight({
    smartHomeInsights,
    whatChangedInsights,
    calmSummaries,
    financialState,
  })
  const storySentence = moneyStorySentence({ insight, replay: monthlyReplay, activeTrips })
  const trackedDays = buildTrackedDayCount(expenses)
  const actionChips = [
    { label: 'Goals', icon: Target, tab: 'planner' },
    { label: 'Trip', icon: Plane, tab: 'history' },
    { label: 'Borrow', icon: Wallet, tab: 'history' },
    { label: 'Lend', icon: CreditCard, tab: 'history' },
    { label: 'EMI', icon: CalendarDays, tab: 'profile' },
    { label: 'Reports', icon: ChartPie, tab: 'reports' },
  ]
  const hasFutureSnapshot = hasUpcomingMoney(upcomingMoney) || futureSnapshot.events.length > 0
  const hasNotificationCenter = visibleNotifications.length > 0 || readNotificationHistory.length > 0
  const markNotificationRead = useCallback((notification) => {
    if (!notification) {
      return
    }

    setReadNotificationIds((current) => (
      current.includes(notification.id) ? current : [notification.id, ...current]
    ))
    trackHomeInteraction('notification_mark_read', {
      notification_type: notification.type,
      priority: notification.priority,
    })
  }, [])
  const dismissNotification = useCallback((notification) => {
    if (!notification) {
      return
    }

    setDismissedNotificationIds((current) => (
      current.includes(notification.id) ? current : [notification.id, ...current]
    ))
    setReadNotificationIds((current) => (
      current.includes(notification.id) ? current : [notification.id, ...current]
    ))
    trackHomeInteraction('notification_dismiss', {
      notification_type: notification.type,
      priority: notification.priority,
    })
  }, [])
  const markAllNotificationsRead = useCallback(() => {
    const unreadIds = visibleNotifications
      .filter((notification) => !readNotificationIds.includes(notification.id))
      .map((notification) => notification.id)

    if (!unreadIds.length) {
      return
    }

    setReadNotificationIds((current) => Array.from(new Set([...unreadIds, ...current])))
    trackHomeInteraction('notification_mark_all_read', { count: unreadIds.length })
  }, [readNotificationIds, visibleNotifications])
  const clearReadNotifications = useCallback(() => {
    const readIds = smartNotifications
      .filter((notification) => readNotificationIds.includes(notification.id))
      .map((notification) => notification.id)

    if (!readIds.length) {
      return
    }

    setDismissedNotificationIds((current) => Array.from(new Set([...readIds, ...current])))
    setReadNotificationIds((current) => current.filter((id) => !readIds.includes(id)))
    trackHomeInteraction('notification_clear_read', { count: readIds.length })
  }, [readNotificationIds, smartNotifications])
  const toggleNotificationCenter = useCallback(() => {
    setIsNotificationCenterOpen((current) => {
      const next = !current

      if (next) {
        trackHomeInteraction('notification_center_open', {
          unread_count: unreadCount,
          notification_count: visibleNotifications.length,
        })
      }

      return next
    })
  }, [unreadCount, visibleNotifications.length])
  const openNotification = useCallback((notification) => {
    if (!notification) {
      return
    }

    setReadNotificationIds((current) => (
      current.includes(notification.id) ? current : [notification.id, ...current]
    ))
    trackHomeInteraction('notification_open', {
      notification_type: notification.type,
      priority: notification.priority,
    })

    if (notification.report) {
      redownloadReport?.(notification.report)
      return
    }

    if (notification.tab) {
      setActiveTab?.(notification.tab)
    }
  }, [redownloadReport, setActiveTab])
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

  return (
    <section className={`screen-content today-screen today-${status.tone}`}>
      <div className="today-v2-header">
        <div className="today-header-copy">
          <p className="eyebrow">{smartHeader.eyebrow}</p>
          <h1>{smartHeader.title}</h1>
          {smartHeader.detail && <p className="smart-header-context">{smartHeader.detail}</p>}
        </div>
        <div className="today-header-actions">
          {hasNotificationCenter && (
            <button
              className="notification-bell-button"
              type="button"
              aria-label={`Open notification center${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              onClick={toggleNotificationCenter}
            >
              <Bell size={17} />
              {unreadCount > 0 && <span>{unreadCount}</span>}
            </button>
          )}
          <span className={`today-status-pill ${financialState.pressureTone === 'slight-pressure' ? 'warm' : financialState.pressureTone}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      <article className="today-available-card premium-money-hero">
        <div>
          <span>Available this month</span>
          <strong>{rupees(safeToSpend.comfortablyUsable)}</strong>
          <p>{topNotification?.title || status.detail}</p>
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

      <div className="today-action-chips" aria-label="Action center">
        {actionChips.map((chip) => {
          const Icon = chip.icon
          return (
            <button
              type="button"
              key={chip.label}
              onClick={() => navigateFromHome(setActiveTab, chip.tab, 'home_action', { target: chip.label })}
            >
              <Icon size={16} />
              <span>{chip.label}</span>
            </button>
          )
        })}
      </div>

      {hasNotificationCenter && (
        <section className={`smart-notification-center ${isNotificationCenterOpen ? 'open' : ''}`} aria-label="Smart Notification Center">
          <button
            className="notification-center-summary"
            type="button"
            aria-expanded={isNotificationCenterOpen}
            onClick={toggleNotificationCenter}
          >
            <span className="soft-icon">
              <Bell size={17} />
            </span>
            <span>
              <small>Smart Notifications</small>
              <strong>{topNotification?.title || 'Read history is clear'}</strong>
              <em>{topNotification?.message || 'No active financial alerts right now.'}</em>
            </span>
            <b className={unreadCount > 0 ? 'active' : ''}>{unreadCount > 0 ? `${unreadCount} unread` : 'Clear'}</b>
            <ChevronDown size={17} />
          </button>

          {isNotificationCenterOpen && (
            <div className="notification-center-panel">
              {visibleNotifications.length > 0 && (
                <>
                  <div className="notification-center-actions">
                    <span>{visibleNotifications.length} active</span>
                    <button type="button" onClick={markAllNotificationsRead}>
                      <CheckCheck size={14} />
                      Mark read
                    </button>
                    <button type="button" onClick={clearReadNotifications}>
                      Clear read
                    </button>
                  </div>
                  <div className="notification-list">
                    {visibleNotifications.map((notification) => {
                      const Icon = notification.icon
                      const isRead = readNotificationIds.includes(notification.id)

                      return (
                        <article className={`notification-card ${notification.priority.toLowerCase()} ${isRead ? 'read' : 'unread'}`} key={notification.id}>
                          <button type="button" className="notification-main" onClick={() => openNotification(notification)}>
                            <span className={`notification-type ${notification.type.toLowerCase().replace(/\s+/g, '-')}`}>{notification.type}</span>
                            <Icon size={16} />
                            <div>
                              <strong>{notification.title}</strong>
                              <small>{notification.message}</small>
                            </div>
                            <b>{notification.priority}</b>
                          </button>
                          <div className="notification-row-actions">
                            <button type="button" aria-label={`Mark ${notification.title} read`} onClick={() => markNotificationRead(notification)}>
                              <Check size={14} />
                            </button>
                            <button type="button" aria-label={`Dismiss ${notification.title}`} onClick={() => dismissNotification(notification)}>
                              <X size={14} />
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </>
              )}

              {readNotificationHistory.length > 0 && (
                <div className="notification-history">
                  <span>Read history</span>
                  {readNotificationHistory.map((notification) => (
                    <small key={`history-${notification.id}`}>
                      {notification.title}
                    </small>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

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
