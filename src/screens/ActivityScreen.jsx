import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronRight,
  CreditCard,
  Pencil,
  PiggyBank,
  Plane,
  Plus,
  Receipt,
  Target,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { AppModal, CurrencyInput, EmptyState } from '../components/AppPrimitives.jsx'
import { buildRelatedTransactionGroups } from '../lib/financeIntelligence'
import { addMoney, normalizeMoney, sumMoney } from '../lib/money'
import { rupees, shortRupees } from '../lib/ruleEngine'
import { focusInvalidField } from '../lib/uiHelpers'
import SharedExpensesPanel from './SharedExpenseScreen.jsx'
import { trackEvent } from '../lib/analytics'

const HISTORY_GROUP_BATCH_SIZE = 12

function todayDateKey() {
  return new Date().toISOString().slice(0, 10)
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

const activityFilterOptions = [
  { key: 'all', label: 'All', icon: CalendarDays },
  { key: 'expense', label: 'Expense', icon: Receipt },
  { key: 'income', label: 'Income', icon: Wallet },
  { key: 'borrow', label: 'Borrow', icon: CreditCard },
  { key: 'transfer', label: 'Transfer', icon: PiggyBank },
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

function filterActivityGroup(group = {}, filter = 'all') {
  const items = (group.items || []).filter((transaction) => matchesActivityFilter(transaction, filter))

  return {
    ...group,
    items,
    incoming: sumMoney(items.filter((transaction) => transaction.tone === 'incoming'), (transaction) => transaction.amount),
    outgoing: sumMoney(items.filter((transaction) => transaction.tone === 'outgoing'), (transaction) => transaction.amount),
    transfers: sumMoney(items.filter((transaction) => transaction.tone === 'transfer'), (transaction) => transaction.amount),
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
}) {
  const [moneyBookModalEntry, setMoneyBookModalEntry] = useState(null)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [activityFilter, setActivityFilter] = useState('all')
  const [historyWindow, setHistoryWindow] = useState({ key: '', count: HISTORY_GROUP_BATCH_SIZE })
  const deferredGroups = useDeferredValue(groups)
  const filteredGroups = useMemo(
    () => deferredGroups
      .map((group) => filterActivityGroup(group, activityFilter))
      .filter((group) => group.items.length > 0),
    [activityFilter, deferredGroups],
  )
  const historyWindowKey = `${selectedMonthKey}-${activityFilter}-${filteredGroups.length}`
  const visibleGroupCount = historyWindow.key === historyWindowKey ? historyWindow.count : HISTORY_GROUP_BATCH_SIZE
  const visibleGroups = useMemo(
    () => filteredGroups.slice(0, visibleGroupCount),
    [filteredGroups, visibleGroupCount],
  )
  const hasMoreHistory = visibleGroupCount < filteredGroups.length
  const hasHistory = filteredGroups.some((group) => group.items.length > 0)
  const expensesById = useMemo(
    () => new Map(expenses.map((expense) => [String(expense.id), expense])),
    [expenses],
  )
  const relatedGroupsByDate = useMemo(
    () => new Map(visibleGroups.map((group) => [group.date, buildRelatedTransactionGroups(group.items)])),
    [visibleGroups],
  )

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
      empty_state: activityFilter === 'all' ? 'activity_timeline' : `${activityFilter}_timeline`,
      target: 'add_expense',
    })
    openAddSheet?.('expense')
  }, [activityFilter, openAddSheet])
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

  return (
    <section className="screen-content history-screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">Activity</p>
          <h1>Your money timeline</h1>
        </div>
        <MonthSelector
          monthOptions={monthOptions}
          selectedMonthKey={selectedMonthKey}
          setSelectedMonthKey={setSelectedMonthKey}
        />
      </div>

      <div className="activity-filter-row" aria-label="Activity filters">
        {activityFilterOptions.map((option) => {
          const Icon = option.icon

          return (
            <button
              className={activityFilter === option.key ? 'active' : ''}
              key={option.key}
              type="button"
              aria-pressed={activityFilter === option.key}
              onClick={() => setActivityFilter(option.key)}
            >
              <Icon size={14} />
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>

      <section className="history-feed" aria-label="Unified financial activity timeline">
        {!hasHistory ? (
          <EmptyState
            title={activityFilter === 'all' ? 'Track your first spending move' : `No ${activityFilter} activity yet`}
            detail="Add one expense to start the timeline. Income, goals, trips, and borrow/lend activity will appear as they are added."
            actionLabel="Add expense"
            onAction={openExpenseFromEmptyState}
            icon={CalendarDays}
          />
        ) : visibleGroups.map((group) => {
          const relatedNodes = relatedGroupsByDate.get(group.date) || []

          return (
            <article className="history-day-group" key={group.date}>
              <div className="history-day-heading">
                <div>
                  <span>{group.label}</span>
                  <strong>{group.items.length} move{group.items.length === 1 ? '' : 's'}</strong>
                </div>
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

      <section className="history-summary-grid" aria-label="Money activity summary">
        <HistorySummaryCard label="Earned" value={summary.incoming} tone="incoming" />
        <HistorySummaryCard label="Spent" value={summary.outgoing} tone="outgoing" />
        <HistorySummaryCard label="Shifted" value={summary.transfers} tone="transfer" />
      </section>

      <CashflowStrip events={cashflowTimeline} />

      <MoneyBookPanel
        summary={moneyBookSummary}
        onAdd={openMoneyBookFromDiscovery}
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
        variant="activity"
      />

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

function MoneyBookPanel({ summary = {}, onAdd, onEdit, onToggleSettled, onDelete }) {
  const entries = summary.visibleEntries || []
  const hasEntries = entries.length > 0

  return (
    <section className="money-book-panel" id="money-book-section" aria-label="Money Book">
      <div className="money-book-header">
        <div>
          <p className="eyebrow">Money Book</p>
          <h2>Borrow & lend</h2>
        </div>
        <button className="primary-button small-button" type="button" onClick={() => onAdd?.('header')}>
          <Plus size={15} />
          Add Entry
        </button>
      </div>

      <div className="money-book-summary-grid">
        <HistorySummaryCard label="You Gave" value={summary.totalGiven} tone="outgoing" />
        <HistorySummaryCard label="To Receive" value={summary.needToReceive} tone="incoming" />
        <HistorySummaryCard label="Borrowed" value={summary.totalBorrowed} tone="incoming" />
        <article className="history-summary-card transfer">
          <span>Pending</span>
          <strong>{shortRupees(summary.pendingSettlements || 0)}</strong>
          <small>{summary.pendingCount || 0} open</small>
        </article>
      </div>

      {!hasEntries ? (
        <button className="money-book-empty" type="button" onClick={() => onAdd?.('empty_state')}>
          <span className="soft-icon">
            <Wallet size={17} />
          </span>
          <span>
            <strong>Track your first borrow/lend entry</strong>
            <small>Add money given or taken so pending settlements stay visible.</small>
          </span>
        </button>
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
        <button className="text-action-button" type="button" onClick={onToggleSettled}>
          {isSettled ? 'Reopen' : 'Settle'}
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
            <p className="eyebrow">Money Book</p>
            <h2 id="money-book-entry-title">{entry.id ? 'Edit udhar entry' : 'Add udhar entry'}</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close money book form" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <div className="segmented-control money-book-kind-toggle" aria-label="Money book entry type">
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
            Cancel
          </button>
          <button className="primary-button full" type="submit">
            Save
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
      <strong>{shortRupees(value)}</strong>
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
