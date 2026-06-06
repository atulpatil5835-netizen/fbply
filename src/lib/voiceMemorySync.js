import { normalizeMoney } from './money'
import { safeStorageGet, safeStorageSet } from './storage'

export const VOICE_MEMORY_SYNC_TABLE = 'user_voice_memory'
export const VOICE_MEMORY_SYNC_VERSION = 'v1'
export const VOICE_MEMORY_SYNC_COLUMNS =
  'id, user_id, memory_key, label, merchant, category, amount, usage_count, confidence, learning_source, category_reason, last_learned_at, payload, position, created_at, updated_at, deleted_at'

function voiceMemoryMigrationKey(userId) {
  return `fbply-voice-memory-sync-${VOICE_MEMORY_SYNC_VERSION}-${userId}`
}

function voiceMemoryQueueKey(userId) {
  return `fbply-voice-memory-sync-queue-${VOICE_MEMORY_SYNC_VERSION}-${userId}`
}

function cleanText(value) {
  return String(value || '').trim()
}

function cleanTimestamp(value, fallback = new Date().toISOString()) {
  const parsed = new Date(value || '')
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString()
}

function normalizeMemoryKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
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
    const parsed = JSON.parse(safeStorageGet(voiceMemoryQueueKey(userId), '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(userId, queue) {
  if (!userId) {
    return
  }

  safeStorageSet(voiceMemoryQueueKey(userId), JSON.stringify(Array.isArray(queue) ? queue : []))
}

export function hasVoiceMemoryMigrationRun(userId) {
  return Boolean(userId) && safeStorageGet(voiceMemoryMigrationKey(userId), 'false') === 'true'
}

export function markVoiceMemoryMigrationRun(userId) {
  if (!userId) {
    return
  }

  safeStorageSet(voiceMemoryMigrationKey(userId), 'true')
}

export function normalizeVoiceMemory(memory = {}) {
  if (!memory || typeof memory !== 'object' || Array.isArray(memory)) {
    return {}
  }

  return Object.entries(memory).reduce((normalized, [key, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return normalized
    }

    const memoryKey = normalizeMemoryKey(key || value.label || value.merchant)
    const category = cleanText(value.category)

    if (!memoryKey || !category) {
      return normalized
    }

    normalized[memoryKey] = {
      ...value,
      label: cleanText(value.label || value.merchant || key),
      merchant: cleanText(value.merchant || value.label || key),
      category,
      amount: normalizeMoney(value.amount),
      count: Math.max(Math.round(Number(value.count || value.usageCount || value.usage_count || 0)), 0),
      confidence: cleanText(value.confidence),
      learningSource: cleanText(value.learningSource || value.learning_source || value.source),
      categoryReason: cleanText(value.categoryReason || value.category_reason),
      updatedAt: cleanTimestamp(value.updatedAt || value.updated_at || value.lastLearnedAt || value.last_learned_at),
    }
    return normalized
  }, {})
}

export function buildVoiceMemorySyncRecords(memory = {}) {
  return Object.entries(normalizeVoiceMemory(memory))
    .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
    .map(([memoryKey, item], index) => ({
      id: stableId('voice-memory', memoryKey),
      memoryKey,
      label: item.label,
      merchant: item.merchant,
      category: item.category,
      amount: item.amount,
      count: item.count,
      confidence: item.confidence,
      learningSource: item.learningSource,
      categoryReason: item.categoryReason,
      updatedAt: item.updatedAt,
      payload: {},
      position: index,
    }))
}

function voiceMemoryRecordToCloudPayload(user, record = {}) {
  const memoryKey = normalizeMemoryKey(record.memoryKey || record.memory_key || record.label || record.merchant)

  return {
    id: cleanText(record.id) || stableId('voice-memory', memoryKey),
    user_id: user.id,
    memory_key: memoryKey,
    label: cleanText(record.label) || null,
    merchant: cleanText(record.merchant) || null,
    category: cleanText(record.category) || 'Other',
    amount: normalizeMoney(record.amount),
    usage_count: Math.max(Math.round(Number(record.count || record.usageCount || record.usage_count || 0)), 0),
    confidence: cleanText(record.confidence) || null,
    learning_source: cleanText(record.learningSource || record.learning_source) || null,
    category_reason: cleanText(record.categoryReason || record.category_reason) || null,
    last_learned_at: cleanTimestamp(record.updatedAt || record.updated_at || record.lastLearnedAt || record.last_learned_at),
    payload: record.payload && typeof record.payload === 'object' && !Array.isArray(record.payload)
      ? record.payload
      : {},
    position: Number.isFinite(Number(record.position)) ? Number(record.position) : 0,
    deleted_at: null,
  }
}

function cloudRowToVoiceMemoryRecord(row = {}, index = 0) {
  const memoryKey = normalizeMemoryKey(row.memory_key)

  return {
    id: cleanText(row.id) || stableId('voice-memory', memoryKey),
    memoryKey,
    label: cleanText(row.label),
    merchant: cleanText(row.merchant),
    category: cleanText(row.category) || 'Other',
    amount: normalizeMoney(row.amount),
    count: Math.max(Math.round(Number(row.usage_count || 0)), 0),
    confidence: cleanText(row.confidence),
    learningSource: cleanText(row.learning_source),
    categoryReason: cleanText(row.category_reason),
    updatedAt: row.last_learned_at || row.updated_at || row.created_at,
    payload: row.payload || {},
    position: Number.isFinite(Number(row.position)) ? Number(row.position) : index,
  }
}

function cloudRowsToVoiceMemory(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => !row.deleted_at)
    .map(cloudRowToVoiceMemoryRecord)
    .sort((first, second) => first.position - second.position || first.memoryKey.localeCompare(second.memoryKey))
    .reduce((memory, record) => {
      if (!record.memoryKey || !record.category) {
        return memory
      }

      memory[record.memoryKey] = {
        label: record.label || record.merchant || record.memoryKey,
        merchant: record.merchant || record.label || record.memoryKey,
        category: record.category,
        amount: record.amount,
        count: record.count,
        confidence: record.confidence,
        learningSource: record.learningSource,
        categoryReason: record.categoryReason || 'Learned Merchant',
        updatedAt: record.updatedAt,
        ...(record.payload && typeof record.payload === 'object' && !Array.isArray(record.payload) ? record.payload : {}),
      }
      return memory
    }, {})
}

function voiceMemorySyncFingerprint(record = {}) {
  return JSON.stringify({
    id: cleanText(record.id),
    memoryKey: normalizeMemoryKey(record.memoryKey || record.memory_key),
    label: cleanText(record.label),
    merchant: cleanText(record.merchant),
    category: cleanText(record.category) || 'Other',
    amount: normalizeMoney(record.amount),
    count: Math.max(Math.round(Number(record.count || record.usageCount || record.usage_count || 0)), 0),
    confidence: cleanText(record.confidence),
    learningSource: cleanText(record.learningSource || record.learning_source),
    categoryReason: cleanText(record.categoryReason || record.category_reason),
    updatedAt: cleanTimestamp(record.updatedAt || record.updated_at || record.lastLearnedAt || record.last_learned_at),
    position: Number.isFinite(Number(record.position)) ? Number(record.position) : 0,
  })
}

export function diffVoiceMemorySyncRecords(previousMemory = {}, nextMemory = {}) {
  const previousById = new Map(
    buildVoiceMemorySyncRecords(previousMemory).map((record) => [record.id, record]),
  )
  const nextRecords = buildVoiceMemorySyncRecords(nextMemory)
  const nextById = new Map(nextRecords.map((record) => [record.id, record]))
  const upserts = []
  const deletes = []

  nextById.forEach((record, id) => {
    const previousRecord = previousById.get(id)

    if (!previousRecord || voiceMemorySyncFingerprint(previousRecord) !== voiceMemorySyncFingerprint(record)) {
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

export async function loadCloudVoiceMemory(supabase, userId) {
  const { data, error } = await supabase
    .from(VOICE_MEMORY_SYNC_TABLE)
    .select(VOICE_MEMORY_SYNC_COLUMNS)
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('updated_at', { ascending: false })

  if (error) {
    throw error
  }

  const rows = data || []
  const memory = cloudRowsToVoiceMemory(rows)

  return {
    memory,
    rowCount: rows.length,
    records: buildVoiceMemorySyncRecords(memory),
  }
}

export async function saveCloudVoiceMemory(supabase, user, memory = {}) {
  const payloads = buildVoiceMemorySyncRecords(memory).map((record) => voiceMemoryRecordToCloudPayload(user, record))

  if (payloads.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from(VOICE_MEMORY_SYNC_TABLE)
    .upsert(payloads, { onConflict: 'user_id,id' })
    .select(VOICE_MEMORY_SYNC_COLUMNS)

  if (error) {
    throw error
  }

  return data || []
}

export function buildVoiceMemorySyncOperations(user, { upserts = [], deletes = [] } = {}) {
  const operations = []

  if (upserts.length > 0) {
    operations.push({
      kind: 'upsert',
      records: upserts.map((record) => voiceMemoryRecordToCloudPayload(user, record)),
      queuedAt: new Date().toISOString(),
    })
  }

  if (deletes.length > 0) {
    operations.push({
      kind: 'delete',
      ids: deletes.map((record) => cleanText(record.id) || stableId('voice-memory', record.memoryKey)),
      queuedAt: new Date().toISOString(),
    })
  }

  return operations
}

export function queueVoiceMemorySyncOperations(userId, operations = []) {
  const nextOperations = (Array.isArray(operations) ? operations : [operations]).filter(Boolean)

  if (!userId || nextOperations.length === 0) {
    return
  }

  writeQueue(userId, [...readQueue(userId), ...nextOperations])
}

export async function applyVoiceMemorySyncOperations(supabase, user, operations = []) {
  const safeOperations = (Array.isArray(operations) ? operations : []).filter(Boolean)

  for (const operation of safeOperations) {
    if (operation.kind === 'upsert' && Array.isArray(operation.records) && operation.records.length > 0) {
      const records = operation.records.map((record) => ({
        ...record,
        user_id: user.id,
        deleted_at: null,
      }))
      const { error } = await supabase
        .from(VOICE_MEMORY_SYNC_TABLE)
        .upsert(records, { onConflict: 'user_id,id' })

      if (error) {
        throw error
      }
    }

    if (operation.kind === 'delete' && Array.isArray(operation.ids) && operation.ids.length > 0) {
      const { error } = await supabase
        .from(VOICE_MEMORY_SYNC_TABLE)
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('id', operation.ids)

      if (error) {
        throw error
      }
    }
  }
}

export async function flushVoiceMemorySyncQueue(supabase, user) {
  const pendingOperations = readQueue(user?.id)

  if (!user?.id || pendingOperations.length === 0) {
    return { operationCount: 0 }
  }

  await applyVoiceMemorySyncOperations(supabase, user, pendingOperations)
  writeQueue(user.id, [])

  return { operationCount: pendingOperations.length }
}
