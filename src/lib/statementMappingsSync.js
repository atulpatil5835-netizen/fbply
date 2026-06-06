import { safeStorageGet, safeStorageSet } from './storage'

export const STATEMENT_MAPPINGS_SYNC_TABLE = 'user_statement_mappings'
export const STATEMENT_MAPPINGS_SYNC_VERSION = 'v1'
export const STATEMENT_MAPPINGS_SYNC_COLUMNS =
  'id, user_id, mapping_key, category, payload, position, created_at, updated_at, deleted_at'

function statementMappingsMigrationKey(userId) {
  return `fbply-statement-mappings-sync-${STATEMENT_MAPPINGS_SYNC_VERSION}-${userId}`
}

function statementMappingsQueueKey(userId) {
  return `fbply-statement-mappings-sync-queue-${STATEMENT_MAPPINGS_SYNC_VERSION}-${userId}`
}

function cleanText(value) {
  return String(value || '').trim()
}

function stableId(prefix, value) {
  let hash = 2166136261

  Array.from(String(value || '')).forEach((character) => {
    hash ^= character.codePointAt(0) || 0
    hash = Math.imul(hash, 16777619)
  })

  return `${prefix}-${(hash >>> 0).toString(36)}-${String(value || '').length}`
}

function readQueue(userId) {
  if (!userId) {
    return []
  }

  try {
    const parsed = JSON.parse(safeStorageGet(statementMappingsQueueKey(userId), '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(userId, queue) {
  if (!userId) {
    return
  }

  safeStorageSet(statementMappingsQueueKey(userId), JSON.stringify(Array.isArray(queue) ? queue : []))
}

export function hasStatementMappingsMigrationRun(userId) {
  return Boolean(userId) && safeStorageGet(statementMappingsMigrationKey(userId), 'false') === 'true'
}

export function markStatementMappingsMigrationRun(userId) {
  if (!userId) {
    return
  }

  safeStorageSet(statementMappingsMigrationKey(userId), 'true')
}

export function normalizeStatementMappings(mappings = {}) {
  if (!mappings || typeof mappings !== 'object' || Array.isArray(mappings)) {
    return {}
  }

  return Object.entries(mappings).reduce((normalized, [key, category]) => {
    const cleanKey = cleanText(key)
    const cleanCategory = cleanText(category)

    if (!cleanKey || !cleanCategory) {
      return normalized
    }

    normalized[cleanKey] = cleanCategory
    return normalized
  }, {})
}

export function buildStatementMappingsSyncRecords(mappings = {}) {
  return Object.entries(normalizeStatementMappings(mappings))
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
    .map(([mappingKey, category], index) => ({
      id: stableId('statement-mapping', mappingKey),
      mappingKey,
      category,
      payload: {},
      position: index,
    }))
}

function statementMappingRecordToCloudPayload(user, record = {}) {
  const mappingKey = cleanText(record.mappingKey || record.mapping_key)
  const category = cleanText(record.category) || 'Other'

  return {
    id: cleanText(record.id) || stableId('statement-mapping', mappingKey),
    user_id: user.id,
    mapping_key: mappingKey,
    category,
    payload: record.payload && typeof record.payload === 'object' && !Array.isArray(record.payload)
      ? record.payload
      : {},
    position: Number.isFinite(Number(record.position)) ? Number(record.position) : 0,
    deleted_at: null,
  }
}

function cloudRowToStatementMappingRecord(row = {}, index = 0) {
  const mappingKey = cleanText(row.mapping_key)

  return {
    id: cleanText(row.id) || stableId('statement-mapping', mappingKey),
    mappingKey,
    category: cleanText(row.category) || 'Other',
    payload: row.payload || {},
    position: Number.isFinite(Number(row.position)) ? Number(row.position) : index,
  }
}

function cloudRowsToStatementMappings(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => !row.deleted_at)
    .map(cloudRowToStatementMappingRecord)
    .sort((first, second) => first.position - second.position || first.mappingKey.localeCompare(second.mappingKey))
    .reduce((mappings, record) => {
      if (record.mappingKey && record.category) {
        mappings[record.mappingKey] = record.category
      }

      return mappings
    }, {})
}

function statementMappingSyncFingerprint(record = {}) {
  return JSON.stringify({
    id: cleanText(record.id),
    mappingKey: cleanText(record.mappingKey || record.mapping_key),
    category: cleanText(record.category) || 'Other',
    position: Number.isFinite(Number(record.position)) ? Number(record.position) : 0,
  })
}

export function diffStatementMappingsSyncRecords(previousMappings = {}, nextMappings = {}) {
  const previousById = new Map(
    buildStatementMappingsSyncRecords(previousMappings).map((record) => [record.id, record]),
  )
  const nextRecords = buildStatementMappingsSyncRecords(nextMappings)
  const nextById = new Map(nextRecords.map((record) => [record.id, record]))
  const upserts = []
  const deletes = []

  nextById.forEach((record, id) => {
    const previousRecord = previousById.get(id)

    if (!previousRecord || statementMappingSyncFingerprint(previousRecord) !== statementMappingSyncFingerprint(record)) {
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

export async function loadCloudStatementMappings(supabase, userId) {
  const { data, error } = await supabase
    .from(STATEMENT_MAPPINGS_SYNC_TABLE)
    .select(STATEMENT_MAPPINGS_SYNC_COLUMNS)
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('updated_at', { ascending: false })

  if (error) {
    throw error
  }

  const rows = data || []
  const mappings = cloudRowsToStatementMappings(rows)

  return {
    mappings,
    rowCount: rows.length,
    records: buildStatementMappingsSyncRecords(mappings),
  }
}

export async function saveCloudStatementMappings(supabase, user, mappings = {}) {
  const payloads = buildStatementMappingsSyncRecords(mappings).map((record) =>
    statementMappingRecordToCloudPayload(user, record),
  )

  if (payloads.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from(STATEMENT_MAPPINGS_SYNC_TABLE)
    .upsert(payloads, { onConflict: 'user_id,id' })
    .select(STATEMENT_MAPPINGS_SYNC_COLUMNS)

  if (error) {
    throw error
  }

  return data || []
}

export function buildStatementMappingsSyncOperations(user, { upserts = [], deletes = [] } = {}) {
  const operations = []

  if (upserts.length > 0) {
    operations.push({
      kind: 'upsert',
      records: upserts.map((record) => statementMappingRecordToCloudPayload(user, record)),
      queuedAt: new Date().toISOString(),
    })
  }

  if (deletes.length > 0) {
    operations.push({
      kind: 'delete',
      ids: deletes.map((record) => cleanText(record.id) || stableId('statement-mapping', record.mappingKey)),
      queuedAt: new Date().toISOString(),
    })
  }

  return operations
}

export function queueStatementMappingsSyncOperations(userId, operations = []) {
  const nextOperations = (Array.isArray(operations) ? operations : [operations]).filter(Boolean)

  if (!userId || nextOperations.length === 0) {
    return
  }

  writeQueue(userId, [...readQueue(userId), ...nextOperations])
}

export async function applyStatementMappingsSyncOperations(supabase, user, operations = []) {
  const safeOperations = (Array.isArray(operations) ? operations : []).filter(Boolean)

  for (const operation of safeOperations) {
    if (operation.kind === 'upsert' && Array.isArray(operation.records) && operation.records.length > 0) {
      const records = operation.records.map((record) => ({
        ...record,
        user_id: user.id,
        deleted_at: null,
      }))
      const { error } = await supabase
        .from(STATEMENT_MAPPINGS_SYNC_TABLE)
        .upsert(records, { onConflict: 'user_id,id' })

      if (error) {
        throw error
      }
    }

    if (operation.kind === 'delete' && Array.isArray(operation.ids) && operation.ids.length > 0) {
      const { error } = await supabase
        .from(STATEMENT_MAPPINGS_SYNC_TABLE)
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('id', operation.ids)

      if (error) {
        throw error
      }
    }
  }
}

export async function flushStatementMappingsSyncQueue(supabase, user) {
  const pendingOperations = readQueue(user?.id)

  if (!user?.id || pendingOperations.length === 0) {
    return { operationCount: 0 }
  }

  await applyStatementMappingsSyncOperations(supabase, user, pendingOperations)
  writeQueue(user.id, [])

  return { operationCount: pendingOperations.length }
}
