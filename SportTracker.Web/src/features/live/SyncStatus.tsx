import { useEffect, useState } from 'react'
import type { LiveExerciseDraft } from '../../domain/liveDraft'
import { draftStore } from './drafts'
import { owner } from './liveApi'

export function SyncStatus({ draft }: { draft: LiveExerciseDraft }) {
  const [online, setOnline] = useState(navigator.onLine)
  const [saved, setSaved] = useState(draft)
  useEffect(() => {
    let active = true
    let sequence = 0
    const refresh = async () => {
      setOnline(navigator.onLine)
      const request = ++sequence
      const value = await draftStore.get(owner(), draft.storageKey).catch(() => null)
      if (active && request === sequence && value) setSaved(value)
    }
    const update = () => { void refresh() }
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    window.addEventListener('sporttracker:draft-saved', update)
    void refresh()
    return () => {
      active = false
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      window.removeEventListener('sporttracker:draft-saved', update)
    }
  }, [draft.storageKey])
  const current = saved.storageKey === draft.storageKey && saved.revision >= draft.revision ? saved : draft
  return <p className="live-sync" role="status"><span aria-hidden="true" />{current.syncConflict ? 'Sync bloquée — séance introuvable' : !online ? 'Hors ligne — sync en attente' : current.pendingSync ? 'Sauvegarde locale — sync en attente' : `Enregistré automatiquement · ${new Date(current.savedAtUtc).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}</p>
}
