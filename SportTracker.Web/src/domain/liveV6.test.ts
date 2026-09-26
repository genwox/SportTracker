import { afterEach, describe, expect, it, vi } from 'vitest'
import { keypadNumber, keypadText, pressKey } from './keypad'
import { createPressRepeat } from './pressRepeat'
import { addRestTime, remainingRestMs, restProgress, setRestDuration, startRestTimer, pauseRestTimer } from './restTimer'
import { enterLiveSession, formatElapsed, formatRest, lastTimeSet, parseLiveSession } from './liveSession'

describe('V6 keypad', () => {
  it('replaces the value on the first digit, then appends', () => {
    expect(pressKey('60', '6', 2, true)).toBe('6')
    expect(pressKey('6', '2', 2)).toBe('62')
    expect(pressKey('62', ',', 2)).toBe('62,')
    expect(pressKey('62,', '5', 2)).toBe('62,5')
    expect(keypadNumber('62,5')).toBe(62.5)
  })
  it('keeps one comma, limits decimals and integer digits', () => {
    expect(pressKey('62,5', ',', 2)).toBe('62,5')
    expect(pressKey('1,25', '5', 2)).toBe('1,25')
    expect(pressKey('9999', '1', 2)).toBe('9999')
    expect(pressKey('0', '7', 2)).toBe('7')
    expect(pressKey('', ',', 2)).toBe('0,')
  })
  it('has no comma for repetitions', () => {
    expect(pressKey('9', ',', 0)).toBe('9')
    expect(pressKey('9', '1', 0)).toBe('91')
  })
  it('erases one character, or the whole value when just focused', () => {
    expect(pressKey('62,5', 'back', 2)).toBe('62,')
    expect(pressKey('62,5', 'back', 2, true)).toBe('')
    expect(keypadNumber('')).toBe(0)
    expect(keypadNumber('12,')).toBe(12)
  })
  it('formats numbers with a French comma', () => {
    expect(keypadText(62.5, 2)).toBe('62,5')
    expect(keypadText(10, 0)).toBe('10')
  })
})

describe('stepper press-and-hold repetition', () => {
  afterEach(() => { vi.useRealTimers() })
  it('a tap is one step when the finger lifts', () => {
    vi.useFakeTimers()
    const step = vi.fn()
    const repeat = createPressRepeat(step)
    repeat.start(); vi.advanceTimersByTime(150)
    expect(step).not.toHaveBeenCalled()
    repeat.release(); vi.advanceTimersByTime(1000)
    expect(step).toHaveBeenCalledTimes(1)
  })
  it('held: steps at 400 ms, then every 80 ms, and nothing more on release', () => {
    vi.useFakeTimers()
    const step = vi.fn()
    const repeat = createPressRepeat(step)
    repeat.start()
    vi.advanceTimersByTime(399)
    expect(step).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(step).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(80 * 5)
    expect(step).toHaveBeenCalledTimes(6)
    expect(repeat.repeating).toBe(true)
    repeat.release(); vi.advanceTimersByTime(1000)
    expect(step).toHaveBeenCalledTimes(6)
    expect(repeat.repeating).toBe(false)
  })
  it('a press that turns into a scroll changes nothing', () => {
    vi.useFakeTimers()
    const step = vi.fn()
    const repeat = createPressRepeat(step)
    repeat.start(); vi.advanceTimersByTime(100); repeat.cancel(); repeat.release(); vi.advanceTimersByTime(1000)
    expect(step).not.toHaveBeenCalled()
  })
})

describe('rest timer V6 actions (endsAt based)', () => {
  it('+30 s moves the end of a running rest', () => {
    const timer = addRestTime(startRestTimer(90_000, 0), 30_000, 10_000)
    expect(timer.endsAt).toBe(120_000)
    expect(remainingRestMs(timer, 10_000)).toBe(110_000)
  })
  it('+30 s starts a rest when none is running', () => {
    expect(addRestTime({ state: 'idle', durationMs: 0, endsAt: null, remainingMs: 0 }, 30_000, 5).endsAt).toBe(30_005)
  })
  it('a new planned rest keeps the time already rested', () => {
    const timer = setRestDuration(startRestTimer(90_000, 0), 120_000, 60_000)
    expect(timer.endsAt).toBe(120_000)
    expect(timer.durationMs).toBe(120_000)
    expect(setRestDuration(startRestTimer(90_000, 0), 30_000, 60_000).state).toBe('finished')
  })
  it('a paused rest is resized too', () => {
    const paused = pauseRestTimer(startRestTimer(90_000, 0), 30_000)
    expect(setRestDuration(paused, 60_000).remainingMs).toBe(30_000)
  })
  it('reports the share still to go', () => {
    expect(restProgress(startRestTimer(100_000, 0), 25_000)).toBe(.75)
  })
})

describe('live session (mini-bar)', () => {
  const entry = { owner: 'a@b.c', sessionKey: 'd1', href: '/live/d1/exercises/7', storageKey: 'free:d1:7', exerciseName: 'Squat', setsDone: 1, targetSets: 3 }
  it('keeps the start time and running rest of the same session', () => {
    const first = { ...enterLiveSession(null, entry, 1000), timer: startRestTimer(90_000, 2000) }
    const again = enterLiveSession(first, { ...entry, exerciseName: 'Fentes', storageKey: 'free:d1:8' }, 5000)
    expect(again.startedAt).toBe(1000)
    expect(again.timer.endsAt).toBe(92_000)
    expect(again.exerciseName).toBe('Fentes')
  })
  it('starts over for another session or another account', () => {
    const first = { ...enterLiveSession(null, entry, 1000), timer: startRestTimer(90_000, 2000) }
    expect(enterLiveSession(first, { ...entry, sessionKey: 'd2' }, 5000)).toMatchObject({ startedAt: 5000, timer: { state: 'idle' } })
    expect(enterLiveSession(first, { ...entry, owner: 'x@y.z' }, 5000).startedAt).toBe(5000)
  })
  it('ignores a corrupted saved session', () => {
    expect(parseLiveSession('{')).toBeNull()
    expect(parseLiveSession('{"owner":1}')).toBeNull()
    expect(parseLiveSession(JSON.stringify(enterLiveSession(null, entry, 1)))?.sessionKey).toBe('d1')
  })
  it('formats the session chrono and the rest', () => {
    expect(formatElapsed(32 * 60_000 + 15_000)).toBe('32:15')
    expect(formatElapsed(3_725_000)).toBe('1:02:05')
    expect(formatRest(72_001)).toBe('1:13')
    expect(formatRest(0)).toBe('0:00')
  })
  it('finds the same set of the latest earlier workout', () => {
    const history = [
      { date: '2026-09-20T00:00:00', sets: [{ weight: 50, repetitions: 10, order: 0 }] },
      { date: '2026-09-23T00:00:00', sets: [{ weight: 60, repetitions: 10, order: 1 }, { weight: 55, repetitions: 12, order: 0 }] },
      { date: '2026-09-26T00:00:00', sets: [{ weight: 70, repetitions: 5, order: 0 }] },
    ]
    expect(lastTimeSet(history, 1, '2026-09-26')).toMatchObject({ weight: 60, repetitions: 10, number: 2 })
    expect(lastTimeSet(history, 5, '2026-09-26')).toMatchObject({ weight: 60, number: 2 })
    expect(lastTimeSet([], 0, '2026-09-26')).toBeNull()
  })
})
