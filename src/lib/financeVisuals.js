import { aggregateExpenses, categoryColor, normalizeSpendCategory } from './categoryIntelligence.js'
import { getFinanceColor, getFinanceMatteColor } from './financeColors.js'
import { normalizeCommitments, shortRupees } from './ruleEngine.js'

function safeAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function groupedEntriesFromTotals(totals = {}, { matte = false } = {}) {
  return Object.entries(totals)
    .filter(([, value]) => safeAmount(value) > 0)
    .sort((a, b) => safeAmount(b[1]) - safeAmount(a[1]))
    .map(([name, value], index) => ({
      name,
      value: safeAmount(value),
      color: matte
        ? getFinanceMatteColor(name, index)
        : categoryColor(name) || getFinanceColor(name, index),
    }))
}

export function buildFixedExpenseDistribution(profile = {}) {
  const totals = {}

  normalizeCommitments(profile).forEach((commitment) => {
    const normalized = normalizeSpendCategory({
      category: commitment.name,
      note: commitment.name,
    })
    const category = normalized.category === 'Other' ? 'Recurring' : normalized.category
    totals[category] = (totals[category] || 0) + safeAmount(commitment.amount)
  })

  const entries = groupedEntriesFromTotals(totals, { matte: true })
  const total = entries.reduce((sum, entry) => sum + entry.value, 0)

  return {
    title: 'Fixed Expense Distribution',
    subtitle: 'Regular payments that shape the month.',
    entries,
    total,
    totalLabel: shortRupees(total),
    tone: 'matte',
  }
}

export function buildFlexibleSpendingDistribution(expenses = [], financialState = {}) {
  const spending = aggregateExpenses(expenses)
  const availableAfterFixed = Math.max(
    safeAmount(financialState.income) - safeAmount(financialState.fixedTotal),
    0,
  )
  const trackedFlexible = spending.total
  const openFlexibleSpace = Math.max(availableAfterFixed - trackedFlexible, 0)
  const entries = spending.categories.map((entry) => ({
    name: entry.name,
    value: entry.value,
    color: entry.color,
  }))

  if (openFlexibleSpace > 0) {
    entries.push({
      name: 'Open flexible space',
      value: openFlexibleSpace,
      color: getFinanceColor('Other'),
    })
  }

  return {
    title: 'Flexible Spending Distribution',
    subtitle: 'Tracked spending inside the space left after fixed expenses.',
    entries,
    total: availableAfterFixed,
    spent: trackedFlexible,
    totalLabel: shortRupees(availableAfterFixed),
  }
}

export function getGreeting(name = 'Jon Doe') {
  const hour = new Date().getHours()
  const period = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = String(name || 'there').trim().split(/\s+/)[0] || 'there'

  return `${period}, ${firstName}`
}

export function getProfileBalanceMessage(financialState = {}) {
  if (financialState.pressureTone === 'slight-pressure') {
    return 'Your financial balance is carrying a lot this month. Keeping new commitments light may help.'
  }

  if (financialState.pressureTone === 'warm') {
    return 'Your financial balance looks manageable, with a little care around new spending.'
  }

  if (financialState.pressureTone === 'comfortable') {
    return 'Your financial balance looks stable this month.'
  }

  return 'Your financial balance looks steady with room for careful planning.'
}
