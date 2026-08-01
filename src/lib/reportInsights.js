import { aggregateExpenses, getCategoryTotal } from './categoryIntelligence.js'
import { addMoney, normalizeMoney, sumMoney } from './money.js'
import { rupees, shortRupees } from './ruleEngine.js'

function safeAmount(value) {
  return normalizeMoney(value)
}

function getTopBreakdown(expenseBreakdown = []) {
  return expenseBreakdown
    .slice()
    .sort((a, b) => safeAmount(b.value) - safeAmount(a.value))[0]
}

function confidenceLabel(confidence) {
  if (confidence === 'high') {
    return 'Strong visibility'
  }

  if (confidence === 'moderate' || confidence === 'medium') {
    return 'Moderate visibility'
  }

  if (confidence === 'none') {
    return 'No tracked entries yet'
  }

  return 'Limited visibility'
}

function insight(title, detail, confidence = 'moderate') {
  return { title, detail, confidence: confidenceLabel(confidence) }
}

function weekendTotal(spending) {
  return spending.records.reduce((total, expense) => {
    const date = new Date(`${expense.date || ''}T00:00:00`)

    if (Number.isNaN(date.getTime())) {
      return total
    }

    const day = date.getDay()
    return day === 0 || day === 6 ? addMoney(total, expense.amount) : total
  }, 0)
}

function recurringTotal(profile = {}, spending) {
  const commitments = Array.isArray(profile.commitments) ? profile.commitments : profile.fixedExpenses || []
  const subscriptions = getCategoryTotal(spending, 'Subscription')

  return commitments.reduce((total, item) => addMoney(total, item.amount), subscriptions)
}

function savingsBucketTotal(buckets = []) {
  return sumMoney(buckets, (bucket) => bucket.saved)
}

function savingsBucketTarget(buckets = []) {
  return sumMoney(buckets, (bucket) => bucket.target)
}

function savingsConsistency(financialState, savingsBuckets = []) {
  const saved = savingsBucketTotal(savingsBuckets)
  const target = savingsBucketTarget(savingsBuckets)
  const progress = target > 0 ? Math.round((saved / target) * 100) : 0

  if (target <= 0 && saved <= 0) {
    return 'No goal yet'
  }

  if (target <= 0) {
    return 'Saved, no target'
  }

  if (financialState.breathingRoom > 0 && progress >= 25) {
    return 'Stable'
  }

  if (financialState.breathingRoom > 0 || progress > 0) {
    return 'Forming'
  }

  return 'Under 25%'
}

function buildAdvisory(financialState, topTracked, spending) {
  if (spending.count === 0) {
    return 'The report is ready, but spending insight confidence is limited until a few expenses are added.'
  }

  if (financialState.pressureTone === 'slight-pressure') {
    return 'Current monthly balance is carrying a lot. Keeping purchases lighter and protecting cash space may make the next few weeks feel easier.'
  }

  if (spending.lowConfidenceShare > 0.35) {
    return 'Some custom entries are included in the report, but a few labels are still broad. Tightening those names will make future insights more precise.'
  }

  if (financialState.pressureTone === 'warm') {
    return 'Current monthly balance appears manageable, though preserving stronger breathing room may improve future flexibility.'
  }

  if (topTracked?.value > financialState.income * 0.18) {
    return `${topTracked.name} is the biggest tracked spending area this month. It is not a problem by itself, but reviewing it gently can improve clarity.`
  }

  return 'The month looks readable overall. Keep monthly bills clear, protect a small buffer, and plan larger purchases with time on your side.'
}

function buildTimeline(spending) {
  const byDate = new Map()

  spending.records.forEach((expense) => {
    const date = String(expense.date || '').trim()
    if (!date) {
      return
    }

    byDate.set(date, addMoney(byDate.get(date) || 0, expense.amount))
  })

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => {
      const parsed = new Date(`${date}T00:00:00`)
      const label = Number.isNaN(parsed.getTime())
        ? date
        : parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

      return { date, label, amount }
    })
}

function buildSharedInsights(sharedSummary = {}) {
  if (!sharedSummary?.activeGroups) {
    return []
  }

  const insights = [
    insight(
      'Shared expenses are connected',
      `Shared payments currently affect this month by around ${rupees(sharedSummary.netSharedImpact)} after received settlements.`,
      'high',
    ),
  ]

  if (sharedSummary.pendingRecoverable > 0) {
    insights.push(insight(
      'Pending recoveries are visible',
      `${rupees(sharedSummary.pendingRecoverable)} is still recoverable from shared expenses.`,
      'high',
    ))
  }

  if (sharedSummary.receivedRecoveries > 0) {
    insights.push(insight(
      'Settlements received',
      `${rupees(sharedSummary.receivedRecoveries)} has been marked received and is no longer treated as monthly pressure.`,
      'high',
    ))
  }

  if (sharedSummary.pendingLiability > 0) {
    insights.push(insight(
      'Shared amount owed',
      `${rupees(sharedSummary.pendingLiability)} is still pending from shared expenses you did not pay upfront.`,
      'high',
    ))
  }

  return insights
}

function buildMoneyBookInsights(moneyBookSummary = {}) {
  if (!moneyBookSummary || (!moneyBookSummary.pendingCount && !moneyBookSummary.totalGiven && !moneyBookSummary.totalBorrowed)) {
    return []
  }

  const insights = [
    insight(
      'Money Book is connected',
      `Borrow and lend activity is included in history, reports, and monthly pressure where it affects cash.`,
      'high',
    ),
  ]

  if (moneyBookSummary.needToReceive > 0) {
    insights.push(insight(
      'Pending money to receive',
      `${rupees(moneyBookSummary.needToReceive)} is still receivable from Money Book entries.`,
      'high',
    ))
  }

  if (moneyBookSummary.needToPay > 0) {
    insights.push(insight(
      'Pending money to repay',
      `${rupees(moneyBookSummary.needToPay)} is still payable from Money Book entries.`,
      'high',
    ))
  }

  if (moneyBookSummary.settledThisMonth > 0) {
    insights.push(insight(
      'Settlements completed',
      `${rupees(moneyBookSummary.settledThisMonth)} was marked settled this month.`,
      'high',
    ))
  }

  return insights
}

export function buildAdvancedReport({
  expenseBreakdown = [],
  expenses = [],
  financialState = {},
  insights = [],
  profile = {},
  savingsBuckets = [],
  sharedSummary = null,
  moneyBookSummary = null,
} = {}) {
  const spending = aggregateExpenses(expenses)
  const topItem = getTopBreakdown(expenseBreakdown)
  const topTracked = spending.categories[0]
  const totalSpending = safeAmount(financialState.committed)
  const travel = getCategoryTotal(spending, 'Travel')
  const shopping = getCategoryTotal(spending, 'Shopping')
  const weekend = weekendTotal(spending)
  const recurring = recurringTotal(profile, spending)
  const saved = savingsBucketTotal(savingsBuckets)
  const target = savingsBucketTarget(savingsBuckets)
  const savingsProgress = target > 0 ? Math.round((saved / target) * 100) : 0
  const safeRoom = safeAmount(financialState.safeToSpend ?? financialState.breathingRoom)
  const timeline = buildTimeline(spending)
  const snapshot = [
    { label: 'Income', value: shortRupees(safeAmount(financialState.income)), detail: 'Monthly base' },
    { label: 'Total spending', value: shortRupees(totalSpending), detail: `${financialState.usagePercent || 0}% of income used` },
    { label: 'EMI load', value: `${financialState.emiLoad || 0}%`, detail: rupees(safeAmount(financialState.emiAmount)) },
    { label: 'Safe to spend', value: shortRupees(safeRoom), detail: 'After safety savings' },
    {
      label: 'Insight confidence',
      value: confidenceLabel(spending.dataConfidence),
      detail: `${spending.count} tracked entr${spending.count === 1 ? 'y' : 'ies'}`,
    },
    { label: 'Savings consistency', value: savingsConsistency(financialState, savingsBuckets), detail: `${savingsProgress}% goal progress` },
    ...(sharedSummary?.activeGroups
      ? [{
          label: 'Shared impact',
          value: shortRupees(sharedSummary.netSharedImpact),
          detail: `${shortRupees(sharedSummary.pendingRecoverable)} recoverable`,
        }]
      : []),
    ...(moneyBookSummary?.pendingCount || moneyBookSummary?.totalGiven || moneyBookSummary?.totalBorrowed
      ? [{
          label: 'Money Book',
          value: shortRupees(moneyBookSummary.pendingSettlements || 0),
          detail: `${moneyBookSummary.pendingCount || 0} pending settlement${moneyBookSummary.pendingCount === 1 ? '' : 's'}`,
        }]
      : []),
  ]
  const behaviorInsights = [
    weekend > 0
      ? insight('Weekend spending is visible', `Weekend-dated entries total around ${rupees(weekend)}.`, 'moderate')
      : insight(
          'Weekend visibility is limited',
          spending.count >= 4
            ? 'No weekend-dated entries are visible in the current tracked data.'
            : 'More dated entries are needed before weekend patterns are meaningful.',
          spending.count >= 4 ? 'moderate' : 'low',
        ),
    insight(
      recurring > financialState.income * 0.45 ? 'Monthly bills take meaningful space' : 'Monthly bills look trackable',
      `Monthly bills and subscription-like entries are roughly ${rupees(recurring)}.`,
      'high',
    ),
    saved > 0
      ? insight('Savings goals are building', `Goals hold around ${rupees(saved)} so far.`, 'high')
      : insight('Savings goal visibility is early', 'No goal savings are recorded yet. Adding one goal can make purchase planning clearer.', 'low'),
    travel > 0
      ? insight('Travel mapping is active', `Travel includes fuel and commute-like labels, currently totaling ${rupees(travel)}.`, 'high')
      : insight('Travel mapping is ready', 'Fuel, petrol, cab, train, bus, flight, and hotel labels will be included when they appear.', 'low'),
    shopping > 0
      ? insight('Shopping is included in tracked spending', `Shopping currently totals ${rupees(shopping)}.`, 'high')
      : insight('Shopping entries are not visible yet', 'No shopping entries are currently present in the tracked data.', spending.dataConfidence === 'high' ? 'moderate' : 'low'),
    ...buildSharedInsights(sharedSummary),
    ...buildMoneyBookInsights(moneyBookSummary),
  ]

  return {
    advisory: buildAdvisory(financialState, topTracked || topItem, spending),
    snapshot,
    behaviorInsights,
    spending,
    timeline,
    insights,
    sharedSummary,
    moneyBookSummary,
  }
}
