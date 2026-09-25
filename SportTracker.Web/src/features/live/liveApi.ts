import { getDraftOwner, getToken } from '../../api/tokenStore'
import type { LiveExerciseDraft } from '../../domain/liveDraft'
import { draftStore, draftSyncQueue } from './drafts'

export const liveQueue = draftSyncQueue

export interface Exercise { id: number; name: string; type: number; muscleGroups: number[]; equipment: string | null; gifUrl: string | null; instructionsFr: string | null }
export interface ServerSet { id: number; weight: number; repetitions: number; setType: number; rpe: number | null }
export interface WorkoutExercise { exerciseId: number; exercise?: Exercise; exerciseSets?: ServerSet[]; notes?: string | null; supersetGroupId?: number | null }
export interface Workout { id: number; date: string; workoutProgramSessionId?: number | null; workoutExercises?: WorkoutExercise[] }
export interface ProgramExercise { exerciseId: number; exercise?: Exercise; targetSets: number; targetRepsMin: number; restSeconds: number; order: number }
export interface ProgramSession { id: number; name: string; exercises: ProgramExercise[] }
export interface Program { sessions: ProgramSession[] }
export interface HistoryEntry { date: string; sets: { weight: number; repetitions: number; order: number }[] }

export const owner = () => getDraftOwner() || getToken() || ''
export const freeKey = (draftId: string, exerciseId: number) => `free:${draftId}:${exerciseId}`
const localDate = () => new Date().toLocaleDateString('sv-SE')
export const routineKey = (sessionId: number, exerciseId: number) => `routine:${sessionId}:${localDate().replaceAll('-', '')}:${exerciseId}`
export const sessionPrefix = (draftId: string) => `free:${draftId}:`

const setTypeCodes: Record<string, number> = { Warmup: 0, Normal: 1, DropSet: 2, Dropset: 2, Failure: 3 }
export const setTypeNumber = (type: string) => setTypeCodes[type] ?? 1
export const setTypeName = (type: number | string): string => typeof type === 'number' ? ['Warmup', 'Normal', 'DropSet', 'Failure'][type] ?? 'Normal' : type

export function createDraft(key: string, draftId: string, exercise: Exercise, programSessionId: number | null = null, sessionName: string | null = null, targetSets = 3, restSeconds = 90): LiveExerciseDraft {
  return {
    storageKey: key, draftId, workoutDate: `${localDate()}T00:00:00`, programSessionId, exerciseId: exercise.id,
    exerciseName: exercise.name, gifUrl: exercise.gifUrl, instructions: exercise.instructionsFr, sessionName,
    restSeconds, targetSets, sets: [], weightCurrent: 20, repsCurrent: 10, setType: 'Normal', rpe: null,
    notes: null, supersetGroupId: null, pendingSync: false, syncConflict: false, revision: 0,
    savedAtUtc: new Date().toISOString(), workoutSessionId: null,
  }
}

export async function persistDraft(draft: LiveExerciseDraft, pending: boolean): Promise<LiveExerciseDraft> {
  const saved = { ...draft, pendingSync: draft.pendingSync || pending, revision: draft.revision + 1, savedAtUtc: new Date().toISOString() }
  await draftStore.put(owner(), saved.storageKey, saved)
  if (!pending || !navigator.onLine) return saved
  return await draftSyncQueue.sync(owner(), saved.storageKey) ?? saved
}
