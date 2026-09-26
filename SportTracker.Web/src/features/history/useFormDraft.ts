import { useCallback, useEffect, useRef, useState } from 'react'
import { getDraftOwner } from '../../api/tokenStore'
import { clearFormDraft, formDraftKey, readFormDraft, writeFormDraft } from '../../domain/formDraft'

/**
 * Local draft of a form: restored when the page opens, saved 400 ms after each change, cleared once the
 * server has it. `restored` lets the page say « Brouillon repris ». A change still waiting for its 400 ms is
 * written at once when the app goes to the background, is closed, or the page is left (iOS may kill it then).
 */
export function useFormDraft<T>(kind: string, id: string | number | null | undefined, isValue: (value: unknown) => value is T) {
  const [key] = useState(() => formDraftKey(kind, getDraftOwner(), id))
  const [restored] = useState(() => readFormDraft(localStorage, key, isValue))
  const [savedAt, setSavedAt] = useState<string | null>(restored?.savedAt ?? null)
  const timer = useRef(0)
  const pending = useRef<{ value: T } | null>(null)
  const flush = useCallback((value: T) => {
    window.clearTimeout(timer.current)
    pending.current = null
    const draft = writeFormDraft(localStorage, key, value)
    if (draft) setSavedAt(draft.savedAt)
    return !!draft
  }, [key])
  const save = useCallback((value: T) => {
    window.clearTimeout(timer.current)
    pending.current = { value }
    timer.current = window.setTimeout(() => flush(value), 400)
  }, [flush])
  const clear = useCallback(() => { window.clearTimeout(timer.current); pending.current = null; clearFormDraft(localStorage, key); setSavedAt(null) }, [key])
  useEffect(() => {
    const writePending = () => { const waiting = pending.current; if (waiting) { pending.current = null; window.clearTimeout(timer.current); writeFormDraft(localStorage, key, waiting.value) } }
    const onVisibility = () => { if (document.visibilityState === 'hidden') writePending() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', writePending)
    return () => { document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('pagehide', writePending); writePending() }
  }, [key])
  return { restored, savedAt, save, flush, clear }
}
