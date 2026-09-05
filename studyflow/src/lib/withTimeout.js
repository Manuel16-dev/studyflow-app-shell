// Wraps a promise so it rejects after `ms` instead of hanging forever.
// fetch() (which supabase-js sits on top of) has no built-in timeout — a
// stalled connection can otherwise sit pending indefinitely with zero
// feedback to the UI, which is what a frozen "Adding..." button actually is.
export function withTimeout(promise, ms = 15000, message = 'Request timed out. Check your connection and try again.') {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}
