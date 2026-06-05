import { normalizeMoney } from './money'
import { safeStorageGet, safeStorageSet } from './storage'

export const SAVINGS_SYNC_TABLE = 'savings_buckets'
export const SAVINGS_SYNC_VERSION = 'v1'
export const SAVINGS_SYNC_COLUMNS =
  'id, user_id, name, target_amount, current_amount, target_date, color, icon, notes, position, created_at, updated_at, deleted_at'

const SAVINGS_META_PREFIX = 'fbply:'

function savingsMigrationKey(userId) {
  return `fbply-savings-sync-${SAVINGS_SYNC_VERSION}-${userId}`
}

function savingsQueueKey(userId) {
  return `fbply-savings-sync-queue-${SAVINGS_SYNC_VERSION}-${userId}`
}

function cleanText(value) {
  return String(value || '').trim()
}

function cleanDateKey(value) {
  const clean = String(value || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : ''
}

function normalizeDueDay(value) {
  const day = Number(value)
  return Number.isFinite(day) && day >= 1 ? Math.min(Math.round(day), 31) : undefined
}

function fallbackId(index) {
  return `bucket-${index}`
}

function readQueue(userId) {
  if (!userId) {
    return []
  }

  try {
    const parsed = JSON.parse(safeStorageGet(savingsQueueKey(userId), '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(userId, queue) {
  if (!userId) {
    return
  }

  safeStorageSet(savingsQueueKey(userId), JSON.stringify(Array.isArray(queue) ? queue : []))
}

function encodeCloudNotes(record = {}) {
  const notes = cleanText(record.notes)
  const monthlyContribution = normalizeMoney(record.monthlyContribution)
  const dueDay = normalizeDueDay(record.dueDay)

  if (!notes && monthlyContribution <= 0 && !dueDay) {
    return null
  }

  return `${SAVINGS_META_PREFIX}${JSON.stringify({
    notes,
    monthlyContribution,
    dueDay: dueDay || null,
  })}`
}

function decodeCloudNotes(value) {
  const clean = cleanText(value)

  if (!clean.startsWith(SAVINGS_META_PREFIX)) {
    return {
      notes: clean,
      monthlyContribution: 0,
      dueDay: undefined,
    }
  }

  try {
    const parsed = JSON.parse(clean.slice(SAVINGS_META_PREFIX.length))

    return {
      notes: cleanText(parsed.notes),
      monthlyContribution: normalizeMoney(parsed.monthlyContribution),
      dueDay: normalizeDueDay(parsed.dueDay),
    }
  } catch {
    return {
      notes: '',
      monthlyContribution: 0,
      dueDay: undefined,
    }
  }
}

export function hasSavingsMigrationRun(userId) {
  return Boolean(userId) && safeStorageGet(savingsMigrationKey(userId), 'false') === 'true'
}

export function markSavingsMigrationRun(userId) {
  if (!userId) {
    return
  }

  safeStorageSet(savingsMigrationKey(userId), 'true')
}

export function normalizeSavingsBucket(bucket = {}, index = 0) {
  const id = cleanText(bucket.id || bucket.key || fallbackId(index))
  const name = cleanText(bucket.name || bucket.label) || 'Savings goal'
  const saved = normalizeMoney(bucket.saved ?? bucket.currentAmount ?? bucket.current_amount)
  const target = normalizeMoney(bucket.target ?? bucket.targetAmount ?? bucket.target_amount)
  const deadline = cleanDateKey(bucket.deadline || bucket.targetDate || bucket.target_date)
  const monthlyContribution = normalizeMoney(bucket.monthlyContribution)
  const dueDay = normalizeDueDay(bucket.dueDay)

  return {
    id,
    name,
    saved,
    target,
    monthlyContribution,
    dueDay,
    deadline,
    color: cleanText(bucket.color),
    icon: cleanText(bucket.icon),
    notes: cleanText(bucket.notes),
  }
}

export function normalizeSavingsBuckets(buckets = []) {
  const byId = new Map()

  ;(Array.isArray(buckets) ? buckets : []).forEach((bucket, index) => {
    const normalized = normalizeSavingsBucket(bucket, index)
    const hasData = Boolean(
      bucket?.id ||
      bucket?.key ||
      cleanText(bucket?.name || bucket?.label) ||
      normalized.saved > 0 ||
      normalized.target > 0 ||
      normalized.deadline,
    )

    if (!hasData || bucket?.deletedAt || bucket?.deleted_at) {
      return
    }

    const baseId = normalized.id || fallbackId(index)
    const id = byId.has(baseId) ? `${baseId}-${index}` : baseId
    byId.set(id, {
      ...normalized,
      id,
    })
  })

  return Array.from(byId.values())
}

export function buildSavingsSyncRecords(buckets = []) {
  return normalizeSavingsBuckets(buckets).map((bucket, index) => ({
    id: bucket.id,
    name: bucket.name,
    saved: bucket.saved,
    target: bucket.target,
    monthlyContribution: bucket.monthlyContribution,
    dueDay: bucket.dueDay,
    deadline: bucket.deadline,
    color: bucket.color,
    icon: bucket.icon,
    notes: bucket.notes,
    position: index,
  }))
}

function savingsRecordToCloudPayload(user, record = {}) {
  const normalized = normalizeSavingsBucket(record)

  return {
    id: normalized.id,
    user_id: user.id,
    name: normalized.name,
    target_amount: normalized.target,
    current_amount: normalized.saved,
    target_date: normalized.deadline || null,
    color: normalized.color || null,
    icon: normalized.icon || null,
    notes: encodeCloudNotes(normalized),
    position: Number.isFinite(Number(record.position)) ? Number(record.position) : 0,
    deleted_at: null,
  }
}

function cloudRowToSavingsBucket(row = {}) {
  const decodedNotes = decodeCloudNotes(row.notes)

  return normalizeSavingsBucket({
    id: row.id,
    name: row.name,
    saved: row.current_amount,
    target: row.target_amount,
    deadline: row.target_date,
    color: row.color,
    icon: row.icon,
    notes: decodedNotes.notes,
    monthlyContribution: decodedNotes.monthlyContribution,
    dueDay: decodedNotes.dueDay,
  })
}

function cloudRowsToSavingsBuckets(rows = []) {
  return normalizeSavingsBuckets(
    (Array.isArray(rows) ? rows : [])
      .filter((row) => !row.deleted_at)
      .sort((first, second) =>
        Number(first.position || 0) - Number(second.position || 0) ||
        String(first.name || '').localeCompare(String(second.name || '')),
      )
      .map(cloudRowToSavingsBucket),
  )
}

function savingsSyncFingerprint(record = {}) {
  const normalized = normalizeSavingsBucket(record)

  return JSON.stringify({
    id: normalized.id,
    name: normalized.name,
    saved: normalized.saved,
    target: normalized.target,
    monthlyContribution: normalized.monthlyContribution,
    dueDay: normalized.dueDay,
    deadline: normalized.deadline,
    color: normalized.color,
    icon: normalized.icon,
    notes: normalized.notes,
    position: Number.isFinite(Number(record.position)) ? Number(record.position) : 0,
  })
}

export function diffSavingsSyncRecords(previousRecords = [], nextBuckets = []) {
  const previousById = new Map(
    buildSavingsSyncRecords(previousRecords).map((record) => [record.id, record]),
  )
  const nextRecords = buildSavingsSyncRecords(nextBuckets)
  const nextById = new Map(nextRecords.map((record) => [record.id, record]))
  const upserts = []
  const deletes = []

  nextById.forEach((record, id) => {
    const previousRecord = previousById.get(id)

    if (!previousRecord || savingsSyncFingerprint(previousRecord) !== savingsSyncFingerprint(record)) {
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

export async function loadCloudSavingsBucketState(supabase, userId) {
  const { data, error } = await supabase
    .from(SAVINGS_SYNC_TABLE)
    .select(SAVINGS_SYNC_COLUMNS)
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('updated_at', { ascending: true })

  if (error) {
    throw error
  }

  const rows = data || []

  return {
    buckets: cloudRowsToSavingsBuckets(rows),
    rowCount: rows.length,
  }
}

export async function loadCloudSavingsBuckets(supabase, userId) {
  const state = await loadCloudSavingsBucketState(supabase, userId)
  return state.buckets
}

export async function saveCloudSavingsBuckets(supabase, user, buckets = []) {
  const payloads = buildSavingsSyncRecords(buckets).map((record) => savingsRecordToCloudPayload(user, record))

  if (payloads.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from(SAVINGS_SYNC_TABLE)
    .upsert(payloads, { onConflict: 'user_id,id' })
    .select(SAVINGS_SYNC_COLUMNS)

  if (error) {
    throw error
  }

  return data || []
}

export function buildSavingsSyncOperations(user, { upserts = [], deletes = [] } = {}) {
  const operations = []

  if (upserts.length > 0) {
    operations.push({
      kind: 'upsert',
      records: buildSavingsSyncRecords(upserts).map((record) => savingsRecordToCloudPayload(user, record)),
      queuedAt: new Date().toISOString(),
    })
  }

  if (deletes.length > 0) {
    operations.push({
      kind: 'delete',
      ids: buildSavingsSyncRecords(deletes).map((record) => record.id),
      queuedAt: new Date().toISOString(),
    })
  }

  return operations
}

export function queueSavingsSyncOperations(userId, operations = []) {
  const nextOperations = (Array.isArray(operations) ? operations : [operations]).filter(Boolean)

  if (!userId || nextOperations.length === 0) {
    return
  }

  writeQueue(userId, [...readQueue(userId), ...nextOperations])
}

export async function applySavingsSyncOperations(supabase, user, operations = []) {
  const safeOperations = (Array.isArray(operations) ? operations : []).filter(Boolean)

  for (const operation of safeOperations) {
    if (operation.kind === 'upsert' && Array.isArray(operation.records) && operation.records.length > 0) {
      const records = operation.records.map((record) => ({
        ...record,
        user_id: user.id,
        deleted_at: null,
      }))
      const { error } = await supabase
        .from(SAVINGS_SYNC_TABLE)
        .upsert(records, { onConflict: 'user_id,id' })

      if (error) {
        throw error
      }
    }

    if (operation.kind === 'delete' && Array.isArray(operation.ids) && operation.ids.length > 0) {
      const { error } = await supabase
        .from(SAVINGS_SYNC_TABLE)
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('id', operation.ids)

      if (error) {
        throw error
      }
    }
  }
}

export async function flushSavingsSyncQueue(supabase, user) {
  const pendingOperations = readQueue(user?.id)

  if (!user?.id || pendingOperations.length === 0) {
    return { operationCount: 0 }
  }

  await applySavingsSyncOperations(supabase, user, pendingOperations)
  writeQueue(user.id, [])

  return { operationCount: pendingOperations.length }
}
