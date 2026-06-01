import { normalizeMoney } from './money.js'
import { normalizeCommitments, rupees } from './ruleEngine.js'

export const recurringTypes = ['Salary', 'Rent', 'EMI', 'Subscription', 'Utilities', 'Insurance', 'Custom']
export const recurringFrequencies = ['monthly', 'weekly', 'quarterly', 'yearly']

const dayMs = 24 * 60 * 60 * 1000

function pad(value) {
  return String(value).padStart(2, '0')
}

export function dateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return dateKey(new Date())
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : new Date(value)
  }

  const clean = String(value || '').slice(0, 10)
  const parsed = clean ? new Date(`${clean}T12:00:00`) : new Date()

  if (Number.isNaN(parsed.getTime())) {
    return new Date()
  }

  return parsed
}

function startOfDay(value) {
  const parsed = parseDate(value)
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

function clampDay(year, monthIndex, day) {
  return Math.min(Math.max(Number(day || 1), 1), new Date(year, monthIndex + 1, 0).getDate())
}

function dateFromMonthDay(anchor, dueDay, monthOffset = 0) {
  const date = new Date(anchor.getFullYear(), anchor.getMonth() + monthOffset, 1, 12, 0, 0, 0)
  date.setDate(clampDay(date.getFullYear(), date.getMonth(), dueDay))
  return date
}

function daysBetween(from, to) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / dayMs)
}

function addByFrequency(date, frequency) {
  const next = new Date(date)

  if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7)
    return next
  }

  if (frequency === 'quarterly') {
    next.setMonth(next.getMonth() + 3)
    return next
  }

  if (frequency === 'yearly') {
    next.setFullYear(next.getFullYear() + 1)
    return next
  }

  next.setMonth(next.getMonth() + 1)
  return next
}

function normalizeFrequency(value) {
  return recurringFrequencies.includes(value) ? value : 'monthly'
}

function directionForType(type, direction) {
  if (direction === 'incoming' || direction === 'outgoing') {
    return direction
  }

  return type === 'Salary' ? 'incoming' : 'outgoing'
}

function normalizeType(type) {
  return recurringTypes.includes(type) ? type : 'Custom'
}

function sanitizeDueDay(value) {
  return Math.min(Math.max(Number(value || 1), 1), 31)
}

export function createRecurringSchedule(partial = {}) {
  const type = normalizeType(partial.type || 'Custom')

  return normalizeRecurringSchedule({
    id: `recurring-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: partial.name || type,
    amount: partial.amount || 0,
    type,
    direction: partial.direction,
    frequency: partial.frequency || 'monthly',
    dueDay: partial.dueDay || new Date().getDate(),
    startDate: partial.startDate || dateKey(),
    note: partial.note || '',
    paused: Boolean(partial.paused),
  })
}

export function normalizeRecurringSchedule(item = {}, index = 0) {
  const type = normalizeType(item.type)
  const startDate = String(item.startDate || item.nextDate || dateKey()).slice(0, 10)

  return {
    id: String(item.id || `recurring-${index}`),
    name: String(item.name || type || 'Recurring item').trim() || 'Recurring item',
    amount: normalizeMoney(item.amount),
    type,
    direction: directionForType(type, item.direction),
    frequency: normalizeFrequency(item.frequency),
    dueDay: sanitizeDueDay(item.dueDay || startDate.slice(-2)),
    startDate: /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? startDate : dateKey(),
    note: String(item.note || ''),
    paused: Boolean(item.paused),
  }
}

export function normalizeRecurringSchedules(items = []) {
  return Array.isArray(items)
    ? items.map(normalizeRecurringSchedule).filter((item) => item.id && item.name)
    : []
}

export function nextScheduleDate(schedule = {}, from = new Date()) {
  const normalized = normalizeRecurringSchedule(schedule)
  const anchor = startOfDay(from)

  if (normalized.frequency === 'weekly') {
    let next = startOfDay(normalized.startDate)

    while (next < anchor) {
      next = addByFrequency(next, 'weekly')
    }

    return next
  }

  let next = dateFromMonthDay(anchor, normalized.dueDay)

  if (next < anchor) {
    next = addByFrequency(next, normalized.frequency)
  }

  return next
}

function recurrenceEvent(schedule, dueDate, source) {
  const normalized = normalizeRecurringSchedule(schedule)

  return {
    id: `${source}-${normalized.id}-${dateKey(dueDate)}`,
    source,
    scheduleId: normalized.id,
    title: normalized.name,
    type: normalized.type,
    direction: normalized.direction,
    amount: normalized.amount,
    dueDate: dateKey(dueDate),
    frequency: normalized.frequency,
    paused: normalized.paused,
    detail: normalized.frequency,
  }
}

function upcomingScheduleEvents(schedule, from, days, source = 'recurring-schedule') {
  const normalized = normalizeRecurringSchedule(schedule)

  if (normalized.paused) {
    return []
  }

  const until = new Date(startOfDay(from).getTime() + days * dayMs)
  const events = []
  let next = nextScheduleDate(normalized, from)
  let guard = 0

  while (next <= until && guard < 18) {
    events.push(recurrenceEvent(normalized, next, source))
    next = normalized.frequency === 'weekly'
      ? addByFrequency(next, 'weekly')
      : nextScheduleDate(normalized, new Date(next.getTime() + dayMs))
    guard += 1
  }

  return events
}

function salaryEvent(profile = {}, from = new Date()) {
  const amount = normalizeMoney(profile.income)

  if (amount <= 0) {
    return null
  }

  const dueDate = dateFromMonthDay(startOfDay(from), profile.salaryDay || 1)
  const next = dueDate < startOfDay(from) ? addByFrequency(dueDate, 'monthly') : dueDate

  return recurrenceEvent({
    id: 'profile-salary',
    name: 'Salary',
    amount,
    type: 'Salary',
    direction: 'incoming',
    frequency: 'monthly',
    dueDay: profile.salaryDay || 1,
    startDate: dateKey(next),
  }, next, 'profile-salary')
}

function commitmentEvents(profile = {}, from = new Date(), days = 35) {
  return normalizeCommitments(profile).flatMap((commitment, index) => {
    const amount = normalizeMoney(commitment.amount)

    if (amount <= 0) {
      return []
    }

    const name = commitment.name || 'Monthly bill'
    const lowerName = name.toLowerCase()
    const type = lowerName.includes('emi') || lowerName.includes('loan')
      ? 'EMI'
      : lowerName.includes('insurance')
        ? 'Insurance'
        : lowerName.includes('rent') || lowerName.includes('home')
          ? 'Rent'
          : lowerName.includes('subscription') || lowerName.includes('netflix') || lowerName.includes('prime') || lowerName.includes('spotify')
            ? 'Subscription'
            : 'Utilities'

    return upcomingScheduleEvents({
      id: commitment.id || `commitment-${index}`,
      name,
      amount,
      type,
      direction: 'outgoing',
      frequency: commitment.recurrence || 'monthly',
      dueDay: commitment.dueDay || 1,
      startDate: dateKey(from),
      paused: false,
    }, from, days, 'profile-commitment')
  })
}

function goalEvents(savingsBuckets = [], from = new Date(), days = 35) {
  const anchor = startOfDay(from)
  const until = new Date(anchor.getTime() + days * dayMs)

  return savingsBuckets.flatMap((bucket, index) => {
    const deadline = String(bucket.deadline || '').slice(0, 10)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      return []
    }

    const due = startOfDay(deadline)

    if (due < anchor || due > until) {
      return []
    }

    return [{
      id: `goal-${bucket.id || index}-${deadline}`,
      source: 'goal-deadline',
      title: `${bucket.name || 'Savings goal'} target`,
      type: 'Goal',
      direction: 'transfer',
      amount: normalizeMoney(bucket.target),
      dueDate: deadline,
      frequency: 'once',
      detail: 'deadline',
    }]
  })
}

function settlementEvents(sharedSummary = {}, moneyBookSummary = {}, from = new Date()) {
  const today = dateKey(from)
  const events = []

  if (normalizeMoney(sharedSummary.pendingRecoverable) > 0) {
    events.push({
      id: `settlement-recoverable-${today}`,
      source: 'shared-settlement-pending',
      title: 'Settlement pending',
      type: 'Settlement',
      direction: 'incoming',
      amount: normalizeMoney(sharedSummary.pendingRecoverable),
      dueDate: today,
      frequency: 'open',
      detail: 'recoverable',
    })
  }

  if (normalizeMoney(sharedSummary.pendingLiability) > 0) {
    events.push({
      id: `settlement-liability-${today}`,
      source: 'shared-settlement-liability',
      title: 'Shared payment pending',
      type: 'Settlement',
      direction: 'outgoing',
      amount: normalizeMoney(sharedSummary.pendingLiability),
      dueDate: today,
      frequency: 'open',
      detail: 'payable',
    })
  }

  if (normalizeMoney(moneyBookSummary.needToReceive) > 0) {
    events.push({
      id: `money-book-receive-${today}`,
      source: 'money-book-pending',
      title: 'Money to collect',
      type: 'Borrow/Lend',
      direction: 'incoming',
      amount: normalizeMoney(moneyBookSummary.needToReceive),
      dueDate: today,
      frequency: 'open',
      detail: 'pending',
    })
  }

  if (normalizeMoney(moneyBookSummary.needToPay) > 0) {
    events.push({
      id: `money-book-pay-${today}`,
      source: 'money-book-pending',
      title: 'Money to repay',
      type: 'Borrow/Lend',
      direction: 'outgoing',
      amount: normalizeMoney(moneyBookSummary.needToPay),
      dueDate: today,
      frequency: 'open',
      detail: 'pending',
    })
  }

  return events
}

export function buildFinancialCalendarEvents({
  profile = {},
  recurringSchedules = [],
  savingsBuckets = [],
  sharedSummary = {},
  moneyBookSummary = {},
  from = new Date(),
  days = 35,
} = {}) {
  const salary = salaryEvent(profile, from)
  const scheduleEvents = normalizeRecurringSchedules(recurringSchedules).flatMap((schedule) =>
    upcomingScheduleEvents(schedule, from, days),
  )

  return [
    ...(salary ? [salary] : []),
    ...commitmentEvents(profile, from, days),
    ...scheduleEvents,
    ...goalEvents(savingsBuckets, from, days),
    ...settlementEvents(sharedSummary, moneyBookSummary, from),
  ]
    .filter((event) => event.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || String(a.title).localeCompare(String(b.title)))
}

function dueLabel(daysUntil) {
  if (daysUntil < 0) {
    return `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? '' : 's'} late`
  }

  if (daysUntil === 0) {
    return 'Today'
  }

  if (daysUntil === 1) {
    return 'Tomorrow'
  }

  return `In ${daysUntil} days`
}

export function buildMoneyReminders(events = [], from = new Date()) {
  const anchor = startOfDay(from)

  return events
    .map((event) => {
      const daysUntil = daysBetween(anchor, event.dueDate)

      if (event.source.includes('settlement') || event.source === 'money-book-pending') {
        return {
          ...event,
          reminderId: `reminder-${event.id}`,
          label: 'Pending',
          dueLabel: 'Open',
          urgency: 'today',
          message: `${event.title}: ${rupees(event.amount)}`,
        }
      }

      if (daysUntil < 0 || daysUntil > 7) {
        return null
      }

      if (event.type === 'Goal' && daysUntil > 14) {
        return null
      }

      return {
        ...event,
        reminderId: `reminder-${event.id}`,
        label: event.type,
        dueLabel: dueLabel(daysUntil),
        urgency: daysUntil === 0 ? 'today' : daysUntil <= 2 ? 'soon' : 'upcoming',
        message: event.amount > 0 ? `${event.title}: ${rupees(event.amount)}` : event.title,
      }
    })
    .filter(Boolean)
    .slice(0, 5)
}

export function buildUpcomingMoney(events = []) {
  const total = (items) => items.reduce((sum, event) => sum + normalizeMoney(event.amount), 0)
  const within = (days) => events.filter((event) => {
    const diff = daysBetween(new Date(), event.dueDate)
    return diff >= 0 && diff <= days && (event.direction === 'incoming' || event.direction === 'outgoing')
  })
  const next7 = within(7)
  const next30 = within(30)

  return {
    next7: {
      inflow: total(next7.filter((event) => event.direction === 'incoming')),
      outflow: total(next7.filter((event) => event.direction === 'outgoing')),
    },
    next30: {
      inflow: total(next30.filter((event) => event.direction === 'incoming')),
      outflow: total(next30.filter((event) => event.direction === 'outgoing')),
    },
  }
}
