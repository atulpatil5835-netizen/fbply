import { aggregateExpenses, getCategoryTotal } from './categoryIntelligence.js'
import { rupees } from './ruleEngine.js'

const DAY_MS = 24 * 60 * 60 * 1000

function safeAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(Math.round(value), min), max)
}

function startOfDay(date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function parseExpenseDate(expense, now) {
  const parsed = expense?.date ? new Date(expense.date) : now
  return Number.isNaN(parsed.getTime()) ? now : parsed
}

function daysAgo(expense, now) {
  return Math.floor((startOfDay(now) - startOfDay(parseExpenseDate(expense, now))) / DAY_MS)
}

function entriesInWindow(expenses, now, startDay, endDay) {
  return expenses.filter((expense) => {
    const age = daysAgo(expense, now)
    return age >= startDay && age < endDay
  })
}

function sumExpenses(expenses) {
  return expenses.reduce((total, expense) => total + safeAmount(expense.amount), 0)
}

function percentChange(current, previous) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0
  }

  return Math.round(((current - previous) / previous) * 100)
}

function goalProgressList(savingsBuckets = [], recommendation = null) {
  const bucketGoals = savingsBuckets
    .map((bucket) => {
      const saved = safeAmount(bucket.saved)
      const target = safeAmount(bucket.target)
      return {
        name: bucket.name || 'Savings goal',
        progress: target > 0 ? clamp((saved / target) * 100) : 0,
        saved,
        target,
      }
    })
    .filter((goal) => goal.target > 0)

  const plannerGoal = recommendation?.targetAmount
    ? [{
        name: recommendation.goalName || `${recommendation.category || 'Purchase'} plan`,
        progress: clamp((safeAmount(recommendation.currentSavings) / safeAmount(recommendation.targetAmount)) * 100),
        saved: safeAmount(recommendation.currentSavings),
        target: safeAmount(recommendation.targetAmount),
      }]
    : []

  return [...bucketGoals, ...plannerGoal]
}

function buildWeekendInsight(expenses, now) {
  const totalsByDate = new Map()
  const recentEntries = entriesInWindow(expenses, now, 0, 28)

  recentEntries.forEach((expense) => {
    const key = startOfDay(parseExpenseDate(expense, now)).toISOString().slice(0, 10)
    totalsByDate.set(key, safeAmount(totalsByDate.get(key)) + safeAmount(expense.amount))
  })

  if (recentEntries.length < 4) {
    return null
  }

  let weekendTotal = 0
  let weekdayTotal = 0
  let weekendDays = 0
  let weekdayDays = 0
  const cursor = startOfDay(now)

  for (let index = 0; index < 28; index += 1) {
    const date = new Date(cursor)
    date.setDate(cursor.getDate() - index)
    const key = date.toISOString().slice(0, 10)
    const total = safeAmount(totalsByDate.get(key))
    const isWeekend = date.getDay() === 0 || date.getDay() === 6

    if (isWeekend) {
      weekendTotal += total
      weekendDays += 1
    } else {
      weekdayTotal += total
      weekdayDays += 1
    }
  }

  const weekendAverage = weekendDays > 0 ? weekendTotal / weekendDays : 0
  const weekdayAverage = weekdayDays > 0 ? weekdayTotal / weekdayDays : 0

  if (weekendAverage > weekdayAverage * 1.18 && weekendAverage - weekdayAverage > 100) {
    return {
      kind: 'weekend',
      kicker: 'Pattern',
      title: 'Weekend expenses are higher than average',
      detail: `Weekends average ${rupees(weekendAverage)} per day versus ${rupees(weekdayAverage)} on weekdays.`,
      tone: 'balanced',
      priority: 86,
    }
  }

  if (weekendTotal > 0 && weekendAverage <= weekdayAverage) {
    return {
      kind: 'weekend',
      kicker: 'Pattern',
      title: 'Weekend spending is staying calm',
      detail: 'Your recent weekend pace is not heavier than weekdays.',
      tone: 'good',
      priority: 66,
    }
  }

  return null
}

export function buildSmartHomeInsights({
  expenses = [],
  financialState = {},
  savingsBuckets = [],
  recommendation = null,
  now = new Date(),
} = {}) {
  const currentWeekEntries = entriesInWindow(expenses, now, 0, 7)
  const previousWeekEntries = entriesInWindow(expenses, now, 7, 14)
  const currentWeek = sumExpenses(currentWeekEntries)
  const previousWeek = sumExpenses(previousWeekEntries)
  const spending = aggregateExpenses(expenses)
  const currentAggregation = aggregateExpenses(currentWeekEntries)
  const previousAggregation = aggregateExpenses(previousWeekEntries)
  const candidates = []

  if (currentWeek > 0 && previousWeek > 0) {
    const change = percentChange(currentWeek, previousWeek)
    const changeSize = Math.abs(change)

    candidates.push({
      kind: 'weekly',
      kicker: 'This week',
      title: change <= 0 ? `You spent ${changeSize}% less this week` : `You spent ${changeSize}% more this week`,
      detail: `${rupees(currentWeek)} tracked in the last 7 days versus ${rupees(previousWeek)} before that.`,
      tone: change <= 0 ? 'good' : 'balanced',
      priority: change <= 0 ? 98 : 92,
    })
  } else if (currentWeek > 0) {
    candidates.push({
      kind: 'weekly',
      kicker: 'This week',
      title: `${rupees(currentWeek)} tracked this week`,
      detail: 'A comparison will appear after one more week of entries.',
      tone: 'balanced',
      priority: 58,
    })
  }

  const categoryChanges = currentAggregation.categories
    .map((category) => {
      const previous = getCategoryTotal(previousAggregation, category.name)
      const change = percentChange(category.value, previous)
      return {
        ...category,
        previous,
        change,
        delta: category.value - previous,
      }
    })
    .filter((category) => category.value > 0 && category.previous > 0 && category.change >= 15 && category.delta >= 100)
    .sort((a, b) => b.delta - a.delta)

  if (categoryChanges.length > 0) {
    const category = categoryChanges[0]
    candidates.push({
      kind: 'category',
      kicker: 'Category',
      title: `${category.name} spending increased`,
      detail: `${category.name} is up ${category.change}% versus the previous week.`,
      tone: category.change > 45 ? 'warm' : 'balanced',
      priority: 90,
    })
  } else if (spending.categories[0]?.value > 0) {
    const top = spending.categories[0]
    candidates.push({
      kind: 'category',
      kicker: 'Top spend',
      title: `${top.name} is your largest category`,
      detail: `${rupees(top.value)} tracked so far, about ${Math.round(top.share * 100)}% of recent spending.`,
      tone: top.share > 0.42 ? 'balanced' : 'good',
      priority: 72,
    })
  }

  const goals = goalProgressList(savingsBuckets, recommendation)
  const closestGoal = goals
    .filter((goal) => goal.progress > 0)
    .sort((a, b) => b.progress - a.progress)[0]

  if (closestGoal?.progress >= 100) {
    candidates.push({
      kind: 'goal',
      kicker: 'Goal',
      title: `${closestGoal.name} is fully funded`,
      detail: 'Nice. Keeping it visible can help protect the win.',
      tone: 'good',
      priority: 94,
    })
  } else if (closestGoal?.progress >= 75) {
    candidates.push({
      kind: 'goal',
      kicker: 'Goal',
      title: `You are close to ${closestGoal.name}`,
      detail: `${closestGoal.progress}% complete, with ${rupees(Math.max(closestGoal.target - closestGoal.saved, 0))} left.`,
      tone: 'good',
      priority: 88,
    })
  } else if (closestGoal) {
    candidates.push({
      kind: 'goal',
      kicker: 'Goal',
      title: `${closestGoal.name} is building`,
      detail: `${closestGoal.progress}% complete. Small steady adds will make this feel easier.`,
      tone: 'balanced',
      priority: 64,
    })
  } else {
    candidates.push({
      kind: 'goal',
      kicker: 'Next habit',
      title: 'One small goal will sharpen Home',
      detail: 'Add a savings bucket when you want progress and reminders to feel more personal.',
      tone: 'balanced',
      priority: 52,
    })
  }

  const weekendInsight = buildWeekendInsight(expenses, now)
  if (weekendInsight) {
    candidates.push(weekendInsight)
  }

  if (safeAmount(financialState.breathingRoom) > 0) {
    candidates.push({
      kind: 'control',
      kicker: 'Control',
      title: 'You are protecting breathing room',
      detail: `${rupees(financialState.breathingRoom)} remains after the protected buffer.`,
      tone: 'good',
      priority: 82,
    })
  } else if (safeAmount(financialState.income) > 0) {
    candidates.push({
      kind: 'control',
      kicker: 'Control',
      title: 'Breathing room is close to the buffer',
      detail: 'Keeping new spending light can make the rest of the month feel calmer.',
      tone: 'warm',
      priority: 84,
    })
  }

  if (candidates.length === 0) {
    return [{
      kind: 'starter',
      kicker: 'Starter',
      title: 'Home gets smarter with real entries',
      detail: 'A few expenses and one savings goal are enough to reveal useful patterns.',
      tone: 'balanced',
      priority: 1,
    }]
  }

  const seed = Math.floor(startOfDay(now).getTime() / DAY_MS)
  const prioritized = [...candidates].sort((a, b) => b.priority - a.priority).slice(0, 6)
  const offset = prioritized.length > 0 ? seed % prioritized.length : 0

  return [...prioritized.slice(offset), ...prioritized.slice(0, offset)].slice(0, 4)
}

export function buildFinancialHealthScore({
  expenses = [],
  financialState = {},
  savingsBuckets = [],
  recommendation = null,
  moneyBookSummary = {},
} = {}) {
  const spending = aggregateExpenses(expenses)
  const goals = goalProgressList(savingsBuckets, recommendation)
  const totalSaved = goals.reduce((total, goal) => total + goal.saved, 0)
  const totalTarget = goals.reduce((total, goal) => total + goal.target, 0)
  const averageGoalProgress = goals.length > 0
    ? goals.reduce((total, goal) => total + goal.progress, 0) / goals.length
    : 0
  const usagePercent = safeAmount(financialState.usagePercent)
  const reserveTarget = safeAmount(financialState.reserveTarget)
  const breathingRoom = safeAmount(financialState.breathingRoom)
  const topShare = spending.categories[0]?.share || 0
  const diversityScore = spending.categories.length > 0 ? Math.min((spending.categories.length / 4) * 100, 100) : 52
  const pendingReceivable = safeAmount(moneyBookSummary.needToReceive)
  const pendingPayable = safeAmount(moneyBookSummary.needToPay)
  const pendingDebt = pendingReceivable + pendingPayable
  const settledThisMonth = safeAmount(moneyBookSummary.settledThisMonth)
  const income = safeAmount(financialState.income)
  const pendingDebtRatio = income > 0 ? (pendingDebt / income) * 100 : pendingDebt > 0 ? 45 : 0

  const savingsConsistency = goals.length > 0
    ? clamp((totalTarget > 0 ? (totalSaved / totalTarget) * 82 : 0) + Math.min(goals.length, 3) * 6)
    : clamp(reserveTarget > 0 ? (breathingRoom / reserveTarget) * 80 + 18 : 56)
  const expenseBalance = spending.count >= 3
    ? clamp(100 - topShare * 48 + diversityScore * 0.28)
    : 62
  const goalCompletion = goals.length > 0
    ? clamp(averageGoalProgress * 0.88 + (goals.some((goal) => goal.progress >= 75) ? 10 : 0))
    : 58
  const spendingControl = safeAmount(financialState.income) > 0
    ? clamp(100 - usagePercent * 0.72 + (breathingRoom > 0 ? 8 : 0))
    : 60
  const repaymentBehavior = pendingDebt > 0
    ? clamp(84 - pendingDebtRatio * 0.9 + (settledThisMonth > 0 ? 12 : 0) + (pendingReceivable >= pendingPayable ? 4 : 0))
    : 82
  const score = clamp(
    savingsConsistency * 0.23 +
    expenseBalance * 0.2 +
    goalCompletion * 0.19 +
    spendingControl * 0.24 +
    repaymentBehavior * 0.14,
  )
  const tone = score >= 82 ? 'good' : score >= 68 ? 'balanced' : score >= 52 ? 'steady' : 'warm'
  const label = score >= 82 ? 'Strong' : score >= 68 ? 'Steady' : score >= 52 ? 'Building' : 'Needs space'
  const message =
    score >= 82
      ? 'Your money system looks calm and consistent.'
      : score >= 68
        ? 'You are in a steady place with a few useful habits forming.'
        : score >= 52
          ? 'The foundation is forming. One clear goal or lighter week can lift this quickly.'
          : 'Keep this week simple and protect the next small win.'

  return {
    score,
    label,
    tone,
    message,
    factors: [
      { label: 'Savings', score: savingsConsistency },
      { label: 'Stability', score: expenseBalance },
      { label: 'Goals', score: goalCompletion },
      { label: 'Repay', score: repaymentBehavior },
      { label: 'Control', score: spendingControl },
    ],
  }
}
