import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import type { LiveExerciseDraft } from '../../../domain/liveDraft'
import { createIndexedDbDraftStore } from './indexedDbStore'

const draft = (storageKey: string): LiveExerciseDraft => ({
  storageKey, draftId: '00000000-0000-4000-8000-000000000001', workoutDate: '2026-09-25',
  programSessionId: null, exerciseId: 1, exerciseName: 'Squat', gifUrl: null, instructions: null,
  sessionName: null, restSeconds: 90, targetSets: 3, sets: [{ id: 0, weight: 80, repetitions: 5,
    setType: 'Normal', rpe: 8 }], weightCurrent: 80, repsCurrent: 5, setType: 'Normal', rpe: 8,
  notes: 'Offline', supersetGroupId: null, pendingSync: true, syncConflict: false, revision: 1,
  savedAtUtc: '2026-09-25T00:00:00Z', workoutSessionId: null,
})

describe('IndexedDB live drafts', () => {
  it('persists across store instances and isolates owners and prefixes', async () => {
    const store = createIndexedDbDraftStore()
    await store.put('alice@example.com', 'free:a:1', draft('free:a:1'))
    await store.put('alice@example.com', 'routine:b:1', draft('routine:b:1'))
    await store.put('bob@example.com', 'free:a:1', draft('free:a:1'))
    const reloaded = createIndexedDbDraftStore()
    expect((await reloaded.get('alice@example.com', 'free:a:1'))?.notes).toBe('Offline')
    expect(await reloaded.list('alice@example.com', 'free:')).toHaveLength(1)
    expect(await reloaded.list('bob@example.com', 'routine:')).toEqual([])
    await reloaded.remove('alice@example.com', 'free:a:1')
    expect(await store.get('alice@example.com', 'free:a:1')).toBeNull()
    expect(await store.get('bob@example.com', 'free:a:1')).not.toBeNull()
  })

  it('moves temporary token drafts to the normalized email scope', async () => {
    const store = createIndexedDbDraftStore()
    await store.put('token-value', 'free:migration:1', draft('free:migration:1'))
    await store.migrate('token-value', 'alice@example.com')
    expect(await store.get('token-value', 'free:migration:1')).toBeNull()
    expect((await createIndexedDbDraftStore().get('alice@example.com', 'free:migration:1'))?.sets[0].weight).toBe(80)
  })
})
