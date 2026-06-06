import { normalizeMoney } from './money'
import { safeStorageGet, safeStorageSet } from './storage'

export const SHARED_GROUPS_SYNC_TABLE = 'user_shared_groups'
export const SHARED_GROUPS_SYNC_VERSION = 'v1'
export const SHARED_GROUPS_SYNC_COLUMNS =
  'id, user_id, name, purpose, people, payments, settlements, group_date, position, created_at, updated_at, deleted_at'

function sharedGroupsMigrationKey(userId) {
  return `fbply-shared-groups-sync-${SHARED_GROUPS_SYNC_VERSION}-${userId}`
}

function sharedGroupsQueueKey(userId) {
  return `fbply-shared-groups-sync-queue-${SHARED_GROUPS_SYNC_VERSION}-${userId}`
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

function cleanTimestamp(value, fallback = new Date().toISOString()) {
  const parsed = new Date(value || '')
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString()
}

function uniqueStrings(items = []) {
  const seen = new Set()

  return (Array.isArray(items) ? items : [])
    .map(cleanText)
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase()

      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
}

function fallbackId(prefix, index) {
  return `${prefix}-${index}`
}

function readQueue(userId) {
  if (!userId) {
    return []
  }

  try {
    const parsed = JSON.parse(safeStorageGet(sharedGroupsQueueKey(userId), '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(userId, queue) {
  if (!userId) {
    return
  }

  safeStorageSet(sharedGroupsQueueKey(userId), JSON.stringify(Array.isArray(queue) ? queue : []))
}

function normalizeSharedPayment(payment = {}, index = 0, group = {}) {
  const date = cleanDateKey(payment.date || group.date || group.group_date)
  const amount = normalizeMoney(payment.amount)

  return {
    id: cleanText(payment.id) || fallbackId(`shared-payment-${group.id || 'group'}`, index),
    label: cleanText(payment.label || payment.name || group.name) || 'Shared payment',
    amount,
    paidBy: cleanText(payment.paidBy || payment.paid_by || group.paidBy || group.paid_by),
    participants: uniqueStrings(payment.participants || []),
    date,
  }
}

function normalizeSharedSettlement(settlement = {}, index = 0, group = {}) {
  const amount = normalizeMoney(settlement.amount)
  const settledAmount = normalizeMoney(settlement.settledAmount || settlement.settled_amount)
  const remainingAmount = normalizeMoney(
    settlement.remainingAmount ?? settlement.remaining_amount ?? Math.max(amount - settledAmount, 0),
  )
  const status = ['received', 'paid', 'settled', 'partial'].includes(settlement.status)
    ? settlement.status
    : remainingAmount <= 0 ? 'settled' : 'pending'

  return {
    id: cleanText(settlement.id) || fallbackId(`shared-settlement-${group.id || 'group'}`, index),
    from: cleanText(settlement.from),
    to: cleanText(settlement.to),
    amount,
    settledAmount,
    remainingAmount,
    direction: cleanText(settlement.direction || 'neutral') || 'neutral',
    status,
    receivedAt: settlement.receivedAt || settlement.received_at || '',
  }
}

export function hasSharedGroupsMigrationRun(userId) {
  return Boolean(userId) && safeStorageGet(sharedGroupsMigrationKey(userId), 'false') === 'true'
}

export function markSharedGroupsMigrationRun(userId) {
  if (!userId) {
    return
  }

  safeStorageSet(sharedGroupsMigrationKey(userId), 'true')
}

export function normalizeSharedGroup(group = {}, index = 0) {
  const date = cleanDateKey(group.date || group.group_date || group.createdAt || group.created_at)
  const id = cleanText(group.id) || fallbackId(`shared-${date}`, index)
  const base = {
    ...group,
    id,
    date,
  }
  const payments = (Array.isArray(group.payments) ? group.payments : [])
    .map((payment, paymentIndex) => normalizeSharedPayment(payment, paymentIndex, base))
    .filter((payment) => payment.amount > 0)
  const settlements = (Array.isArray(group.settlements) ? group.settlements : [])
    .map((settlement, settlementIndex) => normalizeSharedSettlement(settlement, settlementIndex, base))
    .filter((settlement) => settlement.amount > 0 || settlement.from || settlement.to)
  const createdAt = cleanTimestamp(group.createdAt || group.created_at || `${date}T12:00:00`)
  const updatedAt = cleanTimestamp(group.updatedAt || group.updated_at || createdAt)

  return {
    id,
    name: cleanText(group.name || group.label) || 'Shared trip',
    purpose: cleanText(group.purpose),
    people: uniqueStrings(group.people || []),
    date,
    payments,
    settlements,
    createdAt,
    updatedAt,
    position: Number.isFinite(Number(group.position)) ? Number(group.position) : index,
  }
}

export function normalizeSharedGroups(groups = []) {
  const byId = new Map()

  ;(Array.isArray(groups) ? groups : []).forEach((group, index) => {
    const normalized = normalizeSharedGroup(group, index)
    const hasData = Boolean(
      normalized.name ||
      normalized.purpose ||
      normalized.people.length > 0 ||
      normalized.payments.length > 0 ||
      normalized.settlements.length > 0,
    )

    if (!hasData || group?.deletedAt || group?.deleted_at) {
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

export function buildSharedGroupsSyncRecords(groups = []) {
  return normalizeSharedGroups(groups).map((group, index) => ({
    ...group,
    position: index,
  }))
}

function sharedGroupRecordToCloudPayload(user, record = {}) {
  const normalized = normalizeSharedGroup(record)

  return {
    id: normalized.id,
    user_id: user.id,
    name: normalized.name,
    purpose: normalized.purpose || null,
    people: normalized.people,
    payments: normalized.payments,
    settlements: normalized.settlements,
    group_date: normalized.date,
    position: Number.isFinite(Number(record.position)) ? Number(record.position) : normalized.position,
    created_at: normalized.createdAt,
    deleted_at: null,
  }
}

function cloudRowToSharedGroup(row = {}, index = 0) {
  return normalizeSharedGroup({
    id: row.id,
    name: row.name,
    purpose: row.purpose,
    people: row.people,
    payments: row.payments,
    settlements: row.settlements,
    date: row.group_date,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }, index)
}

function cloudRowsToSharedGroups(rows = []) {
  return normalizeSharedGroups(
    (Array.isArray(rows) ? rows : [])
      .filter((row) => !row.deleted_at)
      .sort((first, second) =>
        Number(first.position || 0) - Number(second.position || 0) ||
        String(second.updated_at || second.created_at).localeCompare(String(first.updated_at || first.created_at)),
      )
      .map(cloudRowToSharedGroup),
  )
}

function sharedGroupSyncFingerprint(record = {}) {
  const normalized = normalizeSharedGroup(record)

  return JSON.stringify({
    id: normalized.id,
    name: normalized.name,
    purpose: normalized.purpose,
    people: normalized.people,
    date: normalized.date,
    payments: normalized.payments,
    settlements: normalized.settlements,
    position: Number.isFinite(Number(record.position)) ? Number(record.position) : normalized.position,
  })
}

export function diffSharedGroupsSyncRecords(previousRecords = [], nextGroups = []) {
  const previousById = new Map(
    buildSharedGroupsSyncRecords(previousRecords).map((record) => [record.id, record]),
  )
  const nextRecords = buildSharedGroupsSyncRecords(nextGroups)
  const nextById = new Map(nextRecords.map((record) => [record.id, record]))
  const upserts = []
  const deletes = []

  nextById.forEach((record, id) => {
    const previousRecord = previousById.get(id)

    if (!previousRecord || sharedGroupSyncFingerprint(previousRecord) !== sharedGroupSyncFingerprint(record)) {
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

export async function loadCloudSharedGroups(supabase, userId) {
  const { data, error } = await supabase
    .from(SHARED_GROUPS_SYNC_TABLE)
    .select(SHARED_GROUPS_SYNC_COLUMNS)
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('updated_at', { ascending: false })

  if (error) {
    throw error
  }

  const rows = data || []
  const groups = cloudRowsToSharedGroups(rows)

  return {
    groups,
    rowCount: rows.length,
    records: buildSharedGroupsSyncRecords(groups),
  }
}

export async function saveCloudSharedGroups(supabase, user, groups = []) {
  const payloads = buildSharedGroupsSyncRecords(groups).map((record) => sharedGroupRecordToCloudPayload(user, record))

  if (payloads.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from(SHARED_GROUPS_SYNC_TABLE)
    .upsert(payloads, { onConflict: 'user_id,id' })
    .select(SHARED_GROUPS_SYNC_COLUMNS)

  if (error) {
    throw error
  }

  return data || []
}

export function buildSharedGroupsSyncOperations(user, { upserts = [], deletes = [] } = {}) {
  const operations = []

  if (upserts.length > 0) {
    operations.push({
      kind: 'upsert',
      records: buildSharedGroupsSyncRecords(upserts).map((record) => sharedGroupRecordToCloudPayload(user, record)),
      queuedAt: new Date().toISOString(),
    })
  }

  if (deletes.length > 0) {
    operations.push({
      kind: 'delete',
      ids: buildSharedGroupsSyncRecords(deletes).map((record) => record.id),
      queuedAt: new Date().toISOString(),
    })
  }

  return operations
}

export function queueSharedGroupsSyncOperations(userId, operations = []) {
  const nextOperations = (Array.isArray(operations) ? operations : [operations]).filter(Boolean)

  if (!userId || nextOperations.length === 0) {
    return
  }

  writeQueue(userId, [...readQueue(userId), ...nextOperations])
}

export async function applySharedGroupsSyncOperations(supabase, user, operations = []) {
  const safeOperations = (Array.isArray(operations) ? operations : []).filter(Boolean)

  for (const operation of safeOperations) {
    if (operation.kind === 'upsert' && Array.isArray(operation.records) && operation.records.length > 0) {
      const records = operation.records.map((record) => ({
        ...record,
        user_id: user.id,
        deleted_at: null,
      }))
      const { error } = await supabase
        .from(SHARED_GROUPS_SYNC_TABLE)
        .upsert(records, { onConflict: 'user_id,id' })

      if (error) {
        throw error
      }
    }

    if (operation.kind === 'delete' && Array.isArray(operation.ids) && operation.ids.length > 0) {
      const { error } = await supabase
        .from(SHARED_GROUPS_SYNC_TABLE)
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('id', operation.ids)

      if (error) {
        throw error
      }
    }
  }
}

export async function flushSharedGroupsSyncQueue(supabase, user) {
  const pendingOperations = readQueue(user?.id)

  if (!user?.id || pendingOperations.length === 0) {
    return { operationCount: 0 }
  }

  await applySharedGroupsSyncOperations(supabase, user, pendingOperations)
  writeQueue(user.id, [])

  return { operationCount: pendingOperations.length }
}
