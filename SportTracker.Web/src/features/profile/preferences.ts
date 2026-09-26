import { useSyncExternalStore } from 'react'

/* Session preferences of the Profil (V6 · 19), kept on this device. */

const SHOW_RPE = 'st-pref:v1:show-rpe'
const EVENT = 'sporttracker:preferences'

function read(key: string, fallback: boolean): boolean {
  try { const raw = localStorage.getItem(key); return raw == null ? fallback : raw === '1' } catch { return fallback }
}

function write(key: string, value: boolean) {
  try { localStorage.setItem(key, value ? '1' : '0') } catch { /* Storage may be unavailable: the choice lasts until reload. */ }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener)
  window.addEventListener('storage', listener)
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener('storage', listener) }
}

/** « Afficher le RPE » : the RPE row on the live screen and in the set sheet (on by default). */
export function useShowRpe(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(subscribe, () => read(SHOW_RPE, true))
  return [value, next => write(SHOW_RPE, next)]
}
