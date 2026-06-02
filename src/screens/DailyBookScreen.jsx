import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  ChartPie,
  ListFilter,
  Plus,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { EmptyState } from '../components/AppPrimitives.jsx'
import { aggregateExpenses, categoryColor, normalizeSpendCategory } from '../lib/categoryIntelligence.js'
import { addMoney, divideMoney, normalizeMoney, sumMoney } from '../lib/money.js'
import { rupees, shortRupees } from '../lib/ruleEngine.js'
import { trackEvent, trackFeatureUsage } from '../lib/analytics'

const historyFilters = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'custom', label: 'Custom Range' },
]

function todayDateKey() {
  return new Date().toISOString().slice(0, 10)
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').slice(0, 10))
}

function cleanDateKey(value, fallback = todayDateKey()) {
  const clean = String(value || '').slice(0, 10)
  return isDateKey(clean) ? clean : fallback
}

function parseDateKey(value) {
  const clean = cleanDateKey(value, '')

  if (!clean) {
    return null
  }

  const parsed = new Date(`${clean}T12:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function shiftDateKey(baseKey, days) {
  const date = parseDateKey(baseKey) || new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function expenseDateKey(expense = {}, fallback) {
  return cleanDateKey(expense.date || expense.createdAt, fallback)
}

function currentMonthKey(todayKey) {
  return cleanDateKey(todayKey).slice(0, 7)
}

function daysElapsedInMonth(todayKey) {
  return Math.max(Number(cleanDateKey(todayKey).slice(8, 10)) || 1, 1)
}

function formatDateLabel(dateKey, todayKey) {
  const clean = cleanDateKey(dateKey, todayKey)
  const yesterdayKey = shiftDateKey(todayKey, -1)

  if (clean === todayKey) {
    return 'Today'
  }

  if (clean === yesterdayKey) {
    return 'Yesterday'
  }

  const parsed = parseDateKey(clean)

  if (!parsed) {
    return clean
  }

  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: parsed.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}

function formatExpenseTime(value) {
  const parsed = new Date(value || Date.now())

  if (Number.isNaN(parsed.getTime())) {
    return 'Now'
  }

  return parsed.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function rangeForFilter(filter, todayKey, customRange) {
  if (filter === 'yesterday') {
    const yesterday = shiftDateKey(todayKey, -1)
    return { start: yesterday, end: yesterday, label: 'Yesterday' }
  }

  if (filter === '7d') {
    return { start: shiftDateKey(todayKey, -6), end: todayKey, label: 'Last 7 days' }
  }

  if (filter === '30d') {
    return { start: shiftDateKey(todayKey, -29), end: todayKey, label: 'Last 30 days' }
  }

  if (filter === 'custom') {
    const fallbackStart = shiftDateKey(todayKey, -6)
    const start = cleanDateKey(customRange.start, fallbackStart)
    const end = cleanDateKey(customRange.end, todayKey)

    return start <= end
      ? { start, end, label: 'Custom range' }
      : { start: end, end: start, label: 'Custom range' }
  }

  return { start: todayKey, end: todayKey, label: 'Today' }
}

function isWithinRange(dateKey, range) {
  return dateKey >= range.start && dateKey <= range.end
}

function normalizeExpenseRecords(expenses, todayKey) {
  return expenses
    .map((expense) => {
      const normalized = normalizeSpendCategory(expense)
      const amount = normalizeMoney(expense.amount)
      const dateKey = expenseDateKey(expense, todayKey)

      return {
        ...expense,
        amount,
        dateKey,
        displayCategory: normalized.category || expense.category || 'Other',
        color: normalized.color || categoryColor(expense.category || 'Other'),
      }
    })
    .filter((expense) => expense.amount > 0)
    .sort((first, second) => {
      const firstTime = first.createdAt || `${first.dateKey}T12:00:00`
      const secondTime = second.createdAt || `${second.dateKey}T12:00:00`
      return String(secondTime).localeCompare(String(firstTime))
    })
}

function groupExpensesByDate(expenses = [], todayKey) {
  const groups = expenses.reduce((map, expense) => {
    const key = expense.dateKey || todayKey
    const current = map.get(key) || {
      key,
      label: formatDateLabel(key, todayKey),
      total: 0,
      items: [],
    }

    current.total = addMoney(current.total, expense.amount)
    current.items.push(expense)
    map.set(key, current)
    return map
  }, new Map())

  return Array.from(groups.values()).sort((first, second) => second.key.localeCompare(first.key))
}

function highestSpendingDay(expenses = [], todayKey) {
  const groups = groupExpensesByDate(expenses, todayKey)
  return groups.sort((first, second) => second.total - first.total)[0] || null
}

function buildRecentTrend(expenses = [], todayKey) {
  const recentStart = shiftDateKey(todayKey, -6)
  const previousStart = shiftDateKey(todayKey, -13)
  const previousEnd = shiftDateKey(todayKey, -7)
  const recent = sumMoney(
    expenses.filter((expense) => expense.dateKey >= recentStart && expense.dateKey <= todayKey),
    (expense) => expense.amount,
  )
  const previous = sumMoney(
    expenses.filter((expense) => expense.dateKey >= previousStart && expense.dateKey <= previousEnd),
    (expense) => expense.amount,
  )

  if (recent === 0 && previous === 0) {
    return {
      label: 'No trend yet',
      detail: 'Add expenses across a few days',
      tone: 'steady',
      icon: Sparkles,
    }
  }

  if (previous === 0) {
    return {
      label: 'New activity',
      detail: `${rupees(recent)} in the last 7 days`,
      tone: 'up',
      icon: TrendingUp,
    }
  }

  const difference = normalizeMoney(recent - previous, { allowNegative: true })
  const ratio = Math.abs(difference) / Math.max(previous, 1)

  if (ratio < 0.1) {
    return {
      label: 'Steady',
      detail: `${rupees(recent)} in the last 7 days`,
      tone: 'steady',
      icon: Sparkles,
    }
  }

  return difference > 0
    ? {
        label: 'Higher than last week',
        detail: `${rupees(difference)} more this week`,
        tone: 'up',
        icon: TrendingUp,
      }
    : {
        label: 'Lower than last week',
        detail: `${rupees(Math.abs(difference))} less this week`,
        tone: 'down',
        icon: TrendingDown,
      }
}

function buildInsightCards(expenses = [], todayKey) {
  const monthKey = currentMonthKey(todayKey)
  const todayExpenses = expenses.filter((expense) => expense.dateKey === todayKey)
  const monthExpenses = expenses.filter((expense) => String(expense.dateKey || '').startsWith(monthKey))
  const todayTotal = sumMoney(todayExpenses, (expense) => expense.amount)
  const monthTotal = sumMoney(monthExpenses, (expense) => expense.amount)
  const averageDailySpend = divideMoney(monthTotal, daysElapsedInMonth(todayKey))
  const highestDay = highestSpendingDay(monthExpenses, todayKey)
  const spending = aggregateExpenses(monthExpenses)
  const topCategory = spending.categories[0]
  const trend = buildRecentTrend(expenses, todayKey)
  const TrendIcon = trend.icon

  return [
    {
      key: 'today',
      label: 'Spent Today',
      value: rupees(todayTotal),
      detail: `${todayExpenses.length} expense${todayExpenses.length === 1 ? '' : 's'}`,
      tone: 'outgoing',
      icon: Receipt,
    },
    {
      key: 'month',
      label: 'Spent This Month',
      value: rupees(monthTotal),
      detail: `${monthExpenses.length} tracked expense${monthExpenses.length === 1 ? '' : 's'}`,
      tone: 'month',
      icon: CalendarDays,
    },
    {
      key: 'average',
      label: 'Average Daily Spend',
      value: rupees(averageDailySpend),
      detail: `Across ${daysElapsedInMonth(todayKey)} day${daysElapsedInMonth(todayKey) === 1 ? '' : 's'}`,
      tone: 'average',
      icon: ChartPie,
    },
    {
      key: 'highest-day',
      label: 'Highest Spending Day',
      value: highestDay ? rupees(highestDay.total) : rupees(0),
      detail: highestDay ? formatDateLabel(highestDay.key, todayKey) : 'No daily high yet',
      tone: 'highest',
      icon: TrendingUp,
    },
    {
      key: 'top-category',
      label: 'Top Category',
      value: topCategory?.name || 'None',
      detail: topCategory ? rupees(topCategory.value) : 'No category yet',
      tone: 'category',
      icon: Receipt,
    },
    {
      key: 'trend',
      label: 'Recent Spending Trend',
      value: trend.label,
      detail: trend.detail,
      tone: trend.tone,
      icon: TrendIcon,
    },
  ]
}

function RangeFilters({ selectedFilter, onSelect }) {
  return (
    <div className="activity-filter-row daily-book-filter-row" aria-label="Expense history filters">
      {historyFilters.map((filter) => (
        <button
          className={selectedFilter === filter.key ? 'active' : ''}
          key={filter.key}
          type="button"
          aria-pressed={selectedFilter === filter.key}
          onClick={() => onSelect(filter.key)}
        >
          <ListFilter size={14} />
          <span>{filter.label}</span>
        </button>
      ))}
    </div>
  )
}

function DailyBookInsightCard({ insight }) {
  const Icon = insight.icon

  return (
    <article className={`daily-book-insight-card ${insight.tone}`}>
      <span className="daily-book-insight-icon">
        <Icon size={17} />
      </span>
      <div>
        <span>{insight.label}</span>
        <strong>{insight.value}</strong>
        <small>{insight.detail}</small>
      </div>
    </article>
  )
}

function DailyExpenseRow({ expense }) {
  const title = expense.label || expense.category || 'Expense'
  const note = expense.note || expense.type || ''

  return (
    <article className="daily-book-expense-row">
      <span className="daily-book-expense-icon" style={{ color: expense.color || categoryColor(expense.displayCategory) }}>
        <Receipt size={16} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{expense.displayCategory}{note ? ` - ${note}` : ''}</p>
      </div>
      <div className="daily-book-expense-amount">
        <strong>-{rupees(expense.amount)}</strong>
        <time dateTime={expense.createdAt || expense.dateKey}>
          {formatExpenseTime(expense.createdAt || `${expense.dateKey}T12:00:00`)}
        </time>
      </div>
    </article>
  )
}

export default function DailyBookScreen({ expenses = [], openAddSheet }) {
  const todayKey = useMemo(() => todayDateKey(), [])
  const [selectedFilter, setSelectedFilter] = useState('today')
  const [customRange, setCustomRange] = useState(() => ({
    start: shiftDateKey(todayDateKey(), -6),
    end: todayDateKey(),
  }))
  const hasTrackedOpenRef = useRef(false)
  const hasTrackedInsightsRef = useRef(false)
  const expenseRecords = useMemo(() => normalizeExpenseRecords(expenses, todayKey), [expenses, todayKey])
  const activeRange = useMemo(
    () => rangeForFilter(selectedFilter, todayKey, customRange),
    [customRange, selectedFilter, todayKey],
  )
  const filteredExpenses = useMemo(
    () => expenseRecords.filter((expense) => isWithinRange(expense.dateKey, activeRange)),
    [activeRange, expenseRecords],
  )
  const groupedExpenses = useMemo(
    () => groupExpensesByDate(filteredExpenses, todayKey),
    [filteredExpenses, todayKey],
  )
  const insightCards = useMemo(
    () => buildInsightCards(expenseRecords, todayKey),
    [expenseRecords, todayKey],
  )
  const rangeTotal = useMemo(() => sumMoney(filteredExpenses, (expense) => expense.amount), [filteredExpenses])

  useEffect(() => {
    if (hasTrackedOpenRef.current) {
      return
    }

    hasTrackedOpenRef.current = true
    trackEvent('daily_book_opened', {
      surface: 'daily_book',
      expense_count: expenseRecords.length,
    })
    trackFeatureUsage('daily_book', {
      surface: 'app_shell',
      expense_count: expenseRecords.length,
    })
  }, [expenseRecords.length])

  useEffect(() => {
    if (hasTrackedInsightsRef.current) {
      return
    }

    hasTrackedInsightsRef.current = true
    trackEvent('daily_book_insights_opened', {
      surface: 'daily_book',
      insight_count: insightCards.length,
    })
    trackFeatureUsage('daily_book_insights', {
      surface: 'daily_book',
      insight_count: insightCards.length,
    })
  }, [insightCards.length])

  const selectFilter = useCallback((filter) => {
    setSelectedFilter(filter)
    trackEvent('daily_book_history_filter_used', {
      surface: 'daily_book',
      filter,
    })
    trackFeatureUsage('daily_book_history_filter', {
      surface: 'daily_book',
      filter,
    })
  }, [])

  const openExpenseFromDailyBook = useCallback(() => {
    trackEvent('expense_add_from_daily_book', {
      surface: 'daily_book',
      filter: selectedFilter,
    })
    openAddSheet?.('expense')
  }, [openAddSheet, selectedFilter])

  const updateCustomRange = useCallback((field, value) => {
    setCustomRange((current) => ({
      ...current,
      [field]: value,
    }))
  }, [])

  const applyCustomRange = useCallback(() => {
    trackEvent('daily_book_history_filter_used', {
      surface: 'daily_book',
      filter: 'custom',
      has_start: Boolean(customRange.start),
      has_end: Boolean(customRange.end),
    })
    trackFeatureUsage('daily_book_history_filter', {
      surface: 'daily_book',
      filter: 'custom',
    })
  }, [customRange.end, customRange.start])

  return (
    <section className="screen-content daily-book-screen" id="daily-book-section">
      <div className="screen-heading daily-book-heading">
        <div>
          <p className="eyebrow">Daily Book</p>
          <h1>Daily expense book</h1>
        </div>
        <button className="primary-button small-button daily-book-add-button" type="button" onClick={openExpenseFromDailyBook}>
          <Plus size={16} />
          Add Expense
        </button>
      </div>

      <section className="daily-book-summary-panel" aria-label="Daily expense summary">
        <div>
          <span>{activeRange.label}</span>
          <strong>{rupees(rangeTotal)}</strong>
          <p>{filteredExpenses.length} expense{filteredExpenses.length === 1 ? '' : 's'} from saved records</p>
        </div>
        <span className="daily-book-date-pill">
          {formatDateLabel(activeRange.start, todayKey)}
          {activeRange.start !== activeRange.end ? ` to ${formatDateLabel(activeRange.end, todayKey)}` : ''}
        </span>
      </section>

      <RangeFilters selectedFilter={selectedFilter} onSelect={selectFilter} />

      {selectedFilter === 'custom' && (
        <div className="daily-book-custom-range">
          <label>
            <span>Start</span>
            <input
              type="date"
              value={customRange.start}
              onChange={(event) => updateCustomRange('start', event.target.value)}
            />
          </label>
          <label>
            <span>End</span>
            <input
              type="date"
              value={customRange.end}
              onChange={(event) => updateCustomRange('end', event.target.value)}
            />
          </label>
          <button className="ghost-button" type="button" onClick={applyCustomRange}>
            Apply
          </button>
        </div>
      )}

      <section className="daily-book-insight-grid" aria-label="Daily Book Insights">
        {insightCards.map((insight) => (
          <DailyBookInsightCard insight={insight} key={insight.key} />
        ))}
      </section>

      <section className="daily-book-history-panel" aria-label="Expense history">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">History</p>
            <h2>{activeRange.label}</h2>
          </div>
          <span>{shortRupees(rangeTotal)}</span>
        </div>

        {groupedExpenses.length === 0 ? (
          <EmptyState
            title="No expenses in this range"
            detail="Add an expense to start today's book."
            actionLabel="Add expense"
            onAction={openExpenseFromDailyBook}
            icon={Receipt}
          />
        ) : (
          <div className="daily-book-day-list">
            {groupedExpenses.map((group) => (
              <article className="daily-book-day-group" key={group.key}>
                <div className="daily-book-day-heading">
                  <span>
                    <CalendarDays size={15} />
                    {group.label}
                  </span>
                  <strong>{shortRupees(group.total)}</strong>
                  <small>{group.items.length} expense{group.items.length === 1 ? '' : 's'}</small>
                </div>
                <div className="daily-book-expense-list">
                  {group.items.map((expense) => (
                    <DailyExpenseRow expense={expense} key={expense.id || `${expense.dateKey}-${expense.label}-${expense.amount}`} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
