import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryDraftStore, type LiveExerciseDraft } from './liveDraft'
import { createRestTimer, pauseRestTimer, refreshRestTimer, remainingRestMs, restartRestTimer, resumeRestTimer, startRestTimer } from './restTimer'
import { createSyncQueue } from './syncQueue'

const draft = (key = 'free:abc:1'): LiveExerciseDraft => ({ storageKey: key, draftId: 'abc', workoutDate: '2026-09-25', programSessionId: null,
  exerciseId: 1, exerciseName: 'Squat', gifUrl: null, instructions: null, sessionName: null, restSeconds: 90, targetSets: 3,
  sets: [{ id: 0, weight: 80, repetitions: 5, setType: 'Normal', rpe: 8 }], weightCurrent: 80, repsCurrent: 5,
  setType: 'Normal', rpe: 8, notes: 'hard', supersetGroupId: null, pendingSync: true, syncConflict: false,
  revision: 1, savedAtUtc: '2026-09-25T00:00:00Z', workoutSessionId: null })

describe('rest timer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  it('survives a 90 second suspension', () => {
    vi.setSystemTime(0)
    const timer = startRestTimer(90_000)
    vi.setSystemTime(90_000)
    expect(remainingRestMs(timer)).toBe(0)
    expect(refreshRestTimer(timer).state).toBe('finished')
  })
  it('pauses, resumes, and restarts from deadline', () => {
    vi.setSystemTime(0)
    let timer = startRestTimer(90_000)
    vi.setSystemTime(30_000)
    timer = pauseRestTimer(timer)
    vi.setSystemTime(130_000)
    expect(remainingRestMs(timer)).toBe(60_000)
    timer = resumeRestTimer(timer)
    expect(timer.endsAt).toBe(190_000)
    expect(restartRestTimer(timer).endsAt).toBe(220_000)
    expect(createRestTimer().state).toBe('idle')
  })
})

describe('draft queue', () => {
  it('isolates owners and stores copies', async () => {
    const store = createMemoryDraftStore()
    await store.put('alice', 'free:abc:1', draft())
    expect(await store.list('bob', 'free:')).toEqual([])
    const copy = await store.get('alice', 'free:abc:1')
    copy!.sets[0].weight = 100
    expect((await store.get('alice', 'free:abc:1'))!.sets[0].weight).toBe(80)
  })
  it('serializes sync and applies server ids once', async () => {
    const store = createMemoryDraftStore()
    await store.put('alice', 'free:abc:1', draft())
    const put = vi.fn(async () => ({ status: 'ok' as const, workoutSessionId: 4, sets: [{ id: 9 }] }))
    const queue = createSyncQueue(store, { put })
    await Promise.all([queue.sync('alice', 'free:abc:1'), queue.sync('alice', 'free:abc:1')])
    expect(put).toHaveBeenCalledTimes(1)
    expect((await store.get('alice', 'free:abc:1'))?.sets[0].id).toBe(9)
  })
  it('marks conflict and can recreate', async () => {
    const store = createMemoryDraftStore()
    await store.put('alice', 'free:abc:1', draft())
    const put = vi.fn().mockResolvedValueOnce({ status: 'conflict' }).mockResolvedValue({ status: 'ok', workoutSessionId: 5, sets: [] })
    const queue = createSyncQueue(store, { put })
    expect((await queue.sync('alice', 'free:abc:1'))?.syncConflict).toBe(true)
    expect((await queue.resolveConflict('alice', 'free:abc:1', true))?.pendingSync).toBe(false)
    expect(put).toHaveBeenCalledTimes(2)
  })
})
