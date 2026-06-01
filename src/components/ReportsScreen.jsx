import {
  lazy,
  Suspense,
  useMemo,
  useState,
} from 'react'
import { ChevronRight, Download, FileText, HeartHandshake, Trash2, Upload } from 'lucide-react'
import { getFinanceColor } from '../lib/financeColors'
import { addMoney, normalizeMoney } from '../lib/money'
import { rupees } from '../lib/ruleEngine'

const StatementUploadSheet = lazy(() => import('./StatementUploadSheet.jsx'))
const ReportCharts = lazy(() => import('./ReportCharts.jsx'))

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
  return normalizeMoney(value)
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

function ChartDetailsFallback() {
  return (
    <>
      <article className="chart-card skeleton-card" />
      <article className="chart-card skeleton-card" />
    </>
  )
}

function buildDirectionData(financialState = {}, transactionSummary = {}) {
  const income = safeChartAmount(financialState.income)
  const summarizedOutgoing = safeChartAmount(transactionSummary?.outgoing)
  const calculatedCommitted = safeChartAmount(financialState.committed)
  const allocated = summarizedOutgoing || calculatedCommitted
  const safeRoom = safeChartAmount(financialState.safeToSpend ?? financialState.breathingRoom)

  return [
    { name: 'Income', amount: income, color: getFinanceColor('Income') },
    { name: 'Spent or fixed', amount: allocated, color: getFinanceColor('Expense') },
    { name: 'Safe room', amount: safeRoom, color: getFinanceColor('Travel') },
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

      current.value = addMoney(current.value, transaction.amount)
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

      totals.set(date, addMoney(totals.get(date) || 0, transaction.amount))
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
  const visibleItems = items.slice(0, 2)

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <article className="report-section-card">
      <h2>{title}</h2>
      <div className="report-row-list">
        {visibleItems.map((item) => (
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

function reportGeneratedLabel(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Recently generated'
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function ReportsScreen({
  advancedReport,
  expenseBreakdown = [],
  financialState = {},
  reportTransactions = [],
  transactionSummary = {},
  monthlyComparison = [],
  downloadPdf,
  requestReportExport,
  reportTemplate = 'standard',
  setReportTemplate,
  reportHistory = [],
  redownloadReport,
  deleteReportHistoryEntry,
  exportCsv,
  isExportingPdf,
  selectedMonthKey,
  setSelectedMonthKey,
  monthOptions = [],
}) {
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
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
  const breakdownTotal = mixBreakdown.reduce((total, item) => addMoney(total, item.value), 0)
  const visibleBreakdown = selectedCategory === 'all'
    ? mixBreakdown
    : mixBreakdown.filter((item) => item.name === selectedCategory)
  const storyItems = useMemo(
    () => [
      ...(report.pressureAnalysis || []),
      ...(report.spendingPatterns || []),
      ...(report.purchaseInsights || []),
      ...(report.behaviorInsights || []),
    ]
      .filter((item) => item?.title || item?.detail)
      .slice(0, 3),
    [report.behaviorInsights, report.pressureAnalysis, report.purchaseInsights, report.spendingPatterns],
  )
  const recentReportHistory = useMemo(
    () => (Array.isArray(reportHistory) ? reportHistory.slice(0, 6) : []),
    [reportHistory],
  )

  const generateStatementReport = (statementPayload = {}) => {
    if (!requestReportExport) {
      return
    }

    setIsImportOpen(false)
    window.setTimeout(() => {
      requestReportExport('statement', {
        template: statementPayload.template || reportTemplate,
        statementReport: statementPayload.statementReport || {},
        transactions: statementPayload.transactions || [],
        userOverrides: statementPayload.userOverrides || 0,
        accuracy: statementPayload.accuracy,
        period: statementPayload.statementReport?.dateRange || selectedMonthKey,
      })
    }, 0)
  }

  return (
    <section className="screen-content reports-screen advanced-reports-screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Insights</p>
          <h1>Your money story</h1>
          <p className="reports-subtitle">Short notes first. Charts only where they help.</p>
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
          <StatementUploadSheet
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
            onGenerateStatementReport={generateStatementReport}
            reportTemplate={reportTemplate}
          />
        </Suspense>
      )}

      <article className="professional-export-panel">
        <div className="professional-export-heading">
          <div>
            <p className="eyebrow">Professional exports</p>
            <h2>Share-ready financial documents</h2>
            <p>New report generation unlocks after the rewarded export step. Saved reports can be downloaded again from history.</p>
          </div>
          <label className="report-template-select">
            <span>Template</span>
            <select
              className="month-select compact-month-select"
              value={reportTemplate}
              onChange={(event) => setReportTemplate?.(event.target.value)}
            >
              <option value="standard">Standard</option>
              <option value="executive">Executive</option>
              <option value="compact">Compact</option>
            </select>
          </label>
        </div>
        <div className="professional-export-actions">
          <button className="action-button" type="button" onClick={downloadPdf} disabled={isExportingPdf}>
            <FileText size={18} />
            {isExportingPdf ? 'Preparing...' : 'Monthly Budget'}
          </button>
          <button
            className="action-button"
            type="button"
            onClick={() => requestReportExport?.('trip', { template: reportTemplate })}
            disabled={isExportingPdf}
          >
            <FileText size={18} />
            Trip Report
          </button>
          <button
            className="action-button"
            type="button"
            onClick={() => requestReportExport?.('settlement', { template: reportTemplate })}
            disabled={isExportingPdf}
          >
            <FileText size={18} />
            Settlement Report
          </button>
        </div>
      </article>

      {recentReportHistory.length > 0 && (
        <article className="report-history-locker">
          <div className="report-history-heading">
            <div>
              <p className="eyebrow">Report history</p>
              <h2>Generated reports</h2>
            </div>
            <span>{recentReportHistory.length}</span>
          </div>
          <div className="report-history-list">
            {recentReportHistory.map((entry) => (
              <div className="report-history-row" key={entry.id}>
                <div>
                  <strong>{entry.name}</strong>
                  <p>{entry.reportId} - {entry.currency} - {entry.period}</p>
                  <span>{reportGeneratedLabel(entry.generatedAt)} - {entry.template}</span>
                </div>
                <div className="report-history-actions">
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Download ${entry.name}`}
                    onClick={() => redownloadReport?.(entry)}
                    disabled={isExportingPdf}
                  >
                    <Download size={15} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={`Delete ${entry.name} history entry`}
                    onClick={() => deleteReportHistoryEntry?.(entry.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      )}

      <article className="report-advisory-card">
        <span className="soft-icon">
          <HeartHandshake size={18} />
        </span>
        <div>
          <p className="eyebrow">Money note</p>
          <h2>{report.advisory}</h2>
        </div>
      </article>

      <article className="report-story-card">
        <div className="report-story-heading">
          <div>
            <p className="eyebrow">Money story</p>
            <h2>This month in plain language</h2>
          </div>
          <span>{storyItems.length || 1} note{storyItems.length === 1 ? '' : 's'}</span>
        </div>
        <div className="report-story-list">
          {storyItems.length > 0 ? storyItems.map((item) => (
            <div className="report-story-row" key={`${item.title}-${item.detail}`}>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          )) : (
            <div className="report-story-row">
              <strong>Keep adding money moves</strong>
              <p>Income, expenses, transfers, goals, shared payments, and borrow/lend activity will turn into clearer notes here.</p>
            </div>
          )}
        </div>
      </article>

      <details
        className="report-details-panel"
        onToggle={(event) => setIsDetailsOpen(event.currentTarget.open)}
      >
        <summary>
          <span>Detailed monthly report</span>
          <ChevronRight size={16} />
        </summary>
        {isDetailsOpen && (
        <div className="report-details-body">
      <article className="report-snapshot-card">
        <h2>This month in short</h2>
        <div className="report-snapshot-grid">
          {report.snapshot.slice(0, 4).map((item) => (
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
          <h2>What changed</h2>
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

      <ReportSection title="Spending notes" items={report.spendingPatterns} />
      <ReportSection title="Money pressure" items={report.pressureAnalysis} />
      <ReportSection title="Buying safely" items={report.purchaseInsights} />
      <ReportSection title="Other notes" items={report.behaviorInsights} />

      <article className="report-section-card report-direction-card">
        <h2>Money direction</h2>
        <div className="report-direction-list">
          {directionData.length > 0 ? directionData.map((item) => (
            <div key={item.name}>
              <span>{item.name}</span>
              <strong>{compactRupees(item.amount)}</strong>
            </div>
          )) : (
            <p>Add income or transactions to see a clearer direction.</p>
          )}
        </div>
      </article>

      {report.sharedSummary?.activeGroups > 0 && (
        <article className="report-section-card shared-report-card">
          <h2>Shared money</h2>
          <div className="report-snapshot-grid">
            <div>
              <span>You paid</span>
              <strong>{rupees(report.sharedSummary.totalPaidByYou)}</strong>
              <p>Paid upfront in groups.</p>
            </div>
            <div>
              <span>To get back</span>
              <strong>{rupees(report.sharedSummary.pendingRecoverable)}</strong>
              <p>Expected back from friends.</p>
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
          <h2>Borrow / lend</h2>
          <div className="report-snapshot-grid">
            <div>
              <span>You gave</span>
              <strong>{rupees(moneyBookSummary.totalGiven || 0)}</strong>
              <p>Money lent this month.</p>
            </div>
            <div>
              <span>To receive</span>
              <strong>{rupees(moneyBookSummary.needToReceive || 0)}</strong>
              <p>Still pending.</p>
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

      <Suspense fallback={<ChartDetailsFallback />}>
        <ReportCharts
          visibleBreakdown={visibleBreakdown}
          selectedCategory={selectedCategory}
          setActiveCategory={setActiveCategory}
          mixBreakdown={mixBreakdown}
          focusedCategory={focusedCategory}
          breakdownTotal={breakdownTotal}
          trendData={trendData}
        />
      </Suspense>

      <article className="report-section-card">
        <h2>Money status</h2>
        <div className="report-comfort-strip">
          <span>{financialState.pressure}</span>
          <strong>{financialState.comfort}</strong>
          <p>{financialState.usagePercent}% of income is already used from saved data.</p>
        </div>
      </article>
        </div>
        )}
      </details>

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
