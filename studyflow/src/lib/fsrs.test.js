import { describe, it, expect } from 'vitest'
import {
  Rating,
  State,
  LEARNING_STEPS_MS,
  RELEARNING_STEPS_MS,
  newCardState,
  schedule,
  retrievability,
  inferState,
  inferStep,
} from './fsrs'

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0)
const MIN = 60 * 1000
const DAY = 86400000
const { Again, Hard, Good, Easy } = Rating

// The fields the database actually stores (no state / step).
const stored = (s) => ({
  stability: s.stability,
  difficulty: s.difficulty,
  reps: s.reps,
  lapses: s.lapses,
  due: s.due,
  lastReview: s.lastReview,
})

// Drive a card through ratings, reviewing each time exactly when it is due.
function run(ratings, start = newCardState(), t0 = NOW) {
  let card = start
  let now = t0
  const trail = []
  for (const rating of ratings) {
    const result = schedule(card, rating, now)
    card = result.state
    trail.push(result)
    now = card.due
  }
  return { card, trail, now }
}

// A graduated card, reviewed again exactly on its due date.
function reviewCard() {
  const { card } = run([Good, Good]) // new -> learning -> review
  return card
}

describe('new card', () => {
  it('starts as new with no scheduling data', () => {
    const c = newCardState()
    expect(c).toMatchObject({ state: State.New, step: 0, stability: null, reps: 0, lapses: 0, due: null })
  })

  it('Again goes to the first learning step', () => {
    const { state, intervalDays, dueInMs } = schedule(newCardState(), Again, NOW)
    expect(state).toMatchObject({ state: State.Learning, step: 0, reps: 1, lapses: 0 })
    expect(dueInMs).toBe(LEARNING_STEPS_MS[0])
    expect(intervalDays).toBe(0)
    expect(state.due).toBe(NOW + LEARNING_STEPS_MS[0])
  })

  it('Hard stays on the first learning step', () => {
    const { state } = schedule(newCardState(), Hard, NOW)
    expect(state).toMatchObject({ state: State.Learning, step: 0 })
  })

  it('Good moves to the second learning step', () => {
    const { state, dueInMs } = schedule(newCardState(), Good, NOW)
    expect(state).toMatchObject({ state: State.Learning, step: 1 })
    expect(dueInMs).toBe(LEARNING_STEPS_MS[1])
  })

  it('Easy graduates straight to review with a day-based interval', () => {
    const { state, intervalDays } = schedule(newCardState(), Easy, NOW)
    expect(state.state).toBe(State.Review)
    expect(intervalDays).toBeGreaterThanOrEqual(1)
    expect(state.due).toBe(NOW + intervalDays * DAY)
  })

  it('sets a valid initial stability and difficulty for every rating', () => {
    for (const rating of [Again, Hard, Good, Easy]) {
      const { state } = schedule(newCardState(), rating, NOW)
      expect(state.stability).toBeGreaterThanOrEqual(0.1)
      expect(state.difficulty).toBeGreaterThanOrEqual(1)
      expect(state.difficulty).toBeLessThanOrEqual(10)
    }
  })

  it('a harder first answer starts at a higher difficulty', () => {
    const d = (r) => schedule(newCardState(), r, NOW).state.difficulty
    expect(d(Again)).toBeGreaterThan(d(Hard))
    expect(d(Hard)).toBeGreaterThan(d(Good))
    expect(d(Good)).toBeGreaterThan(d(Easy))
  })
})

describe('learning steps', () => {
  it('Good on the last learning step graduates to review', () => {
    const { card } = run([Good, Good])
    expect(card.state).toBe(State.Review)
    expect(card.due - card.lastReview).toBeGreaterThanOrEqual(DAY)
  })

  it('Again in learning goes back to the first step and is not a lapse', () => {
    const { card } = run([Good, Again]) // step 1, then forgot
    expect(card).toMatchObject({ state: State.Learning, step: 0, lapses: 0 })
  })

  it('Hard in learning repeats the current step', () => {
    const { card } = run([Good, Hard])
    expect(card).toMatchObject({ state: State.Learning, step: 1 })
  })

  it('Easy in learning graduates immediately', () => {
    const { card } = run([Again, Easy])
    expect(card.state).toBe(State.Review)
  })

  it('learning gaps stay well under a day', () => {
    const { trail } = run([Again, Hard, Good])
    for (const t of trail) expect(t.dueInMs).toBeLessThan(DAY)
  })
})

describe('review card', () => {
  it('Hard / Good / Easy keep it in review with strictly longer gaps', () => {
    const card = reviewCard()
    const gap = (r) => schedule(card, r, card.due).dueInMs
    for (const r of [Hard, Good, Easy]) {
      expect(schedule(card, r, card.due).state.state).toBe(State.Review)
    }
    expect(gap(Hard)).toBeLessThan(gap(Good))
    expect(gap(Good)).toBeLessThan(gap(Easy))
  })

  it('Again is a lapse: relearning step, lapses + 1, stability drops', () => {
    const card = reviewCard()
    const { state } = schedule(card, Again, card.due)
    expect(state).toMatchObject({ state: State.Relearning, step: 0, lapses: card.lapses + 1 })
    expect(state.due - state.lastReview).toBe(RELEARNING_STEPS_MS[0])
    expect(state.stability).toBeLessThan(card.stability)
  })

  it('Again always gives the shortest wait', () => {
    const card = reviewCard()
    const again = schedule(card, Again, card.due).dueInMs
    for (const r of [Hard, Good, Easy]) {
      expect(schedule(card, r, card.due).dueInMs).toBeGreaterThan(again)
    }
  })

  it('a successful review grows stability', () => {
    const card = reviewCard()
    for (const r of [Hard, Good, Easy]) {
      expect(schedule(card, r, card.due).state.stability).toBeGreaterThan(card.stability)
    }
  })

  it('recalling after a longer delay earns more stability than on time', () => {
    const card = reviewCard()
    const onTime = schedule(card, Good, card.due).state.stability
    const late = schedule(card, Good, card.due + 10 * DAY).state.stability
    expect(late).toBeGreaterThan(onTime)
  })

  it('Hard raises difficulty and Easy lowers it', () => {
    const card = reviewCard()
    expect(schedule(card, Again, card.due).state.difficulty).toBeGreaterThan(card.difficulty)
    expect(schedule(card, Easy, card.due).state.difficulty).toBeLessThan(card.difficulty)
  })
})

describe('relearning', () => {
  const lapsed = () => {
    const card = reviewCard()
    return schedule(card, Again, card.due).state
  }

  it('Good returns the card to review', () => {
    const c = lapsed()
    const { state } = schedule(c, Good, c.due)
    expect(state.state).toBe(State.Review)
    expect(state.lapses).toBe(c.lapses)
  })

  it('Again stays in relearning without a second lapse', () => {
    const c = lapsed()
    const { state } = schedule(c, Again, c.due)
    expect(state).toMatchObject({ state: State.Relearning, lapses: c.lapses })
  })

  it('Hard stays in relearning', () => {
    const c = lapsed()
    expect(schedule(c, Hard, c.due).state.state).toBe(State.Relearning)
  })

  it('Easy returns the card to review', () => {
    const c = lapsed()
    expect(schedule(c, Easy, c.due).state.state).toBe(State.Review)
  })
})

describe('retention and intervals', () => {
  it('retrievability is 90% when elapsed days equal stability', () => {
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 10)
    expect(retrievability(0, 10)).toBe(1)
    expect(retrievability(5, 0)).toBe(0)
  })

  it('retrievability only falls as time passes', () => {
    expect(retrievability(1, 5)).toBeGreaterThan(retrievability(5, 5))
    expect(retrievability(5, 5)).toBeGreaterThan(retrievability(30, 5))
  })

  it('a 90% desired retention gives an interval of about one stability', () => {
    const card = reviewCard()
    const { state, intervalDays } = schedule(card, Good, card.due, 0.9)
    expect(intervalDays).toBe(Math.max(1, Math.round(state.stability)))
  })

  it('higher desired retention gives shorter intervals', () => {
    const card = reviewCard()
    const days = (retention) => schedule(card, Easy, card.due, retention).intervalDays
    expect(days(0.97)).toBeLessThan(days(0.9))
    expect(days(0.9)).toBeLessThan(days(0.8))
  })

  it('intervals are never shorter than a day for review cards', () => {
    const { trail } = run([Good, Good, Hard, Hard, Hard])
    for (const t of trail) if (t.state.state === State.Review) expect(t.intervalDays).toBeGreaterThanOrEqual(1)
  })
})

describe('same-day reviews', () => {
  it('Good and Easy never lower stability within a day', () => {
    const card = reviewCard()
    const sameDay = card.lastReview + 2 * MIN
    for (const r of [Good, Easy]) {
      expect(schedule(card, r, sameDay).state.stability).toBeGreaterThanOrEqual(card.stability)
    }
  })

  it('Again within a day lowers stability', () => {
    const card = reviewCard()
    const sameDay = card.lastReview + 2 * MIN
    expect(schedule(card, Again, sameDay).state.stability).toBeLessThan(card.stability)
  })
})

describe('safety', () => {
  it('does not change the state it was given', () => {
    const card = reviewCard()
    const copy = JSON.parse(JSON.stringify(card))
    schedule(card, Good, card.due)
    expect(card).toEqual(copy)
  })

  it('keeps stability and difficulty inside their limits after any run of answers', () => {
    const ratings = [Again, Again, Again, Again, Again, Again, Easy, Easy, Easy, Easy, Easy, Easy, Easy, Easy]
    const { trail } = run(ratings)
    for (const t of trail) {
      expect(t.state.stability).toBeGreaterThanOrEqual(0.1)
      expect(t.state.difficulty).toBeGreaterThanOrEqual(1)
      expect(t.state.difficulty).toBeLessThanOrEqual(10)
      expect(Number.isFinite(t.state.due)).toBe(true)
    }
  })

  it('counts every answer in reps', () => {
    const { card } = run([Good, Hard, Good, Easy, Again])
    expect(card.reps).toBe(5)
  })
})

// The database stores stability / due / last_review / lapses only, so the
// state must be recoverable from those alone. Check it for every possible
// run of five answers (4^5 = 1024 runs).
describe('state is derivable from stored fields', () => {
  const all = []
  const build = (prefix) => {
    if (prefix.length === 5) return all.push(prefix)
    for (const r of [Again, Hard, Good, Easy]) build([...prefix, r])
  }
  build([])

  it('infers the same state and step the scheduler produced', () => {
    for (const ratings of all) {
      let card = newCardState()
      let now = NOW
      for (const rating of ratings) {
        card = schedule(card, rating, now).state
        const s = stored(card)
        expect(inferState(s), `state after ${ratings.join('')}`).toBe(card.state)
        expect(inferStep(s), `step after ${ratings.join('')}`).toBe(card.step)
        now = card.due
      }
    }
  })

  it('scheduling from the inferred state matches scheduling from the real one', () => {
    for (const ratings of all.filter((_, i) => i % 7 === 0)) {
      let card = newCardState()
      let now = NOW
      for (const rating of ratings) {
        const real = schedule(card, rating, now)
        const s = stored(card)
        const rebuilt = card.stability == null ? card : { ...s, state: inferState(s), step: inferStep(s) }
        expect(schedule(rebuilt, rating, now)).toEqual(real)
        card = real.state
        now = card.due
      }
    }
  })

  it('treats a card with no stability as new', () => {
    expect(inferState({ stability: null, due: null, lastReview: null, lapses: 0 })).toBe(State.New)
  })
})
