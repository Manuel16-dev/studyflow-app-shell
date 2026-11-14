// FSRS scheduler with an Anki-style card state machine (PRD section 19).
// Pure functions only: given a card's scheduling state + a rating, return
// the next state. No backend dependency; the real algorithm runs locally.
// Reference: https://github.com/open-spaced-repetition/fsrs4anki
//
// Two layers:
//   1. FSRS math decides stability / difficulty (how well the memory holds).
//   2. The state machine decides WHEN the card comes back:
//        new -> learning (short steps, minutes) -> review (days+)
//        review --Again--> relearning (short step) -> review
//      Learning and relearning cards come back within minutes, so a card
//      has to be recalled a couple of times before it earns a multi-day gap.
//
// The state is derivable from the stored fields (see inferState), so no
// database column is needed for it. Rules that keep that true:
//   - only a review card pressed Again counts as a lapse (lapses += 1)
//   - learning/relearning gaps are always under 12 hours, review gaps
//     are always at least 1 day (intervalDays clamps to >= 1)

export const Rating = { Again: 1, Hard: 2, Good: 3, Easy: 4 }
export const State = { New: 'new', Learning: 'learning', Review: 'review', Relearning: 'relearning' }

const MS_PER_MINUTE = 60 * 1000
const MS_PER_DAY = 86400000

// Short steps before a card graduates to day-based intervals. A card sits at
// one step at a time: `step` is the index of the step it is currently waiting
// out. New cards start at step 0 (about to be shown for the first time).
export const LEARNING_STEPS_MS = [1 * MS_PER_MINUTE, 10 * MS_PER_MINUTE]
export const RELEARNING_STEPS_MS = [10 * MS_PER_MINUTE]
const MAX_STEP_GAP_MS = 12 * 60 * MS_PER_MINUTE // anything shorter is a learning/relearning gap

// 19-parameter weight set. w17/w18 are the same-day stability parameters
// (FSRS-5), used when a card is reviewed again within a day.
const W = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616,
  0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034, 0.6567,
]

const DECAY = -0.5
const FACTOR = 0.9 ** (1 / DECAY) - 1 // ≈ 19/81
const DEFAULT_REQUEST_RETENTION = 0.9 // fallback if the caller doesn't pass the user's setting
const MAX_INTERVAL_DAYS = 36500

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

// Reviews less than a day after the last one (learning steps). The memory
// has barely had time to fade, so the normal recall formula would give
// nonsense; this one nudges stability up for Good/Easy and down for Again.
function nextStabilitySameDay(stability, rating) {
  const next = stability * Math.exp(W[17] * (rating - 3 + W[18]))
  return rating >= Rating.Good ? Math.max(next, stability) : next
}

function intervalDays(stability, requestRetention) {
  const days = (stability / FACTOR) * (requestRetention ** (1 / DECAY) - 1)
  return clamp(Math.round(days), 1, MAX_INTERVAL_DAYS)
}

/**
 * Create the scheduling state for a card that has never been reviewed.
 */
export function newCardState() {
  return {
    state: State.New,
    step: 0,
    stability: null,
    difficulty: null,
    reps: 0,
    lapses: 0,
    due: null,
    lastReview: null,
  }
}

/**
 * Work out a card's state from its stored fields alone (the database keeps
 * stability / due / last_review / lapses, not the state itself).
 */
export function inferState(s) {
  if (s.stability == null) return State.New
  const gap = s.due != null && s.lastReview != null ? s.due - s.lastReview : Infinity
  if (gap < MAX_STEP_GAP_MS) return s.lapses > 0 ? State.Relearning : State.Learning
  return State.Review
}

/**
 * Which learning step a card is waiting out, worked out from the gap that
 * was scheduled. Only learning cards have more than one step.
 */
export function inferStep(s) {
  if (inferState(s) !== State.Learning) return 0
  const gap = s.due - s.lastReview
  let best = 0
  LEARNING_STEPS_MS.forEach((ms, i) => {
    if (Math.abs(ms - gap) < Math.abs(LEARNING_STEPS_MS[best] - gap)) best = i
  })
  return best
}

/**
 * Given a card's current scheduling state and a rating, return the next
 * state plus metadata (interval in days, next due date).
 * `now` defaults to Date.now() and is injectable for testing.
 */
export function schedule(state, rating, now = Date.now(), requestRetention = DEFAULT_REQUEST_RETENTION) {
  const isNew = state.stability == null
  const phase = isNew ? State.New : (state.state ?? inferState(state))
  const elapsedDays = isNew || !state.lastReview ? 0 : (now - state.lastReview) / MS_PER_DAY
  const r = isNew ? 1 : retrievability(elapsedDays, state.stability)

  // --- 1. FSRS math: how strong is the memory after this answer? ---
  let difficulty
  let stability

  if (isNew) {
    difficulty = initialDifficulty(rating)
    stability = initialStability(rating)
  } else {
    difficulty = nextDifficulty(state.difficulty, rating)
    if (elapsedDays < 1) {
      stability = nextStabilitySameDay(state.stability, rating)
    } else if (rating === Rating.Again) {
      stability = nextStabilityOnLapse(difficulty, state.stability, r)
    } else {
      stability = nextStabilityOnRecall(difficulty, state.stability, r, rating)
    }
  }
  stability = Math.max(stability, 0.1)

  // --- 2. State machine: where does the card go next? ---
  const stay = (nextState, steps, step) => ({
    state: nextState,
    step,
    intervalDays: 0,
    dueInMs: steps[step],
  })
  const graduate = () => {
    const days = intervalDays(stability, requestRetention)
    return { state: State.Review, step: 0, intervalDays: days, dueInMs: days * MS_PER_DAY }
  }

  let next
  let lapsed = false
  if (phase === State.Review) {
    if (rating === Rating.Again) {
      lapsed = true
      next = stay(State.Relearning, RELEARNING_STEPS_MS, 0)
    } else {
      next = graduate()
    }
  } else {
    const relearning = phase === State.Relearning
    const steps = relearning ? RELEARNING_STEPS_MS : LEARNING_STEPS_MS
    const inPhase = relearning ? State.Relearning : State.Learning
    const step = Math.min(state.step ?? 0, steps.length - 1)

    if (rating === Rating.Easy) next = graduate()
    else if (rating === Rating.Again) next = stay(inPhase, steps, 0)
    else if (rating === Rating.Hard) next = stay(inPhase, steps, step)
    else next = step + 1 < steps.length ? stay(inPhase, steps, step + 1) : graduate()
  }

  return {
    state: {
      state: next.state,
      step: next.step,
      stability,
      difficulty,
      reps: state.reps + 1,
      lapses: state.lapses + (lapsed ? 1 : 0),
      due: now + next.dueInMs,
      lastReview: now,
    },
    intervalDays: next.intervalDays,
    dueInMs: next.dueInMs,
  }
}
