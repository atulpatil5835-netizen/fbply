import { aggregateExpenses, categoryColor, normalizeSpendCategory } from './categoryIntelligence.js'
import { getTransactionTone } from './financeColors.js'
import { buildFinancialActivity, displayPersonName, isCurrentUserName } from './financialActivity.js'
import { addMoney, normalizeMoney } from './money.js'
import { normalizeCommitments } from './ruleEngine.js'

function safeAmount(value) {
  return normalizeMoney(value)
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function activeMonthKey(monthKey) {
  const clean = String(monthKey || '').slice(0, 7)
  return /^\d{4}-\d{2}$/.test(clean) ? clean : todayKey().slice(0, 7)
}

function monthStartKey(monthKey) {
  return `${activeMonthKey(monthKey)}-01`
}

function monthEndKey(monthKey) {
  const [year, month] = activeMonthKey(monthKey).split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
}

function daysInMonth(monthKey) {
  const [year, month] = activeMonthKey(monthKey).split('-').map(Number)
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function monthDateFromDay(monthKey, dueDay = 1) {
  const day = Math.min(Math.max(Number(dueDay || 1), 1), daysInMonth(monthKey))
  return `${activeMonthKey(monthKey)}-${String(day).padStart(2, '0')}`
}

function monthKeyFor(date) {
  const clean = String(date || '').slice(0, 7)
  return /^\d{4}-\d{2}$/.test(clean) ? clean : todayKey().slice(0, 7)
}

function isInMonth(date, monthKey) {
  return monthKeyFor(date) === activeMonthKey(monthKey)
}

function isOnOrBefore(date, compareDate) {
  const cleanDate = String(date || todayKey()).slice(0, 10)
  const cleanCompare = String(compareDate || todayKey()).slice(0, 10)
  return cleanDate <= cleanCompare
}

function isAfter(date, compareDate) {
  const cleanDate = String(date || '').slice(0, 10)
  const cleanCompare = String(compareDate || todayKey()).slice(0, 10)
  return Boolean(cleanDate) && cleanDate > cleanCompare
}

function dateTimeFor(date, fallbackHour = '12:00:00') {
  const cleanDate = String(date || todayKey()).slice(0, 10)
  return `${cleanDate}T${fallbackHour}`
}

function makeTransaction({
  id,
  title,
  amount,
  category = 'Other',
  date,
  dateTime,
  direction = 'outgoing',
  impactType = 'expense',
  sourceModule = 'Profile',
  source = 'manual',
  note = '',
  color,
  meta = {},
}) {
  const safeCategory = category || 'Other'
  const transactionDate = String(date || todayKey()).slice(0, 10)

  return {
    id,
    title: title || safeCategory,
    amount: safeAmount(amount),
    category: safeCategory,
    date: transactionDate,
    dateTime: dateTime || dateTimeFor(transactionDate),
    direction,
    impactType,
    tone: getTransactionTone(direction, impactType),
    source,
    sourceModule,
    note,
    color: color || categoryColor(safeCategory),
    meta,
  }
}

function transactionDateLabel(date) {
  const parsed = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return date || 'Recent'
  }

  const today = todayKey()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = yesterday.toISOString().slice(0, 10)

  if (date === today) {
    return 'Today'
  }

  if (date === yesterdayKey) {
    return 'Yesterday'
  }

  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: parsed.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}

function buildIncomeTransactions(profile = {}, monthKey) {
  const income = safeAmount(profile.income)

  if (!income) {
    return []
  }

  const incomeDate = monthStartKey(monthKey)

  return [
    makeTransaction({
      id: `income-${activeMonthKey(monthKey)}`,
      title: 'Monthly income',
      amount: income,
      category: 'Income',
      date: incomeDate,
      dateTime: dateTimeFor(incomeDate, '08:00:00'),
      direction: 'incoming',
      impactType: 'income',
      sourceModule: 'Profile',
      source: 'profile',
      note: profile.email ? `Profile income for ${profile.email}` : 'Profile income baseline',
    }),
  ]
}

function buildCommitmentTransactions(profile = {}, monthKey) {
  return normalizeCommitments(profile)
    .filter((item) => safeAmount(item.amount) > 0)
    .map((item, index) => {
      const normalized = normalizeSpendCategory({ category: item.name, note: item.name })
      const category = normalized.category === 'Other' ? 'Recurring' : normalized.category
      const commitmentDate = monthDateFromDay(monthKey, item.dueDay || 1)

      return makeTransaction({
        id: `commitment-${item.id || index}-${activeMonthKey(monthKey)}`,
        title: item.name || 'Monthly bill',
        amount: item.amount,
        category,
        date: commitmentDate,
        dateTime: dateTimeFor(commitmentDate, `08:${String(index + 10).padStart(2, '0')}:00`),
        direction: 'outgoing',
        impactType: 'expense',
        sourceModule: 'Profile',
        source: 'commitment',
        note: item.dueDay ? `Monthly bill due day ${item.dueDay}` : 'Monthly bill',
        meta: {
          commitmentId: item.id,
          recurrence: item.recurrence || 'monthly',
          dueDay: item.dueDay || 1,
        },
      })
    })
}

function buildExpenseTransactions(expenses = []) {
  return expenses
    .filter((expense) => safeAmount(expense.amount) > 0)
    .map((expense) => {
      const normalized = normalizeSpendCategory(expense)
      return makeTransaction({
        id: `expense-${expense.id}`,
        title: expense.label || expense.category || 'Expense',
        amount: expense.amount,
        category: normalized.category || expense.category || 'Other',
        date: expense.date,
        dateTime: expense.createdAt || dateTimeFor(expense.date, '18:00:00'),
        direction: 'outgoing',
        impactType: 'expense',
        sourceModule: expense.source === 'voice' ? 'Voice' : 'Profile',
        source: expense.source || 'manual',
        note: expense.note || '',
        color: normalized.color,
        meta: {
          expenseId: expense.id,
          type: expense.type || 'daily',
          originalCategory: expense.category,
        },
      })
    })
}

function buildSavingsTransactions(savingsBuckets = [], monthKey) {
  return savingsBuckets.flatMap((bucket, index) => {
    const transactions = []
    const saved = safeAmount(bucket.saved)
    const target = safeAmount(bucket.target)
    const monthlyContribution = safeAmount(bucket.monthlyContribution)

    if (saved > 0 && isInMonth(todayKey(), monthKey)) {
      transactions.push(makeTransaction({
        id: `bucket-${bucket.id || index}-saved-${activeMonthKey(monthKey)}`,
        title: `${bucket.name || 'Savings goal'} funding`,
        amount: saved,
        category: 'Savings',
        date: todayKey(),
        dateTime: dateTimeFor(todayKey(), `10:${String(index + 10).padStart(2, '0')}:00`),
        direction: 'neutral',
        impactType: 'transfer',
        sourceModule: 'Goals',
        source: 'savings-bucket',
        note: target > 0 ? `${Math.min(Math.round((saved / target) * 100), 100)}% funded` : 'Savings goal balance',
        meta: {
          target,
          bucketId: bucket.id,
        },
      }))
    }

    if (monthlyContribution > 0) {
      const contributionDate = monthDateFromDay(monthKey, bucket.dueDay || 1)
      transactions.push(makeTransaction({
        id: `bucket-recurring-${bucket.id || index}-${activeMonthKey(monthKey)}`,
        title: `${bucket.name || 'Savings goal'} monthly add`,
        amount: monthlyContribution,
        category: 'Savings',
        date: contributionDate,
        dateTime: dateTimeFor(contributionDate, `10:${String(index + 30).padStart(2, '0')}:00`),
        direction: 'neutral',
        impactType: 'transfer',
        sourceModule: 'Goals',
        source: 'recurring-savings',
        note: bucket.deadline ? `Recurring saving toward ${bucket.deadline}` : 'Recurring savings movement',
        meta: {
          target,
          bucketId: bucket.id,
          recurrence: 'monthly',
          dueDay: bucket.dueDay || 1,
          deadline: bucket.deadline || '',
        },
      }))
    }

    return transactions
  })
}

function buildPlannerTransactions(planner = {}) {
  const targetAmount = safeAmount(planner.targetAmount)
  const currentSavings = safeAmount(planner.currentSavings)

  if (!targetAmount && !currentSavings) {
    return []
  }

  const name = String(planner.label || planner.selectedPlan || 'Purchase plan').trim()
  const transactions = [
    makeTransaction({
      id: `planner-target-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'target'}`,
      title: `${name} plan`,
      amount: targetAmount,
      category: 'Planner',
      date: todayKey(),
      dateTime: dateTimeFor(todayKey(), '11:00:00'),
      direction: 'neutral',
      impactType: 'goal',
      sourceModule: 'Planner',
      source: 'planner',
      note: planner.timeline ? `Timeline: ${planner.timeline}` : 'Purchase target',
    }),
  ]

  if (currentSavings > 0) {
    transactions.push(makeTransaction({
      id: `planner-savings-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'target'}`,
      title: `${name} saved amount`,
      amount: currentSavings,
      category: 'Savings',
      date: todayKey(),
      dateTime: dateTimeFor(todayKey(), '11:05:00'),
      direction: 'neutral',
      impactType: 'transfer',
      sourceModule: 'Planner',
      source: 'planner',
      note: 'Current savings assigned to this plan',
    }))
  }

  return transactions.filter((item) => item.amount > 0)
}

function buildSharedTransactions(reconciledShared = [], profile = {}) {
  return reconciledShared.flatMap((group) => {
    const groupTransactions = []

    group.payments.forEach((payment, index) => {
      const paidByCurrentUser = isCurrentUserName(payment.paidBy, profile)
      groupTransactions.push(makeTransaction({
        id: `shared-payment-${payment.id}`,
        title: payment.label || group.name || 'Shared payment',
        amount: payment.amount,
        category: 'Shared',
        date: payment.date || group.date,
        dateTime: dateTimeFor(payment.date || group.date, `19:${String(index + 10).padStart(2, '0')}:00`),
        direction: paidByCurrentUser ? 'outgoing' : 'neutral',
        impactType: paidByCurrentUser ? 'expense' : 'shared',
        sourceModule: 'Shared',
        source: 'shared-payment',
        note: `${displayPersonName(payment.paidBy, profile)} paid in ${group.name || 'shared group'}`,
        meta: {
          groupId: group.id,
          groupName: group.name,
        },
      }))
    })

    group.settlements
      .filter((settlement) => safeAmount(settlement.settledAmount) > 0)
      .forEach((settlement, index) => {
        const isIncoming = settlement.direction === 'incoming'
        const isOutgoing = settlement.direction === 'outgoing'
        const amount = settlement.settledAmount || settlement.amount

        groupTransactions.push(makeTransaction({
          id: `shared-settlement-${settlement.id}`,
          title: isIncoming
            ? `${displayPersonName(settlement.from, profile)} paid you`
            : isOutgoing
              ? `You paid ${displayPersonName(settlement.to, profile)}`
              : 'Shared settlement',
          amount,
          category: 'Shared',
          date: settlement.receivedAt ? String(settlement.receivedAt).slice(0, 10) : group.date,
          dateTime: settlement.receivedAt || dateTimeFor(group.date, `20:${String(index + 10).padStart(2, '0')}:00`),
          direction: isIncoming ? 'incoming' : isOutgoing ? 'outgoing' : 'neutral',
          impactType: 'shared',
          sourceModule: 'Shared',
          source: 'shared-settlement',
          note: `${group.name || 'Shared group'} settlement`,
          meta: {
            groupId: group.id,
            status: settlement.status,
          },
        }))
      })

    return groupTransactions
  })
}

function normalizeMoneyBookEntry(entry = {}, index = 0) {
  const kind = entry.kind === 'taken' || entry.type === 'taken' || entry.direction === 'taken' ? 'taken' : 'given'
  const date = String(entry.date || entry.createdAt || todayKey()).slice(0, 10)
  const status = entry.status === 'settled' || entry.status === 'completed' ? 'settled' : 'pending'
  const settledAt = entry.settledAt || entry.completedAt || entry.receivedAt || ''
  const dueDate = String(entry.dueDate || entry.due || '').slice(0, 10)

  return {
    id: entry.id || `money-book-${date}-${index}`,
    kind,
    person: String(entry.person || entry.name || entry.borrower || entry.lender || '').trim(),
    amount: safeAmount(entry.amount),
    interest: safeAmount(entry.interest || entry.vyaj),
    date,
    note: String(entry.note || '').trim(),
    status,
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : '',
    createdAt: entry.createdAt || dateTimeFor(date, '12:00:00'),
    updatedAt: entry.updatedAt || entry.createdAt || dateTimeFor(date, '12:00:00'),
    settledAt: status === 'settled' ? settledAt || dateTimeFor(date, '20:00:00') : '',
  }
}

function moneyBookDue(entry) {
  return addMoney(entry.amount, entry.interest)
}

function isMoneyBookPendingAt(entry, monthKey) {
  const endDate = monthEndKey(monthKey)

  if (!isOnOrBefore(entry.date, endDate)) {
    return false
  }

  if (entry.status !== 'settled') {
    return true
  }

  return isAfter(entry.settledAt, endDate)
}

function isMoneyBookRelevantForMonth(entry, monthKey) {
  return isInMonth(entry.date, monthKey) ||
    (entry.settledAt && isInMonth(entry.settledAt, monthKey)) ||
    isMoneyBookPendingAt(entry, monthKey)
}

function buildMoneyBookTransactions(moneyBookEntries = [], monthKey) {
  const selectedMonthKey = monthKey ? activeMonthKey(monthKey) : ''

  return moneyBookEntries.flatMap((rawEntry, index) => {
    const entry = normalizeMoneyBookEntry(rawEntry, index)
    const due = moneyBookDue(entry)

    if (!entry.person || !entry.amount) {
      return []
    }

    const entryIsInMonth = !selectedMonthKey || monthKeyFor(entry.date) === selectedMonthKey
    const settlementIsInMonth = entry.settledAt && (!selectedMonthKey || monthKeyFor(entry.settledAt) === selectedMonthKey)

    if (!entryIsInMonth && !settlementIsInMonth) {
      return []
    }

    const transactions = []

    if (entryIsInMonth) {
      transactions.push(makeTransaction({
        id: `money-book-${entry.kind}-${entry.id}`,
        title: entry.kind === 'given' ? `Given to ${entry.person}` : `Taken from ${entry.person}`,
        amount: entry.amount,
        category: entry.kind === 'given' ? 'Lending' : 'Borrowed',
        date: entry.date,
        dateTime: entry.createdAt || dateTimeFor(entry.date, entry.kind === 'given' ? '15:00:00' : '15:05:00'),
        direction: entry.kind === 'given' ? 'outgoing' : 'incoming',
        impactType: entry.kind === 'given' ? 'lend_given' : 'borrow_taken',
        sourceModule: 'Money Book',
        source: 'money-book',
        note: entry.note || (entry.kind === 'given' ? 'Money given' : 'Money borrowed'),
        meta: {
          moneyBookId: entry.id,
          status: entry.status,
          interest: entry.interest,
          dueDate: entry.dueDate,
        },
      }))
    }

    if (entry.status === 'settled' && settlementIsInMonth && due > 0) {
      const settledDate = String(entry.settledAt).slice(0, 10)
      transactions.push(makeTransaction({
        id: `money-book-settlement-${entry.id}`,
        title: entry.kind === 'given' ? `${entry.person} repaid you` : `Repaid ${entry.person}`,
        amount: due,
        category: entry.kind === 'given' ? 'Lending' : 'Borrowed',
        date: settledDate,
        dateTime: entry.settledAt || dateTimeFor(settledDate, '20:00:00'),
        direction: entry.kind === 'given' ? 'incoming' : 'outgoing',
        impactType: entry.kind === 'given' ? 'lend_received' : 'repayment',
        sourceModule: 'Money Book',
        source: 'money-book-settlement',
        note: entry.interest > 0 ? `Includes ${entry.interest} interest` : 'Marked settled',
        meta: {
          moneyBookId: entry.id,
          status: entry.status,
          interest: entry.interest,
          dueDate: entry.dueDate,
        },
      }))
    }

    return transactions
  })
}

function buildMoneyBookCalculationEntries(moneyBookEntries = [], monthKey) {
  return moneyBookEntries
    .map(normalizeMoneyBookEntry)
    .filter((entry) => entry.amount > 0 && entry.person)
    .flatMap((entry) => {
      if (entry.kind === 'given' && isMoneyBookPendingAt(entry, monthKey)) {
        return [{
          id: `money-book-active-${entry.id}`,
          category: 'Money Book',
          label: `${entry.person} receivable`,
          amount: entry.amount,
          note: entry.interest > 0 ? `Pending recovery with ${entry.interest} interest` : 'Pending recovery',
          type: 'money-book',
          date: entry.date,
          source: 'money-book',
          moneyBookId: entry.id,
        }]
      }

      if (entry.kind === 'taken' && entry.status === 'settled' && isInMonth(entry.settledAt, monthKey)) {
        return [{
          id: `money-book-repayment-active-${entry.id}`,
          category: 'Money Book',
          label: `Repaid ${entry.person}`,
          amount: moneyBookDue(entry),
          note: entry.interest > 0 ? `Repayment includes ${entry.interest} interest` : 'Borrowed money repaid',
          type: 'money-book',
          date: String(entry.settledAt).slice(0, 10),
          source: 'money-book',
          moneyBookId: entry.id,
        }]
      }

      return []
    })
}

function buildMoneyBookSummary(moneyBookEntries = [], monthKey) {
  const summary = {
    totalGiven: 0,
    needToReceive: 0,
    totalBorrowed: 0,
    needToPay: 0,
    pendingSettlements: 0,
    pendingCount: 0,
    settledThisMonth: 0,
    visibleEntries: [],
  }
  const normalized = moneyBookEntries.map(normalizeMoneyBookEntry)

  normalized.forEach((entry) => {
    if (!entry.amount || !entry.person) {
      return
    }

    if (isMoneyBookRelevantForMonth(entry, monthKey)) {
      summary.visibleEntries.push(entry)
    }

    const due = moneyBookDue(entry)
    const pendingAtMonthEnd = isMoneyBookPendingAt(entry, monthKey)

    if (entry.kind === 'given' && isInMonth(entry.date, monthKey)) {
      summary.totalGiven = addMoney(summary.totalGiven, entry.amount)
    }

    if (entry.kind === 'taken' && isInMonth(entry.date, monthKey)) {
      summary.totalBorrowed = addMoney(summary.totalBorrowed, entry.amount)
    }

    if (entry.status === 'settled' && entry.settledAt && isInMonth(entry.settledAt, monthKey)) {
      summary.settledThisMonth = addMoney(summary.settledThisMonth, due)
    }

    if (pendingAtMonthEnd) {
      summary.pendingCount += 1
      summary.pendingSettlements = addMoney(summary.pendingSettlements, due)

      if (entry.kind === 'given') {
        summary.needToReceive = addMoney(summary.needToReceive, due)
      } else {
        summary.needToPay = addMoney(summary.needToPay, due)
      }
    }
  })

  summary.visibleEntries.sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))

  return summary
}

function dedupeTransactions(transactions) {
  const byId = new Map()

  transactions.forEach((transaction) => {
    if (!transaction.id || transaction.amount <= 0) {
      return
    }

    byId.set(transaction.id, transaction)
  })

  return Array.from(byId.values())
}

export function groupTransactionsByDate(transactions = []) {
  const groups = new Map()

  transactions.forEach((transaction) => {
    const key = transaction.date || todayKey()
    const group = groups.get(key) || {
      date: key,
      label: transactionDateLabel(key),
      items: [],
      incoming: 0,
      outgoing: 0,
      transfers: 0,
    }

    group.items.push(transaction)

    if (transaction.tone === 'incoming') {
      group.incoming = addMoney(group.incoming, transaction.amount)
    } else if (transaction.tone === 'outgoing') {
      group.outgoing = addMoney(group.outgoing, transaction.amount)
    } else if (transaction.tone === 'transfer') {
      group.transfers = addMoney(group.transfers, transaction.amount)
    }

    groups.set(key, group)
  })

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => String(b.dateTime).localeCompare(String(a.dateTime))),
    }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

export function buildTransactionSummary(transactions = []) {
  return transactions.reduce((summary, transaction) => {
    if (transaction.tone === 'incoming') {
      summary.incoming = addMoney(summary.incoming, transaction.amount)
    } else if (transaction.tone === 'outgoing') {
      summary.outgoing = addMoney(summary.outgoing, transaction.amount)
    } else if (transaction.tone === 'transfer') {
      summary.transfers = addMoney(summary.transfers, transaction.amount)
    }

    summary.count += 1
    return summary
  }, {
    incoming: 0,
    outgoing: 0,
    transfers: 0,
    count: 0,
  })
}

export function buildUnifiedFinanceEngine({
  profile = {},
  expenses = [],
  savingsBuckets = [],
  sharedGroups = [],
  moneyBookEntries = [],
  planner = {},
  monthKey,
} = {}) {
  const selectedMonthKey = activeMonthKey(monthKey)
  const isSelectedMonth = (date) => monthKeyFor(date) === selectedMonthKey
  const monthExpenses = expenses.filter((expense) => isSelectedMonth(expense.date || expense.createdAt))
  const activity = buildFinancialActivity({ expenses: monthExpenses, sharedGroups, profile })
  const moneyBookCalculationEntries = buildMoneyBookCalculationEntries(moneyBookEntries, selectedMonthKey)
  const calculationEntries = [...activity.entries, ...moneyBookCalculationEntries]
  const transactions = dedupeTransactions([
    ...buildIncomeTransactions(profile, selectedMonthKey),
    ...buildCommitmentTransactions(profile, selectedMonthKey),
    ...buildExpenseTransactions(monthExpenses),
    ...buildSharedTransactions(activity.sharedGroups, profile),
    ...buildSavingsTransactions(savingsBuckets, selectedMonthKey),
    ...buildPlannerTransactions(planner),
    ...buildMoneyBookTransactions(moneyBookEntries, selectedMonthKey),
  ])
    .filter((transaction) => isSelectedMonth(transaction.date))
    .sort((a, b) => String(b.dateTime).localeCompare(String(a.dateTime)))
  const historyGroups = groupTransactionsByDate(transactions)
  const transactionSummary = buildTransactionSummary(transactions)
  const spending = aggregateExpenses(calculationEntries)
  const moneyBookSummary = buildMoneyBookSummary(moneyBookEntries, selectedMonthKey)

  return {
    ...activity,
    entries: calculationEntries,
    transactions,
    historyGroups,
    transactionSummary,
    moneyBookSummary,
    spending,
    calculationEntries,
    monthKey: selectedMonthKey,
  }
}
