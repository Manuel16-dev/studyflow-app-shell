import { supabase } from './supabaseClient'

// Every query here is RLS-scoped to auth.uid() automatically — no explicit
// user_id filter needed, same pattern as the rest of the stores.
export async function exportMyData() {
  const [profile, settings, subjects, cards, reviews, reviewLogs] = await Promise.all([
    supabase.from('profiles').select('*').maybeSingle(),
    supabase.from('settings').select('*').maybeSingle(),
    supabase.from('subjects').select('*'),
    supabase.from('cards').select('*'),
    supabase.from('reviews').select('*'),
    supabase.from('review_logs').select('*'),
  ])

  const firstError = [profile, settings, subjects, cards, reviews, reviewLogs].find((r) => r.error)?.error
  if (firstError) throw firstError

  const payload = {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    settings: settings.data,
    subjects: subjects.data,
    cards: cards.data,
    reviews: reviews.data,
    review_logs: reviewLogs.data,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `studyflow-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
