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
  const timeline = report.timeline || []
  const moneyBookSummary = report.moneyBookSummary || {}
  const hasActiveCategory = expenseBreakdown.some((item) => item.name === activeCategory)
  const selectedCategory = hasActiveCategory ? activeCategory : 'all'
  const focusedCategory = expenseBreakdown.find((item) => item.name === selectedCategory) || null
  const breakdownTotal = expenseBreakdown.reduce((total, item) => total + Number(item.value || 0), 0)
  const visibleBreakdown = selectedCategory === 'all'
    ? expenseBreakdown
    : expenseBreakdown.filter((item) => item.name === selectedCategory)
  const directionData = useMemo(() => [
    { name: 'Income', amount: Number(financialState.income || 0), color: getFinanceColor('Income') },
    { name: 'Allocated', amount: Number(financialState.committed || 0), color: getFinanceColor('Expense') },
    { name: 'Flexible', amount: Number(financialState.flexibility || 0), color: getFinanceColor('Travel') },
  ].filter((item) => item.amount > 0), [financialState])

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
        <ResponsiveContainer width="100%" height={156}>
          <BarChart data={directionData} margin={{ left: -22, right: 8, top: 14, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" stroke="var(--chart-axis)" />
            <YAxis stroke="var(--chart-axis)" />
            <RechartsTooltip formatter={(value) => rupees(value)} />
            <Bar dataKey="amount" radius={[10, 10, 4, 4]} isAnimationActive animationDuration={460}>
              {directionData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
          {expenseBreakdown.slice(0, 8).map((item) => (
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
          {timeline.length > 1
            ? 'Built from dated entries saved this month.'
            : 'Add more dated entries to see a clearer trend.'}
        </p>
        {timeline.length > 0 ? (
          <ResponsiveContainer width="100%" height={148}>
            <TrendLineChart data={timeline} margin={{ left: -24, right: 8, top: 10, bottom: 0 }}>
              <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="var(--chart-axis)" />
              <YAxis stroke="var(--chart-axis)" />
              <RechartsTooltip formatter={(value) => rupees(value)} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="var(--chart-trend)"
                strokeWidth={3}
                dot={timeline.length <= 6}
                isAnimationActive
                animationDuration={460}
              />
            </TrendLineChart>
          </ResponsiveContainer>
        ) : (
          <div className="report-empty-chart">Add a few expenses to see a trend.</div>
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
