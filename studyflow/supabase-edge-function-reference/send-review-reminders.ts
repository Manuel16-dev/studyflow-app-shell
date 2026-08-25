// Cron-triggered Edge Function (see the pg_cron job set up in Supabase).
// Not user-facing — only pg_cron should ever call this, verified via the
// x-cron-secret header (checked against the CRON_SECRET env var) rather
// than a user JWT, since there's no signed-in user for a scheduled job.
//
// Logic: ask get_due_push_targets() (a Postgres function — see migration
// add_review_reminder_query_functions) who currently qualifies for a
// review-due push (push enabled, reminders on, cards due, outside quiet
// hours, not reminded in the last 3h), then send each one a Web Push
// notification and mark them as reminded so we don't repeat within 3h.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!

webpush.setVapidDetails('mailto:studyflow@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: targets, error } = await supabase.rpc('get_due_push_targets')
  if (error) {
    console.error('get_due_push_targets failed:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const target of targets ?? []) {
    const subscription = {
      endpoint: target.endpoint,
      keys: { p256dh: target.p256dh, auth: target.auth },
    }
    const payload = JSON.stringify({
      title: 'Cards are waiting for you',
      body: `${target.due_count} card${target.due_count === 1 ? '' : 's'} due for review.`,
      url: '/review',
    })

    try {
      await webpush.sendNotification(subscription, payload)
      await supabase.rpc('mark_review_reminder_sent', { p_user_id: target.user_id })
      sent += 1
    } catch (err) {
      failed += 1
      // 410/404 = the browser unsubscribed or the subscription expired —
      // clean it up so future runs stop wasting a push attempt on it.
      const status = err?.statusCode
      if (status === 404 || status === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', target.endpoint)
      } else {
        console.error('push send failed for', target.endpoint, err)
      }
    }
  }

  return new Response(JSON.stringify({ sent, failed, candidates: targets?.length ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
