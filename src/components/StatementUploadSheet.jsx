import { useRef, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, FileSpreadsheet, Files, FileText, LockKeyhole, ShieldCheck, Store, X } from 'lucide-react'
import { normalizeMoney, sumMoney } from '../lib/money'
import { rupees } from '../lib/ruleEngine'
import { safeStorageGet, safeStorageSetQueued } from '../lib/storage'
import { trackActivation, trackEvent, trackFeatureUsage } from '../lib/analytics'

const modes = [
  { key: 'reflection', label: 'Report' },
  { key: 'timeline', label: 'Activity' },
]

const statementPreviewCategories = [
  'Food',
  'Grocery',
  'Travel',
  'Fuel',
  'Shopping',
  'Subscription',
  'Housing',
  'Loan',
  'Health',
  'Education',
  'Utilities',
  'Entertainment',
  'Cash / ATM',
  'Personal Transfer',
  'Salary',
  'Friends / Personal',
  'Cashback / Refund',
  'Interest',
  'Other',
]

function readCategoryMappings() {
  try {
    const parsed = JSON.parse(safeStorageGet('fbply-statement-category-mappings', '{}'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function monthsForAnalysisWindow(value) {
  return {
    '1m': 1,
    '3m': 3,
    '6m': 6,
    '12m': 12,
  }[value] || 3
}

function filterTransactionsByAnalysisWindow(transactions = [], windowKey = '3m') {
  const datedTransactions = transactions
    .map((transaction) => ({ transaction, date: new Date(`${transaction.date}T00:00:00`) }))
    .filter((item) => !Number.isNaN(item.date.getTime()))

  if (datedTransactions.length === 0) {
    return transactions
  }

  const latestDate = datedTransactions.reduce((latest, item) => (item.date > latest ? item.date : latest), datedTransactions[0].date)
  const months = monthsForAnalysisWindow(windowKey)
  const cutoff = new Date(latestDate.getFullYear(), latestDate.getMonth() - months + 1, 1)

  return transactions.filter((transaction) => {
    const date = new Date(`${transaction.date}T00:00:00`)
    return Number.isNaN(date.getTime()) || date >= cutoff
  })
}

function mappingKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function formatSize(bytes) {
  if (!bytes) {
    return '0 KB'
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(Math.round(bytes / 1024), 1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StatementBars({ title, items, emptyText }) {
  const visibleItems = items.slice(0, 6)
  const total = sumMoney(visibleItems, (item) => item.amount)

  return (
    <div className="statement-chart-block">
      <strong>{title}</strong>
      {visibleItems.length === 0 && <p>{emptyText}</p>}
      {visibleItems.map((item) => {
        const share = total > 0 ? Math.max((normalizeMoney(item.amount) / total) * 100, 3) : 0

        return (
          <div className="statement-bar-row" key={`${title}-${item.name}`}>
            <div>
              <span>{item.name}</span>
              <strong>{rupees(item.amount)}</strong>
            </div>
            <i aria-hidden="true">
              <b style={{ width: `${share}%` }} />
            </i>
          </div>
        )
      })}
    </div>
  )
}

function StatementParsingSkeleton() {
  return (
    <div className="statement-preview-list" aria-label="Reading statement">
      <div className="statement-preview-heading">
        <span className="skeleton-line short" />
        <span className="skeleton-line tiny" />
      </div>
      {[0, 1, 2].map((item) => (
        <div className="statement-skeleton-row" key={item}>
          <span className="skeleton-line wide" />
          <span className="skeleton-line" />
          <span className="skeleton-line short" />
        </div>
      ))}
    </div>
  )
}

function StatementReportSummary({ report }) {
  if (!report || report.transactionCount === 0) {
    return (
      <div className="statement-intelligence-card">
        <strong>Statement report needs clearer rows.</strong>
        <p>FBPly could not read enough dates, amounts, and descriptions from this file. Try another PDF or CSV export.</p>
      </div>
    )
  }

  return (
    <div className="statement-intelligence-card">
      <div className="statement-intelligence-heading">
        <div>
          <p className="eyebrow">Statement report</p>
          <h3>Detected from this file.</h3>
        </div>
        <span>{report.confidenceScore || 0}% confidence</span>
      </div>
      <p className="statement-truth-note">
        Based on {report.recognizedTransactions || report.transactionCount} recognized transactions.
        {report.needsReviewCount > 0 ? ` ${report.needsReviewCount} row${report.needsReviewCount === 1 ? '' : 's'} need review.` : ' No uncertain rows detected.'}
      </p>

      <div className="statement-money-grid">
        <div>
          <ArrowDownLeft size={16} />
          <span>Money in</span>
          <strong>{rupees(report.totalIncome)}</strong>
        </div>
        <div>
          <ArrowUpRight size={16} />
          <span>Money out</span>
          <strong>{rupees(report.totalExpense)}</strong>
        </div>
        <div>
          <Store size={16} />
          <span>Net movement</span>
          <strong>{rupees(report.netMovement)}</strong>
        </div>
      </div>

      <div className="statement-report-block">
        <strong>Income sources</strong>
        {(report.incomeSources.length ? report.incomeSources : [{ name: 'No income detected', amount: 0 }]).slice(0, 5).map((item) => (
          <div className="statement-report-row" key={`income-${item.name}`}>
            <span>{item.name}</span>
            <strong>{item.amount > 0 ? rupees(item.amount) : 'Review'}</strong>
          </div>
        ))}
      </div>

      <StatementBars
        title="Spend chart"
        items={report.expenseCategories}
        emptyText="No money-out rows were detected."
      />

      <StatementBars
        title="Income chart"
        items={report.incomeSources}
        emptyText="No money-in rows were detected."
      />

      <div className="statement-report-block">
        <strong>Spending categories</strong>
        {(report.expenseCategories.length ? report.expenseCategories : [{ name: 'No spending detected', amount: 0 }]).slice(0, 6).map((item) => (
          <div className="statement-report-row" key={`expense-${item.name}`}>
            <span>{item.name}</span>
            <strong>{item.amount > 0 ? rupees(item.amount) : 'Review'}</strong>
          </div>
        ))}
      </div>

      {report.merchants.length > 0 && (
        <div className="statement-report-block">
          <strong>Local businesses & merchants</strong>
          {report.merchants.slice(0, 5).map((item) => (
            <div className="statement-report-row" key={`merchant-${item.name}`}>
              <span>{item.name}</span>
              <strong>{rupees(item.amount)}</strong>
            </div>
          ))}
        </div>
      )}

      {report.needsReviewCount > 0 && (
        <div className="statement-report-block needs-review-block">
          <strong>Needs Review</strong>
          <div className="statement-report-row">
            <span>Uncertain categorization</span>
            <strong>{report.needsReviewCount}</strong>
          </div>
        </div>
      )}

      <div className="statement-insight-list">
        {report.insights.slice(0, 3).map((insight) => (
          <p key={insight}>{insight}</p>
        ))}
      </div>
    </div>
  )
}

export default function StatementUploadSheet({
  isOpen,
  onClose,
  onGenerateStatementReport,
  onCategoryMappingsChange,
  reportTemplate = 'standard',
}) {
  const inputRef = useRef(null)
  const [mode, setMode] = useState('reflection')
  const [accept, setAccept] = useState('.pdf,.csv')
  const [allowMultiple, setAllowMultiple] = useState(true)
  const [isParsing, setIsParsing] = useState(false)
  const [result, setResult] = useState(null)
  const [previewTransactions, setPreviewTransactions] = useState([])
  const [pendingFiles, setPendingFiles] = useState(null)
  const [protectedFiles, setProtectedFiles] = useState([])
  const [pdfPassword, setPdfPassword] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const [error, setError] = useState('')
  const [analysisWindow, setAnalysisWindow] = useState('3m')
  const [categoryMappings, setCategoryMappings] = useState(readCategoryMappings)
  const [userOverrides, setUserOverrides] = useState(0)
  const hasTrackedStatementUploadRef = useRef(false)

  if (!isOpen) {
    return null
  }

  const openPicker = ({ fileAccept, multiple }) => {
    setAccept(fileAccept)
    setAllowMultiple(multiple)
    setError('')
    setImportMessage('')
    trackFeatureUsage('statement_upload_picker_opened', {
      surface: 'statement_analysis',
      mode,
      multiple,
    })
    window.setTimeout(() => inputRef.current?.click(), 0)
  }

  const safelyParseFiles = async (files, password = '') => {
    setIsParsing(true)
    setError('')
    setImportMessage('')

    try {
      const { parseStatementFiles } = await import('../lib/statementImport')
      const parsed = await parseStatementFiles(files, mode, { pdfPassword: password, categoryMappings })
      setResult(parsed)
      setPreviewTransactions(parsed.transactions || [])
      trackEvent('statement_upload_parsed', {
        surface: 'statement_analysis',
        mode,
        file_count: files?.length || 0,
        transaction_count: parsed.transactions?.length || 0,
        confidence_score: parsed.statementReport?.confidenceScore || 0,
        historical_only: Boolean(parsed.historicalOnly),
      })
    } catch (parseError) {
      if (parseError?.code === 'PDF_PASSWORD_REQUIRED') {
        setProtectedFiles((files || []).map((file) => ({ name: file.name, size: file.size })))
        setPendingFiles(files)
        setError('')
        trackEvent('statement_upload_password_required', {
          surface: 'statement_analysis',
          mode,
          file_count: files?.length || 0,
        })
        return
      }

      setError('Statement analysis preview could not be prepared. Please try another PDF or CSV file.')
      trackEvent('statement_upload_failed', {
        surface: 'statement_analysis',
        mode,
        reason: parseError?.code || 'parse_failed',
      })
    } finally {
      setIsParsing(false)
      setPdfPassword('')
      setPendingFiles(null)
    }
  }

  const parseFiles = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''

    if (files.length === 0) {
      return
    }

    trackEvent('statement_upload_started', {
      surface: 'statement_analysis',
      mode,
      file_count: files.length,
    })

    if (!hasTrackedStatementUploadRef.current) {
      hasTrackedStatementUploadRef.current = true
      trackActivation('first_statement_upload', {
        source: 'statement_analysis',
      })
    }

    try {
      const { inspectStatementFilesForPasswords } = await import('../lib/statementImport')
      const passwordFiles = await inspectStatementFilesForPasswords(files)

      if (passwordFiles.length > 0) {
        setProtectedFiles(passwordFiles)
        setPendingFiles(files)
        setPdfPassword('')
        trackEvent('statement_upload_password_required', {
          surface: 'statement_analysis',
          mode,
          file_count: files.length,
        })
        return
      }

      await safelyParseFiles(files)
    } catch {
      setError('Statement analysis preview could not be prepared. Please try another PDF or CSV file.')
      trackEvent('statement_upload_failed', {
        surface: 'statement_analysis',
        mode,
        reason: 'inspection_failed',
      })
    }
  }

  const continueProtectedPdf = async (event) => {
    event.preventDefault()

    if (!pdfPassword.trim()) {
      setError('Enter the PDF password to continue processing.')
      return
    }

    const files = pendingFiles
    const passwordForProcessing = pdfPassword
    setProtectedFiles([])
    await safelyParseFiles(files || [], passwordForProcessing)
  }

  const cancelProtectedPdf = () => {
    setPendingFiles(null)
    setProtectedFiles([])
    setPdfPassword('')
    setError('')
  }

  const updatePreviewTransaction = (id, patch) => {
    setPreviewTransactions((current) =>
      current.map((transaction) => (transaction.id === id ? { ...transaction, ...patch } : transaction)),
    )
  }

  const updatePreviewCategory = (transaction, category) => {
    updatePreviewTransaction(transaction.id, { category })

    const key = mappingKey(transaction.merchant || transaction.description)
    if (!key) {
      return
    }

    setCategoryMappings((current) => {
      const next = { ...current, [key]: category }
      safeStorageSetQueued('fbply-statement-category-mappings', JSON.stringify(next))
      onCategoryMappingsChange?.(next)
      return next
    })
    setUserOverrides((current) => current + 1)
  }

  const confirmPreview = () => {
    setImportMessage(
      result?.historicalOnly
        ? 'Review saved for this session. Older statements are not added to live balance or planner automatically.'
        : 'Review saved for this session. These rows are not added to live balance until import is confirmed.',
    )
    trackFeatureUsage('statement_preview_confirmed', {
      surface: 'statement_analysis',
      transaction_count: previewTransactions.length,
    })
  }

  const generateStatementReport = async () => {
    if (!result?.statementReport || !onGenerateStatementReport) {
      return
    }

    const scopedTransactions = filterTransactionsByAnalysisWindow(previewTransactions, analysisWindow)
    const { buildStatementReport } = await import('../lib/statementImport')
    const statementReport = buildStatementReport(scopedTransactions)
    trackEvent('statement_report_requested', {
      surface: 'statement_analysis',
      transaction_count: scopedTransactions.length,
      analysis_window: analysisWindow,
      user_overrides: userOverrides,
      confidence_score: statementReport.confidenceScore || 0,
    })

    onGenerateStatementReport({
      statementReport: {
        ...statementReport,
        analysisWindow,
      },
      transactions: scopedTransactions,
      userOverrides,
      template: reportTemplate,
      accuracy: {
        recognizedTransactions: statementReport.recognizedTransactions || statementReport.transactionCount,
        needsReviewCount: statementReport.needsReviewCount || 0,
        confidenceScore: statementReport.confidenceScore || 0,
        userOverrides,
        coverage: statementReport.coverage || statementReport.confidenceScore || 0,
      },
    })
  }

  return (
    <div className="statement-upload-backdrop" role="presentation" onClick={onClose}>
      <section
        className="statement-upload-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Analyze bank statement"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="statement-sheet-header">
          <div>
            <h2>Analyze statement</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close statement analysis" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <div className="privacy-note-card">
          <ShieldCheck size={17} />
          <p>Private review. Passwords are not stored.</p>
        </div>

        <div className="statement-option-grid">
          <button type="button" onClick={() => openPicker({ fileAccept: '.pdf,application/pdf', multiple: false })}>
            <FileText size={18} />
            <span>PDF</span>
          </button>
          <button type="button" onClick={() => openPicker({ fileAccept: '.csv,text/csv', multiple: false })}>
            <FileSpreadsheet size={18} />
            <span>CSV</span>
          </button>
          <button type="button" onClick={() => openPicker({ fileAccept: '.pdf,.csv,application/pdf,text/csv', multiple: true })}>
            <Files size={18} />
            <span>Files</span>
          </button>
        </div>

        <details className="statement-advanced-options">
          <summary>Import Options</summary>
          <label className="statement-window-select">
            <span className="input-label">Report period</span>
            <select className="month-select" value={analysisWindow} onChange={(event) => setAnalysisWindow(event.target.value)}>
              <option value="1m">1 Month</option>
              <option value="3m">3 Month</option>
              <option value="6m">6 Month</option>
              <option value="12m">12 Month</option>
            </select>
          </label>
          <div className="statement-mode-row" aria-label="Import mode">
            {modes.map((item) => (
              <button
                className={mode === item.key ? 'active' : ''}
                key={item.key}
                type="button"
                onClick={() => setMode(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </details>

        <input
          ref={inputRef}
          className="visually-hidden-file-input"
          type="file"
          accept={accept}
          multiple={allowMultiple}
          onChange={parseFiles}
        />

        {isParsing && <StatementParsingSkeleton />}
        {error && <p className="form-message">{error}</p>}
        {importMessage && <p className="statement-import-status">{importMessage}</p>}

        {protectedFiles.length > 0 && (
          <form className="password-sheet" onSubmit={continueProtectedPdf}>
            <div className="password-sheet-title">
              <LockKeyhole size={18} />
              <div>
                <h3>This statement is password protected.</h3>
                <p>Enter PDF password to continue processing. It stays only in memory for this step.</p>
              </div>
            </div>
            <input
              className="plain-input"
              type="password"
              value={pdfPassword}
              autoComplete="off"
              placeholder="PDF password"
              onChange={(event) => setPdfPassword(event.target.value)}
            />
            <div className="mini-action-row">
              <button className="primary-button" type="submit">
                Continue
              </button>
              <button className="ghost-button" type="button" onClick={cancelProtectedPdf}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {result && (
          <div className="statement-result-card">
            <div className="statement-result-summary">
              <span>{result.files.length} file{result.files.length === 1 ? '' : 's'}</span>
              <strong>{result.detectedMonths.length || 'Review'}</strong>
              <p>{result.detectedMonths.length ? 'Month found' : 'Month needs review'}</p>
            </div>

            <div className="statement-file-list">
              {result.files.map((file) => (
                <article key={file.id}>
                  <div>
                    <strong>{file.name}</strong>
                    <p>{file.type} - {formatSize(file.size)} - {file.monthLabel}</p>
                  </div>
                  {file.visibleAmountSample > 0 && <span>{rupees(file.visibleAmountSample)}</span>}
                </article>
              ))}
            </div>

            <StatementReportSummary report={result.statementReport} />

            {result.historicalTimeline.length > 0 && (
              <div className="statement-timeline-row">
                {result.historicalTimeline.map((item) => (
                  <span key={item.month}>{item.label}</span>
                ))}
              </div>
            )}

            {result.historicalOnly && (
              <p className="statement-import-status">
                Older statement months stay in report history. They are not added to live flexibility automatically.
              </p>
            )}

            {previewTransactions.length > 0 && (
              <div className="statement-preview-list">
                <div className="statement-preview-heading">
                  <strong>Review before import</strong>
                  <span>
                    {result.previewLimited
                      ? `${previewTransactions.length} of ${result.transactionCount} shown`
                      : `${previewTransactions.length} detected`}
                  </span>
                </div>
                {previewTransactions.map((transaction) => (
                  <article key={transaction.id}>
                    <input
                      className="plain-input"
                      value={transaction.description}
                      onChange={(event) => updatePreviewTransaction(transaction.id, { description: event.target.value })}
                    />
                    <input
                      className="plain-input"
                      type="date"
                      value={transaction.date}
                      onChange={(event) => updatePreviewTransaction(transaction.id, { date: event.target.value })}
                    />
                    <select
                      className="month-select"
                      value={transaction.direction}
                      onChange={(event) => updatePreviewTransaction(transaction.id, { direction: event.target.value })}
                    >
                      <option value="expense">Money out</option>
                      <option value="income">Money in</option>
                    </select>
                    <select
                      className="month-select"
                      value={transaction.category}
                      onChange={(event) => updatePreviewCategory(transaction, event.target.value)}
                    >
                      {statementPreviewCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <span>
                      {transaction.direction === 'income' ? '+' : '-'} {rupees(transaction.amount)}
                      {(transaction.confidence === 'low' || transaction.category === 'Other') && <small>Needs Review</small>}
                    </span>
                  </article>
                ))}
                <div className="statement-preview-actions">
                  <button className="primary-button" type="button" onClick={confirmPreview}>
                    Confirm preview
                  </button>
                  <button className="ghost-button" type="button" onClick={generateStatementReport}>
                    Generate statement report
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
