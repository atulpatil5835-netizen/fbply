import { normalizeMoney } from './money'
import { normalizeRecurringSchedule, normalizeRecurringSchedules } from './recurringSchedule'
import { safeStorageGet, safeStorageSet } from './storage'

export const COMMITMENT_SYNC_TABLE = 'user_commitments'
export const COMMITMENT_SYNC_VERSION = 'v1'
export const COMMITMENT_SYNC_COLUMNS =
  'id, user_id, local_id, source, commitment_type, schedule_type, direction, name, amount, frequency, due_day, start_date, note, paused, position, created_at, updated_at, deleted_at'

const PROFILE_SOURCE = 'profile_commitment'
const SCHEDULE_SOURCE = 'recurring_schedule'
const commitmentSources = [PROFILE_SOURCE, SCHEDULE_SOURCE]
const commitmentDirections = ['incoming', 'outgoing']
const commitmentFrequencies = ['monthly', 'weekly', 'quarterly', 'yearly']

function commitmentMigrationKey(userId) {
  return `fbply-commitments-sync-${COMMITMENT_SYNC_VERSION}-${userId}`
}

function commitmentQueueKey(userId) {
  return `fbply-commitments-sync-queue-${COMMITMENT_SYNC_VERSION}-${userId}`
}

function cleanText(value) {
  return String(value || '').trim()
}

function normalizeSource(source) {
  return commitmentSources.includes(source) ? source : PROFILE_SOURCE
}

function normalizeDirection(direction, scheduleType = '') {
  if (commitmentDirections.includes(direction)) {
    return direction
  }

  return scheduleType === 'Salary' ? 'incoming' : 'outgoing'
}

function normalizeFrequency(frequency) {
  return commitmentFrequencies.includes(frequency) ? frequency : 'monthly'
}

function normalizeDueDay(value) {
  const day = Number(value)
  return Number.isFinite(day) && day >= 1 ? Math.min(Math.round(day), 31) : null
}

function cleanDateKey(value) {
  const clean = String(value || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : null
}

function parseLocalIdFromCloudId(id, source) {
  const prefix = `${source}:`
  const cleanId = cleanText(id)
  return cleanId.startsWith(prefix) ? cleanId.slice(prefix.length) : cleanId
}

function cloudIdFor(source, localId) {
  return `${source}:${localId}`
}

function fallbackId(source, index) {
  return `${source}-${index}`
}

function commitmentTypeFor({ name = '', scheduleType = '', direction = 'outgoing' } = {}) {
  const lowerName = cleanText(name).toLowerCase()

  if (direction === 'incoming' || scheduleType === 'Salary') {
    return 'Recurring Income'
  }

  if (scheduleType === 'Rent' || /\b(rent|home|housing)\b/.test(lowerName)) {
    return 'Rent'
  }

  if (scheduleType === 'EMI' || /\b(emi|loan|installment|instalment|finance|bnpl)\b/.test(lowerName)) {
    return 'EMI'
  }

  if (/\b(mobile|phone|cellular|recharge)\b/.test(lowerName)) {
    return 'Mobile Bill'
  }

  if (/\b(internet|broadband|wifi|wi-fi|fiber|fibre)\b/.test(lowerName)) {
    return 'Internet Bill'
  }

  if (/\b(electricity|power|light bill|utility bill)\b/.test(lowerName)) {
    return 'Electricity'
  }

  if (
    scheduleType === 'Subscription' ||
    /\b(subscription|netflix|prime|spotify|hotstar|youtube|saas)\b/.test(lowerName)
  ) {
    return 'Subscriptions'
  }

  if (scheduleType === 'Utilities' || scheduleType === 'Insurance') {
    return 'Recurring Expenses'
  }

  return 'Other Commitments'
}

function scheduleTypeFromCommitmentType(commitmentType) {
  if (commitmentType === 'Rent') {
    return 'Rent'
  }

  if (commitmentType === 'EMI') {
    return 'EMI'
  }

  if (commitmentType === 'Subscriptions') {
    return 'Subscription'
  }

  if (commitmentType === 'Recurring Income') {
    return 'Salary'
  }

  if (['Electricity', 'Internet Bill', 'Mobile Bill', 'Recurring Expenses'].includes(commitmentType)) {
    return 'Utilities'
  }

  return 'Custom'
}

function readQueue(userId) {
  if (!userId) {
    return []
  }

  try {
    const parsed = JSON.parse(safeStorageGet(commitmentQueueKey(userId), '[]'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(userId, queue) {
  if (!userId) {
    return
  }

  safeStorageSet(commitmentQueueKey(userId), JSON.stringify(Array.isArray(queue) ? queue : []))
}

export function hasCommitmentMigrationRun(userId) {
  return Boolean(userId) && safeStorageGet(commitmentMigrationKey(userId), 'false') === 'true'
}

export function markCommitmentMigrationRun(userId) {
  if (!userId) {
    return
  }

  safeStorageSet(commitmentMigrationKey(userId), 'true')
}

export function readCommitmentSyncQueue(userId) {
  return readQueue(userId)
}

export function appendCommitmentSyncQueue(userId, operations = []) {
  const nextOperations = (Array.isArray(operations) ? operations : [operations]).filter(Boolean)

  if (!userId || nextOperations.length === 0) {
    return
  }

  writeQueue(userId, [...readQueue(userId), ...nextOperations])
}

export function clearCommitmentSyncQueue(userId) {
  writeQueue(userId, [])
}

export function normalizeProfileCommitment(item = {}, index = 0) {
  const localId = cleanText(item.id || item.key || fallbackId('commitment', index))
  const name = cleanText(item.name ?? item.label ?? '') || 'Monthly bill'
  const dueDay = normalizeDueDay(item.dueDay || item.paymentDay)

  return {
    id: localId,
    name,
    amount: normalizeMoney(item.amount),
    dueDay: dueDay || undefined,
    recurrence: normalizeFrequency(item.recurrence || item.frequency),
  }
}

export function normalizeProfileCommitments(profileOrItems = {}) {
  const safeProfileOrItems = profileOrItems && typeof profileOrItems === 'object' ? profileOrItems : {}
  const source = Array.isArray(safeProfileOrItems)
    ? profileOrItems
    : Array.isArray(safeProfileOrItems.commitments) && safeProfileOrItems.commitments.length > 0
      ? safeProfileOrItems.commitments
      : safeProfileOrItems.fixedExpenses || []

  return (Array.isArray(source) ? source : [])
    .map((item, index) => {
      const hasData = Boolean(
        item?.id ||
        item?.key ||
        cleanText(item?.name ?? item?.label) ||
        normalizeMoney(item?.amount) > 0,
      )

      return hasData ? normalizeProfileCommitment(item, index) : null
    })
    .filter(Boolean)
}

function normalizeSyncRecord(record = {}, index = 0) {
  const source = normalizeSource(record.source)
  const localId = cleanText(
    record.localId ||
    record.local_id ||
    parseLocalIdFromCloudId(record.id, source) ||
    fallbackId(source, index),
  )
  const scheduleType = cleanText(record.scheduleType || record.schedule_type)
  const direction = normalizeDirection(record.direction, scheduleType)
  const name = cleanText(record.name) || 'Recurring item'
  const frequency = normalizeFrequency(record.frequency || record.recurrence)
  const dueDay = normalizeDueDay(record.dueDay || record.due_day)
  const startDate = cleanDateKey(record.startDate || record.start_date)
  const commitmentType = cleanText(record.commitmentType || record.commitment_type) ||
    commitmentTypeFor({ name, scheduleType, direction })
  const recordId = cleanText(record.id)
  const id = recordId.startsWith(`${source}:`) ? recordId : cloudIdFor(source, localId)

  return {
    id,
    localId,
    source,
    commitmentType,
    scheduleType: scheduleType || null,
    direction,
    name,
    amount: normalizeMoney(record.amount),
    frequency,
    dueDay,
    startDate,
    note: cleanText(record.note),
    paused: Boolean(record.paused),
    position: Number.isFinite(Number(record.position)) ? Number(record.position) : index,
  }
}

export function buildCommitmentSyncRecords({ profile = {}, recurringSchedules = [] } = {}) {
  const profileRecords = normalizeProfileCommitments(profile).map((commitment, index) => {
    const direction = 'outgoing'

    return normalizeSyncRecord({
      id: cloudIdFor(PROFILE_SOURCE, commitment.id),
      localId: commitment.id,
      source: PROFILE_SOURCE,
      commitmentType: commitmentTypeFor({ name: commitment.name, direction }),
      direction,
      name: commitment.name,
      amount: commitment.amount,
      frequency: commitment.recurrence,
      dueDay: commitment.dueDay,
      position: index,
    }, index)
  })
  const scheduleRecords = normalizeRecurringSchedules(recurringSchedules).map((schedule, index) => {
    const normalized = normalizeRecurringSchedule(schedule, index)

    return normalizeSyncRecord({
      id: cloudIdFor(SCHEDULE_SOURCE, normalized.id),
      localId: normalized.id,
      source: SCHEDULE_SOURCE,
      commitmentType: commitmentTypeFor({
        name: normalized.name,
        scheduleType: normalized.type,
        direction: normalized.direction,
      }),
      scheduleType: normalized.type,
      direction: normalized.direction,
      name: normalized.name,
      amount: normalized.amount,
      frequency: normalized.frequency,
      dueDay: normalized.dueDay,
      startDate: normalized.startDate,
      note: normalized.note,
      paused: normalized.paused,
      position: index,
    }, profileRecords.length + index)
  })

  return [...profileRecords, ...scheduleRecords]
}

function syncRecordToCloudPayload(user, record = {}) {
  const normalized = normalizeSyncRecord(record)

  return {
    id: normalized.id,
    user_id: user.id,
    local_id: normalized.localId,
    source: normalized.source,
    commitment_type: normalized.commitmentType,
    schedule_type: normalized.scheduleType,
    direction: normalized.direction,
    name: normalized.name,
    amount: normalized.amount,
    frequency: normalized.frequency,
    due_day: normalized.dueDay,
    start_date: normalized.startDate,
    note: normalized.note || null,
    paused: normalized.paused,
    position: normalized.position,
    deleted_at: null,
  }
}

function cloudRowToSyncRecord(row = {}, index = 0) {
  const source = normalizeSource(row.source)
  const localId = cleanText(row.local_id || parseLocalIdFromCloudId(row.id, source) || fallbackId(source, index))

  return normalizeSyncRecord({
    id: row.id || cloudIdFor(source, localId),
    localId,
    source,
    commitmentType: row.commitment_type,
    scheduleType: row.schedule_type,
    direction: row.direction,
    name: row.name,
    amount: row.amount,
    frequency: row.frequency,
    dueDay: row.due_day,
    startDate: row.start_date,
    note: row.note,
    paused: row.paused,
    position: row.position,
  }, index)
}

function syncRecordsToCommitmentState(records = []) {
  const sortedRecords = (Array.isArray(records) ? records : [])
    .map(normalizeSyncRecord)
    .sort((first, second) => {
      if (first.source !== second.source) {
        return first.source === PROFILE_SOURCE ? -1 : 1
      }

      return first.position - second.position || first.name.localeCompare(second.name)
    })

  const profileCommitments = sortedRecords
    .filter((record) => record.source === PROFILE_SOURCE)
    .map((record) => ({
      id: record.localId,
      name: record.name,
      amount: record.amount,
      dueDay: record.dueDay || undefined,
      recurrence: record.frequency,
    }))
  const recurringSchedules = normalizeRecurringSchedules(
    sortedRecords
      .filter((record) => record.source === SCHEDULE_SOURCE)
      .map((record) => ({
        id: record.localId,
        name: record.name,
        amount: record.amount,
        type: record.scheduleType || scheduleTypeFromCommitmentType(record.commitmentType),
        direction: record.direction,
        frequency: record.frequency,
        dueDay: record.dueDay || 1,
        startDate: record.startDate || undefined,
        note: record.note,
        paused: record.paused,
      })),
  )

  return {
    profileCommitments,
    recurringSchedules,
    syncRecords: sortedRecords,
  }
}

export function cloudRowsToCommitmentState(rows = []) {
  const syncRecords = (Array.isArray(rows) ? rows : [])
    .filter((row) => !row.deleted_at)
    .map(cloudRowToSyncRecord)

  return syncRecordsToCommitmentState(syncRecords)
}

export function hasLocalCommitmentData(state = {}) {
  return buildCommitmentSyncRecords(state).length > 0
}

export function commitmentSyncFingerprint(record = {}) {
  const normalized = normalizeSyncRecord(record)

  return JSON.stringify({
    id: normalized.id,
    localId: normalized.localId,
    source: normalized.source,
    commitmentType: normalized.commitmentType,
    scheduleType: normalized.scheduleType,
    direction: normalized.direction,
    name: normalized.name,
    amount: normalized.amount,
    frequency: normalized.frequency,
    dueDay: normalized.dueDay,
    startDate: normalized.startDate,
    note: normalized.note,
    paused: normalized.paused,
    position: normalized.position,
  })
}

export function diffCommitmentState(previousRecords = [], nextState = {}) {
  const previousById = new Map(
    (Array.isArray(previousRecords) ? previousRecords : [])
      .map(normalizeSyncRecord)
      .map((record) => [record.id, record]),
  )
  const nextRecords = buildCommitmentSyncRecords(nextState)
  const nextById = new Map(nextRecords.map((record) => [record.id, record]))
  const upserts = []
  const deletes = []

  nextById.forEach((record, id) => {
    const previousRecord = previousById.get(id)

    if (!previousRecord || commitmentSyncFingerprint(previousRecord) !== commitmentSyncFingerprint(record)) {
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

export async function loadCloudCommitments(supabase, userId) {
  const { data, error } = await supabase
    .from(COMMITMENT_SYNC_TABLE)
    .select(COMMITMENT_SYNC_COLUMNS)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('source', { ascending: true })
    .order('position', { ascending: true })
    .order('updated_at', { ascending: true })

  if (error) {
    throw error
  }

  return cloudRowsToCommitmentState(data || [])
}

export async function saveCloudCommitments(supabase, user, state = {}) {
  const records = buildCommitmentSyncRecords(state)
  const payloads = records.map((record) => syncRecordToCloudPayload(user, record))

  if (payloads.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from(COMMITMENT_SYNC_TABLE)
    .upsert(payloads, { onConflict: 'user_id,id' })
    .select(COMMITMENT_SYNC_COLUMNS)

  if (error) {
    throw error
  }

  return data || []
}

export async function softDeleteCloudCommitments(supabase, userId, records = []) {
  const ids = (Array.isArray(records) ? records : [])
    .map(normalizeSyncRecord)
    .map((record) => record.id)

  if (ids.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from(COMMITMENT_SYNC_TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('id', ids)
    .select(COMMITMENT_SYNC_COLUMNS)

  if (error) {
    throw error
  }

  return data || []
}

export function buildCommitmentSyncOperations(user, { upserts = [], deletes = [] } = {}) {
  const operations = []

  if (upserts.length > 0) {
    operations.push({
      kind: 'upsert',
      records: upserts.map((record) => syncRecordToCloudPayload(user, record)),
      queuedAt: new Date().toISOString(),
    })
  }

  if (deletes.length > 0) {
    operations.push({
      kind: 'delete',
      ids: deletes.map((record) => normalizeSyncRecord(record).id),
      queuedAt: new Date().toISOString(),
    })
  }

  return operations
}

export async function applyCommitmentSyncOperations(supabase, user, operations = []) {
  const safeOperations = (Array.isArray(operations) ? operations : []).filter(Boolean)

  for (const operation of safeOperations) {
    if (operation.kind === 'upsert' && Array.isArray(operation.records) && operation.records.length > 0) {
      const records = operation.records.map((record) => ({
        ...record,
        user_id: user.id,
        deleted_at: null,
      }))
      const { error } = await supabase
        .from(COMMITMENT_SYNC_TABLE)
        .upsert(records, { onConflict: 'user_id,id' })

      if (error) {
        throw error
      }
    }

    if (operation.kind === 'delete' && Array.isArray(operation.ids) && operation.ids.length > 0) {
      const { error } = await supabase
        .from(COMMITMENT_SYNC_TABLE)
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('id', operation.ids)

      if (error) {
        throw error
      }
    }
  }
}
