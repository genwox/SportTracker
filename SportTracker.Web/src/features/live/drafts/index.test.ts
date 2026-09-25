import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LiveExerciseDraft } from '../../../domain/liveDraft'
import { createIndexedDbDraftStore } from './indexedDbStore'
import { draftOwner, draftStore, liveDraftApi } from './index'

const local = new Map<string, string>()
beforeEach(() => vi.stubGlobal('localStorage', {
  getItem: (key: string) => local.get(key) ?? null,
  setItem: (key: string, value: string) => { local.set(key, value) },
  removeItem: (key: string) => { local.delete(key) },
}))

const draft: LiveExerciseDraft = {
  storageKey: 'free:00000000-0000-4000-8000-000000000001:7',
  draftId: '00000000-0000-4000-8000-000000000001', workoutDate: '2026-09-25',
  programSessionId: null, exerciseId: 7, exerciseName: 'Squat', gifUrl: null, instructions: null,
  sessionName: 'Test', restSeconds: 90, targetSets: 3,
  sets: [{ id: 0, weight: 80, repetitions: 5, setType: 'Normal', rpe: 8 }],
  weightCurrent: 80, repsCurrent: 5, setType: 'Normal', rpe: 8, notes: 'Saved offline',
  supersetGroupId: null, pendingSync: true, syncConflict: false, revision: 1,
  savedAtUtc: '2026-09-25T00:00:00Z', workoutSessionId: null,
}

afterEach(() => { local.clear(); vi.unstubAllGlobals() })

describe('live draft API and owner', () => {
  it('uses the token offline, then migrates after /manage/info responds', async () => {
    local.set('st-auth-token', 'token-for-test')
    const store = createIndexedDbDraftStore()
    await store.put('token-for-test', draft.storageKey, draft)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(
      new Response(JSON.stringify({ email: 'Alice@Example.com' }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    ))
    expect(await draftOwner()).toBe('token-for-test')
    expect(await draftOwner()).toBe('alice@example.com')
    expect(local.get('st-draft-owner')).toBe('alice@example.com')
    expect(await store.get('token-for-test', draft.storageKey)).toBeNull()
    expect(await store.get('alice@example.com', draft.storageKey)).toEqual(draft)
  })

  it('sends the backend snapshot shape and recognizes a conflict', async () => {
    local.set('st-auth-token', 'token-for-test')
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ workoutSessionId: 12, sets: [{ id: 34 }] }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })).mockResolvedValueOnce(new Response('', { status: 409 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await liveDraftApi.put(draft, null)).toEqual({ status: 'ok', workoutSessionId: 12, sets: [{ id: 34 }] })
    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(String(url)).toContain('/api/workoutsessions/live/00000000-0000-4000-8000-000000000001/exercises/7')
    expect(JSON.parse(String(options.body))).toMatchObject({ expectedWorkoutSessionId: null,
      workoutProgramSessionId: null, notes: 'Saved offline', sets: [{ weight: 80, repetitions: 5, setType: 1, rpe: 8 }] })
    expect(await liveDraftApi.put(draft, 12)).toEqual({ status: 'conflict' })
  })

  it('queues a newly saved online draft once', async () => {
    local.set('st-auth-token', 'token-for-test')
    vi.stubGlobal('navigator', { onLine: true })
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ workoutSessionId: 12, sets: [{ id: 34 }] }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const key = 'free:00000000-0000-4000-8000-000000000002:7'
    await draftStore.put('alice@example.com', key, { ...draft, storageKey: key, draftId: '00000000-0000-4000-8000-000000000002' })
    await vi.waitFor(async () => expect((await draftStore.get('alice@example.com', key))?.pendingSync).toBe(false))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
