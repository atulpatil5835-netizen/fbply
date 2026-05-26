import { createClient } from '@supabase/supabase-js'

const defaultSupabaseUrl = 'https://klvdaxyearifahfynhkd.supabase.co'
const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function normalizeSupabaseUrl(url) {
  return String(url || '')
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '')
}

export const supabaseUrl = normalizeSupabaseUrl(configuredSupabaseUrl)
export const isSupabaseConfigured = Boolean(supabaseUrl)
export const hasSupabaseAnonKey = Boolean(supabaseAnonKey)

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      })
    : null

export const isSupabaseReady = Boolean(supabase)
