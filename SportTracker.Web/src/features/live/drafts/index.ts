import { createSyncQueue, type SyncApi, type SyncReply } from '../../../domain/syncQueue'
import type { LiveExerciseDraft } from '../../../domain/liveDraft'
import { apiRequest, ApiError } from '../../../api/client'
import { getDraftOwner, getToken, setDraftOwner } from '../../../api/tokenStore'
import { createIndexedDbDraftStore } from './indexedDbStore'

const persistedStore = createIndexedDbDraftStore()
export const draftStore = {
  ...persistedStore,
  async put(owner: string, key: string, draft: LiveExerciseDraft): Promise<void> {
    await persistedStore.put(owner, key, draft)
    if (draft.pendingSync && !draft.syncConflict && navigator.onLine) {
      void draftSyncQueue.sync(owner, key).catch(() => { /* Retry on the next resume event. */ })
    }
  },
}

// A token is only a temporary offline scope. Migrate it when the email is known.
export async function draftOwner(): Promise<string> {
  const token = getToken()
  if (!token) throw new Error('Connexion requise pour les brouillons live.')
  const savedOwner = getDraftOwner()?.trim().toLowerCase()
  if (savedOwner) {
    await draftStore.migrate(token, savedOwner)
    return savedOwner
  }
  try {
    const info = await apiRequest<{ email?: string }>('/manage/info')
    if (getToken() !== token) throw new Error('La session a changé.')
    const email = info?.email?.trim().toLowerCase()
    if (email) {
      await draftStore.migrate(token, email)
      setDraftOwner(email)
      return email
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw error
  }
  return token
}

type PutResponse = { workoutSessionId: number; sets: { id: number }[] }
const wireSetType: Record<string, number> = { Warmup: 0, Normal: 1, DropSet: 2, Dropset: 2, Failure: 3 }

export const liveDraftApi: SyncApi = {
  async put(draft: LiveExerciseDraft, expectedWorkoutSessionId: number | null) {
    try {
      const response = await apiRequest<PutResponse>(
        `/api/workoutsessions/live/${encodeURIComponent(draft.draftId)}/exercises/${draft.exerciseId}`,
        {
          method: 'PUT',
          body: {
            workoutProgramSessionId: draft.programSessionId,
            workoutDate: draft.workoutDate,
            sessionName: draft.sessionName,
            notes: draft.notes,
            supersetGroupId: draft.supersetGroupId,
            sets: draft.sets.map(({ weight, repetitions, setType, rpe }) => ({
              weight, repetitions, setType: wireSetType[setType] ?? setType, rpe,
            })),
            expectedWorkoutSessionId,
          },
        },
      )
      return { status: 'ok', workoutSessionId: response.workoutSessionId, sets: response.sets } satisfies SyncReply
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) return { status: 'conflict' }
      return { status: 'error' }
    }
  },
}

export async function getLiveWorkout(draftId: string): Promise<unknown> {
  return apiRequest(`/api/workoutsessions/live/${encodeURIComponent(draftId)}`)
}

export const draftSyncQueue = createSyncQueue(persistedStore, liveDraftApi, () => navigator.onLine)

export async function syncPendingDrafts(): Promise<void> {
  if (!navigator.onLine || !getToken()) return
  const owner = await draftOwner()
  await draftSyncQueue.syncPending(owner)
}

let started = false
export function startDraftSync(): void {
  if (started || typeof window === 'undefined') return
  started = true
  const resume = () => { void syncPendingDrafts().catch(() => { /* Keep drafts for the next retry. */ }) }
  window.addEventListener('online', resume)
  window.addEventListener('sporttracker:auth-changed', resume)
  window.addEventListener('storage', resume)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') resume() })
  resume()
}

startDraftSync()
