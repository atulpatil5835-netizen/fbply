import { getFinanceColor } from './financeColors.js'
import { normalizeCommitments, rupees } from './ruleEngine.js'

const DAY_MS = 24 * 60 * 60 * 1000

function safeAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(Math.round(value), min), max)
}

function todayKey(now = new Date()) {
  const parsed = now instanceof Date ? now : new Date(now)
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed
  return date.toISOString().slice(0, 10)
}

function activeMonthKey(monthKey, now = new Date()) {
  const clean = String(monthKey || '').slice(0, 7)
  return /^\d{4}-\d{2}$/.test(clean) ? clean : todayKey(now).slice(0, 7)
}

function parseDayKey(dateKey, fallback = todayKey()) {
  const clean = String(dateKey || fallback).slice(0, 10)
  const parsed = new Date(`${clean}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? new Date(`${fallback}T00:00:00`) : parsed
}

function dateKeyFromDate(date) {
  return date.toISOString().slice(0, 10)
}

function addDays(dateKey, days) {
  const date = parseDayKey(dateKey)
  date.setDate(date.getDate() + days)
  return dateKeyFromDate(date)
}

function daysUntil(dateKey, now = new Date()) {
  const start = parseDayKey(todayKey(now))
  const target = parseDayKey(dateKey)
  return Math.round((target - start) / DAY_MS)
}

function daysInMonth(monthKey) {
  const [year, month] = activeMonthKey(monthKey).split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function monthDateFromDay(monthKey, dueDay = 1) {
  const day = Math.min(Math.max(Number(dueDay || 1), 1), daysInMonth(monthKey))
  return `${activeMonthKey(monthKey)}-${String(day).padStart(2, '0')}`
}

function compactDateLabel(dateKey) {
  const parsed = parseDayKey(dateKey)
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function dueStatus(dateKey, now = new Date(), dueSoonWindow = 5) {
  const diff = daysUntil(dateKey, now)

  if (diff < 0) {
    return {
      label: `${Math.abs(diff)}d overdue`,
      severity: 'overdue',
      priority: 120 + Math.min(Math.abs(diff), 20),
    }
  }

  if (diff === 0) {
    return { label: 'Due today', severity: 'today', priority: 112 }
  }

  if (diff === 1) {
    return { label: 'Due tomorrow', severity: 'soon', priority: 104 }
  }

  if (diff <= dueSoonWindow) {
    return { label: `Due in ${diff}d`, severity: 'soon', priority: 96 - diff }
  }

  return { label: `Due ${compactDateLabel(dateKey)}`, severity: 'later', priority: 36 - Math.min(diff, 30) }
}

function isActionableDue(dateKey, now, windowDays = 7) {
  const diff = daysUntil(dateKey, now)
  return diff <= windowDays
}

function reminderId(prefix, value) {
  return `${prefix}-${String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'item'}`
}

function normalizeTone(tone) {
  if (tone === 'incoming' || tone === 'outgoing' || tone === 'transfer') {
    return tone
  }

  return 'balanced'
}

function buildMoneyBookReminders(moneyBookSummary = {}, now) {
  return (moneyBookSummary.visibleEntries || [])
    .filter((entry) => entry.status !== 'settled' && safeAmount(entry.amount) > 0 && entry.person)
    .map((entry) => {
      const due = safeAmount(entry.amount) + safeAmount(entry.interest)
      const fallbackDate = addDays(entry.date || todayKey(now), entry.kind === 'given' ? 21 : 14)
      const dueDate = entry.dueDate || fallbackDate
      const status = dueStatus(dueDate, now, entry.dueDate ? 7 : -1)
      const isGiven = entry.kind === 'given'

      return {
        id: reminderId('money-book', entry.id || entry.person),
        title: isGiven ? `${entry.person} owes you ${rupees(due)}` : `Repay ${entry.person} ${rupees(due)}`,
        detail: entry.dueDate
          ? `${status.label} from Money Book`
          : isGiven
            ? 'Pending recovery in Money Book'
            : 'Pending repayment in Money Book',
        amount: due,
        tone: isGiven ? 'incoming' : 'outgoing',
        severity: status.severity,
        source: 'Money Book',
        dueDate,
        dueLabel: status.label,
        priority: status.priority + Math.min(due / 500, 18),
      }
    })
}

function buildCommitmentReminders(profile = {}, monthKey, now) {
  return normalizeCommitments(profile)
    .filter((item) => safeAmount(item.amount) > 0 && Number(item.dueDay || 0) > 0)
    .map((item) => {
      const dueDate = monthDateFromDay(monthKey, item.dueDay)
      const status = dueStatus(dueDate, now)

      if (!isActionableDue(dueDate, now, 5)) {
        return null
      }

      return {
        id: reminderId('commitment', item.id || item.name),
        title: `${item.name} ${status.label.toLowerCase()}`,
        detail: `Fixed payment of ${rupees(safeAmount(item.amount))}`,
        amount: safeAmount(item.amount),
        tone: 'outgoing',
        severity: status.severity,
        source: 'Recurring',
        dueDate,
        dueLabel: status.label,
        priority: status.priority + 8,
      }
    })
    .filter(Boolean)
}

function buildSavingsReminders(savingsBuckets = [], now) {
  return savingsBuckets
    .map((bucket) => {
      const target = safeAmount(bucket.target)
      const saved = safeAmount(bucket.saved)
      const deadline = String(bucket.deadline || '').slice(0, 10)

      if (!target || !deadline || saved >= target || !isActionableDue(deadline, now, 14)) {
        return null
      }

      const progress = clamp((saved / target) * 100)
      const status = dueStatus(deadline, now, 14)

      return {
        id: reminderId('goal', bucket.id || bucket.name),
        title: `${bucket.name || 'Savings goal'} deadline approaching`,
        detail: `${progress}% funded, ${rupees(Math.max(target - saved, 0))} left`,
        amount: Math.max(target - saved, 0),
        tone: progress >= 70 ? 'incoming' : 'transfer',
        severity: status.severity,
        source: 'Goals',
        dueDate: deadline,
        dueLabel: status.label,
        priority: status.priority + (100 - progress) * 0.18,
      }
    })
    .filter(Boolean)
}

function buildPlannerReminder(recommendation = null, now) {
  if (!recommendation?.targetAmount) {
    return []
  }

  const target = safeAmount(recommendation.targetAmount)
  const saved = safeAmount(recommendation.currentSavings)
  const remaining = Math.max(target - saved, 0)

  if (!remaining) {
    return []
  }

  const months = Number(recommendation.timelineMonths)
  const dueDate = Number.isFinite(months)
    ? addDays(todayKey(now), Math.max(months, 0) * 30)
    : ''
  const status = dueDate ? dueStatus(dueDate, now, 21) : null
  const urgent = Number.isFinite(months) && months <= 1

  if (!urgent && remaining < target * 0.35) {
    return []
  }

  return [{
    id: 'planner-active-reminder',
    title: `${recommendation.goalName || recommendation.category || 'Planner goal'} needs attention`,
    detail: status
      ? `${status.label}; ${rupees(remaining)} still to arrange`
      : `${rupees(remaining)} still to arrange for the selected plan`,
    amount: remaining,
    tone: 'transfer',
    severity: urgent ? 'soon' : 'later',
    source: 'Planner',
    dueDate,
    dueLabel: status?.label || recommendation.timelineLabel || 'Flexible',
    priority: urgent ? 88 : 56,
  }]
}

export function buildSmartReminders({
  profile = {},
  savingsBuckets = [],
  moneyBookSummary = {},
  recommendation = null,
  monthKey,
  now = new Date(),
} = {}) {
  const activeMonth = activeMonthKey(monthKey, now)
  const candidates = [
    ...buildMoneyBookReminders(moneyBookSummary, now),
    ...buildCommitmentReminders(profile, activeMonth, now),
    ...buildSavingsReminders(savingsBuckets, now),
    ...buildPlannerReminder(recommendation, now),
  ]

  return candidates
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5)
}

function flowGroupLabel(transaction) {
  if (transaction.source === 'commitment') {
    return 'Fixed payment'
  }

  if (transaction.source === 'recurring-savings') {
    return 'Savings move'
  }

  if (transaction.sourceModule === 'Money Book') {
    return transaction.impactType === 'repayment' || transaction.impactType === 'lend_received'
      ? 'Settlement'
      : 'Borrow/Lend'
  }

  return transaction.sourceModule || transaction.category || 'Money move'
}

export function buildCashflowTimeline(transactions = []) {
  const grouped = new Map()

  transactions.forEach((transaction) => {
    const amount = safeAmount(transaction.amount)

    if (!amount || !transaction.date) {
      return
    }

    const tone = normalizeTone(transaction.tone)
    const key = `${transaction.date}-${tone}-${flowGroupLabel(transaction)}`
    const current = grouped.get(key) || {
      id: key,
      date: transaction.date,
      day: String(Number(String(transaction.date).slice(8, 10)) || ''),
      title: flowGroupLabel(transaction),
      tone,
      amount: 0,
      count: 0,
      categories: new Set(),
      color: transaction.color || getFinanceColor(transaction.category),
    }

    current.amount += amount
    current.count += 1
    current.categories.add(transaction.category)
    grouped.set(key, current)
  })

  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      categories: Array.from(item.categories).slice(0, 2).join(', '),
      label: compactDateLabel(item.date),
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 14)
}

function groupKeyForTransaction(transaction = {}) {
  if (transaction.meta?.groupId) {
    return `shared-${transaction.meta.groupId}`
  }

  if (transaction.meta?.moneyBookId) {
    return `money-book-${transaction.meta.moneyBookId}`
  }

  if (transaction.source === 'commitment') {
    return `recurring-${transaction.category || 'commitment'}`
  }

  if (transaction.source === 'recurring-savings') {
    return 'recurring-savings'
  }

  if (transaction.sourceModule === 'Planner') {
    return 'planner'
  }

  return ''
}

function groupedTitle(key, items) {
  const first = items[0] || {}

  if (key.startsWith('shared-')) {
    return first.meta?.groupName || 'Shared expense activity'
  }

  if (key.startsWith('money-book-')) {
    return first.title?.includes('repaid') || first.title?.includes('Repaid')
      ? 'Money Book settlement'
      : 'Money Book activity'
  }

  if (key === 'recurring-savings') {
    return 'Recurring savings'
  }

  if (key.startsWith('recurring-')) {
    return 'Recurring payments'
  }

  if (key === 'planner') {
    return 'Planner movement'
  }

  return first.sourceModule || 'Related activity'
}

function groupedTone(items) {
  const incoming = items.reduce((total, item) => total + (item.tone === 'incoming' ? item.amount : 0), 0)
  const outgoing = items.reduce((total, item) => total + (item.tone === 'outgoing' ? item.amount : 0), 0)

  if (incoming > outgoing) {
    return 'incoming'
  }

  if (outgoing > incoming) {
    return 'outgoing'
  }

  return 'transfer'
}

export function buildRelatedTransactionGroups(transactions = []) {
  const grouped = new Map()
  const singles = []

  transactions.forEach((transaction) => {
    const key = groupKeyForTransaction(transaction)

    if (!key) {
      singles.push({ kind: 'item', key: transaction.id, transaction, sortKey: transaction.dateTime })
      return
    }

    const current = grouped.get(key) || []
    current.push(transaction)
    grouped.set(key, current)
  })

  const nodes = [
    ...singles,
    ...Array.from(grouped.entries()).flatMap(([key, items]) => {
      if (items.length < 2) {
        const transaction = items[0]
        return [{ kind: 'item', key: transaction.id, transaction, sortKey: transaction.dateTime }]
      }

      const tone = groupedTone(items)
      const incoming = items.reduce((total, item) => total + (item.tone === 'incoming' ? safeAmount(item.amount) : 0), 0)
      const outgoing = items.reduce((total, item) => total + (item.tone === 'outgoing' ? safeAmount(item.amount) : 0), 0)
      const transfers = items.reduce((total, item) => total + (item.tone === 'transfer' ? safeAmount(item.amount) : 0), 0)
      const amount = Math.abs(incoming - outgoing) || transfers
      const latest = items.reduce(
        (value, item) => (String(item.dateTime) > String(value) ? item.dateTime : value),
        '',
      )

      return [{
        kind: 'group',
        key,
        title: groupedTitle(key, items),
        detail: `${items.length} linked moves`,
        tone,
        amount,
        items: [...items].sort((a, b) => String(b.dateTime).localeCompare(String(a.dateTime))),
        sortKey: latest,
      }]
    }),
  ]

  return nodes.sort((a, b) => String(b.sortKey).localeCompare(String(a.sortKey)))
}

function changeLabel(current, previous) {
  const diff = safeAmount(current) - safeAmount(previous)

  if (!previous && !current) {
    return 'No movement'
  }

  if (!previous) {
    return 'New this month'
  }

  const percent = Math.round((diff / previous) * 100)

  if (percent === 0) {
    return 'Flat vs last month'
  }

  return `${Math.abs(percent)}% ${percent > 0 ? 'higher' : 'lower'}`
}

export function buildMonthlyComparison({
  current = {},
  previous = {},
} = {}) {
  const rows = [
    {
      label: 'Incoming',
      tone: 'incoming',
      current: safeAmount(current.incoming),
      previous: safeAmount(previous.incoming),
    },
    {
      label: 'Outgoing',
      tone: 'outgoing',
      current: safeAmount(current.outgoing),
      previous: safeAmount(previous.outgoing),
    },
    {
      label: 'Transfers',
      tone: 'transfer',
      current: safeAmount(current.transfers),
      previous: safeAmount(previous.transfers),
    },
  ]

  return rows.map((row) => ({
    ...row,
    labelText: changeLabel(row.current, row.previous),
    delta: row.current - row.previous,
  }))
}
