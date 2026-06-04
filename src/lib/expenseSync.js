import { normalizeMoney } from './money'
import { safeStorageGet, safeStorageSet } from './storage'

export const EXPENSE_SYNC_TABLE = 'expenses'
export const EXPENSE_SYNC_VERSION = 'v1'
export const EXPENSE_SYNC_COLUMNS = 'id, user_id, type, amount, category, merchant, note, date, created_at, updated_at, deleted_at'

function expenseMigrationKey(userId) {
  return `fbply-expense-sync-${EXPENSE_SYNC_VERSION}-${userId}`
}

function expenseQueueKey(userId) {
  return `fbply-expense-sync-queue-${EXPENSE_SYNC_VERSION}-${userId}`
}

function parseExpenseId(value) {
  const clean = String(value || '').trim()
  return /^\d+$/.test(clean) ? Number(clean) : clean
}

function cleanDateKey(value) {
  const clean = String(value || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : new Date().toISOString().slice(0, 10)
}

function cleanText(value) {
  return String(value || '').trim()
}

function readQueue(userId) {
  if (!userId) {
    return []
  }

  try {
    const parsed = JSON.parse(safeStorageGet(expenseQueueKey(userId), '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(userId, queue) {
  if (!userId) {
    return
  }

  safeStorageSet(expenseQueueKey(userId), JSON.stringify(Array.isArray(queue) ? queue : []))
}

export function hasExpenseMigrationRun(userId) {
  return Boolean(userId) && safeStorageGet(expenseMigrationKey(userId), 'false') === 'true'
}

export function markExpenseMigrationRun(userId) {
  if (!userId) {
    return
  }

  safeStorageSet(expenseMigrationKey(userId), 'true')
}

export function readExpenseSyncQueue(userId) {
  return readQueue(userId)
}

export function appendExpenseSyncQueue(userId, operations = []) {
  const nextOperations = (Array.isArray(operations) ? operations : [operations]).filter(Boolean)

  if (!userId || nextOperations.length === 0) {
    return
  }

  writeQueue(userId, [...readQueue(userId), ...nextOperations])
}

export function clearExpenseSyncQueue(userId) {
  writeQueue(userId, [])
}

export function normalizeExpenseRecord(expense = {}) {
  const id = expense.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const merchant = cleanText(expense.merchant || expense.label || expense.category || 'Expense')
  const category = cleanText(expense.category) || 'Other'
  const type = cleanText(expense.type) || 'daily'
  const date = cleanDateKey(expense.date || expense.createdAt)
  const amount = normalizeMoney(expense.amount)

  return {
    ...expense,
    id,
    label: cleanText(expense.label || merchant || category),
    merchant,
    category,
    amount,
    note: cleanText(expense.note),
    type,
    date,
    createdAt: expense.createdAt || `${date}T12:00:00`,
  }
}

export function normalizeExpenseRecords(expenses = []) {
  const byId = new Map()

  ;(Array.isArray(expenses) ? expenses : []).forEach((expense, index) => {
    const normalized = normalizeExpenseRecord(expense)

    if (!normalized.id || normalized.amount <= 0 || normalized.deletedAt || normalized.deleted_at) {
      return
    }

    const baseId = String(normalized.id)
    const id = byId.has(baseId) ? `${baseId}-${index}` : baseId
    byId.set(id, {
      ...normalized,
      id,
    })
  })

  return Array.from(byId.values()).sort((first, second) => {
    const firstTime = first.createdAt || `${first.date}T12:00:00`
    const secondTime = second.createdAt || `${second.date}T12:00:00`
    return String(secondTime).localeCompare(String(firstTime))
  })
}

export function expenseToCloudPayload(user, expense = {}) {
  const normalized = normalizeExpenseRecord(expense)

  return {
    id: String(normalized.id),
    user_id: user.id,
    type: normalized.type,
    amount: normalized.amount,
    category: normalized.category,
    merchant: normalized.merchant || null,
    note: normalized.note || null,
    date: normalized.date,
    created_at: normalized.createdAt || new Date().toISOString(),
    deleted_at: null,
  }
}

export function cloudRowToExpense(row = {}) {
  const merchant = cleanText(row.merchant || row.category || 'Expense')
  const date = cleanDateKey(row.date || row.created_at)

  return {
    id: parseExpenseId(row.id),
    label: merchant,
    merchant,
    category: cleanText(row.category) || 'Other',
    amount: normalizeMoney(row.amount),
    note: cleanText(row.note),
    type: cleanText(row.type) || 'daily',
    date,
    createdAt: row.created_at || `${date}T12:00:00`,
    updatedAt: row.updated_at || '',
  }
}

export function cloudRowsToExpenses(rows = []) {
  return normalizeExpenseRecords(
    (Array.isArray(rows) ? rows : [])
      .filter((row) => !row.deleted_at)
      .map(cloudRowToExpense),
  )
}

export function expenseSyncFingerprint(expense = {}) {
  const normalized = normalizeExpenseRecord(expense)
  return JSON.stringify({
    id: String(normalized.id),
    type: normalized.type,
    amount: normalized.amount,
    category: normalized.category,
    merchant: normalized.merchant,
    note: normalized.note,
    date: normalized.date,
    createdAt: normalized.createdAt,
  })
}

export function diffExpenseRecords(previous = [], next = []) {
  const previousById = new Map(normalizeExpenseRecords(previous).map((expense) => [String(expense.id), expense]))
  const nextById = new Map(normalizeExpenseRecords(next).map((expense) => [String(expense.id), expense]))
  const upserts = []
  const deletes = []

  nextById.forEach((expense, id) => {
    const previousExpense = previousById.get(id)

    if (!previousExpense || expenseSyncFingerprint(previousExpense) !== expenseSyncFingerprint(expense)) {
      upserts.push(expense)
    }
  })

  previousById.forEach((expense, id) => {
    if (!nextById.has(id)) {
      deletes.push(expense)
    }
  })

  return { upserts, deletes }
}

export async function loadCloudExpenses(supabase, userId) {
  const { data, error } = await supabase
    .from(EXPENSE_SYNC_TABLE)
    .select(EXPENSE_SYNC_COLUMNS)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return cloudRowsToExpenses(data || [])
}

export async function saveCloudExpenses(supabase, user, expenses = []) {
  const payloads = normalizeExpenseRecords(expenses).map((expense) => expenseToCloudPayload(user, expense))

  if (payloads.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from(EXPENSE_SYNC_TABLE)
    .upsert(payloads, { onConflict: 'user_id,id' })
    .select(EXPENSE_SYNC_COLUMNS)

  if (error) {
    throw error
  }

  return data || []
}

export async function softDeleteCloudExpenses(supabase, userId, expenses = []) {
  const ids = normalizeExpenseRecords(expenses).map((expense) => String(expense.id))

  if (ids.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from(EXPENSE_SYNC_TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('id', ids)
    .select(EXPENSE_SYNC_COLUMNS)

  if (error) {
    throw error
  }

  return data || []
}

export function buildExpenseSyncOperations(user, { upserts = [], deletes = [] } = {}) {
  const operations = []

  if (upserts.length > 0) {
    operations.push({
      kind: 'upsert',
      records: normalizeExpenseRecords(upserts).map((expense) => expenseToCloudPayload(user, expense)),
      queuedAt: new Date().toISOString(),
    })
  }

  if (deletes.length > 0) {
    operations.push({
      kind: 'delete',
      ids: normalizeExpenseRecords(deletes).map((expense) => String(expense.id)),
      queuedAt: new Date().toISOString(),
    })
  }

  return operations
}

export async function applyExpenseSyncOperations(supabase, user, operations = []) {
  const safeOperations = (Array.isArray(operations) ? operations : []).filter(Boolean)

  for (const operation of safeOperations) {
    if (operation.kind === 'upsert' && Array.isArray(operation.records) && operation.records.length > 0) {
      const { error } = await supabase
        .from(EXPENSE_SYNC_TABLE)
        .upsert(operation.records, { onConflict: 'user_id,id' })

      if (error) {
        throw error
      }
    }

    if (operation.kind === 'delete' && Array.isArray(operation.ids) && operation.ids.length > 0) {
      const { error } = await supabase
        .from(EXPENSE_SYNC_TABLE)
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('id', operation.ids)

      if (error) {
        throw error
      }
    }
  }
}
