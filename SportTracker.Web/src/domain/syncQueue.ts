import type { DraftStore, LiveExerciseDraft } from './liveDraft'

export interface SyncReply { status: 'ok'; workoutSessionId: number; sets: { id: number }[] }
export interface SyncApi { put(draft: LiveExerciseDraft, expectedWorkoutSessionId: number | null): Promise<SyncReply | { status: 'conflict' } | { status: 'error' }> }

export function createSyncQueue(store: DraftStore, api: SyncApi, isOnline: () => boolean = () => true) {
  let gate: Promise<unknown> = Promise.resolve()
  const exclusive = <T>(action: () => Promise<T>): Promise<T> => {
    const result = gate.then(action, action)
    gate = result.then(() => undefined, () => undefined)
    return result
  }
  async function sync(owner: string, key: string): Promise<LiveExerciseDraft | null> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const draft = await store.get(owner, key)
      if (!draft || !draft.pendingSync || draft.syncConflict || !isOnline()) return draft
      const siblings = await store.list(owner, key.slice(0, key.lastIndexOf(':') + 1))
      const expectedId = draft.workoutSessionId ?? siblings.find(item => item.workoutSessionId !== null)?.workoutSessionId ?? null
      let response: Awaited<ReturnType<SyncApi['put']>>
      try { response = await api.put(draft, expectedId) } catch { return store.get(owner, key) }
      if (response.status === 'conflict') {
        const current = await store.get(owner, key)
        if (!current) return null
        current.syncConflict = true
        await store.put(owner, key, current)
        return current
      }
      if (response.status === 'error') return draft
      const latest = await store.get(owner, key)
      if (!latest) return null
      if (latest.revision !== draft.revision) continue
      latest.workoutSessionId = response.workoutSessionId
      latest.sets.forEach((set, index) => { if (response.sets[index]) set.id = response.sets[index].id })
      latest.pendingSync = false
      latest.savedAtUtc = new Date().toISOString()
      await store.put(owner, key, latest)
      return latest
    }
    return store.get(owner, key)
  }
  return {
    sync: (owner: string, key: string) => exclusive(() => sync(owner, key)),
    syncPending: (owner: string) => exclusive(async () => {
      if (!isOnline()) return
      for (const prefix of ['free:', 'routine:']) {
        for (const draft of await store.list(owner, prefix)) {
          if (draft.pendingSync && !draft.syncConflict) await sync(owner, draft.storageKey)
        }
      }
    }),
    resolveConflict: (owner: string, key: string, recreate: boolean) => exclusive(async () => {
      if (!recreate) { await store.remove(owner, key); return null }
      const draft = await store.get(owner, key)
      if (!draft) return null
      const lostId = draft.workoutSessionId ?? (await store.list(owner, key.slice(0, key.lastIndexOf(':') + 1)))
        .find(item => item.workoutSessionId !== null)?.workoutSessionId ?? null
      if (lostId !== null) {
        for (const sibling of await store.list(owner, key.slice(0, key.lastIndexOf(':') + 1))) {
          if (sibling.storageKey !== key && sibling.workoutSessionId === lostId) {
            sibling.workoutSessionId = null
            await store.put(owner, sibling.storageKey, sibling)
          }
        }
      }
      draft.workoutSessionId = null
      draft.syncConflict = false
      draft.pendingSync = true
      draft.revision++
      draft.savedAtUtc = new Date().toISOString()
      await store.put(owner, key, draft)
      return sync(owner, key)
    }),
  }
}
