import { normalizeCurrency, normalizeMoney } from './money'
import { safeStorageGet, safeStorageSet } from './storage'

export const PROFILE_SYNC_TABLE = 'user_profiles'
export const PROFILE_SYNC_VERSION = 'v1'
export const PROFILE_SYNC_COLUMNS = 'user_id, display_name, currency, salary_day, monthly_income, setup_completed, created_at, updated_at'

function clampSalaryDay(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.round(parsed), 1), 31) : 1
}

function profileMigrationKey(userId) {
  return `fbply-profile-sync-${PROFILE_SYNC_VERSION}-${userId}`
}

export function hasProfileMigrationRun(userId) {
  return Boolean(userId) && safeStorageGet(profileMigrationKey(userId), 'false') === 'true'
}

export function markProfileMigrationRun(userId) {
  if (!userId) {
    return
  }

  safeStorageSet(profileMigrationKey(userId), 'true')
}

export function hasLocalProfileData(profile = {}, setupCompleted = false) {
  return Boolean(
    setupCompleted ||
    String(profile.name || '').trim() ||
    String(profile.email || '').trim() ||
    normalizeMoney(profile.income) > 0 ||
    profile.currency ||
    profile.salaryDay,
  )
}

export function cloudRowToProfile(row = {}, fallbackProfile = {}, fallbackSetupCompleted = false) {
  const hasIncome = row.monthly_income !== null && row.monthly_income !== undefined
  const hasName = row.display_name !== null && row.display_name !== undefined
  const hasSetup = row.setup_completed !== null && row.setup_completed !== undefined

  return {
    profile: {
      ...fallbackProfile,
      name: hasName ? String(row.display_name || '') : fallbackProfile.name,
      currency: normalizeCurrency(row.currency || fallbackProfile.currency),
      salaryDay: clampSalaryDay(row.salary_day || fallbackProfile.salaryDay),
      income: hasIncome ? normalizeMoney(row.monthly_income) : normalizeMoney(fallbackProfile.income),
    },
    setupCompleted: hasSetup ? Boolean(row.setup_completed) : Boolean(fallbackSetupCompleted),
  }
}

export function profileToCloudPayload(user, profile = {}, setupCompleted = false) {
  return {
    user_id: user.id,
    display_name: String(profile.name || user.user_metadata?.name || user.user_metadata?.full_name || '').trim(),
    currency: normalizeCurrency(profile.currency),
    salary_day: clampSalaryDay(profile.salaryDay),
    monthly_income: normalizeMoney(profile.income),
    setup_completed: Boolean(setupCompleted),
  }
}

export async function loadCloudProfile(supabase, userId) {
  const { data, error } = await supabase
    .from(PROFILE_SYNC_TABLE)
    .select(PROFILE_SYNC_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

export async function saveCloudProfile(supabase, payload) {
  const { data, error } = await supabase
    .from(PROFILE_SYNC_TABLE)
    .upsert(payload, { onConflict: 'user_id' })
    .select(PROFILE_SYNC_COLUMNS)
    .single()

  if (error) {
    throw error
  }

  return data
}
