// FSRS-4.5 scheduler — same algorithm family used by Anki's FSRS add-on.
// Pure functions only: given a card's scheduling state + a rating, return
// the next state. No backend dependency; this is the real algorithm running
// locally so the review loop is functionally correct pre-backend.
// Reference: https://github.com/open-spaced-repetition/fsrs4anki

export const Rating = { Again: 1, Hard: 2, Good: 3, Easy: 4 }

// Default FSRS-4.5 weights (w0..w18), trained on the community benchmark dataset.
const W = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616,
  0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034, 0.6567,
]

const DECAY = -0.5
const FACTOR = 0.9 ** (1 / DECAY) - 1 // ≈ 19/81
const DEFAULT_REQUEST_RETENTION = 0.9 // fallback if the caller doesn't pass the user's setting
const MAX_INTERVAL_DAYS = 36500
const MS_PER_DAY = 86400000

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function initialStability(rating) {
  return Math.max(W[rating - 1], 0.1)
}

function initialDifficulty(rating) {
  return clamp(W[4] - (rating - 3) * W[5], 1, 10)
}

function nextDifficulty(difficulty, rating) {
  const delta = -W[6] * (rating - 3)
  const updated = difficulty + delta * ((10 - difficulty) / 9)
  const meanReverted = W[7] * initialDifficulty(Rating.Easy) + (1 - W[7]) * updated
  return clamp(meanReverted, 1, 10)
}

// Predicted probability of recall right now, given elapsed days and stability.
export function retrievability(elapsedDays, stability) {
  if (stability <= 0) return 0
  return (1 + (FACTOR * elapsedDays) / stability) ** DECAY
}

function nextStabilityOnRecall(difficulty, stability, r, rating) {
  const hardPenalty = rating === Rating.Hard ? W[15] : 1
  const easyBonus = rating === Rating.Easy ? W[16] : 1
  const growth =
    Math.exp(W[8]) *
    (11 - difficulty) *
    stability ** -W[9] *
    (Math.exp((1 - r) * W[10]) - 1) *
    hardPenalty *
    easyBonus
  return stability * (1 + growth)
}

function nextStabilityOnLapse(difficulty, stability, r) {
  return (
    W[11] *
    difficulty ** -W[12] *
    ((stability + 1) ** W[13] - 1) *
    Math.exp((1 - r) * W[14])
  )
}

function intervalDays(stability, requestRetention) {
  const days = (stability / FACTOR) * (requestRetention ** (1 / DECAY) - 1)
  return clamp(Math.round(days), 1, MAX_INTERVAL_DAYS)
}

/**
 * Create the scheduling state for a card that has never been reviewed.
 */
export function newCardState() {
  return { stability: null, difficulty: null, reps: 0, lapses: 0, due: null, lastReview: null }
}

/**
 * Given a card's current scheduling state and a rating, return the next
 * state plus metadata (interval in days, next due date).
 * `now` defaults to Date.now() and is injectable for testing.
 */
export function schedule(state, rating, now = Date.now(), requestRetention = DEFAULT_REQUEST_RETENTION) {
  const isNew = state.stability == null
  const elapsedDays = isNew || !state.lastReview ? 0 : (now - state.lastReview) / MS_PER_DAY
  const r = isNew ? 1 : retrievability(elapsedDays, state.stability)

  let difficulty
  let stability

  if (isNew) {
    difficulty = initialDifficulty(rating)
    stability = initialStability(rating)
  } else {
    difficulty = nextDifficulty(state.difficulty, rating)
    stability =
      rating === Rating.Again
        ? nextStabilityOnLapse(difficulty, state.stability, r)
        : nextStabilityOnRecall(difficulty, state.stability, r, rating)
  }
  stability = Math.max(stability, 0.1)

  // "Again" drops the card into a short relearning step rather than a
  // multi-day interval, matching standard FSRS/Anki behavior — but S/D are
  // still updated above so the *next* successful review schedules correctly.
  const isRelearning = rating === Rating.Again
  const dueInMs = isRelearning ? 10 * 60 * 1000 : intervalDays(stability, requestRetention) * MS_PER_DAY

  return {
    state: {
      stability,
      difficulty,
      reps: state.reps + 1,
      lapses: state.lapses + (rating === Rating.Again ? 1 : 0),
      due: now + dueInMs,
      lastReview: now,
    },
    intervalDays: isRelearning ? 0 : intervalDays(stability, requestRetention),
    dueInMs,
  }
}

/**
 * Preview the resulting interval for all four ratings without committing —
 * used to show "Again / Hard / Good / Easy" buttons with their predicted
 * next-review time, the way Anki does.
 */
export function previewIntervals(state, now = Date.now(), requestRetention = DEFAULT_REQUEST_RETENTION) {
  const preview = {}
  for (const [label, rating] of Object.entries(Rating)) {
    preview[label.toLowerCase()] = schedule(state, rating, now, requestRetention).dueInMs
  }
  return preview
}

/**
 * Human-readable interval label from a duration in ms, e.g. "<10 min",
 * "4 days", "3 months".
 */
export function formatDue(ms) {
  const minutes = ms / 60000
  if (minutes < 60) return minutes <= 10 ? '<10 min' : `${Math.round(minutes)} min`
  const hours = minutes / 60
  if (hours < 24) return `${Math.round(hours)}h`
  const days = Math.round(hours / 24)
  if (days < 30) return days === 1 ? '1 day' : `${days} days`
  const months = Math.round(days / 30)
  if (months < 12) return months === 1 ? '1 month' : `${months} months`
  const years = Math.round(days / 365)
  return years === 1 ? '1 year' : `${years} years`
}
