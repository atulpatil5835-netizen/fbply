import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  Pencil,
  PiggyBank,
  Plane,
  Plus,
  Receipt,
  Sparkles,
  Target,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { AppModal, CurrencyInput } from '../components/AppPrimitives.jsx'
import {
  ActionCard,
  AnimatedNumber,
  EmptyState as MoneyOSEmptyState,
  InsightCard,
  MoneyCard,
  SectionHeader,
  StatCard,
  StatusBadge,
  defaultMoneyOSTheme,
  getMoneyOSThemeExperience,
} from '../design-system'
import { buildRelatedTransactionGroups } from '../lib/financeIntelligence'
import { addMoney, normalizeMoney, sumMoney } from '../lib/money'
import { rupees, shortRupees } from '../lib/ruleEngine'
import { focusInvalidField } from '../lib/uiHelpers'
import SharedExpensesPanel from './SharedExpenseScreen.jsx'
import { trackEvent } from '../lib/analytics'
import { isLegacyProgressLayer, percentFromParts, trackProgressComponentsViewed } from '../lib/progressLayer'
import { displayPersonName, reconcileSharedGroup } from '../lib/financialActivity'

const HISTORY_GROUP_BATCH_SIZE = 12

function isLegacyPeopleExperience() {
  return typeof window !== 'undefined' && Boolean(
    window.__FBPLY_LEGACY_PEOPLE__ ||
    window.__FBPLY_LEGACY_BORROW_LEND__ ||
    window.__FBPLY_LEGACY_SHARED_EXPENSES__,
  )
}

function todayDateKey() {
  return new Date().toISOString().slice(0, 10)
}

function formatPeopleDate(value) {
  const cleanValue = String(value || '').slice(0, 10)
  const parsed = cleanValue ? new Date(`${cleanValue}T00:00:00`) : null

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return 'No date'
  }

  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

function formatLedgerNotebookPage(value) {
  const cleanValue = String(value || '').slice(0, 10)
  const parsed = cleanValue ? new Date(`${cleanValue}T12:00:00`) : null

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return {
      dateLabel: 'Notebook page',
      dayName: 'Day not set',
      monthLabel: 'Current notebook',
      footerDate: cleanValue || 'No date',
    }
  }

  return {
    dateLabel: parsed.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    }),
    dayName: parsed.toLocaleDateString('en-IN', {
      weekday: 'long',
    }),
    monthLabel: parsed.toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    }),
    footerDate: parsed.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  }
}

function settlementSortDate(item = {}) {
  return String(item.receivedAt || item.settledAt || item.updatedAt || item.date || '').slice(0, 10)
}

function formatActivityTime(value) {
  const parsed = new Date(value || Date.now())

  if (Number.isNaN(parsed.getTime())) {
    return 'Now'
  }

  return parsed.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function activityVerb(transaction = {}) {
  if (transaction.tone === 'incoming') {
    return 'Earned'
  }

  if (transaction.tone === 'outgoing') {
    return 'Spent'
  }

  if (transaction.tone === 'transfer') {
    return 'Shifted'
  }

  if (transaction.impactType === 'goal') {
    return 'Planned'
  }

  return 'Tracked'
}

function MonthSelector({ selectedMonthKey, setSelectedMonthKey, monthOptions = [] }) {
  return (
    <label className="month-selector">
      <span>Month</span>
      <select
        aria-label="Month selector"
        value={selectedMonthKey}
        onChange={(event) => setSelectedMonthKey(event.target.value)}
      >
        {monthOptions.map((month) => (
          <option key={month.key} value={month.key}>
            {month.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function moneyBookEntryDue(entry = {}) {
  return addMoney(entry.amount, entry.interest)
}

function buildMoneyBookProgressItems(entries = []) {
  return [
    {
      key: 'collection',
      label: 'Collection',
      entries: entries.filter((entry) => entry.kind === 'given'),
      note: 'money to receive',
    },
    {
      key: 'repayment',
      label: 'Repayment',
      entries: entries.filter((entry) => entry.kind === 'taken'),
      note: 'money to repay',
    },
  ]
    .map((item) => {
      const total = item.entries.length
      const completed = item.entries.filter((entry) => entry.status === 'settled').length
      const pending = Math.max(total - completed, 0)

      return {
        ...item,
        completed,
        pending,
        progress: percentFromParts(completed, total),
        total,
      }
    })
    .filter((item) => item.total > 0)
}

function BorrowLendProgressLayer({ entries = [] }) {
  const progressItems = useMemo(() => buildMoneyBookProgressItems(entries), [entries])

  useEffect(() => {
    if (progressItems.length > 0) {
      trackProgressComponentsViewed('people', ['borrow_lend_progress'])
    }
  }, [progressItems.length])

  if (isLegacyProgressLayer() || progressItems.length === 0) {
    return null
  }

  return (
    <div className="v74-progress-stack v74-people-progress" aria-label="Borrow and lend progress">
      {progressItems.map((item) => (
        <article className="v74-progress-strip" key={item.key}>
          <div className="v74-progress-header">
            <span>{item.label}</span>
            <strong>{item.progress}%</strong>
          </div>
          <div className="v74-progress-track" aria-label={`${item.progress}% ${item.label.toLowerCase()} complete`}>
            <span className="v74-progress-fill" style={{ width: `${item.progress}%` }} />
          </div>
          <p className="v74-progress-note">
            {item.completed} settled, {item.pending} pending across {item.total} {item.note} entr{item.total === 1 ? 'y' : 'ies'}.
          </p>
        </article>
      ))}
    </div>
  )
}

const activityFilterOptions = [
  { key: 'all', label: 'All', icon: CalendarDays },
  { key: 'expense', label: 'Expense', icon: Receipt },
  { key: 'income', label: 'Income', icon: Wallet },
  { key: 'borrow', label: 'Borrow', icon: CreditCard },
  { key: 'transfer', label: 'Savings', icon: PiggyBank },
  { key: 'shared', label: 'Shared', icon: Plane },
]

function matchesActivityFilter(transaction = {}, filter = 'all') {
  if (filter === 'all') {
    return true
  }

  if (filter === 'shared') {
    return transaction.sourceModule === 'Shared'
  }

  if (filter === 'borrow') {
    return transaction.sourceModule === 'Money Book'
  }

  if (filter === 'income') {
    return transaction.impactType === 'income' || (
      transaction.tone === 'incoming' &&
      transaction.sourceModule === 'Profile'
    )
  }

  if (filter === 'transfer') {
    return transaction.impactType === 'transfer' ||
      transaction.impactType === 'goal' ||
      transaction.category === 'Savings' ||
      transaction.sourceModule === 'Goals' ||
      transaction.sourceModule === 'Planner'
  }

  if (filter === 'expense') {
    return transaction.sourceModule !== 'Shared' &&
      transaction.sourceModule !== 'Money Book' &&
      (
        transaction.impactType === 'expense' ||
        (transaction.tone === 'outgoing' && ['Profile', 'Voice'].includes(transaction.sourceModule))
      )
  }

  return true
}

function matchesActivitySearch(transaction = {}, query = '') {
  const cleanQuery = String(query || '').trim().toLowerCase()

  if (!cleanQuery) {
    return true
  }

  return [
    transaction.title,
    transaction.label,
    transaction.category,
    transaction.sourceModule,
    transaction.note,
    transaction.person,
    transaction.date,
    transaction.amount,
  ]
    .filter((value) => value !== null && typeof value !== 'undefined')
    .some((value) => String(value).toLowerCase().includes(cleanQuery))
}

function filterActivityGroup(group = {}, filter = 'all', query = '') {
  const items = (group.items || []).filter((transaction) => (
    matchesActivityFilter(transaction, filter) && matchesActivitySearch(transaction, query)
  ))

  return {
    ...group,
    items,
    incoming: sumMoney(items.filter((transaction) => transaction.tone === 'incoming'), (transaction) => transaction.amount),
    outgoing: sumMoney(items.filter((transaction) => transaction.tone === 'outgoing'), (transaction) => transaction.amount),
    transfers: sumMoney(items.filter((transaction) => transaction.tone === 'transfer'), (transaction) => transaction.amount),
  }
}

function ledgerEmptyStateCopy({ deferredSearch, effectiveActivityFilter, themeExperience }) {
  if (deferredSearch) {
    return {
      title: 'No matching notebook entries.',
      detail: 'Clear search or choose another filter.',
    }
  }

  if (effectiveActivityFilter !== 'all') {
    return {
      title: `No ${effectiveActivityFilter} entries yet.`,
      detail: 'Choose another page filter or write a new expense line.',
    }
  }

  return {
    title: themeExperience?.copy?.emptyLedger || 'This page is waiting for your first expense.',
    detail: 'Add one expense to start the ledger. Trips and borrow/lend entries will appear here too.',
  }
}

export default function ActivityScreen({
  groups = [],
  summary = {},
  cashflowTimeline = [],
  expenses = [],
  moneyBookSummary = {},
  profile,
  sharedGroups = [],
  sharedSummary = {},
  addSharedGroup,
  addSharedPayment,
  markSharedSettlementReceived,
  removeSharedGroup,
  onSaveMoneyBookEntry,
  onToggleMoneyBookSettlement,
  onDeleteMoneyBookEntry,
  selectedMonthKey,
  setSelectedMonthKey,
  monthOptions,
  onEditExpense,
  openAddSheet,
  requestReportExport,
  moneyTheme = defaultMoneyOSTheme,
  view = 'people',
}) {
  const [moneyBookModalEntry, setMoneyBookModalEntry] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [activityFilter, setActivityFilter] = useState('all')
  const [activitySearch, setActivitySearch] = useState('')
  const [historyWindow, setHistoryWindow] = useState({ key: '', count: HISTORY_GROUP_BATCH_SIZE })
  const deferredGroups = useDeferredValue(groups)
  const deferredSearch = useDeferredValue(activitySearch)
  const isLedgerView = view === 'ledger'
  const themeExperience = useMemo(() => getMoneyOSThemeExperience(moneyTheme), [moneyTheme])
  const effectiveActivityFilter = isLedgerView && activityFilter === 'income' ? 'all' : activityFilter
  const visibleActivityFilterOptions = useMemo(
    () => isLedgerView
      ? activityFilterOptions.filter((option) => option.key !== 'income')
      : activityFilterOptions,
    [isLedgerView],
  )
  const filteredGroups = useMemo(
    () => deferredGroups
      .map((group) => filterActivityGroup(group, effectiveActivityFilter, deferredSearch))
      .filter((group) => group.items.length > 0),
    [deferredGroups, deferredSearch, effectiveActivityFilter],
  )
  const historyWindowKey = `${selectedMonthKey}-${effectiveActivityFilter}-${deferredSearch}-${filteredGroups.length}`
  const visibleGroupCount = historyWindow.key === historyWindowKey ? historyWindow.count : HISTORY_GROUP_BATCH_SIZE
  const visibleGroups = useMemo(
    () => filteredGroups.slice(0, visibleGroupCount),
    [filteredGroups, visibleGroupCount],
  )
  const filteredItemCount = useMemo(
    () => filteredGroups.reduce((total, group) => total + group.items.length, 0),
    [filteredGroups],
  )
  const hasMoreHistory = visibleGroupCount < filteredGroups.length
  const hasHistory = filteredGroups.some((group) => group.items.length > 0)
  const hasSearchQuery = activitySearch.trim().length > 0
  const hasCustomLedgerFilter = effectiveActivityFilter !== 'all' || hasSearchQuery
  const selectedMonthLabel = monthOptions?.find((month) => month.key === selectedMonthKey)?.label || selectedMonthKey || 'Current month'
  const expensesById = useMemo(
    () => new Map(expenses.map((expense) => [String(expense.id), expense])),
    [expenses],
  )
  const relatedGroupsByDate = useMemo(
    () => new Map(visibleGroups.map((group) => [group.date, buildRelatedTransactionGroups(group.items)])),
    [visibleGroups],
  )
  const todayLedgerGroup = useMemo(
    () => groups.find((group) => group.date === todayDateKey()) || null,
    [groups],
  )
  const ledgerTodaySummary = useMemo(() => {
    const incoming = todayLedgerGroup?.incoming || 0
    const outgoing = todayLedgerGroup?.outgoing || 0
    const transfers = todayLedgerGroup?.transfers || 0

    return {
      incoming,
      outgoing,
      transfers,
      balance: addMoney(incoming, -outgoing),
      dailyTotal: outgoing || incoming || transfers || 0,
      lineCount: todayLedgerGroup?.items?.length || 0,
    }
  }, [todayLedgerGroup])

  const getExpenseEditHandler = useCallback((transaction) => {
    if (!transaction.meta?.expenseId || !onEditExpense) {
      return null
    }

    return () => {
      const expense = expensesById.get(String(transaction.meta.expenseId))

      if (expense) {
        onEditExpense(expense)
      }
    }
  }, [expensesById, onEditExpense])
  const toggleRelatedGroup = useCallback((key) => {
    setExpandedGroups((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }, [])
  const closeMoneyBookModal = useCallback(() => setMoneyBookModalEntry(null), [])
  const saveMoneyBookFromModal = useCallback((entry) => {
    const saved = onSaveMoneyBookEntry?.(entry)

    if (saved) {
      closeMoneyBookModal()
    }

    return saved
  }, [closeMoneyBookModal, onSaveMoneyBookEntry])
  const openExpenseFromEmptyState = useCallback(() => {
    trackEvent('empty_state_cta_clicked', {
      surface: 'activity',
      empty_state: effectiveActivityFilter === 'all' ? 'activity_timeline' : `${effectiveActivityFilter}_timeline`,
      target: 'add_expense',
    })
    openAddSheet?.('expense')
  }, [effectiveActivityFilter, openAddSheet])
  const openMoneyBookFromDiscovery = useCallback((source = 'header') => {
    trackEvent(source === 'empty_state' ? 'empty_state_cta_clicked' : 'feature_discovery_click', {
      surface: 'activity',
      source,
      empty_state: source === 'empty_state' ? 'money_book' : undefined,
      feature: 'borrow_lend',
      target: 'add_borrow_lend',
    })
    setMoneyBookModalEntry({ kind: 'given', date: todayDateKey() })
  }, [])
  const useLegacyPeople = isLegacyPeopleExperience()
  const emptyStateCopy = ledgerEmptyStateCopy({ deferredSearch, effectiveActivityFilter, themeExperience })
  const ledgerDailySummaryContent = isLedgerView ? (
    <section className="v16-ledger-summary-grid" aria-label="Today's ledger summary">
      <HistorySummaryCard label="Today's Balance" value={ledgerTodaySummary.balance} tone={ledgerTodaySummary.balance >= 0 ? 'incoming' : 'outgoing'} />
      <HistorySummaryCard label="Money In" value={ledgerTodaySummary.incoming} tone="incoming" />
      <HistorySummaryCard label="Money Out" value={ledgerTodaySummary.outgoing} tone="outgoing" />
      <HistorySummaryCard label="Daily Total" value={ledgerTodaySummary.dailyTotal} tone="transfer" />
      <article className="v16-ledger-today-note">
        <span>Today&apos;s page</span>
        <strong>{ledgerTodaySummary.lineCount} line{ledgerTodaySummary.lineCount === 1 ? '' : 's'} written</strong>
        <small>Search and filters stay below the daily page summary.</small>
      </article>
    </section>
  ) : null

  const activityTimelineContent = (
    <>
      <div className="ledger-search-cluster">
        <label className="ledger-search-field">
          <span className="sr-only">Search ledger</span>
          <input
            type="search"
            value={activitySearch}
            placeholder="Search ledger"
            autoComplete="off"
            aria-label="Search ledger entries"
            onChange={(event) => setActivitySearch(event.target.value)}
          />
        </label>
        {hasSearchQuery && (
          <button className="ledger-search-clear" type="button" onClick={() => setActivitySearch('')} aria-label="Clear ledger search">
            <X size={14} />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div className="ledger-result-meta" aria-live="polite">
        <span>
          {filteredItemCount} entr{filteredItemCount === 1 ? 'y' : 'ies'}
          {effectiveActivityFilter !== 'all' ? ` in ${effectiveActivityFilter}` : ''}
          {hasSearchQuery ? ` for "${activitySearch.trim()}"` : ''}
        </span>
        {hasCustomLedgerFilter && (
          <button type="button" onClick={() => {
            setActivitySearch('')
            setActivityFilter('all')
          }}>
            Reset
          </button>
        )}
      </div>

      <div className="activity-filter-row" aria-label="Activity filters">
        {visibleActivityFilterOptions.map((option) => {
          const Icon = option.icon

          return (
            <button
              className={effectiveActivityFilter === option.key ? 'active' : ''}
              key={option.key}
              type="button"
              aria-label={`Show ${option.label} ledger entries`}
              aria-pressed={effectiveActivityFilter === option.key}
              onClick={() => setActivityFilter(option.key)}
            >
              <Icon size={14} />
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>

      <section className={`history-feed${isLedgerView ? ' v16-ledger-pages' : ''}`} aria-label={isLedgerView ? 'Daily notebook pages' : 'Unified financial activity timeline'}>
        {!hasHistory ? (
          <MoneyOSEmptyState
            title={emptyStateCopy.title}
            detail={emptyStateCopy.detail}
            action={hasCustomLedgerFilter ? { label: 'Reset ledger', onClick: () => {
              setActivitySearch('')
              setActivityFilter('all')
            } } : { label: 'Add expense', onClick: openExpenseFromEmptyState }}
            secondaryAction={hasCustomLedgerFilter ? { label: 'Add expense', onClick: openExpenseFromEmptyState } : null}
            icon={CalendarDays}
          />
        ) : visibleGroups.map((group) => {
          const relatedNodes = relatedGroupsByDate.get(group.date) || []
          const pageMeta = formatLedgerNotebookPage(group.date)

          return (
            <article className={`history-day-group${isLedgerView ? ' v16-ledger-page v17-notebook-page' : ''}`} key={group.date}>
              <div className="history-day-heading">
                {isLedgerView ? (
                  <div className="v17-page-date-stack">
                    <span>{pageMeta.monthLabel}</span>
                    <strong>{pageMeta.dateLabel}</strong>
                    <small>{pageMeta.dayName}</small>
                  </div>
                ) : (
                  <div>
                    <span>{group.label}</span>
                    <strong>{group.items.length} move{group.items.length === 1 ? '' : 's'}</strong>
                  </div>
                )}
                <small>{group.outgoing > 0 ? `${shortRupees(group.outgoing)} out` : `${shortRupees(group.incoming || group.transfers)} ${group.incoming > 0 ? 'in' : 'shifted'}`}</small>
              </div>
              <div className="history-item-list">
                {relatedNodes.map((node) => (
                  node.kind === 'group' ? (
                    <MemoHistoryRelatedGroup
                      group={node}
                      isOpen={Boolean(expandedGroups[node.key])}
                      key={node.key}
                      onToggle={() => toggleRelatedGroup(node.key)}
                      getExpenseEditHandler={getExpenseEditHandler}
                    />
                  ) : (
                    <MemoHistoryItem
                      transaction={node.transaction}
                      key={node.key}
                      onEditExpense={getExpenseEditHandler(node.transaction)}
                    />
                  )
                ))}
              </div>
              {isLedgerView && (
                <>
                  <div className="v17-page-footer">
                    <span>{themeExperience.copy.pageFooter}</span>
                    <small>{group.items.length} line{group.items.length === 1 ? '' : 's'} written on {pageMeta.footerDate}</small>
                  </div>
                  <div className="v16-daily-total-row">
                    <span>Daily Total</span>
                    <strong>{group.outgoing > 0 ? `${rupees(group.outgoing)} out` : `${rupees(group.incoming || group.transfers || 0)} ${group.incoming > 0 ? 'in' : 'shifted'}`}</strong>
                  </div>
                </>
              )}
            </article>
          )
        })}
        {hasMoreHistory && (
          <button
            className="history-load-more"
            type="button"
            onClick={() => {
              setHistoryWindow((current) => {
                const currentCount = current.key === historyWindowKey ? current.count : HISTORY_GROUP_BATCH_SIZE
                return {
                  key: historyWindowKey,
                  count: currentCount + HISTORY_GROUP_BATCH_SIZE,
                }
              })
            }}
          >
            Show more activity
            <span>{Math.max(filteredGroups.length - visibleGroupCount, 0)} date groups left</span>
          </button>
        )}
      </section>

      {isLedgerView ? (
        <details className="ledger-secondary-details">
          <summary>
            <span>
              <strong>Month totals</strong>
              <small>Income, spending, and transfers for the selected month</small>
            </span>
            <StatusBadge>Summary</StatusBadge>
          </summary>
          <div className="ledger-secondary-stack">
            <section className="history-summary-grid" aria-label="Money activity summary">
              <HistorySummaryCard label="Earned" value={summary.incoming} tone="incoming" />
              <HistorySummaryCard label="Spent" value={summary.outgoing} tone="outgoing" />
              <HistorySummaryCard label="Shifted" value={summary.transfers} tone="transfer" />
            </section>
          </div>
        </details>
      ) : (
        <>
          <section className="history-summary-grid" aria-label="Money activity summary">
            <HistorySummaryCard label="Earned" value={summary.incoming} tone="incoming" />
            <HistorySummaryCard label="Spent" value={summary.outgoing} tone="outgoing" />
            <HistorySummaryCard label="Shifted" value={summary.transfers} tone="transfer" />
          </section>

          <CashflowStrip events={cashflowTimeline} />
        </>
      )}
    </>
  )
  const peopleToolsContent = (
    <>
      <MoneyBookPanel
        summary={moneyBookSummary}
        themeExperience={themeExperience}
        onAdd={openMoneyBookFromDiscovery}
        onDownloadSettlement={() => requestReportExport?.('settlement', { template: 'standard' })}
        onEdit={(entry) => setMoneyBookModalEntry(entry)}
        onToggleSettled={onToggleMoneyBookSettlement}
        onDelete={onDeleteMoneyBookEntry}
      />

      <SharedExpensesPanel
        groups={sharedGroups}
        profile={profile}
        sharedSummary={sharedSummary}
        addSharedGroup={addSharedGroup}
        addSharedPayment={addSharedPayment}
        markSharedSettlementReceived={markSharedSettlementReceived}
        removeSharedGroup={removeSharedGroup}
        onExportTripPdf={(groupId) => requestReportExport?.('trip', { groupId, template: 'standard' })}
        experienceCopy={themeExperience.copy}
        variant="activity"
      />
    </>
  )

  if (isLedgerView) {
    return (
      <section className="screen-content history-screen ledger-screen money-os">
        <div className="screen-heading">
          <div>
            <p className="eyebrow">Notebook</p>
            <h1>Ledger</h1>
          </div>
          <MonthSelector
            monthOptions={monthOptions}
            selectedMonthKey={selectedMonthKey}
            setSelectedMonthKey={setSelectedMonthKey}
          />
        </div>

        <article className="v17-month-notebook-banner" aria-label="Monthly notebook">
          <span>{themeExperience.copy.monthNotebook}</span>
          <strong>{selectedMonthLabel}</strong>
          <small>{filteredItemCount} line{filteredItemCount === 1 ? '' : 's'} in this notebook section.</small>
        </article>

        {ledgerDailySummaryContent}
        {activityTimelineContent}
      </section>
    )
  }

  return (
    <section className="screen-content history-screen">
      <div className="screen-heading">
        <div>
          {useLegacyPeople && <p className="eyebrow">Activity</p>}
          <h1>{useLegacyPeople ? 'Your money timeline' : 'People'}</h1>
        </div>
        <MonthSelector
          monthOptions={monthOptions}
          selectedMonthKey={selectedMonthKey}
          setSelectedMonthKey={setSelectedMonthKey}
        />
      </div>

      {useLegacyPeople ? (
        <>
          {activityTimelineContent}
          {peopleToolsContent}
        </>
      ) : (
        <>
          <PeopleHubPanel
            moneyBookSummary={moneyBookSummary}
            profile={profile}
            sharedGroups={sharedGroups}
            sharedSummary={sharedSummary}
            onAddMoneyBook={openMoneyBookFromDiscovery}
            onEditMoneyBook={(entry) => setMoneyBookModalEntry(entry)}
            onToggleMoneyBookSettlement={onToggleMoneyBookSettlement}
            onDeleteMoneyBookEntry={onDeleteMoneyBookEntry}
            markSharedSettlementReceived={markSharedSettlementReceived}
          >
            {peopleToolsContent}
          </PeopleHubPanel>
          <details className="money-os mos-people-secondary-details">
            <summary>
              <span>
                <strong>Recent Activity</strong>
              </span>
              <StatusBadge>History</StatusBadge>
            </summary>
            <div className="mos-people-secondary-stack">
              {activityTimelineContent}
            </div>
          </details>
        </>
      )}

      {moneyBookModalEntry && (
        <MoneyBookEntryModal
          entry={moneyBookModalEntry}
          onClose={closeMoneyBookModal}
          onSave={saveMoneyBookFromModal}
        />
      )}
    </section>
  )
}

function PeopleHubPanel({
  moneyBookSummary = {},
  profile = {},
  sharedGroups = [],
  sharedSummary = {},
  onAddMoneyBook,
  onEditMoneyBook,
  onToggleMoneyBookSettlement,
  onDeleteMoneyBookEntry,
  markSharedSettlementReceived,
  children,
}) {
  const [toolsOpen, setToolsOpen] = useState(false)
  const moneyBookEntries = moneyBookSummary.visibleEntries || []
  const reconciledGroups = useMemo(
    () => sharedGroups.map((group) => reconcileSharedGroup(group, profile)),
    [profile, sharedGroups],
  )
  const receivableEntries = moneyBookEntries.filter((entry) => entry.kind === 'given' && entry.status !== 'settled')
  const repayableEntries = moneyBookEntries.filter((entry) => entry.kind === 'taken' && entry.status !== 'settled')
  const sharedSettlementRows = useMemo(
    () => reconciledGroups.flatMap((group) =>
      (group.settlements || []).map((settlement) => ({
        id: `shared-${group.id}-${settlement.id}`,
        type: 'shared',
        group,
        settlement,
        date: settlementSortDate({ ...settlement, date: group.date }),
      }))),
    [reconciledGroups],
  )
  const incomingSharedSettlements = sharedSettlementRows.filter((item) =>
    item.settlement.direction === 'incoming' && normalizeMoney(item.settlement.remainingAmount) > 0)
  const outgoingSharedSettlements = sharedSettlementRows.filter((item) =>
    item.settlement.direction === 'outgoing' && normalizeMoney(item.settlement.remainingAmount) > 0)
  const groupsRequiringAction = reconciledGroups.filter((group) =>
    (group.settlements || []).some((settlement) => normalizeMoney(settlement.remainingAmount) > 0))
  const settledMoneyBookRows = moneyBookEntries
    .filter((entry) => entry.status === 'settled')
    .map((entry) => ({
      id: `money-book-settlement-${entry.id}`,
      type: 'money-book',
      entry,
      date: settlementSortDate(entry),
    }))
  const recentSettlementRows = [...sharedSettlementRows, ...settledMoneyBookRows]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 6)
  const totalToReceive = addMoney(moneyBookSummary.needToReceive || 0, sharedSummary.pendingRecoverable || 0)
  const totalToRepay = addMoney(moneyBookSummary.needToPay || 0, sharedSummary.pendingLiability || 0)
  const openSettlementCount = incomingSharedSettlements.length + outgoingSharedSettlements.length + (moneyBookSummary.pendingCount || 0)
  const hasPeopleData = moneyBookEntries.length > 0 || reconciledGroups.length > 0

  const openPeopleTools = useCallback((targetId) => {
    setToolsOpen(true)

    if (typeof window === 'undefined') {
      return
    }

    window.setTimeout(() => {
      const target = targetId ? document.getElementById(targetId) : document.getElementById('people-tools-section')
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })

      if (target && 'focus' in target) {
        target.focus()
      }
    }, 40)
  }, [])

  const openSharedGroupForm = useCallback(() => openPeopleTools('shared-group-name'), [openPeopleTools])
  const hasActivePeopleAction = totalToReceive > 0 || totalToRepay > 0 || groupsRequiringAction.length > 0
  const peoplePriority = totalToRepay > 0
    ? {
        label: 'To Repay',
        value: rupees(totalToRepay),
        detail: 'Pay next',
        icon: CreditCard,
        tone: 'warning',
      }
    : totalToReceive > 0
      ? {
          label: 'To Receive',
          value: rupees(totalToReceive),
          detail: 'Follow up',
          icon: Wallet,
          tone: 'success',
        }
      : groupsRequiringAction.length > 0
        ? {
            label: 'Shared Group',
            value: `${groupsRequiringAction.length} need${groupsRequiringAction.length === 1 ? 's' : ''} action`,
            detail: 'Review settlement',
            icon: User,
            tone: 'tint',
          }
        : null

  return (
    <section className="money-os money-os-people-hub" id="people-hub-section" aria-label="People">
      <SectionHeader
        title="People"
        actions={<StatusBadge tone={openSettlementCount > 0 ? 'warning' : 'success'}>{openSettlementCount > 0 ? `${openSettlementCount} due` : 'Settled'}</StatusBadge>}
      />

      {hasActivePeopleAction && peoplePriority ? (
        <div className="mos-people-priority-grid mos-people-priority-grid--single" aria-label="People money priority">
          <StatCard
            label={peoplePriority.label}
            value={peoplePriority.value}
            detail={peoplePriority.detail}
            icon={peoplePriority.icon}
            tone={peoplePriority.tone}
            animatedValue
          />
        </div>
      ) : (
        <MoneyCard
          className="mos-people-settled-card"
          title="Everything is settled."
          detail="No balances need action."
          icon={CheckCircle2}
          tone="success"
          actions={<StatusBadge tone="success">Settled</StatusBadge>}
        />
      )}

      <BorrowLendProgressLayer entries={moneyBookEntries} />

      <details className="money-os mos-people-secondary-details">
        <summary>
          <span>
            <strong>Balances</strong>
          </span>
          <StatusBadge>Review</StatusBadge>
        </summary>
        <div className="mos-people-secondary-stack">
      <PeoplePrioritySection
        title="To Receive"
        action={<StatusBadge tone={totalToReceive > 0 ? 'success' : 'neutral'}>{rupees(totalToReceive)}</StatusBadge>}
      >
        {receivableEntries.length === 0 && incomingSharedSettlements.length === 0 ? (
          <MoneyOSEmptyState
            title="No money to receive."
            detail="Add a borrow/lend entry when someone owes you money."
            icon={Wallet}
            action={{ label: 'Add borrow/lend', onClick: () => onAddMoneyBook?.('empty_state') }}
          />
        ) : (
          <>
            {receivableEntries.slice(0, 4).map((entry) => (
              <PeopleMoneyBookCard
                entry={entry}
                key={entry.id}
                onEdit={() => onEditMoneyBook?.(entry)}
                onToggleSettled={() => onToggleMoneyBookSettlement?.(entry.id)}
                onDelete={() => onDeleteMoneyBookEntry?.(entry.id)}
              />
            ))}
            {incomingSharedSettlements.slice(0, 4).map((item) => (
              <PeopleSettlementCard
                group={item.group}
                key={item.id}
                settlement={item.settlement}
                profile={profile}
                onSettle={() => markSharedSettlementReceived?.(item.group.id, item.settlement.id)}
              />
            ))}
          </>
        )}
      </PeoplePrioritySection>

      <PeoplePrioritySection
        title="To Repay"
        action={<StatusBadge tone={totalToRepay > 0 ? 'warning' : 'neutral'}>{rupees(totalToRepay)}</StatusBadge>}
      >
        {repayableEntries.length === 0 && outgoingSharedSettlements.length === 0 ? (
          <MoneyOSEmptyState
            title="No money to repay."
            detail="Add a borrow/lend entry when you need to repay someone."
            icon={CreditCard}
            action={{ label: 'Add borrow/lend', onClick: () => onAddMoneyBook?.('empty_state') }}
          />
        ) : (
          <>
            {repayableEntries.slice(0, 4).map((entry) => (
              <PeopleMoneyBookCard
                entry={entry}
                key={entry.id}
                onEdit={() => onEditMoneyBook?.(entry)}
                onToggleSettled={() => onToggleMoneyBookSettlement?.(entry.id)}
                onDelete={() => onDeleteMoneyBookEntry?.(entry.id)}
              />
            ))}
            {outgoingSharedSettlements.slice(0, 4).map((item) => (
              <PeopleSettlementCard
                group={item.group}
                key={item.id}
                settlement={item.settlement}
                profile={profile}
                onSettle={() => markSharedSettlementReceived?.(item.group.id, item.settlement.id)}
              />
            ))}
          </>
        )}
      </PeoplePrioritySection>

      <PeoplePrioritySection
        title="Shared Groups"
        action={<StatusBadge>{groupsRequiringAction.length || reconciledGroups.length} group{(groupsRequiringAction.length || reconciledGroups.length) === 1 ? '' : 's'}</StatusBadge>}
      >
        {reconciledGroups.length === 0 ? (
          <MoneyOSEmptyState
            title="Create your first trip."
            detail="Create a group when travel or shared costs need splitting."
            icon={User}
            action={{ label: 'Create trip', onClick: openSharedGroupForm }}
          />
        ) : (groupsRequiringAction.length > 0 ? groupsRequiringAction : reconciledGroups).slice(0, 4).map((group) => (
          <PeopleSharedGroupCard
            group={group}
            key={group.id}
            profile={profile}
            onManage={() => openPeopleTools('shared-expenses-section')}
          />
        ))}
      </PeoplePrioritySection>

      <PeoplePrioritySection
        title="Recent Settlements"
        action={<StatusBadge>{recentSettlementRows.length} item{recentSettlementRows.length === 1 ? '' : 's'}</StatusBadge>}
      >
        {recentSettlementRows.length === 0 ? (
          <MoneyOSEmptyState
            title="Everything is settled."
            detail="Settlements appear after you add shared expenses or borrow/lend entries."
            icon={CheckCircle2}
            action={{ label: 'Open shared expenses', onClick: () => openPeopleTools('shared-expenses-section') }}
          />
        ) : recentSettlementRows.map((item) => (
          item.type === 'money-book' ? (
            <PeopleMoneyBookCard
              entry={item.entry}
              key={item.id}
              onEdit={() => onEditMoneyBook?.(item.entry)}
              onToggleSettled={() => onToggleMoneyBookSettlement?.(item.entry.id)}
              onDelete={() => onDeleteMoneyBookEntry?.(item.entry.id)}
            />
          ) : (
            <PeopleSettlementCard
              group={item.group}
              key={item.id}
              settlement={item.settlement}
              profile={profile}
              onSettle={() => markSharedSettlementReceived?.(item.group.id, item.settlement.id)}
            />
          )
        ))}
      </PeoplePrioritySection>
        </div>
      </details>

      <details
        className="money-os mos-people-secondary-details"
        id="people-tools-section"
        open={toolsOpen}
        onToggle={(event) => setToolsOpen(event.currentTarget.open)}
      >
        <summary>
          <span>
            <strong>Add or manage</strong>
          </span>
          <StatusBadge>People Actions</StatusBadge>
        </summary>
        <div className="mos-people-secondary-stack">
          <div className="mos-people-action-grid" aria-label="People actions">
            <ActionCard
              title="Borrow / Lend"
              detail="Money given or taken"
              actionLabel="Add entry"
              icon={Wallet}
              tone="tint"
              onClick={() => onAddMoneyBook?.('people_hub')}
            />
            <ActionCard
              title="Trip group"
              detail="Trip, rent, food, or bill"
              actionLabel="Create trip"
              icon={User}
              tone="success"
              onClick={openSharedGroupForm}
            />
          </div>
          {hasPeopleData ? (
            <InsightCard
              title="Snapshot"
              insight={totalToReceive > totalToRepay
                ? 'Follow up on money to receive first.'
                : totalToRepay > 0
                  ? 'Repayments are the next focus.'
                  : 'No people balance needs action.'}
              icon={Sparkles}
              actions={<StatusBadge tone={totalToReceive >= totalToRepay ? 'success' : 'warning'}>{rupees(Math.max(totalToReceive, totalToRepay))}</StatusBadge>}
            />
          ) : (
            <MoneyOSEmptyState
              title="Everything is settled."
              detail="Add borrow/lend entries or create a trip group to get started."
              icon={User}
              action={{ label: 'Add borrow/lend', onClick: () => onAddMoneyBook?.('empty_state') }}
              secondaryAction={{ label: 'Create trip', onClick: openSharedGroupForm }}
            />
          )}
          {children}
        </div>
      </details>
    </section>
  )
}

function PeoplePrioritySection({ eyebrow = '', title, detail = '', action = null, children }) {
  return (
    <section className="mos-people-section">
      <SectionHeader eyebrow={eyebrow} title={title} detail={detail} actions={action} />
      <div className="mos-people-card-list">
        {children}
      </div>
    </section>
  )
}

function PeopleMoneyBookCard({ entry = {}, onEdit, onToggleSettled, onDelete }) {
  const isSettled = entry.status === 'settled'
  const isGiven = entry.kind === 'given'
  const due = moneyBookEntryDue(entry)
  const title = entry.person || 'Someone'
  const directionLabel = isGiven ? 'To receive' : 'To repay'
  const statusLabel = isSettled ? 'Settled' : directionLabel

  return (
    <MoneyCard
      className={`mos-people-row-card ${isGiven ? 'mos-people-row-card--receive' : 'mos-people-row-card--repay'} ${isSettled ? 'mos-people-row-card--settled' : ''}`}
      eyebrow="Borrow/Lend"
      title={title}
      detail={entry.note || (isGiven ? 'Money to receive' : 'Money to repay')}
      icon={isGiven ? Wallet : CreditCard}
      tone={isSettled ? 'success' : isGiven ? 'success' : 'warning'}
      actions={<StatusBadge tone={isSettled ? 'success' : isGiven ? 'success' : 'warning'}>{statusLabel}</StatusBadge>}
    >
      <div className="mos-people-money-row">
        <strong>{rupees(due)}</strong>
        <span>{isSettled ? `Settled ${formatPeopleDate(entry.settledAt || entry.updatedAt)}` : entry.dueDate ? `Due ${formatPeopleDate(entry.dueDate)}` : `Added ${formatPeopleDate(entry.date)}`}</span>
      </div>
      <div className="mos-people-inline-actions">
        <button className="text-action-button" type="button" onClick={onToggleSettled}>
          {isSettled ? 'Reopen' : 'Settle'}
        </button>
        <button className="icon-button mini-icon-button" type="button" aria-label={`Edit ${title}`} onClick={onEdit}>
          <Pencil size={14} />
        </button>
        <button className="icon-button mini-icon-button" type="button" aria-label={`Delete ${title}`} onClick={onDelete}>
          <Trash2 size={14} />
        </button>
      </div>
    </MoneyCard>
  )
}

function PeopleSharedGroupCard({ group = {}, profile = {}, onManage }) {
  const pendingAmount = addMoney(group.pendingRecoverable || 0, group.pendingLiability || 0)
  const isSettled = pendingAmount <= 0
  const people = group.people || []

  return (
    <MoneyCard
      className="mos-people-row-card mos-people-group-card"
      eyebrow="Shared Group"
      title={group.name || 'Shared group'}
      detail={`${group.payments?.length || 0} payment${group.payments?.length === 1 ? '' : 's'} across ${people.length} participant${people.length === 1 ? '' : 's'}`}
      icon={User}
      tone={isSettled ? 'success' : 'tint'}
      actions={<StatusBadge tone={isSettled ? 'success' : 'warning'}>{isSettled ? 'Settled' : `${rupees(pendingAmount)} open`}</StatusBadge>}
    >
      <div className="mos-people-group-metrics">
        <span>
          <small>Total shared</small>
          <strong>{rupees(group.amount || 0)}</strong>
        </span>
        <span>
          <small>Your share impact</small>
          <strong>{rupees(group.cashImpact || 0)}</strong>
        </span>
        <span>
          <small>To receive</small>
          <strong>{rupees(group.pendingRecoverable || 0)}</strong>
        </span>
      </div>
      <div className="mos-people-chip-row" aria-label={`${group.name || 'Shared group'} participants`}>
        {people.slice(0, 6).map((person) => (
          <StatusBadge key={person}>{displayPersonName(person, profile)}</StatusBadge>
        ))}
      </div>
      <div className="mos-people-inline-actions">
        <button className="text-action-button" type="button" onClick={onManage}>
          Manage group
        </button>
      </div>
    </MoneyCard>
  )
}

function PeopleSettlementCard({ group = {}, settlement = {}, profile = {}, onSettle }) {
  const isComplete = ['received', 'paid', 'settled'].includes(settlement.status) || normalizeMoney(settlement.remainingAmount) <= 0
  const amount = isComplete ? settlement.amount : settlement.remainingAmount || settlement.amount
  const isIncoming = settlement.direction === 'incoming'
  const isOutgoing = settlement.direction === 'outgoing'
  const from = displayPersonName(settlement.from, profile)
  const to = displayPersonName(settlement.to, profile)
  const title = isIncoming ? `${from} owes you` : isOutgoing ? `You owe ${to}` : `${from} pays ${to}`
  const actionLabel = isIncoming ? 'Mark received' : 'Mark paid'
  const statusLabel = isComplete
    ? settlement.status === 'received'
      ? 'Received'
      : 'Paid'
    : 'Pending'

  return (
    <MoneyCard
      className="mos-people-row-card mos-people-settlement-card"
      eyebrow={group.name || 'Shared settlement'}
      title={title}
      detail={`${group.name || 'Shared group'} settlement`}
      icon={Plane}
      tone={isComplete ? 'success' : isIncoming ? 'success' : isOutgoing ? 'warning' : 'neutral'}
      actions={<StatusBadge tone={isComplete ? 'success' : 'warning'}>{statusLabel}</StatusBadge>}
    >
      <div className="mos-people-money-row">
        <strong>{rupees(amount || 0)}</strong>
        <span>{isComplete ? `Settled ${formatPeopleDate(settlement.receivedAt)}` : 'Open settlement'}</span>
      </div>
      {!isComplete && (isIncoming || isOutgoing) && (
        <div className="mos-people-inline-actions">
          <button className="text-action-button" type="button" onClick={onSettle}>
            {actionLabel}
          </button>
        </div>
      )}
    </MoneyCard>
  )
}

function CashflowStrip({ events = [] }) {
  if (events.length === 0) {
    return (
      <section className="cashflow-strip empty" aria-label="Monthly cashflow timeline">
        <div>
          <p className="eyebrow">Money flow</p>
          <h2>Add income or expense to build cashflow</h2>
        </div>
        <span>Empty</span>
      </section>
    )
  }

  return (
    <section className="cashflow-strip" aria-label="Monthly cashflow timeline">
      <div className="cashflow-strip-header">
        <div>
          <p className="eyebrow">Money flow</p>
          <h2>This month in short</h2>
        </div>
        <span>{events.length} flow{events.length === 1 ? '' : 's'}</span>
      </div>
      <div className="cashflow-event-row">
        {events.map((event) => (
          <article className={`cashflow-event ${event.tone}`} key={event.id}>
            <span className="cashflow-dot" style={{ backgroundColor: event.color }} />
            <small>{event.label}</small>
            <strong>{event.tone === 'incoming' ? '+' : event.tone === 'outgoing' ? '-' : ''}{shortRupees(event.amount)}</strong>
            <p>{event.title}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function HistoryRelatedGroup({ group, isOpen, onToggle, getExpenseEditHandler }) {
  const amountPrefix = group.tone === 'incoming' ? '+' : group.tone === 'outgoing' ? '-' : ''

  return (
    <div className={`history-related-group ${group.tone}`}>
      <button className="history-related-header" type="button" onClick={onToggle} aria-expanded={isOpen}>
        <span className="history-related-chevron">
          <ChevronRight size={15} />
        </span>
        <div>
          <strong>{group.title}</strong>
          <small>{group.detail}</small>
        </div>
        <b>{amountPrefix}{shortRupees(group.amount)}</b>
      </button>
      {isOpen && (
        <div className="history-related-items">
          {group.items.map((transaction) => (
            <MemoHistoryItem
              transaction={transaction}
              key={transaction.id}
              onEditExpense={getExpenseEditHandler(transaction)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function MoneyBookPanel({ summary = {}, themeExperience = {}, onAdd, onDownloadSettlement, onEdit, onToggleSettled, onDelete }) {
  const entries = summary.visibleEntries || []
  const hasEntries = entries.length > 0

  return (
    <section className="money-book-panel" id="money-book-section" aria-label="Borrow/lend records">
      <div className="money-book-header">
        <div>
          <p className="eyebrow">Borrow/Lend</p>
          <h2>Borrow & lend</h2>
        </div>
        <div className="money-book-header-actions">
          <button className="ghost-button small-button" type="button" onClick={onDownloadSettlement}>
            <Download size={15} />
            Download settlement sheet
          </button>
          <button className="primary-button small-button" type="button" onClick={() => onAdd?.('header')}>
            <Plus size={15} />
            Add entry
          </button>
        </div>
      </div>

      <div className="money-book-summary-grid">
        <HistorySummaryCard label="You Gave" value={summary.totalGiven} tone="outgoing" />
        <HistorySummaryCard label="To Receive" value={summary.needToReceive} tone="incoming" />
        <HistorySummaryCard label="Borrowed" value={summary.totalBorrowed} tone="incoming" />
        <article className="history-summary-card transfer">
          <span>Pending</span>
          <AnimatedNumber as="strong" value={shortRupees(summary.pendingSettlements || 0)} />
          <small>{summary.pendingCount || 0} open</small>
        </article>
      </div>

      {!hasEntries ? (
        <MoneyOSEmptyState
          className="money-book-empty-state"
          title={themeExperience.copy?.emptyBorrowLend || 'No borrow/lend entries yet.'}
          detail="Record money given or taken when it needs a note."
          icon={Wallet}
          action={{ label: 'Add entry', onClick: () => onAdd?.('empty_state') }}
        />
      ) : (
        <div className="money-book-entry-list">
          {entries.slice(0, 5).map((entry) => (
            <MoneyBookEntryCard
              entry={entry}
              key={entry.id}
              onEdit={() => onEdit(entry)}
              onToggleSettled={() => onToggleSettled(entry.id)}
              onDelete={() => onDelete(entry.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function MoneyBookEntryCard({ entry, onEdit, onToggleSettled, onDelete }) {
  const isSettled = entry.status === 'settled'
  const isGiven = entry.kind === 'given'
  const due = moneyBookEntryDue(entry)

  return (
    <article className={`money-book-entry ${isSettled ? 'settled' : 'pending'} ${isGiven ? 'given' : 'taken'}`}>
      <div className="money-book-entry-main">
        <span className="money-book-direction">{isGiven ? 'Given' : 'Taken'}</span>
        <strong>{entry.person}</strong>
        <p>{entry.note || (isGiven ? 'Money to receive' : 'Money to repay')}</p>
      </div>
      <div className="money-book-entry-amount">
        <strong>{isGiven ? '-' : '+'}{rupees(entry.amount)}</strong>
        {entry.interest > 0 && <span>Vyaj {rupees(entry.interest)}</span>}
        <small>{isSettled ? 'Settled' : `${rupees(due)} pending${entry.dueDate ? ` by ${entry.dueDate}` : ''}`}</small>
      </div>
      <div className="money-book-entry-actions">
        <button className="ghost-button money-book-settle-button" type="button" onClick={onToggleSettled}>
          {isSettled ? 'Reopen' : 'Mark settled'}
        </button>
        <button className="icon-button mini-icon-button" type="button" aria-label={`Edit ${entry.person}`} onClick={onEdit}>
          <Pencil size={14} />
        </button>
        <button className="icon-button mini-icon-button" type="button" aria-label={`Delete ${entry.person}`} onClick={onDelete}>
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  )
}

function MoneyBookEntryModal({ entry = {}, onClose, onSave }) {
  const [kind, setKind] = useState(entry.kind === 'taken' ? 'taken' : 'given')
  const [person, setPerson] = useState(entry.person || '')
  const [amount, setAmount] = useState(entry.amount ? String(entry.amount) : '')
  const [date, setDate] = useState(entry.date || todayDateKey())
  const [dueDate, setDueDate] = useState(entry.dueDate || '')
  const [note, setNote] = useState(entry.note || '')
  const [interest, setInterest] = useState(entry.interest ? String(entry.interest) : '')
  const [errors, setErrors] = useState({})

  const clearError = useCallback((field) => {
    setErrors((current) => {
      if (!current[field]) {
        return current
      }

      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const submitEntry = useCallback((event) => {
    event.preventDefault()
    const form = event.currentTarget

    const fieldErrors = {}
    const parsedAmount = normalizeMoney(amount)
    const parsedInterest = normalizeMoney(interest)

    if (!String(person || '').trim()) {
      fieldErrors.person = 'Add a person name.'
    }

    if (!parsedAmount || parsedAmount <= 0) {
      fieldErrors.amount = 'Add a positive amount.'
    }

    if (!date) {
      fieldErrors.date = 'Choose a date.'
    }

    if (parsedInterest < 0) {
      fieldErrors.interest = 'Interest cannot be negative.'
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      focusInvalidField(form)
      return
    }

    const saved = onSave({
      ...entry,
      kind,
      person,
      amount: parsedAmount,
      date,
      dueDate,
      note,
      interest: parsedInterest,
      status: entry.status || 'pending',
      settledAt: entry.settledAt || '',
    })

    if (!saved) {
      setErrors({ form: 'Check the highlighted fields before saving.' })
      focusInvalidField(form)
    }
  }, [amount, date, dueDate, entry, interest, kind, note, onSave, person])

  return (
    <AppModal onClose={onClose} labelledBy="money-book-entry-title" sheetClassName="editor-sheet money-book-modal">
      <form className={`money-book-form ${Object.keys(errors).length > 0 ? 'form-has-errors' : ''}`} onSubmit={submitEntry}>
        <div className="editor-sheet-header">
          <div>
            <p className="eyebrow">Borrow/Lend</p>
            <h2 id="money-book-entry-title">{entry.id ? 'Edit udhar entry' : 'Add udhar entry'}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close borrow/lend form" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <div className="segmented-control money-book-kind-toggle" aria-label="Borrow/lend entry type">
          <button className={kind === 'given' ? 'active' : ''} type="button" onClick={() => setKind('given')}>
            Given
          </button>
          <button className={kind === 'taken' ? 'active' : ''} type="button" onClick={() => setKind('taken')}>
            Taken
          </button>
        </div>

        <div className="editor-sheet-body money-book-form-body">
          <label>
            <span className="input-label">Person Name</span>
            <input
              className={`plain-input ${errors.person ? 'field-invalid' : ''}`}
              type="text"
              value={person}
              placeholder="Rahul, Priya, Sam"
              onChange={(event) => {
                setPerson(event.target.value)
                clearError('person')
              }}
            />
            {errors.person && <small className="field-helper">{errors.person}</small>}
          </label>

          <CurrencyInput
            label="Amount"
            id="money-book-amount"
            value={amount}
            onChange={(value) => {
              setAmount(value)
              clearError('amount')
            }}
            error={errors.amount}
          />

          <label>
            <span className="input-label">Date</span>
            <input
              className={`plain-input ${errors.date ? 'field-invalid' : ''}`}
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value)
                clearError('date')
              }}
            />
            {errors.date && <small className="field-helper">{errors.date}</small>}
          </label>

          <CurrencyInput
            label="Interest / Vyaj"
            id="money-book-interest"
            value={interest}
            onChange={(value) => {
              setInterest(value)
              clearError('interest')
            }}
            error={errors.interest}
          />

          <label>
            <span className="input-label">Due Date</span>
            <input
              className="plain-input"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>

          <label>
            <span className="input-label">Note</span>
            <input
              className="plain-input"
              type="text"
              value={note}
              placeholder="Optional"
              onChange={(event) => setNote(event.target.value)}
            />
          </label>

          {errors.form && <p className="form-message">{errors.form}</p>}
        </div>

        <div className="editor-sheet-footer money-book-form-actions">
          <button className="ghost-button full" type="button" onClick={onClose}>
            Close
          </button>
          <button className="primary-button full" type="submit">
            Save entry
          </button>
        </div>
      </form>
    </AppModal>
  )
}

function HistorySummaryCard({ label, value = 0, tone }) {
  return (
    <article className={`history-summary-card ${tone}`}>
      <span>{label}</span>
      <AnimatedNumber as="strong" value={shortRupees(value)} />
    </article>
  )
}

function HistoryItemIcon({ transaction }) {
  if (transaction.sourceModule === 'Money Book') {
    return <Wallet size={17} />
  }

  if (transaction.sourceModule === 'Shared') {
    return <User size={17} />
  }

  if (transaction.sourceModule === 'Goals' || transaction.category === 'Savings') {
    return <PiggyBank size={17} />
  }

  if (transaction.sourceModule === 'Planner' || transaction.category === 'Planner') {
    return <Target size={17} />
  }

  if (transaction.source === 'commitment') {
    return <CreditCard size={17} />
  }

  if (transaction.tone === 'incoming') {
    return <Wallet size={17} />
  }

  return <Receipt size={17} />
}

function HistoryItem({ transaction, onEditExpense }) {
  const amountPrefix = transaction.tone === 'incoming' ? '+' : transaction.tone === 'outgoing' ? '-' : ''

  return (
    <div className={`history-item ${transaction.tone}`}>
      <span className="history-item-icon" style={{ color: transaction.color }}>
        <HistoryItemIcon transaction={transaction} />
      </span>
      <div className="history-item-main">
        <div>
          <strong>{transaction.title}</strong>
          <span>{activityVerb(transaction)}</span>
        </div>
        <p>{transaction.category}{transaction.note ? ` - ${transaction.note}` : ''}</p>
      </div>
      <div className="history-item-amount">
        <strong>{amountPrefix}{rupees(transaction.amount)}</strong>
        <span>{formatActivityTime(transaction.dateTime)}</span>
        {onEditExpense && (
          <button className="text-action-button history-edit-button" type="button" onClick={onEditExpense}>
            Edit
          </button>
        )}
      </div>
    </div>
  )
}

const MemoHistoryRelatedGroup = memo(HistoryRelatedGroup)
const MemoHistoryItem = memo(HistoryItem)
