import { createRestTimer, type RestTimer } from './restTimer'

/**
 * The live workout that stays open while the user browses the tabs: it feeds the mini-bar above the
 * tab bar and carries the rest timer (based on its end time, so it survives a reload or a page change).
 */
export interface LiveSession {
  owner: string
  /** Free session: its draftId. Programme session: `routine:<sessionId>:<yyyymmdd>`. */
  sessionKey: string
  /** Page the mini-bar reopens. */
  href: string
  /** Draft shown in the mini-bar; the bar disappears as soon as it no longer exists. */
  storageKey: string
  exerciseName: string
  setsDone: number
  targetSets: number
  startedAt: number
  timer: RestTimer
}

export type LiveSessionEntry = Omit<LiveSession, 'startedAt' | 'timer'>

/** Entering (or coming back to) a live page: same session → keep its start time and running rest. */
export function enterLiveSession(current: LiveSession | null, entry: LiveSessionEntry, now = Date.now()): LiveSession {
  const same = current && current.owner === entry.owner && current.sessionKey === entry.sessionKey
  return { ...entry, startedAt: same ? current.startedAt : now, timer: same ? current.timer : createRestTimer() }
}

export function parseLiveSession(raw: string | null): LiveSession | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<LiveSession>
    if (typeof value.owner !== 'string' || typeof value.sessionKey !== 'string' || typeof value.href !== 'string' ||
      typeof value.storageKey !== 'string' || typeof value.startedAt !== 'number' || !value.timer) return null
    return value as LiveSession
  } catch { return null }
}

/** `12:05` under one hour, `1:02:05` beyond. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor(total / 60) % 60
  const seconds = String(total % 60).padStart(2, '0')
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}

/** `1:30` for the rest countdown (rounded up: 0:01 until the very end). */
export function formatRest(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

type HistorySet = { weight: number; repetitions: number; order: number }

/** « Dernière fois, série 2 : 60 kg × 10 reps » — the same set of the latest earlier workout (or its last set). */
export function lastTimeSet(history: { date: string; sets: HistorySet[] }[], setIndex: number, today: string): { weight: number; repetitions: number; number: number } | null {
  const previous = history.filter(entry => entry.date.slice(0, 10) < today && entry.sets.length)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!previous) return null
  const sets = [...previous.sets].sort((a, b) => a.order - b.order)
  const index = Math.min(setIndex, sets.length - 1)
  return { weight: sets[index].weight, repetitions: sets[index].repetitions, number: index + 1 }
}
