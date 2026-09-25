import { useCallback, useEffect, useRef, useState } from 'react'
import { useHistory, useLocation, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IonContent, IonModal, IonPage } from '@ionic/react'
import { apiRequest } from '../../api/client'
import { detectPersonalRecord, estimateOneRm } from '../../domain/strengthMath'
import { createRestTimer, pauseRestTimer, refreshRestTimer, remainingRestMs, restartRestTimer, resumeRestTimer, startRestTimer } from '../../domain/restTimer'
import type { RestTimer } from '../../domain/restTimer'
import type { LiveExerciseDraft, LiveSetDraft } from '../../domain/liveDraft'
import { V5Button, V5Card, V5Loading, V5State } from '../../ui'
import { draftStore } from './drafts'
import { CatalogSheet } from './CatalogSheet'
import { createDraft, freeKey, liveQueue, owner, persistDraft, routineKey, sessionPrefix, setTypeName, type Exercise, type HistoryEntry, type Program, type Workout } from './liveApi'
import { SyncStatus } from './SyncStatus'
import medalIcon from './assets/031-medal.svg'
import stopwatchIcon from './assets/030-stopwatch.svg'
import './live.css'

const types = [{ value: 'Warmup', label: 'Échauffement', short: 'Éch.' }, { value: 'Normal', label: 'Normal', short: 'Normal' }, { value: 'DropSet', label: 'Drop set', short: 'Drop' }, { value: 'Failure', label: 'Échec', short: 'Échec' }]
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
const kg = (value: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value)
const conflictMessage = (count: number) => count === 0 ? 'Elle a été supprimée depuis un autre écran. Recrée une séance pour enregistrer cet exercice, ou abandonne ce brouillon.' : count === 1 ? 'Elle a été supprimée depuis un autre écran. Ta série reste sur cet appareil : recrée une séance pour l’enregistrer, ou abandonne ce brouillon.' : `Elle a été supprimée depuis un autre écran. Tes ${count} séries restent sur cet appareil : recrée une séance pour les enregistrer, ou abandonne ce brouillon.`

export function LiveWorkoutPage() {
  const history = useHistory()
  const queryClient = useQueryClient()
  const location = useLocation()
  const { draftId } = useParams<{ draftId?: string }>()
  const [drafts, setDrafts] = useState<LiveExerciseDraft[]>([])
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (!draftId) history.replace(`/live/${crypto.randomUUID()}`) }, [draftId, history])
  const refresh = useCallback(async () => { if (draftId) setDrafts((await draftStore.list(owner(), sessionPrefix(draftId))).sort((a, b) => a.savedAtUtc.localeCompare(b.savedAtUtc))) }, [draftId])
  useEffect(() => { const load = async () => refresh(); void load() }, [refresh, location.key])
  async function changeGroup(draft: LiveExerciseDraft, value: string) {
    try { await persistDraft({ ...draft, supersetGroupId: value ? Number(value) : null }, true); await refresh() }
    catch { setError('Impossible de sauvegarder le groupe sur cet appareil.') }
  }
  async function finish() {
    setBusy(true)
    try { await liveQueue.syncPending(owner()); await queryClient.invalidateQueries(); history.replace('/tabs/today') }
    catch { setError('Impossible de terminer la séance. Réessaie.'); setBusy(false) }
  }
  return <IonPage><IonContent fullscreen><main className="live-page">
    <header className="live-head"><p>Séance en cours</p><h1>Séance libre</h1></header>
    <p className="live-intro">Ajoute tes exercices au fil de la séance. Chaque série est conservée sur cet appareil et synchronisée dès que possible.</p>
    <p className="live-summary">{drafts.length} exercice{drafts.length > 1 ? 's' : ''} · {drafts.reduce((sum, item) => sum + item.sets.length, 0)} séries</p>
    {drafts.length ? <section aria-label="Exercices de la séance" className="live-list">{drafts.map((draft, index) => <V5Card key={draft.storageKey} className={`live-exercise-card ${draft.supersetGroupId ? 'is-superset' : ''} ${draft.supersetGroupId && drafts[index + 1]?.supersetGroupId === draft.supersetGroupId ? 'superset-continues' : ''}`}>
      {draft.supersetGroupId && drafts[index - 1]?.supersetGroupId !== draft.supersetGroupId && <div className="live-group"><strong>Superset {String.fromCharCode(64 + draft.supersetGroupId)}</strong><span>enchaîne sans repos</span></div>}
      <button className="live-card-link" onClick={() => history.push(`/live/${draftId}/exercises/${draft.exerciseId}`)}><strong>{draft.exerciseName}</strong><span>{draft.sets.length} séries · {draft.syncConflict ? 'Sync bloquée' : draft.pendingSync ? 'Sync en attente' : 'Enregistré'}</span></button>
      <label>Superset <select value={draft.supersetGroupId ?? ''} onChange={event => void changeGroup(draft, event.target.value)} aria-label={`Groupe superset de ${draft.exerciseName}`}><option value="">Aucun</option><option value="1">A</option><option value="2">B</option><option value="3">C</option></select></label>
    </V5Card>)}</section> : <V5State title="À toi de jouer" message="Choisis ton premier exercice pour commencer la séance en direct." />}
    {error && <div role="alert"><V5State title="Enregistrement interrompu" message={error} error /></div>}
    <V5Button onClick={() => setCatalogOpen(true)}>Ajouter un exercice</V5Button>
    <V5Button secondary onClick={() => void finish()} disabled={busy}>{busy ? 'Synchronisation…' : 'Terminer'}</V5Button>
    <CatalogSheet open={catalogOpen} onClose={() => setCatalogOpen(false)} onSelect={exercise => { setCatalogOpen(false); history.push(`/live/${draftId}/exercises/${exercise.id}`) }} exclude={drafts.map(item => item.exerciseId)} />
  </main></IonContent></IonPage>
}

export function ExerciseLivePage() {
  const history = useHistory()
  const queryClient = useQueryClient()
  const params = useParams<{ draftId?: string; programId?: string; sessionId?: string; exerciseId: string }>()
  const exerciseId = Number(params.exerciseId)
  const free = Boolean(params.draftId)
  const sessionId = Number(params.sessionId)
  const key = free ? freeKey(params.draftId!, exerciseId) : routineKey(sessionId, exerciseId)
  const back = free ? `/live/${params.draftId}` : `/tabs/programs/${params.programId}/sessions/${sessionId}`
  const [draft, setDraft] = useState<LiveExerciseDraft | null>(null)
  const draftRef = useRef<LiveExerciseDraft | null>(null)
  const saveSequence = useRef(0)
  const saveChain = useRef<Promise<unknown>>(Promise.resolve())
  const showDraft = (value: LiveExerciseDraft) => { draftRef.current = value; setDraft(value) }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [padOpen, setPadOpen] = useState(false)
  const [timerOpen, setTimerOpen] = useState(false)
  const [timer, setTimer] = useState<RestTimer>(createRestTimer)
  const [now, setNow] = useState(() => Date.now())
  const [saving, setSaving] = useState(false)
  const exerciseQuery = useQuery({ queryKey: ['live', 'exercise', exerciseId], queryFn: () => apiRequest<Exercise>(`api/exercises/${exerciseId}`), enabled: Number.isInteger(exerciseId) })
  const historyQuery = useQuery({ queryKey: ['live', 'history', exerciseId], queryFn: () => apiRequest<HistoryEntry[]>(`api/exercises/${exerciseId}/history`), enabled: Number.isInteger(exerciseId) })
  const programQuery = useQuery({ queryKey: ['live', 'program', params.programId], queryFn: () => apiRequest<Program>(`api/programs/${params.programId}`), enabled: !free })
  const workoutsQuery = useQuery({ queryKey: ['live', 'workouts'], queryFn: () => apiRequest<Workout[]>('api/workoutsessions'), enabled: !free })
  const session = programQuery.data?.sessions.find(item => Number(item.id) === sessionId)
  const programExercise = session?.exercises.find(item => Number(item.exerciseId) === exerciseId)
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const saved = await draftStore.get(owner(), key)
        if (cancelled) return
        if (saved) { showDraft(saved); setLoading(false); return }
        if (!exerciseQuery.data || (!free && (!session || !programExercise))) {
          if (exerciseQuery.isError || programQuery.isError) { setError('Vérifie ta connexion, puis réessaie.'); setLoading(false) }
          return
        }
        const created = createDraft(key, free ? params.draftId! : crypto.randomUUID(), exerciseQuery.data, free ? null : sessionId, session?.name ?? null, programExercise?.targetSets ?? 3, programExercise?.restSeconds ?? 90)
        if (programExercise?.targetRepsMin) created.repsCurrent = programExercise.targetRepsMin
        const today = workoutsQuery.data?.find(item => Number(item.workoutProgramSessionId) === sessionId && item.date.slice(0, 10) === new Date().toLocaleDateString('sv-SE'))
        const logged = today?.workoutExercises?.find(item => Number(item.exerciseId) === exerciseId)
        if (logged) {
          created.sets = (logged.exerciseSets ?? []).map(set => ({ id: Number(set.id), weight: Number(set.weight), repetitions: Number(set.repetitions), setType: setTypeName(set.setType), rpe: set.rpe == null ? null : Number(set.rpe) }))
          created.notes = logged.notes ?? null; created.supersetGroupId = logged.supersetGroupId ?? null; created.workoutSessionId = Number(today?.id)
        }
        if (created.sets.length) { const last = created.sets.at(-1)!; created.weightCurrent = last.weight; created.repsCurrent = last.repetitions }
        await draftStore.put(owner(), key, created)
        if (!cancelled) { showDraft(created); setLoading(false) }
      } catch { if (!cancelled) { setError('Sauvegarde locale impossible. Réessaie.'); setLoading(false) } }
    }
    void load()
    return () => { cancelled = true }
  }, [key, free, params.draftId, exerciseId, exerciseQuery.data, exerciseQuery.isError, programQuery.isError, session, programExercise, workoutsQuery.data, sessionId])
  useEffect(() => { if (!timerOpen) return; const interval = window.setInterval(() => { setNow(Date.now()); setTimer(current => refreshRestTimer(current)) }, 500); return () => clearInterval(interval) }, [timerOpen])
  const remaining = Math.ceil(remainingRestMs(timer, now) / 1000)
  async function save(change: Partial<LiveExerciseDraft>, pending = false) {
    const current = draftRef.current
    if (!current) return
    const updated = { ...current, ...change, pendingSync: current.pendingSync || pending, revision: current.revision + 1 }
    showDraft(updated)
    const sequence = ++saveSequence.current
    const operation = saveChain.current.then(() => persistDraft(updated, pending))
    saveChain.current = operation.catch(() => undefined)
    try { const result = await operation; if (sequence === saveSequence.current) showDraft(result) }
    catch { setError('Sauvegarde locale impossible. Garde cette page ouverte et réessaie.') }
  }
  async function addSet() {
    const current = draftRef.current
    if (!current || current.repsCurrent < 1 || saving) return
    setSaving(true); setError('')
    const record = detectPersonalRecord([...(historyQuery.data ?? []).flatMap(entry => entry.sets.map(set => ({ weight: set.weight, repetitions: set.repetitions }))), ...current.sets], current.weightCurrent, current.repsCurrent)
    const set: LiveSetDraft = { id: 0, weight: current.weightCurrent, repetitions: current.repsCurrent, setType: current.setType, rpe: current.rpe }
    try {
      const updated = { ...current, sets: [...current.sets, set], pendingSync: true, revision: current.revision + 1 }
      showDraft(updated)
      const sequence = ++saveSequence.current
      const operation = saveChain.current.then(() => persistDraft(updated, true))
      saveChain.current = operation.catch(() => undefined)
      const result = await operation
      if (sequence === saveSequence.current) showDraft(result)
      setPadOpen(false)
      if (record.isPersonalRecord) setNotice(record.isFirst ? `Premier 1RM estimé : ${kg(record.achieved)} kg` : `1RM estimé ${kg(record.achieved)} kg · +${kg(record.achieved - record.previousBest)} kg`)
      if (current.restSeconds > 0) { const started = startRestTimer(current.restSeconds * 1000); setTimer(started); setNow((started.endsAt ?? 0) - started.durationMs); setTimerOpen(true) }
    } catch { setError('Sauvegarde locale impossible. Garde cette page ouverte et réessaie.') }
    finally { setSaving(false) }
  }
  async function deleteSet(index: number) {
    const current = draftRef.current
    if (!current) return
    try {
      const target = current.sets[index]
      if (target.id > 0 && navigator.onLine) await apiRequest<void>(`api/exercises/${exerciseId}/sets/${target.id}`, { method: 'DELETE' })
      await save({ sets: current.sets.filter((_, i) => i !== index) }, true); setNotice('')
    } catch { setError('Suppression impossible. Réessaie.') }
  }
  async function resolve(recreate: boolean) {
    const result = await liveQueue.resolveConflict(owner(), key, recreate)
    if (result) showDraft(result); else history.replace(back)
  }
  async function finish() {
    setSaving(true)
    try { await saveChain.current; await liveQueue.syncPending(owner()); await queryClient.invalidateQueries(); history.replace('/tabs/today') }
    catch { setError('Impossible de terminer la séance. Réessaie.'); setSaving(false) }
  }
  return <IonPage><IonContent fullscreen><main className="live-page">
    {loading && !draft ? <V5Loading /> : error && !draft ? <V5State title="Impossible de charger l’exercice" message={error} error onRetry={() => window.location.reload()} /> : draft && <>
      <header className="live-head"><p>{draft.sessionName ?? 'Séance libre'}{draft.supersetGroupId ? ` · Superset ${String.fromCharCode(64 + draft.supersetGroupId)}` : ''}</p><h1>{draft.exerciseName}</h1><button className="live-link" onClick={() => history.push(back)}>‹ Séance</button></header>
      {notice && <div className="live-pr" role="status"><img src={medalIcon} alt="" /><div><strong>Nouveau record personnel !</strong><span>{notice}</span></div><small className="live-badge live-badge--pr">PR</small></div>}
      <SyncStatus draft={draft} />
      {draft.syncConflict && <V5State title="Séance introuvable sur le serveur" message={conflictMessage(draft.sets.length)} error><V5Button onClick={() => void resolve(true)}>Recréer la séance</V5Button><V5Button secondary onClick={() => void resolve(false)}>Abandonner le brouillon</V5Button></V5State>}
      <ol className="live-indicators" aria-label="Séries">{Array.from({ length: Math.max(draft.targetSets, draft.sets.length + 1) }, (_, index) => <li key={index} className={index < draft.sets.length ? 'done' : index === draft.sets.length ? 'active' : ''} aria-current={index === draft.sets.length ? 'step' : undefined}>{index < draft.sets.length ? '✓ ' : ''}{index + 1}</li>)}</ol>
      {draft.gifUrl && <a className="live-tile" href={draft.gifUrl} target="_blank" rel="noreferrer">Voir le mouvement <span>→</span></a>}
      <V5Card className="live-entry" aria-label="Saisie de série">
        <div className="live-entry__measurements"><div className="live-entry__measure"><label>Poids (kg)</label><div className="live-stepper"><button aria-label="Diminuer le poids de 2,5 kg" onClick={() => void save({ weightCurrent: Math.max(0, draft.weightCurrent - 2.5) })}>−</button><button className="live-stepper__value" aria-label={`Poids ${draft.weightCurrent} kg, saisie précise`} onClick={() => setPadOpen(true)}>{kg(draft.weightCurrent)}</button><button aria-label="Augmenter le poids de 2,5 kg" onClick={() => void save({ weightCurrent: draft.weightCurrent + 2.5 })}>＋</button></div>
        </div><div className="live-entry__measure"><label>Répétitions</label><div className="live-stepper"><button aria-label="Retirer une répétition" onClick={() => void save({ repsCurrent: Math.max(0, draft.repsCurrent - 1) })}>−</button><button className="live-stepper__value" aria-label={`${draft.repsCurrent} répétitions, saisie précise`} onClick={() => setPadOpen(true)}>{draft.repsCurrent}</button><button aria-label="Ajouter une répétition" onClick={() => void save({ repsCurrent: draft.repsCurrent + 1 })}>＋</button></div></div></div>
        <p>1RM estimé : <strong>{estimateOneRm(draft.weightCurrent, draft.repsCurrent, true) > 0 ? `${kg(estimateOneRm(draft.weightCurrent, draft.repsCurrent, true))} kg` : '—'}</strong></p>
        <fieldset className="live-choice"><legend>Type de série</legend><div className="live-chips live-types">{types.map(option => <button key={option.value} aria-label={option.label} className={draft.setType === option.value ? 'active' : ''} aria-pressed={draft.setType === option.value} onClick={() => void save({ setType: option.value })}>{option.short}</button>)}</div></fieldset>
        <fieldset className="live-choice"><legend>RPE</legend><div className="live-chips live-rpe">{[6, 7, 8, 9, 10].map(value => <button key={value} className={draft.rpe === value ? 'active' : ''} aria-pressed={draft.rpe === value} onClick={() => void save({ rpe: draft.rpe === value ? null : value })}>{value}</button>)}</div></fieldset>
        <V5Button secondary onClick={() => setPadOpen(true)}>Saisie précise · type, RPE, notes</V5Button>
      </V5Card>
      {draft.sets.length > 0 && <V5Card className="live-completed"><h2>Séries validées</h2>{draft.sets.map((set, index) => <div key={`${index}-${set.id}`} className="live-set"><span>{index + 1}</span><span className={`live-badge live-badge--${set.setType.toLowerCase()}`}>{types.find(option => option.value === set.setType)?.short ?? set.setType}</span><strong>{kg(set.weight)} kg × {set.repetitions}</strong>{set.rpe && <small className="live-badge live-badge--rpe">RPE {set.rpe}</small>}<button aria-label={`Supprimer la série ${index + 1}`} onClick={() => void deleteSet(index)}>×</button></div>)}</V5Card>}
      {draft.notes && <p className="live-note"><span aria-hidden="true">✎</span> {draft.notes}</p>}
      <button className="live-tile" onClick={() => { if (timer.state === 'idle') setTimer(startRestTimer(draft.restSeconds * 1000)); setTimerOpen(true) }}><img className="live-icon" src={stopwatchIcon} alt="" />Repos · {timer.state === 'idle' ? clock(draft.restSeconds) : clock(remaining)} <span>→</span></button>
      {error && <div role="alert"><V5State title="Enregistrement interrompu" message={error} error /></div>}
      <V5Button onClick={() => void addSet()} disabled={saving || draft.repsCurrent < 1}>{saving ? 'Enregistrement…' : `Valider la série ${draft.sets.length + 1}`}</V5Button>
      <V5Button secondary onClick={() => history.push(back)}>Retour à la séance</V5Button>
      <V5Button secondary onClick={() => void finish()} disabled={saving}>Terminer</V5Button>
      <IonModal isOpen={padOpen} onDidDismiss={() => setPadOpen(false)} initialBreakpoint={0.9} breakpoints={[0, 0.5, 0.9]} className="live-sheet"><IonContent><div className="live-sheet__inner live-form">
        <h2>Saisie précise</h2><p>{draft.exerciseName} · Série {draft.sets.length + 1}</p>
        <label>Poids (kg)<input type="number" min="0" step="0.5" inputMode="decimal" value={draft.weightCurrent} onChange={event => void save({ weightCurrent: Math.max(0, Number(event.target.value)) })} /></label>
        <label>Répétitions<input type="number" min="0" step="1" inputMode="numeric" value={draft.repsCurrent} onChange={event => void save({ repsCurrent: Math.max(0, Math.floor(Number(event.target.value))) })} /></label>
        <fieldset><legend>Type de série</legend><div className="live-chips">{types.map(option => <button key={option.value} className={draft.setType === option.value ? 'active' : ''} aria-pressed={draft.setType === option.value} onClick={() => void save({ setType: option.value })}>{option.label}</button>)}</div></fieldset>
        <label>RPE {draft.rpe ?? '(facultatif)'}<input type="range" min="1" max="10" value={draft.rpe ?? 8} onChange={event => void save({ rpe: Number(event.target.value) })} /></label><button className="live-link" onClick={() => void save({ rpe: null })}>Effacer le RPE</button>
        <label>Notes de l’exercice<textarea rows={3} value={draft.notes ?? ''} onChange={event => void save({ notes: event.target.value })} onBlur={() => void save({}, true)} placeholder="Repères, ressenti…" /></label>
        <V5Button onClick={() => void addSet()} disabled={saving || draft.repsCurrent < 1}>Valider la série</V5Button><V5Button secondary onClick={() => setPadOpen(false)}>Annuler</V5Button>
      </div></IonContent></IonModal>
      <IonModal isOpen={timerOpen} onDidDismiss={() => setTimerOpen(false)} initialBreakpoint={0.9} breakpoints={[0, 0.9]} className="live-sheet"><IonContent><div className="live-sheet__inner live-timer">
        <h2>Minuteur de repos</h2><div className="live-timer__dial" style={{ background: `conic-gradient(var(--st-neon) ${timer.durationMs ? remainingRestMs(timer, now) / timer.durationMs * 100 : 0}%, #ddf6f4 0)` }} role="timer" aria-label="Temps de repos restant"><span>{clock(remaining)}<small>restantes</small></span></div><p>{timer.state === 'finished' ? 'Repos terminé' : `sur ${clock(draft.restSeconds)} de repos`}</p>
        <div className="live-timer__actions"><V5Button onClick={() => setTimer(current => current.state === 'running' ? pauseRestTimer(current) : resumeRestTimer(current))}>{timer.state === 'running' ? 'Pause' : 'Reprendre'}</V5Button><V5Button secondary onClick={() => setTimer(current => restartRestTimer(current))}>Relancer</V5Button><V5Button secondary onClick={() => setTimerOpen(false)}>Fermer</V5Button></div>
      </div></IonContent></IonModal>
    </>}
  </main></IonContent></IonPage>
}
