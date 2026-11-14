import { describe, it, expect, vi, beforeEach } from 'vitest'

// xpStore pulls in the Supabase client, which needs env vars. These tests
// only cover the pure level rules and the localStorage bookkeeping.
vi.mock('./supabaseClient', () => ({ supabase: {} }))
vi.mock('./authHelpers', () => ({ requireUserId: async () => 'user-1' }))

const { levelInfo, levelUpFor, checkLevelUp } = await import('./xpStore')

describe('levelInfo', () => {
  it('starts at level 1 with 0 XP', () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, floorXp: 0, nextXp: 100, toNext: 100, percent: 0 })
  })

  it('changes level exactly at 100 * (N - 1)^2 XP', () => {
    expect(levelInfo(99).level).toBe(1)
    expect(levelInfo(100).level).toBe(2)
    expect(levelInfo(399).level).toBe(2)
    expect(levelInfo(400).level).toBe(3)
    expect(levelInfo(899).level).toBe(3)
    expect(levelInfo(900).level).toBe(4)
  })

  it('reports distance to the next level', () => {
    expect(levelInfo(250)).toMatchObject({ level: 2, toNext: 150, intoLevel: 150, levelSpan: 300, percent: 50 })
  })

  it('treats bad input as 0 XP', () => {
    expect(levelInfo(null).level).toBe(1)
    expect(levelInfo(-50).level).toBe(1)
    expect(levelInfo(undefined).xp).toBe(0)
  })
})

describe('levelUpFor', () => {
  it('does not celebrate on first run, but remembers the level', () => {
    const { event, level } = levelUpFor(0, 900)
    expect(event).toBeNull()
    expect(level).toBe(4)
  })

  it('celebrates when the level went up', () => {
    const { event, level } = levelUpFor(2, 400)
    expect(event).toMatchObject({ from: 2, to: 3 })
    expect(event.info.level).toBe(3)
    expect(level).toBe(3)
  })

  it('reports a jump over several levels as one event', () => {
    expect(levelUpFor(2, 900).event).toMatchObject({ from: 2, to: 4 })
  })

  it('stays quiet at the same level', () => {
    expect(levelUpFor(3, 650).event).toBeNull()
  })

  it('stays quiet when the level dropped, and remembers the lower level', () => {
    const { event, level } = levelUpFor(5, 100)
    expect(event).toBeNull()
    expect(level).toBe(2)
  })
})

describe('checkLevelUp', () => {
  let store
  beforeEach(() => {
    store = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    })
  })

  it('first call sets a silent baseline, then a later level-up fires once', async () => {
    expect(await checkLevelUp(250)).toBeNull() // level 2 baseline
    expect(store.get('studyflow-level-user-1')).toBe('2')
    expect(await checkLevelUp(250)).toBeNull() // nothing changed
    const event = await checkLevelUp(400) // level 3
    expect(event).toMatchObject({ from: 2, to: 3 })
    expect(await checkLevelUp(400)).toBeNull() // already shown
    expect(store.get('studyflow-level-user-1')).toBe('3')
  })

  it('remembers levels separately for each user', async () => {
    await checkLevelUp(250)
    expect([...store.keys()]).toEqual(['studyflow-level-user-1'])
  })

  it('shows nothing when storage is unavailable', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(await checkLevelUp(900)).toBeNull()
  })

  it('still reports the level-up if saving the new level fails', async () => {
    store.set('studyflow-level-user-1', '2')
    vi.stubGlobal('localStorage', {
      getItem: (k) => store.get(k) ?? null,
      setItem: () => {
        throw new Error('quota')
      },
    })
    expect(await checkLevelUp(400)).toMatchObject({ from: 2, to: 3 })
  })
})
