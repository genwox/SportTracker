export type SetType = 'Normal' | 'Warmup' | 'Dropset' | 'Failure' | 'Superset' | 'RestPause' | 'AMRAP' | string
export interface LiveSetDraft { id: number; weight: number; repetitions: number; setType: SetType; rpe: number | null }
export interface LiveExerciseDraft {
  storageKey: string; draftId: string; workoutDate: string; programSessionId: number | null; exerciseId: number
  exerciseName: string; gifUrl: string | null; instructions: string | null; sessionName: string | null
  restSeconds: number; targetSets: number; sets: LiveSetDraft[]; weightCurrent: number; repsCurrent: number
  setType: SetType; rpe: number | null; notes: string | null; supersetGroupId: number | null
  pendingSync: boolean; syncConflict: boolean; revision: number; savedAtUtc: string; workoutSessionId: number | null
}
export interface DraftStore {
  get(owner: string, key: string): Promise<LiveExerciseDraft | null>
  put(owner: string, key: string, draft: LiveExerciseDraft): Promise<void>
  list(owner: string, prefix: string): Promise<LiveExerciseDraft[]>
  remove(owner: string, key: string): Promise<void>
}
const clone = <T>(value: T): T => structuredClone(value)
export function createMemoryDraftStore(): DraftStore {
  const data = new Map<string, Map<string, LiveExerciseDraft>>()
  const scope = (owner: string) => { let entries = data.get(owner); if (!entries) { entries = new Map(); data.set(owner, entries) } return entries }
  return {
    async get(owner, key) { return clone(scope(owner).get(key) ?? null) },
    async put(owner, key, draft) { scope(owner).set(key, clone(draft)) },
    async list(owner, prefix) { return [...scope(owner)].filter(([key]) => key.startsWith(prefix)).map(([, draft]) => clone(draft)) },
    async remove(owner, key) { scope(owner).delete(key) },
  }
}
