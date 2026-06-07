import {
  lazy,
  Suspense,
  useCallback,
  useMemo,
  useState,
} from 'react'
import {
  ChartPie,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  HeartHandshake,
  PiggyBank,
  Receipt,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Wallet,
} from 'lucide-react'
import {
  ActionCard,
  EmptyState,
  FLoader,
  InsightCard,
  MoneyCard,
  MoneyOSProvider,
  SectionHeader,
  StatCard,
  StatusBadge,
} from '../design-system'
import { getFinanceColor } from '../lib/financeColors'
import { addMoney, normalizeMoney } from '../lib/money'
import { rupees } from '../lib/ruleEngine'
import { trackEvent, trackFeatureUsage } from '../lib/analytics'

const StatementUploadSheet = lazy(() => import('./StatementUploadSheet.jsx'))
const ReportCharts = lazy(() => import('./ReportCharts.jsx'))

function isLegacyReportsExperience() {
  return typeof window !== 'undefined' && Boolean(window.__FBPLY_LEGACY_REPORTS__)
}

function StatementUploadFallback() {
  return (
    <div className="statement-upload-backdrop" role="presentation">
      <section className="statement-upload-sheet" aria-label="Loading statement import">
        <FLoader fullPage label="Opening statement analysis" />
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
    <FLoader label="Preparing report charts" />
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

function moneyHealthFromFinancialState(financialState = {}) {
  if (financialState.pressureTone === 'slight-pressure') {
    return {
      label: 'Attention',
      tone: 'warning',
      detail: 'Fixed costs need attention this month.',
    }
  }

  if (financialState.pressureTone === 'warm') {
    return {
      label: 'Moderate',
      tone: 'warning',
      detail: 'Expenses fit, but spending should stay measured.',
    }
  }

  return {
    label: 'Healthy',
    tone: 'success',
    detail: 'Income currently covers expenses comfortably.',
  }
}

function reportTypeLabel(type = 'monthly') {
  return {
    monthly: 'Monthly Report',
    statement: 'Statement Report',
    trip: 'Trip Report',
    settlement: 'Settlement Report',
  }[type] || 'Report'
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
  onStatementMappingsChange,
  exportCsv,
  isExportingPdf,
  exportingReportType = '',
  reportExportPrompt = null,
  onReportPromptAction,
  clearReportExportPrompt,
  selectedMonthKey,
  setSelectedMonthKey,
  monthOptions = [],
  statementImportRequestId = 0,
}) {
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [dismissedStatementImportRequestId, setDismissedStatementImportRequestId] = useState(0)
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
  const activeExportType = exportingReportType || (isExportingPdf ? 'monthly' : '')
  const isPreparingReport = (type) => isExportingPdf && activeExportType === type
  const openStatementAnalysis = useCallback((source = 'header') => {
    setIsImportOpen(true)
    trackEvent('statement_analysis_opened', {
      surface: 'reports',
      source,
    })
    trackFeatureUsage('statement_analysis_opened', {
      surface: 'reports',
      source,
    })
  }, [])

  const isAddHubImportOpen = statementImportRequestId > 0 && dismissedStatementImportRequestId !== statementImportRequestId
  const isStatementImportOpen = isImportOpen || isAddHubImportOpen
  const closeStatementAnalysis = () => {
    setIsImportOpen(false)
    setDismissedStatementImportRequestId(statementImportRequestId)
  }

  const generateStatementReport = (statementPayload = {}) => {
    if (!requestReportExport) {
      return
    }

    setIsImportOpen(false)
    setDismissedStatementImportRequestId(statementImportRequestId)
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

  const snapshotStats = [
    {
      label: 'Income',
      value: rupees(financialState.income || 0),
      detail: 'Saved monthly income',
      icon: Wallet,
      tone: 'success',
    },
    {
      label: 'Expenses',
      value: rupees(transactionSummary?.outgoing || financialState.committed || 0),
      detail: `${financialState.usagePercent || 0}% of income used`,
      icon: Receipt,
      tone: 'danger',
    },
    {
      label: 'Available',
      value: rupees(financialState.safeToSpend ?? financialState.breathingRoom ?? 0),
      detail: financialState.pressure || 'Current pressure',
      icon: CreditCard,
      tone: financialState.pressureTone === 'slight-pressure' ? 'warning' : 'tint',
    },
    {
      label: 'Protected',
      value: rupees(financialState.reserveTarget || 0),
      detail: 'Savings buffer from current preference',
      icon: PiggyBank,
      tone: 'success',
    },
  ]
  const moneyHealth = moneyHealthFromFinancialState(financialState)
  const keyInsights = storyItems.length > 0
    ? storyItems
    : report.advisory
      ? [{ title: financialState.pressure || 'Money note', detail: report.advisory }]
      : []
  const reportHistoryCounts = recentReportHistory.reduce((counts, entry) => {
    const type = entry.type || 'monthly'
    counts[type] = (counts[type] || 0) + 1
    return counts
  }, {})
  const monthlyReportCount = reportHistoryCounts.monthly || 0
  const statementReportCount = reportHistoryCounts.statement || 0
  const tripReportCount = reportHistoryCounts.trip || 0
  const canExport = !isExportingPdf
  const handleStatementDiscovery = (source = 'statement_discovery_card') => {
    trackEvent('feature_discovery_click', {
      surface: 'reports',
      feature: 'statement_analysis',
      source,
    })
    trackFeatureUsage('feature_discovery_card', {
      surface: 'reports',
      feature: 'statement_analysis',
      source,
    })
    openStatementAnalysis(source)
  }
  const handleMonthlyPdfExport = (placement = 'money_os_exports') => {
    trackEvent('report_conversion_click', {
      surface: 'reports',
      report_type: 'monthly',
      source: placement,
    })
    trackEvent('report_export_click', {
      surface: 'reports',
      report_type: 'monthly',
      export_type: 'pdf',
      placement,
    })
    downloadPdf?.()
  }
  const handleTripPdfExport = (placement = 'money_os_exports') => {
    trackEvent('report_conversion_click', {
      surface: 'reports',
      report_type: 'trip',
      source: placement,
    })
    trackEvent('report_export_click', {
      surface: 'reports',
      report_type: 'trip',
      export_type: 'pdf',
      placement,
    })
    requestReportExport?.('trip', { template: reportTemplate })
  }
  const handleSettlementPdfExport = (placement = 'money_os_exports') => {
    trackEvent('report_conversion_click', {
      surface: 'reports',
      report_type: 'settlement',
      source: placement,
    })
    trackEvent('report_export_click', {
      surface: 'reports',
      report_type: 'settlement',
      export_type: 'pdf',
      placement,
    })
    requestReportExport?.('settlement', { template: reportTemplate })
  }
  const handleCsvExport = (placement = 'money_os_exports') => {
    trackEvent('report_export_click', {
      surface: 'reports',
      export_type: 'csv',
      placement,
    })
    exportCsv?.()
  }
  const toggleReportDetails = (event) => {
    event.preventDefault()
    setIsDetailsOpen((current) => {
      const nextOpen = !current
      if (nextOpen) {
        trackFeatureUsage('report_details_opened', {
          surface: 'reports',
        })
      }
      return nextOpen
    })
  }

  if (!isLegacyReportsExperience()) {
    return (
      <MoneyOSProvider as="section" className="screen-content reports-screen advanced-reports-screen money-os-reports">
        <SectionHeader
          title="Reports"
        />

        {isStatementImportOpen && (
          <Suspense fallback={<StatementUploadFallback />}>
            <StatementUploadSheet
              isOpen={isStatementImportOpen}
              onClose={closeStatementAnalysis}
              onGenerateStatementReport={generateStatementReport}
              onCategoryMappingsChange={onStatementMappingsChange}
              reportTemplate={reportTemplate}
            />
          </Suspense>
        )}

        <section className="mos-report-section mos-report-v4-top" aria-label="Report priorities">
          <div className="mos-report-v4-grid">
            <InsightCard
              title={moneyHealth.label}
              detail={moneyHealth.detail}
              icon={HeartHandshake}
              tone={moneyHealth.tone}
            />
            <ActionCard
              title="Analyze Statement"
              detail="Upload PDF or CSV"
              actionLabel="Upload"
              icon={Upload}
              tone="warning"
              onClick={() => handleStatementDiscovery('priority_card')}
            />
          </div>
        </section>

        <details className="money-os mos-report-secondary-details">
          <summary>
            <span>
              <strong>Reports and exports</strong>
            </span>
            <StatusBadge>Library</StatusBadge>
          </summary>
          <div className="mos-report-secondary-stack">
            <select
              className="month-select compact-month-select mos-report-month-select"
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
        <section className="mos-report-section" aria-label="Money Snapshot">
          <SectionHeader
            title="Money Snapshot"
          />
          <div className="mos-report-snapshot-grid">
            {snapshotStats.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                detail={stat.detail}
                icon={stat.icon}
                tone={stat.tone}
              />
            ))}
          </div>
        </section>

        <section className="mos-report-section" aria-label="Money Health">
          <SectionHeader
            title="Money Health"
            actions={<StatusBadge tone={moneyHealth.tone}>{moneyHealth.label}</StatusBadge>}
          />
          <InsightCard
            title={moneyHealth.label}
            detail={moneyHealth.detail}
            icon={HeartHandshake}
            tone={moneyHealth.tone}
            actions={<StatusBadge>{financialState.usagePercent || 0}% used</StatusBadge>}
          >
            <div className="mos-report-health-strip">
              <span>{financialState.pressure || 'Current pressure'}</span>
              <strong>{financialState.comfort || 'Money state'}</strong>
              <p>{financialState.usagePercent || 0}% of income is used.</p>
            </div>
          </InsightCard>
        </section>

        <section className="mos-report-section" aria-label="Key Insights">
          <SectionHeader
            title="Key Insights"
            actions={<StatusBadge>{keyInsights.length || 0} insight{keyInsights.length === 1 ? '' : 's'}</StatusBadge>}
          />
          {keyInsights.length > 0 ? (
            <div className="mos-report-insight-grid">
              {keyInsights.slice(0, 3).map((item, index) => (
                <InsightCard
                  key={`${item.title || 'insight'}-${index}`}
                  title={item.title || `Insight ${index + 1}`}
                  detail={item.detail}
                  icon={Sparkles}
                  tone={index === 0 ? moneyHealth.tone : 'tint'}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Insights need more activity"
              detail="Income, expenses, transfers, goals, shared payments, and borrow/lend activity will turn into clearer notes here."
              icon={Sparkles}
            />
          )}
        </section>

        <section className="mos-report-section" aria-label="Report Library">
          <SectionHeader
            title="Report Library"
          />
          <div className="mos-report-library-grid">
            <ActionCard
              title="Monthly Reports"
              detail="Generate the current monthly budget report."
              actionLabel={isPreparingReport('monthly') ? 'Preparing' : 'Generate'}
              icon={ChartPie}
              tone="tint"
              disabled={!canExport}
              onClick={() => handleMonthlyPdfExport('report_library')}
            >
              {monthlyReportCount > 0 && <StatusBadge>{monthlyReportCount}</StatusBadge>}
            </ActionCard>
            <ActionCard
              title="Statement Reports"
              detail="Review PDF or CSV rows before generating a statement report."
              actionLabel="Analyze statement"
              icon={Upload}
              tone="warning"
              onClick={() => handleStatementDiscovery('report_library')}
            >
              {statementReportCount > 0 && <StatusBadge>{statementReportCount}</StatusBadge>}
            </ActionCard>
            <ActionCard
              title="Trip Reports"
              detail="Export the current shared trip report."
              actionLabel={isPreparingReport('trip') ? 'Preparing' : 'Generate'}
              icon={ShieldCheck}
              tone="success"
              disabled={!canExport}
              onClick={() => handleTripPdfExport('report_library')}
            >
              {tripReportCount > 0 && <StatusBadge>{tripReportCount}</StatusBadge>}
            </ActionCard>
          </div>
        </section>

        <section className="mos-report-section" aria-label="Report History">
          <SectionHeader
            title="History"
          />
          {recentReportHistory.length > 0 ? (
            <div className="mos-report-history-list">
              {recentReportHistory.map((entry) => (
                <MoneyCard
                  key={entry.id}
                  className="mos-report-history-card"
                  eyebrow={reportTypeLabel(entry.type)}
                  title={entry.name}
                  detail={`${entry.reportId} - ${entry.currency} - ${entry.period}`}
                  icon={FileText}
                  tone={entry.type === 'statement' ? 'warning' : entry.type === 'trip' ? 'success' : 'tint'}
                  actions={<StatusBadge>{entry.template}</StatusBadge>}
                  footer={(
                    <div className="mos-report-history-footer">
                      <span>{reportGeneratedLabel(entry.generatedAt)}</span>
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
                  )}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No reports yet"
              icon={FileText}
              action={{
                label: isPreparingReport('monthly') ? 'Preparing...' : 'Create monthly report',
                onClick: () => {
                  trackEvent('empty_state_cta_clicked', {
                    surface: 'reports',
                    empty_state: 'report_history',
                    target: 'monthly_report',
                  })
                  handleMonthlyPdfExport('history_empty_state')
                },
              }}
            />
          )}
        </section>

        <section className="mos-report-section" id="reports-export-section" aria-label="Exports">
          <SectionHeader
            title="Exports"
            actions={(
              <label className="report-template-select mos-report-template-select">
                <span>Template</span>
                <select
                  className="month-select compact-month-select"
                  value={reportTemplate}
                  onChange={(event) => {
                    setReportTemplate?.(event.target.value)
                    trackFeatureUsage('report_template_selected', {
                      surface: 'reports',
                      template: event.target.value,
                    })
                  }}
                >
                  <option value="standard">Standard</option>
                  <option value="executive">Executive</option>
                  <option value="compact">Compact</option>
                </select>
              </label>
            )}
          />
          <div className="mos-report-export-grid">
            <ActionCard
              title="Monthly Budget PDF"
              detail="Executive summary, key numbers, insights, and recommendations."
              actionLabel={isPreparingReport('monthly') ? 'Preparing' : 'Export PDF'}
              icon={FileText}
              tone="tint"
              disabled={!canExport}
              onClick={() => handleMonthlyPdfExport('money_os_exports')}
            />
            <ActionCard
              title="Trip PDF"
              detail="Shared groups and trip totals."
              actionLabel={isPreparingReport('trip') ? 'Preparing' : 'Export trip'}
              icon={FileText}
              tone="success"
              disabled={!canExport}
              onClick={() => handleTripPdfExport('money_os_exports')}
            />
            <ActionCard
              title="Settlement PDF"
              detail="Settlement balances."
              actionLabel={isPreparingReport('settlement') ? 'Preparing' : 'Export settlement'}
              icon={FileText}
              tone="warning"
              disabled={!canExport}
              onClick={() => handleSettlementPdfExport('money_os_exports')}
            />
            <ActionCard
              title="CSV Export"
              detail="Download the current financial history export."
              actionLabel="Export CSV"
              icon={Download}
              tone="neutral"
              onClick={() => handleCsvExport('money_os_exports')}
            />
          </div>
        </section>
          </div>
        </details>

        {reportExportPrompt && (
          <MoneyCard
            className="mos-report-guidance-card"
            eyebrow="Report setup"
            title={reportExportPrompt.title}
            detail={reportExportPrompt.message}
            icon={FileText}
            tone="warning"
            actions={<StatusBadge>{reportExportPrompt.detail}</StatusBadge>}
            aria-live="polite"
          >
            <div className="report-export-guidance-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => onReportPromptAction?.(reportExportPrompt)}
              >
                {reportExportPrompt.actionLabel}
              </button>
              <button className="ghost-button" type="button" onClick={clearReportExportPrompt}>
                Later
              </button>
            </div>
          </MoneyCard>
        )}

        <details
          className="report-details-panel mos-report-details-panel"
          open={isDetailsOpen}
        >
          <summary onClick={toggleReportDetails}>
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
            <p>{financialState.usagePercent}% of income is used.</p>
          </div>
        </article>
          </div>
          )}
        </details>
      </MoneyOSProvider>
    )
  }

  return (
    <section className="screen-content reports-screen advanced-reports-screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Monthly Financial Reports</p>
          <h1>Your money report</h1>
          <p className="reports-subtitle">Short notes first. Charts only where they help.</p>
        </div>
        <div className="reports-header-actions">
          <button
            className="report-import-button"
            type="button"
            onClick={() => openStatementAnalysis('header')}
          >
            <Upload size={16} />
            <span>Analyze</span>
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

      {isStatementImportOpen && (
        <Suspense fallback={<StatementUploadFallback />}>
          <StatementUploadSheet
            isOpen={isStatementImportOpen}
            onClose={closeStatementAnalysis}
            onGenerateStatementReport={generateStatementReport}
            onCategoryMappingsChange={onStatementMappingsChange}
            reportTemplate={reportTemplate}
          />
        </Suspense>
      )}

      <article className="statement-discovery-card" aria-label="Statement analysis guide">
        <span className="soft-icon">
          <Upload size={18} />
        </span>
        <div>
          <p className="eyebrow">Statement Analysis</p>
          <h2>Review bank statement rows before creating a report</h2>
          <p>Upload a PDF or CSV, check detected transactions, then generate a statement report from the reviewed data.</p>
        </div>
        <button
          className="text-action-button"
          type="button"
          onClick={() => {
            trackEvent('feature_discovery_click', {
              surface: 'reports',
              feature: 'statement_analysis',
              source: 'statement_discovery_card',
            })
            trackFeatureUsage('feature_discovery_card', {
              surface: 'reports',
              feature: 'statement_analysis',
              source: 'statement_discovery_card',
            })
            openStatementAnalysis('statement_discovery_card')
          }}
        >
          Analyze statement
        </button>
      </article>

      <article className="professional-export-panel" id="reports-export-section">
        <div className="professional-export-heading">
          <div>
            <p className="eyebrow">Professional exports</p>
            <h2>Share-ready financial documents</h2>
            <p>Export a clean monthly, trip, settlement, or statement view with the summary, key numbers, insights, and recommendations in one place.</p>
          </div>
          <label className="report-template-select">
            <span>Template</span>
            <select
              className="month-select compact-month-select"
              value={reportTemplate}
              onChange={(event) => {
                setReportTemplate?.(event.target.value)
                trackFeatureUsage('report_template_selected', {
                  surface: 'reports',
                  template: event.target.value,
                })
              }}
            >
              <option value="standard">Standard</option>
              <option value="executive">Executive</option>
              <option value="compact">Compact</option>
            </select>
          </label>
        </div>
        <div className="report-value-grid" aria-label="Report output includes">
          <span>Executive Summary</span>
          <span>Key Numbers</span>
          <span>Insights</span>
          <span>Recommendations</span>
        </div>
        <div className="professional-export-actions">
          <button
            className="action-button"
            type="button"
            onClick={() => {
              trackEvent('report_conversion_click', {
                surface: 'reports',
                report_type: 'monthly',
                source: 'professional_panel',
              })
              trackEvent('report_export_click', {
                surface: 'reports',
                report_type: 'monthly',
                export_type: 'pdf',
                placement: 'professional_panel',
              })
              downloadPdf?.()
            }}
            disabled={isExportingPdf}
          >
            <FileText size={18} />
            {isPreparingReport('monthly') ? 'Preparing...' : 'Monthly Budget'}
          </button>
          <button
            className="action-button"
            type="button"
            onClick={() => {
              trackEvent('report_conversion_click', {
                surface: 'reports',
                report_type: 'trip',
                source: 'professional_panel',
              })
              trackEvent('report_export_click', {
                surface: 'reports',
                report_type: 'trip',
                export_type: 'pdf',
                placement: 'professional_panel',
              })
              requestReportExport?.('trip', { template: reportTemplate })
            }}
            disabled={isExportingPdf}
          >
            <FileText size={18} />
            {isPreparingReport('trip') ? 'Preparing...' : 'Trip Report'}
          </button>
          <button
            className="action-button"
            type="button"
            onClick={() => {
              trackEvent('report_conversion_click', {
                surface: 'reports',
                report_type: 'settlement',
                source: 'professional_panel',
              })
              trackEvent('report_export_click', {
                surface: 'reports',
                report_type: 'settlement',
                export_type: 'pdf',
                placement: 'professional_panel',
              })
              requestReportExport?.('settlement', { template: reportTemplate })
            }}
            disabled={isExportingPdf}
          >
            <FileText size={18} />
            {isPreparingReport('settlement') ? 'Preparing...' : 'Settlement Report'}
          </button>
        </div>
      </article>

      {reportExportPrompt && (
        <article className="report-export-guidance" aria-live="polite">
          <div>
            <p className="eyebrow">Report setup</p>
            <h2>{reportExportPrompt.title}</h2>
            <p>{reportExportPrompt.message}</p>
            <span>{reportExportPrompt.detail}</span>
          </div>
          <div className="report-export-guidance-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => onReportPromptAction?.(reportExportPrompt)}
            >
              {reportExportPrompt.actionLabel}
            </button>
            <button className="ghost-button" type="button" onClick={clearReportExportPrompt}>
              Later
            </button>
          </div>
        </article>
      )}

      {recentReportHistory.length > 0 ? (
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
      ) : (
        <article className="report-history-empty-card">
          <div>
            <p className="eyebrow">Report history</p>
            <h2>Generate your first financial report</h2>
            <p>Once created, saved reports appear here for quick re-download.</p>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              trackEvent('empty_state_cta_clicked', {
                surface: 'reports',
                empty_state: 'report_history',
                target: 'monthly_report',
              })
              trackEvent('report_conversion_click', {
                surface: 'reports',
                report_type: 'monthly',
                source: 'history_empty_state',
              })
              downloadPdf?.()
            }}
            disabled={isExportingPdf}
          >
            Create monthly report
          </button>
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
        open={isDetailsOpen}
      >
        <summary onClick={toggleReportDetails}>
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
          <p>{financialState.usagePercent}% of income is used.</p>
        </div>
      </article>
        </div>
        )}
      </details>

      <div className="action-row">
        <button
          className="action-button"
          type="button"
          onClick={() => {
            trackEvent('report_export_click', {
              surface: 'reports',
              report_type: 'monthly',
              export_type: 'pdf',
              placement: 'bottom_action_row',
            })
            downloadPdf?.()
          }}
          disabled={isExportingPdf}
        >
          <FileText size={20} />
          {isPreparingReport('monthly') ? 'Preparing...' : 'Export PDF'}
        </button>
        <button
          className="action-button"
          type="button"
          onClick={() => {
            trackEvent('report_export_click', {
              surface: 'reports',
              export_type: 'csv',
              placement: 'bottom_action_row',
            })
            exportCsv?.()
          }}
        >
          <Download size={20} />
          Export CSV
        </button>
      </div>
    </section>
  )
}
