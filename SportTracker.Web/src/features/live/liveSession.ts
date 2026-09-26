import { useEffect, useState, useSyncExternalStore } from 'react'
import { enterLiveSession, parseLiveSession, type LiveSession, type LiveSessionEntry } from '../../domain/liveSession'
import type { RestTimer } from '../../domain/restTimer'

const KEY = 'st-live-session'
const EVENT = 'sporttracker:live-session'

const readRaw = () => { try { return localStorage.getItem(KEY) } catch { return null } }
let cachedRaw: string | null = null
let cached: LiveSession | null = null

export function readLiveSession(): LiveSession | null {
  const raw = readRaw()
  if (raw !== cachedRaw) { cachedRaw = raw; cached = parseLiveSession(raw) }
  return cached
}

function write(value: LiveSession | null) {
  try { if (value) localStorage.setItem(KEY, JSON.stringify(value)); else localStorage.removeItem(KEY) } catch { /* Private mode: the bar simply stays hidden. */ }
  window.dispatchEvent(new Event(EVENT))
}

/** A live page is on screen: (re)open the session shown by the mini-bar. */
export function openLiveSession(entry: LiveSessionEntry) { write(enterLiveSession(readLiveSession(), entry)) }

/** Rest timer of the open session, shared by the exercise page, its sheet and the mini-bar. */
export function updateLiveTimer(sessionKey: string, update: (timer: RestTimer) => RestTimer) {
  const current = readLiveSession()
  if (current?.sessionKey === sessionKey) write({ ...current, timer: update(current.timer) })
}

/** « Terminer », or the draft behind the bar no longer exists. */
export function closeLiveSession() { if (readRaw() !== null) write(null) }

/** A workout started less than `maxAgeMs` ago is open (holds PWA updates back; a forgotten « Terminer » stops holding them after 6 h). */
export function hasLiveSession(maxAgeMs = 6 * 3600_000) {
  const session = readLiveSession()
  return session !== null && Date.now() - session.startedAt < maxAgeMs
}

function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener)
  window.addEventListener('storage', listener)
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener('storage', listener) }
}

export function useLiveSession(): LiveSession | null {
  return useSyncExternalStore(subscribe, readLiveSession, () => null)
}

/** Current time, refreshed while `ticking` (rest countdown, session chrono). */
export function useNow(ticking: boolean, every = 500) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!ticking) return
    const tick = () => setNow(Date.now())
    tick()
    const interval = window.setInterval(tick, every)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', tick) }
  }, [ticking, every])
  return now
}
