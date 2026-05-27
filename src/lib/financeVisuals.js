import { aggregateExpenses, categoryColor, normalizeSpendCategory } from './categoryIntelligence.js'
import { getFinanceColor, getFinanceMatteColor } from './financeColors.js'
import { addMoney, normalizeMoney, subtractMoney, sumMoney } from './money.js'
import { normalizeCommitments, shortRupees } from './ruleEngine.js'

function safeAmount(value) {
  return normalizeMoney(value)
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
    totals[category] = addMoney(totals[category] || 0, commitment.amount)
  })

  const entries = groupedEntriesFromTotals(totals, { matte: true })
  const total = sumMoney(entries, (entry) => entry.value)

  return {
    title: 'Monthly bills',
    subtitle: 'Regular payments that shape the month.',
    entries,
    total,
    totalLabel: shortRupees(total),
    tone: 'matte',
  }
}

export function buildFlexibleSpendingDistribution(expenses = [], financialState = {}) {
  const spending = aggregateExpenses(expenses)
  const availableAfterFixed = subtractMoney(financialState.income, financialState.fixedTotal)
  const trackedFlexible = spending.total
  const openFlexibleSpace = safeAmount(financialState.safeToSpend ?? financialState.breathingRoom ?? subtractMoney(availableAfterFixed, trackedFlexible))
  const totalSpace = addMoney(trackedFlexible, openFlexibleSpace)
  const entries = spending.categories.map((entry) => ({
    name: entry.name,
    value: safeAmount(entry.value),
    color: entry.color,
  }))

  if (openFlexibleSpace > 0) {
    entries.push({
      name: 'Safe room left',
      value: openFlexibleSpace,
      color: getFinanceColor('Other'),
    })
  }

  return {
    title: 'Daily spending space',
    subtitle: 'Tracked spending plus what still looks safe.',
    entries,
    total: totalSpace,
    spent: trackedFlexible,
    totalLabel: shortRupees(totalSpace),
  }
}

export function getGreeting(name = '') {
  const hour = new Date().getHours()
  const period = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = String(name || 'there').trim().split(/\s+/)[0] || 'there'

  return `${period}, ${firstName}`
}

export function getProfileBalanceMessage(financialState = {}) {
  if (financialState.pressureTone === 'slight-pressure') {
    return 'This month is carrying a lot. Keeping new monthly bills light may help.'
  }

  if (financialState.pressureTone === 'warm') {
    return 'This month looks manageable, with a little care around new spending.'
  }

  if (financialState.pressureTone === 'comfortable') {
    return 'Your money looks stable this month.'
  }

  return 'Your money looks steady with room for careful planning.'
}
