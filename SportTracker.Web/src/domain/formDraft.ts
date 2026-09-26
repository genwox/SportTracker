/*
 * Local draft of a form (Nouvelle séance, Modifier la séance, sortie cardio): what is typed survives leaving
 * the page, a reload or a failed save (V6 · 25 « Ta séance reste enregistrée sur cet appareil »).
 * Scoped by account so another login on the same phone never sees it; cleared once the server has it.
 */

export type FormDraft<T> = { value: T; savedAt: string }
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>

const PREFIX = 'st-form-draft:v1:'

export function formDraftKey(kind: string, owner: string | null, id?: string | number | null): string {
  return `${PREFIX}${owner?.trim().toLowerCase() || 'anonyme'}:${kind}:${id ?? 'new'}`
}

export function readFormDraft<T>(storage: Storage, key: string, isValue: (value: unknown) => value is T): FormDraft<T> | null {
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<FormDraft<unknown>>
    if (typeof parsed?.savedAt !== 'string' || Number.isNaN(Date.parse(parsed.savedAt)) || !isValue(parsed.value)) return null
    return { value: parsed.value, savedAt: parsed.savedAt }
  } catch {
    return null
  }
}

/** Returns the saved draft, or null when the storage refused it (private mode, quota). */
export function writeFormDraft<T>(storage: Storage, key: string, value: T, now = new Date()): FormDraft<T> | null {
  const draft = { value, savedAt: now.toISOString() }
  try {
    storage.setItem(key, JSON.stringify(draft))
    return draft
  } catch {
    return null
  }
}

export function clearFormDraft(storage: Storage, key: string): void {
  try { storage.removeItem(key) } catch { /* Storage may be unavailable. */ }
}

/** « 12:04 » */
export const draftTime = (savedAt: string) => new Date(savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
