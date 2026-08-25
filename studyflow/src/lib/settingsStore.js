// Settings, backed by Supabase (`settings` table, one row per user, created
// automatically by the handle_new_user trigger on signup).
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'

function rowToSettings(row) {
  if (!row) return null
  return { studyBehavior: row.study_behavior, notifications: row.notifications, appearance: row.appearance }
}

const columnMap = { studyBehavior: 'study_behavior', notifications: 'notifications', appearance: 'appearance' }

export async function getSettings() {
  const userId = await requireUserId()
  const { data, error } = await supabase.from('settings').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return rowToSettings(data)
}

// Shallow-merges a patch into one section (studyBehavior | notifications | appearance).
export async function updateSettingsSection(section, patch) {
  const userId = await requireUserId()
  const column = columnMap[section]
  const current = await getSettings()
  const merged = { ...(current?.[section] ?? {}), ...patch }
  const { error } = await supabase
    .from('settings')
    .update({ [column]: merged, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) throw error
  return getSettings()
}

const TEXT_SIZE_CLASSES = ['text-size-small', 'text-size-medium', 'text-size-large']

// Applies appearance.textSize to <html> as a class so Tailwind's rem-based
// text utilities scale app-wide (see index.css). Called both on load
// (AuthContext, as soon as a session exists) and on live change (Settings)
// so the setting takes effect immediately either way.
export function applyTextSizeClass(size) {
  const root = document.documentElement
  TEXT_SIZE_CLASSES.forEach((c) => root.classList.remove(c))
  root.classList.add(`text-size-${size ?? 'medium'}`)
}

// Applies appearance.theme by toggling the `dark` class on <html> (see
// index.css for the remapped --color-* tokens under html.dark). 'system'
// follows the OS preference and stays in sync if the user changes it
// mid-session; 'light'/'dark' are explicit overrides. Called on load
// (AuthContext) and on live change (Settings), same pattern as
// applyTextSizeClass above.
//
// Also caches the raw choice to localStorage (not the resolved boolean) so
// bootstrapThemeFromCache() can apply it synchronously before React mounts
// and before Supabase resolves a session — otherwise every page load,
// including the pre-login screen, flashes light mode first.
const THEME_CACHE_KEY = 'studyflow-theme-cache'
let systemThemeMedia = null
let systemThemeHandler = null

export function applyThemeClass(theme) {
  const root = document.documentElement

  try {
    localStorage.setItem(THEME_CACHE_KEY, theme ?? 'light')
  } catch {
    // localStorage unavailable (private browsing, etc.) — cache is
    // best-effort, theme still applies correctly for this session.
  }

  if (systemThemeMedia && systemThemeHandler) {
    systemThemeMedia.removeEventListener('change', systemThemeHandler)
    systemThemeMedia = null
    systemThemeHandler = null
  }

  if (theme === 'system') {
    systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)')
    systemThemeHandler = (e) => root.classList.toggle('dark', e.matches)
    systemThemeMedia.addEventListener('change', systemThemeHandler)
    root.classList.toggle('dark', systemThemeMedia.matches)
    return
  }

  root.classList.toggle('dark', theme === 'dark')
}

// Synchronous, no Supabase call — reads the last-known theme choice from
// localStorage (written by applyThemeClass above) and applies it
// immediately. Call this from main.jsx before React renders. Falls back to
// 'system' preference if nothing's cached yet (first-ever visit, or
// storage that got cleared) rather than assuming light.
export function bootstrapThemeFromCache() {
  let cached = null
  try {
    cached = localStorage.getItem(THEME_CACHE_KEY)
  } catch {
    // ignore — falls through to system preference below
  }
  applyThemeClass(cached ?? 'system')
}
