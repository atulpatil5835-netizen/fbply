import {
  lazy,
  Suspense,
  useMemo,
  useState,
} from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as TrendLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Download, FileText, HeartHandshake, Upload } from 'lucide-react'
import { getFinanceColor } from '../lib/financeColors'
import { rupees } from '../lib/ruleEngine'

const StatementUploadSheet = lazy(() => import('./StatementUploadSheet.jsx'))

function StatementUploadFallback() {
  return (
    <div className="statement-upload-backdrop" role="presentation">
      <section className="statement-upload-sheet" aria-label="Loading statement import">
        <div className="statement-sheet-header">
          <div className="skeleton-text-group">
            <span className="skeleton-line short" />
            <span className="skeleton-line wide" />
          </div>
          <span className="skeleton-icon" />
        </div>
        <div className="privacy-note-card skeleton-block" />
        <div className="statement-mode-row skeleton-block" />
        <div className="statement-option-grid">
          <span className="skeleton-option" />
          <span className="skeleton-option" />
          <span className="skeleton-option" />
        </div>
        <div className="statement-intelligence-card">
          <span className="skeleton-line wide" />
          <span className="skeleton-line" />
          <span className="skeleton-line short" />
        </div>
      </section>
    </div>
  )
}

function safeChartAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function cleanCompactNumber(value) {
  return Number(value.toFixed(value >= 10 ? 0 : 1)).toString()
}

function compactRupees(value) {
  const amount = safeChartAmount(value)
  const symbol = rupees(1).replace(/[0-9,.\s-]/g, '') || 'Rs'

  if (amount >= 10000000) {
    return `${symbol}${cleanCompactNumber(amount / 10000000)}Cr`
  }

  if (amount >= 100000) {
    return `${symbol}${cleanCompactNumber(amount / 100000)}L`
  }

  if (amount >= 1000) {
    return `${symbol}${cleanCompactNumber(amount / 1000)}K`
  }

  return rupees(amount)
}

function isValidDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').slice(0, 10))
}

function chartDateLabel(value) {
  const date = String(value || '').slice(0, 10)

  if (!isValidDateKey(date)) {
    return 'Recent'
  }

  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return 'Recent'
  }

  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

function ChartEmptyState({ message }) {
  return (
    <div className="report-empty-chart">
      <span className="report-empty-chart-mark" aria-hidden="true" />
      <strong>Not enough activity yet</strong>
      <p>{message}</p>
    </div>
  )
}

function buildDirectionData(financialState = {}, transactionSummary = {}) {
  const income = safeChartAmount(financialState.income)
  const summarizedOutgoing = safeChartAmount(transactionSummary?.outgoing)
  const calculatedCommitted = safeChartAmount(financialState.committed)
  const allocated = summarizedOutgoing || calculatedCommitted
  const flexible = income > 0 ? Math.max(income - allocated, 0) : safeChartAmount(financialState.flexibility)

  return [
    { name: 'Income', amount: income, color: getFinanceColor('Income') },
    { name: 'Allocated', amount: allocated, color: getFinanceColor('Expense') },
    { name: 'Flexible', amount: flexible, color: getFinanceColor('Travel') },
  ].filter((item) => item.amount > 0)
}

function isOutgoingMixTransaction(transaction = {}) {
  if (!safeChartAmount(transaction.amount)) {
    return false
  }

  if (transaction.tone === 'outgoing') {
    return true
  }

  return ['expense', 'lend_given', 'repayment'].includes(transaction.impactType)
}

function mixCategoryFor(transaction = {}) {
  if (transaction.category && transaction.category !== 'Other') {
    return transaction.category
  }

  if (transaction.sourceModule === 'Money Book') {
    return transaction.impactType === 'repayment' ? 'Repayments' : 'Lending'
  }

  return transaction.sourceModule || 'Other'
}

function normalizeBreakdownFallback(expenseBreakdown = []) {
  return expenseBreakdown
    .map((item, index) => ({
      name: item.name || 'Other',
      value: safeChartAmount(item.value),
      color: item.color || getFinanceColor(item.name || 'Other', index),
      source: item.source || 'Tracked expense',
    }))
    .filter((item) => item.value > 0)
}

function buildMoneyMixData(reportTransactions = [], expenseBreakdown = []) {
  if (!Array.isArray(reportTransactions) || reportTransactions.length === 0) {
    return normalizeBreakdownFallback(expenseBreakdown)
  }

  const totals = new Map()

  reportTransactions
    .filter(isOutgoingMixTransaction)
    .forEach((transaction) => {
      const name = mixCategoryFor(transaction)
      const current = totals.get(name) || {
        name,
        value: 0,
        color: transaction.color || getFinanceColor(name, totals.size),
        source: transaction.sourceModule || 'Unified finance engine',
      }

      current.value += safeChartAmount(transaction.amount)
      if (current.source !== transaction.sourceModule) {
        current.source = 'Mixed'
      }
      totals.set(name, current)
    })

  return Array.from(totals.values())
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((item, index) => ({
      ...item,
      color: item.color || getFinanceColor(item.name, index),
    }))
}

function buildEntryTrendData(reportTransactions = [], fallbackTimeline = []) {
  if (!Array.isArray(reportTransactions) || reportTransactions.length === 0) {
    return fallbackTimeline
      .map((item) => ({
        label: item.label || chartDateLabel(item.date),
        amount: safeChartAmount(item.amount),
      }))
      .filter((item) => item.amount > 0)
  }

  const totals = new Map()

  reportTransactions
    .filter(isOutgoingMixTransaction)
    .forEach((transaction) => {
      const date = String(transaction.date || transaction.dateTime || '').slice(0, 10)

      if (!isValidDateKey(date)) {
        return
      }

      totals.set(date, (totals.get(date) || 0) + safeChartAmount(transaction.amount))
    })

  return Array.from(totals.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, amount]) => ({
      date,
      label: chartDateLabel(date),
      amount,
    }))
    .filter((item) => item.amount > 0)
}

function ReportSection({ title, items }) {
  return (
    <article className="report-section-card">
      <h2>{title}</h2>
      <div className="report-row-list">
        {items.map((item) => (
          <div className="report-reading-row" key={`${title}-${item.title}`}>
            <div>
              <strong>{item.title}</strong>
              {item.confidence && <span className="report-confidence">{item.confidence}</span>}
            </div>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>
    </article>
  )
}

export default function ReportsScreen({
  advancedReport,
  expenseBreakdown = [],
  financialState = {},
  reportTransactions = [],
  transactionSummary = {},
  monthlyComparison = [],
  downloadPdf,
  exportCsv,
  isExportingPdf,
  selectedMonthKey,
  setSelectedMonthKey,
  monthOptions = [],
}) {
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const report = useMemo(
    () => advancedReport || {
      advisory: 'Add a few entries to build a useful monthly report.',
      snapshot: [],
      spendingPatterns: [],
      pressureAnalysis: [],
      purchaseInsights: [],
      behaviorInsights: [],
      timeline: [],
    },
    [advancedReport],
  )
  const legacyTimeline = useMemo(() => report.timeline || [], [report.timeline])
  const moneyBookSummary = report.moneyBookSummary || {}
  const mixBreakdown = useMemo(
    () => buildMoneyMixData(reportTransactions, expenseBreakdown),
    [expenseBreakdown, reportTransactions],
  )
  const trendData = useMemo(
    () => buildEntryTrendData(reportTransactions, legacyTimeline),
    [legacyTimeline, reportTransactions],
  )
  const directionData = useMemo(
    () => buildDirectionData(financialState, transactionSummary),
    [financialState, transactionSummary],
  )
  const hasActiveCategory = mixBreakdown.some((item) => item.name === activeCategory)
  const selectedCategory = hasActiveCategory ? activeCategory : 'all'
  const focusedCategory = mixBreakdown.find((item) => item.name === selectedCategory) || null
  const breakdownTotal = mixBreakdown.reduce((total, item) => total + Number(item.value || 0), 0)
  const visibleBreakdown = selectedCategory === 'all'
    ? mixBreakdown
    : mixBreakdown.filter((item) => item.name === selectedCategory)

  return (
    <section className="screen-content reports-screen advanced-reports-screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Reports</p>
          <h1>Monthly report</h1>
          <p className="reports-subtitle">Uses only saved entries and reviewed data.</p>
        </div>
        <div className="reports-header-actions">
          <button className="report-import-button" type="button" onClick={() => setIsImportOpen(true)}>
            <Upload size={16} />
            <span>Import</span>
          </button>
          <select
            className="month-select compact-month-select"
            value={selectedMonthKey}
            aria-label="Month selector"
            onChange={(event) => setSelectedMonthKey(event.target.value)}
          >
            {monthOptions.map((month) => (
              <option key={month.key} value={month.key}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isImportOpen && (
        <Suspense fallback={<StatementUploadFallback />}>
          <StatementUploadSheet isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
        </Suspense>
      )}

      <article className="report-advisory-card">
        <span className="soft-icon">
          <HeartHandshake size={18} />
        </span>
        <div>
          <p className="eyebrow">Summary</p>
          <h2>{report.advisory}</h2>
        </div>
      </article>

      <article className="report-snapshot-card">
        <h2>Monthly Snapshot</h2>
        <div className="report-snapshot-grid">
          {report.snapshot.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      </article>

      {monthlyComparison.length > 0 && (
        <article className="report-section-card monthly-comparison-card">
          <h2>Month Comparison</h2>
          <div className="monthly-comparison-grid">
            {monthlyComparison.map((item) => (
              <div className={item.tone} key={item.label}>
                <span>{item.label}</span>
                <strong>{rupees(item.current)}</strong>
                <p>{item.labelText}</p>
              </div>
            ))}
          </div>
        </article>
      )}

      <article className="chart-card report-direction-card">
        <h2>Money Direction</h2>
        <p>Income, allocated spending, and remaining flexibility from the unified finance engine.</p>
        {directionData.length > 0 ? (
          <ResponsiveContainer width="100%" height={156}>
            <BarChart data={directionData} margin={{ left: 4, right: 8, top: 14, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="var(--chart-axis)" tick={{ fontSize: 11 }} />
              <YAxis
                stroke="var(--chart-axis)"
                tick={{ fontSize: 11 }}
                tickFormatter={compactRupees}
                width={52}
              />
              <RechartsTooltip formatter={(value) => rupees(value)} />
              <Bar dataKey="amount" radius={[10, 10, 4, 4]} isAnimationActive animationDuration={460}>
                {directionData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmptyState message="Add income or transactions to view money direction." />
        )}
      </article>

      {report.sharedSummary?.activeGroups > 0 && (
        <article className="report-section-card shared-report-card">
          <h2>Shared Expenses</h2>
          <div className="report-snapshot-grid">
            <div>
              <span>You paid</span>
              <strong>{rupees(report.sharedSummary.totalPaidByYou)}</strong>
              <p>Group payments paid upfront.</p>
            </div>
            <div>
              <span>Recoverable</span>
              <strong>{rupees(report.sharedSummary.pendingRecoverable)}</strong>
              <p>Still expected back from shared expenses.</p>
            </div>
            <div>
              <span>Received</span>
              <strong>{rupees(report.sharedSummary.receivedRecoveries)}</strong>
              <p>Marked as received.</p>
            </div>
            <div>
              <span>Monthly impact</span>
              <strong>{rupees(report.sharedSummary.netSharedImpact)}</strong>
              <p>Used in monthly totals.</p>
            </div>
          </div>
        </article>
      )}

      {(moneyBookSummary.pendingCount > 0 || moneyBookSummary.totalGiven > 0 || moneyBookSummary.totalBorrowed > 0) && (
        <article className="report-section-card money-book-report-card">
          <h2>Money Book</h2>
          <div className="report-snapshot-grid">
            <div>
              <span>You gave</span>
              <strong>{rupees(moneyBookSummary.totalGiven || 0)}</strong>
              <p>Money lent this month.</p>
            </div>
            <div>
              <span>To receive</span>
              <strong>{rupees(moneyBookSummary.needToReceive || 0)}</strong>
              <p>Pending recoveries carried forward.</p>
            </div>
            <div>
              <span>Borrowed</span>
              <strong>{rupees(moneyBookSummary.totalBorrowed || 0)}</strong>
              <p>Money taken this month.</p>
            </div>
            <div>
              <span>Pending</span>
              <strong>{rupees(moneyBookSummary.pendingSettlements || 0)}</strong>
              <p>{moneyBookSummary.pendingCount || 0} open settlement{moneyBookSummary.pendingCount === 1 ? '' : 's'}.</p>
            </div>
          </div>
        </article>
      )}

      <article className="chart-card report-mix-card">
        <h2>Money Mix</h2>
        {visibleBreakdown.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={visibleBreakdown}
                  cx="50%"
                  cy="50%"
                  dataKey="value"
                  innerRadius={42}
                  outerRadius={64}
                  paddingAngle={4}
                  isAnimationActive
                  animationDuration={420}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {visibleBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value) => rupees(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="legend-grid compact-legend">
              <button
                className={selectedCategory === 'all' ? 'active' : ''}
                type="button"
                onClick={() => setActiveCategory('all')}
              >
                <i style={{ backgroundColor: getFinanceColor('Other') }} />
                All
              </button>
              {mixBreakdown.slice(0, 8).map((item) => (
                <button
                  className={selectedCategory === item.name ? 'active' : ''}
                  key={item.name}
                  type="button"
                  onClick={() => setActiveCategory((current) => (current === item.name ? 'all' : item.name))}
                >
                  <i style={{ backgroundColor: item.color }} />
                  {item.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <ChartEmptyState message="Add spending, settlements, or money-book entries to view the mix." />
        )}
        {focusedCategory && (
          <div className="category-focus-card">
            <span>Category focus</span>
            <strong>{focusedCategory.name}</strong>
            <p>{rupees(focusedCategory.value)} tracked, about {Math.round((Number(focusedCategory.value || 0) / Math.max(breakdownTotal, 1)) * 100)}% of the mix.</p>
          </div>
        )}
      </article>

      <article className="chart-card report-trend-card">
        <h2>Entry Trend</h2>
        <p>
          {trendData.length > 1
            ? 'Built from real dated money movements this month.'
            : 'Add more dated transactions to see a clearer trend.'}
        </p>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={148}>
            <TrendLineChart data={trendData} margin={{ left: 4, right: 8, top: 10, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="var(--chart-axis)" tick={{ fontSize: 11 }} />
              <YAxis
                stroke="var(--chart-axis)"
                tick={{ fontSize: 11 }}
                tickFormatter={compactRupees}
                width={52}
              />
              <RechartsTooltip formatter={(value) => rupees(value)} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="var(--chart-trend)"
                strokeWidth={3}
                dot={trendData.length <= 6}
                isAnimationActive
                animationDuration={460}
              />
            </TrendLineChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmptyState message="Add transactions to view trends." />
        )}
      </article>

      <ReportSection title="Spending Notes" items={report.spendingPatterns} />
      <ReportSection title="Pressure Notes" items={report.pressureAnalysis} />
      <ReportSection title="Purchase Planning" items={report.purchaseInsights} />
      <ReportSection title="Other Notes" items={report.behaviorInsights} />

      <article className="report-section-card">
        <h2>Current State</h2>
        <div className="report-comfort-strip">
          <span>{financialState.pressure}</span>
          <strong>{financialState.comfort}</strong>
          <p>{financialState.usagePercent}% of income is allocated from saved data.</p>
        </div>
      </article>

      <div className="action-row">
        <button className="action-button" type="button" onClick={downloadPdf} disabled={isExportingPdf}>
          <FileText size={20} />
          {isExportingPdf ? 'Preparing...' : 'Export PDF'}
        </button>
        <button className="action-button" type="button" onClick={exportCsv}>
          <Download size={20} />
          Export CSV
        </button>
      </div>
    </section>
  )
}
