import { normalizeReportHistory } from './reportHistory'
import { safeStorageGet, safeStorageSet } from './storage'

export const REPORT_HISTORY_SYNC_TABLE = 'user_report_history'
export const REPORT_HISTORY_SYNC_VERSION = 'v1'
export const REPORT_HISTORY_SYNC_COLUMNS =
  'id, user_id, report_id, type, name, template, generated_at, currency, period, prepared_for, payload, position, created_at, updated_at, deleted_at'

function reportHistoryMigrationKey(userId) {
  return `fbply-report-history-sync-${REPORT_HISTORY_SYNC_VERSION}-${userId}`
}

function reportHistoryQueueKey(userId) {
  return `fbply-report-history-sync-queue-${REPORT_HISTORY_SYNC_VERSION}-${userId}`
}

function cleanText(value) {
  return String(value || '').trim()
}

function cleanTimestamp(value, fallback = new Date().toISOString()) {
  const parsed = new Date(value || '')
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString()
}

function readQueue(userId) {
  if (!userId) {
    return []
  }

  try {
    const parsed = JSON.parse(safeStorageGet(reportHistoryQueueKey(userId), '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(userId, queue) {
  if (!userId) {
    return
  }

  safeStorageSet(reportHistoryQueueKey(userId), JSON.stringify(Array.isArray(queue) ? queue : []))
}

export function hasReportHistoryMigrationRun(userId) {
  return Boolean(userId) && safeStorageGet(reportHistoryMigrationKey(userId), 'false') === 'true'
}

export function markReportHistoryMigrationRun(userId) {
  if (!userId) {
    return
  }

  safeStorageSet(reportHistoryMigrationKey(userId), 'true')
}

export function buildReportHistorySyncRecords(history = []) {
  return normalizeReportHistory(history).map((entry, index) => ({
    ...entry,
    position: index,
  }))
}

function reportHistoryRecordToCloudPayload(user, record = {}) {
  const normalized = normalizeReportHistory([record])[0]

  return {
    id: normalized.id,
    user_id: user.id,
    report_id: normalized.reportId,
    type: normalized.type,
    name: normalized.name,
    template: normalized.template,
    generated_at: cleanTimestamp(normalized.generatedAt),
    currency: normalized.currency,
    period: cleanText(normalized.period) || null,
    prepared_for: cleanText(normalized.preparedFor) || null,
    payload: normalized.payload || {},
    position: Number.isFinite(Number(record.position)) ? Number(record.position) : 0,
    created_at: cleanTimestamp(normalized.generatedAt),
    deleted_at: null,
  }
}

function cloudRowToReportHistoryEntry(row = {}) {
  return normalizeReportHistory([{
    id: row.id,
    reportId: row.report_id,
    type: row.type,
    name: row.name,
    template: row.template,
    generatedAt: row.generated_at || row.created_at,
    currency: row.currency,
    period: row.period,
    preparedFor: row.prepared_for,
    payload: row.payload || {},
  }])[0]
}

function cloudRowsToReportHistory(rows = []) {
  return normalizeReportHistory(
    (Array.isArray(rows) ? rows : [])
      .filter((row) => !row.deleted_at)
      .sort((first, second) =>
        Number(first.position || 0) - Number(second.position || 0) ||
        String(second.generated_at || second.created_at).localeCompare(String(first.generated_at || first.created_at)),
      )
      .map(cloudRowToReportHistoryEntry),
  )
}

function reportHistorySyncFingerprint(record = {}) {
  const normalized = normalizeReportHistory([record])[0]

  if (!normalized) {
    return ''
  }

  return JSON.stringify({
    id: normalized.id,
    reportId: normalized.reportId,
    type: normalized.type,
    name: normalized.name,
    template: normalized.template,
    generatedAt: normalized.generatedAt,
    currency: normalized.currency,
    period: normalized.period,
    preparedFor: normalized.preparedFor,
    payload: normalized.payload || {},
    position: Number.isFinite(Number(record.position)) ? Number(record.position) : 0,
  })
}

export function diffReportHistorySyncRecords(previousRecords = [], nextHistory = []) {
  const previousById = new Map(
    buildReportHistorySyncRecords(previousRecords).map((record) => [record.id, record]),
  )
  const nextRecords = buildReportHistorySyncRecords(nextHistory)
  const nextById = new Map(nextRecords.map((record) => [record.id, record]))
  const upserts = []
  const deletes = []

  nextById.forEach((record, id) => {
    const previousRecord = previousById.get(id)

    if (!previousRecord || reportHistorySyncFingerprint(previousRecord) !== reportHistorySyncFingerprint(record)) {
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

export async function loadCloudReportHistory(supabase, userId) {
  const { data, error } = await supabase
    .from(REPORT_HISTORY_SYNC_TABLE)
    .select(REPORT_HISTORY_SYNC_COLUMNS)
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('generated_at', { ascending: false })

  if (error) {
    throw error
  }

  const rows = data || []
  const history = cloudRowsToReportHistory(rows)

  return {
    history,
    rowCount: rows.length,
    records: buildReportHistorySyncRecords(history),
  }
}

export async function saveCloudReportHistory(supabase, user, history = []) {
  const payloads = buildReportHistorySyncRecords(history).map((record) => reportHistoryRecordToCloudPayload(user, record))

  if (payloads.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from(REPORT_HISTORY_SYNC_TABLE)
    .upsert(payloads, { onConflict: 'user_id,id' })
    .select(REPORT_HISTORY_SYNC_COLUMNS)

  if (error) {
    throw error
  }

  return data || []
}

export function buildReportHistorySyncOperations(user, { upserts = [], deletes = [] } = {}) {
  const operations = []

  if (upserts.length > 0) {
    operations.push({
      kind: 'upsert',
      records: buildReportHistorySyncRecords(upserts).map((record) => reportHistoryRecordToCloudPayload(user, record)),
      queuedAt: new Date().toISOString(),
    })
  }

  if (deletes.length > 0) {
    operations.push({
      kind: 'delete',
      ids: buildReportHistorySyncRecords(deletes).map((record) => record.id),
      queuedAt: new Date().toISOString(),
    })
  }

  return operations
}

export function queueReportHistorySyncOperations(userId, operations = []) {
  const nextOperations = (Array.isArray(operations) ? operations : [operations]).filter(Boolean)

  if (!userId || nextOperations.length === 0) {
    return
  }

  writeQueue(userId, [...readQueue(userId), ...nextOperations])
}

export async function applyReportHistorySyncOperations(supabase, user, operations = []) {
  const safeOperations = (Array.isArray(operations) ? operations : []).filter(Boolean)

  for (const operation of safeOperations) {
    if (operation.kind === 'upsert' && Array.isArray(operation.records) && operation.records.length > 0) {
      const records = operation.records.map((record) => ({
        ...record,
        user_id: user.id,
        deleted_at: null,
      }))
      const { error } = await supabase
        .from(REPORT_HISTORY_SYNC_TABLE)
        .upsert(records, { onConflict: 'user_id,id' })

      if (error) {
        throw error
      }
    }

    if (operation.kind === 'delete' && Array.isArray(operation.ids) && operation.ids.length > 0) {
      const { error } = await supabase
        .from(REPORT_HISTORY_SYNC_TABLE)
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('id', operation.ids)

      if (error) {
        throw error
      }
    }
  }
}

export async function flushReportHistorySyncQueue(supabase, user) {
  const pendingOperations = readQueue(user?.id)

  if (!user?.id || pendingOperations.length === 0) {
    return { operationCount: 0 }
  }

  await applyReportHistorySyncOperations(supabase, user, pendingOperations)
  writeQueue(user.id, [])

  return { operationCount: pendingOperations.length }
}
