import { normalizeMoney } from './money'
import { safeStorageGet, safeStorageSet } from './storage'

export const MONEY_BOOK_SYNC_TABLE = 'user_money_book'
export const MONEY_BOOK_SYNC_VERSION = 'v1'
export const MONEY_BOOK_SYNC_COLUMNS =
  'id, user_id, kind, person, amount, interest, entry_date, note, status, due_date, settled_at, position, created_at, updated_at, deleted_at'

function moneyBookMigrationKey(userId) {
  return `fbply-money-book-sync-${MONEY_BOOK_SYNC_VERSION}-${userId}`
}

function moneyBookQueueKey(userId) {
  return `fbply-money-book-sync-queue-${MONEY_BOOK_SYNC_VERSION}-${userId}`
}

function todayDateKey() {
  return new Date().toISOString().slice(0, 10)
}

function cleanText(value) {
  return String(value || '').trim()
}

function cleanDateKey(value, fallback = todayDateKey()) {
  const clean = String(value || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : fallback
}

function cleanOptionalDateKey(value) {
  const clean = String(value || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : ''
}

function cleanTimestamp(value, fallback = new Date().toISOString()) {
  const parsed = new Date(value || '')
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString()
}

function fallbackId(date, index) {
  return `money-book-${date}-${index}`
}

function readQueue(userId) {
  if (!userId) {
    return []
  }

  try {
    const parsed = JSON.parse(safeStorageGet(moneyBookQueueKey(userId), '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(userId, queue) {
  if (!userId) {
    return
  }

  safeStorageSet(moneyBookQueueKey(userId), JSON.stringify(Array.isArray(queue) ? queue : []))
}

export function hasMoneyBookMigrationRun(userId) {
  return Boolean(userId) && safeStorageGet(moneyBookMigrationKey(userId), 'false') === 'true'
}

export function markMoneyBookMigrationRun(userId) {
  if (!userId) {
    return
  }

  safeStorageSet(moneyBookMigrationKey(userId), 'true')
}

export function normalizeMoneyBookEntry(entry = {}, index = 0) {
  const kind = entry.kind === 'taken' || entry.type === 'taken' || entry.direction === 'taken' ? 'taken' : 'given'
  const date = cleanDateKey(entry.date || entry.entry_date || entry.createdAt || entry.created_at)
  const dueDate = cleanOptionalDateKey(entry.dueDate || entry.due_date || entry.due)
  const status = entry.status === 'settled' || entry.status === 'completed' ? 'settled' : 'pending'
  const createdAt = cleanTimestamp(entry.createdAt || entry.created_at || `${date}T12:00:00`)
  const updatedAt = cleanTimestamp(entry.updatedAt || entry.updated_at || createdAt)
  const settledAt = status === 'settled'
    ? cleanTimestamp(entry.settledAt || entry.settled_at || entry.completedAt || `${date}T20:00:00`)
    : ''

  return {
    id: cleanText(entry.id) || fallbackId(date, index),
    kind,
    person: cleanText(entry.person || entry.name || entry.borrower || entry.lender),
    amount: normalizeMoney(entry.amount),
    interest: normalizeMoney(entry.interest || entry.vyaj),
    date,
    note: cleanText(entry.note),
    status,
    dueDate,
    createdAt,
    updatedAt,
    settledAt,
    position: Number.isFinite(Number(entry.position)) ? Number(entry.position) : index,
  }
}

export function normalizeMoneyBookEntries(entries = []) {
  const byId = new Map()

  ;(Array.isArray(entries) ? entries : []).forEach((entry, index) => {
    const normalized = normalizeMoneyBookEntry(entry, index)

    if ((!normalized.person && normalized.amount <= 0) || entry?.deletedAt || entry?.deleted_at) {
      return
    }

    const baseId = normalized.id || fallbackId(normalized.date, index)
    const id = byId.has(baseId) ? `${baseId}-${index}` : baseId
    byId.set(id, {
      ...normalized,
      id,
    })
  })

  return Array.from(byId.values())
}

export function buildMoneyBookSyncRecords(entries = []) {
  return normalizeMoneyBookEntries(entries).map((entry, index) => ({
    ...entry,
    position: index,
  }))
}

function moneyBookRecordToCloudPayload(user, record = {}) {
  const normalized = normalizeMoneyBookEntry(record)

  return {
    id: normalized.id,
    user_id: user.id,
    kind: normalized.kind,
    person: normalized.person,
    amount: normalized.amount,
    interest: normalized.interest,
    entry_date: normalized.date,
    note: normalized.note || null,
    status: normalized.status,
    due_date: normalized.dueDate || null,
    settled_at: normalized.settledAt || null,
    position: Number.isFinite(Number(record.position)) ? Number(record.position) : normalized.position,
    created_at: normalized.createdAt,
    deleted_at: null,
  }
}

function cloudRowToMoneyBookEntry(row = {}, index = 0) {
  return normalizeMoneyBookEntry({
    id: row.id,
    kind: row.kind,
    person: row.person,
    amount: row.amount,
    interest: row.interest,
    date: row.entry_date,
    note: row.note,
    status: row.status,
    dueDate: row.due_date,
    settledAt: row.settled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    position: row.position,
  }, index)
}

function cloudRowsToMoneyBookEntries(rows = []) {
  return normalizeMoneyBookEntries(
    (Array.isArray(rows) ? rows : [])
      .filter((row) => !row.deleted_at)
      .sort((first, second) =>
        Number(first.position || 0) - Number(second.position || 0) ||
        String(second.updated_at || second.created_at).localeCompare(String(first.updated_at || first.created_at)),
      )
      .map(cloudRowToMoneyBookEntry),
  )
}

function moneyBookSyncFingerprint(record = {}) {
  const normalized = normalizeMoneyBookEntry(record)

  return JSON.stringify({
    id: normalized.id,
    kind: normalized.kind,
    person: normalized.person,
    amount: normalized.amount,
    interest: normalized.interest,
    date: normalized.date,
    note: normalized.note,
    status: normalized.status,
    dueDate: normalized.dueDate,
    settledAt: normalized.settledAt,
    position: Number.isFinite(Number(record.position)) ? Number(record.position) : normalized.position,
  })
}

export function diffMoneyBookSyncRecords(previousRecords = [], nextEntries = []) {
  const previousById = new Map(
    buildMoneyBookSyncRecords(previousRecords).map((record) => [record.id, record]),
  )
  const nextRecords = buildMoneyBookSyncRecords(nextEntries)
  const nextById = new Map(nextRecords.map((record) => [record.id, record]))
  const upserts = []
  const deletes = []

  nextById.forEach((record, id) => {
    const previousRecord = previousById.get(id)

    if (!previousRecord || moneyBookSyncFingerprint(previousRecord) !== moneyBookSyncFingerprint(record)) {
      upserts.push(record)
    }
  })

  previousById.forEach((record, id) => {
    if (!nextById.has(id)) {
      deletes.push(record)
    }
  })

  return {
    upserts,
    deletes,
    nextRecords,
  }
}

export async function loadCloudMoneyBook(supabase, userId) {
  const { data, error } = await supabase
    .from(MONEY_BOOK_SYNC_TABLE)
    .select(MONEY_BOOK_SYNC_COLUMNS)
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('updated_at', { ascending: false })

  if (error) {
    throw error
  }

  const rows = data || []

  return {
    entries: cloudRowsToMoneyBookEntries(rows),
    rowCount: rows.length,
    records: buildMoneyBookSyncRecords(cloudRowsToMoneyBookEntries(rows)),
  }
}

export async function saveCloudMoneyBook(supabase, user, entries = []) {
  const payloads = buildMoneyBookSyncRecords(entries).map((record) => moneyBookRecordToCloudPayload(user, record))

  if (payloads.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from(MONEY_BOOK_SYNC_TABLE)
    .upsert(payloads, { onConflict: 'user_id,id' })
    .select(MONEY_BOOK_SYNC_COLUMNS)

  if (error) {
    throw error
  }

  return data || []
}

export function buildMoneyBookSyncOperations(user, { upserts = [], deletes = [] } = {}) {
  const operations = []

  if (upserts.length > 0) {
    operations.push({
      kind: 'upsert',
      records: buildMoneyBookSyncRecords(upserts).map((record) => moneyBookRecordToCloudPayload(user, record)),
      queuedAt: new Date().toISOString(),
    })
  }

  if (deletes.length > 0) {
    operations.push({
      kind: 'delete',
      ids: buildMoneyBookSyncRecords(deletes).map((record) => record.id),
      queuedAt: new Date().toISOString(),
    })
  }

  return operations
}

export function queueMoneyBookSyncOperations(userId, operations = []) {
  const nextOperations = (Array.isArray(operations) ? operations : [operations]).filter(Boolean)

  if (!userId || nextOperations.length === 0) {
    return
  }

  writeQueue(userId, [...readQueue(userId), ...nextOperations])
}

export async function applyMoneyBookSyncOperations(supabase, user, operations = []) {
  const safeOperations = (Array.isArray(operations) ? operations : []).filter(Boolean)

  for (const operation of safeOperations) {
    if (operation.kind === 'upsert' && Array.isArray(operation.records) && operation.records.length > 0) {
      const records = operation.records.map((record) => ({
        ...record,
        user_id: user.id,
        deleted_at: null,
      }))
      const { error } = await supabase
        .from(MONEY_BOOK_SYNC_TABLE)
        .upsert(records, { onConflict: 'user_id,id' })

      if (error) {
        throw error
      }
    }

    if (operation.kind === 'delete' && Array.isArray(operation.ids) && operation.ids.length > 0) {
      const { error } = await supabase
        .from(MONEY_BOOK_SYNC_TABLE)
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('id', operation.ids)

      if (error) {
        throw error
      }
    }
  }
}

export async function flushMoneyBookSyncQueue(supabase, user) {
  const pendingOperations = readQueue(user?.id)

  if (!user?.id || pendingOperations.length === 0) {
    return { operationCount: 0 }
  }

  await applyMoneyBookSyncOperations(supabase, user, pendingOperations)
  writeQueue(user.id, [])

  return { operationCount: pendingOperations.length }
}
