import { useCallback, useEffect, useRef, useState } from 'react'
import { useHistory, useLocation, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IonContent, IonIcon, IonPage, useIonViewWillEnter, useIonViewWillLeave } from '@ionic/react'
import { chevronForwardOutline, pauseOutline, playCircleOutline, playOutline, timerOutline } from 'ionicons/icons'
import { apiRequest } from '../../api/client'
import { detectPersonalRecord, estimateOneRm } from '../../domain/strengthMath'
import { addRestTime, createRestTimer, pauseRestTimer, remainingRestMs, resumeRestTimer, setRestDuration, startRestTimer } from '../../domain/restTimer'
import type { RestTimer } from '../../domain/restTimer'
import type { LiveExerciseDraft, LiveSetDraft } from '../../domain/liveDraft'
import { formatRest, lastTimeSet } from '../../domain/liveSession'
import {
  ExerciseDemoSheet, ExerciseThumb, V5State, V6Button, V6Header, V6Item, V6Keypad, V6List, V6Segment, V6SetRow, V6Sheet, V6Skeleton,
  V6Stepper, V6StickyAction, V6WheelPicker, type V6SegmentOption,
} from '../../ui'
import { draftStore } from './drafts'
import { CatalogSheet } from './CatalogSheet'
import { createDraft, freeKey, liveQueue, owner, persistDraft, routineKey, sessionPrefix, setTypeName, type Exercise, type HistoryEntry, type Program, type Workout } from './liveApi'
import { closeLiveSession, openLiveSession, readLiveSession, updateLiveTimer, useLiveSession, useNow } from './liveSession'
import { SyncStatus } from './SyncStatus'
import { useShowRpe } from '../profile/preferences'
import medalIcon from './assets/031-medal.svg'
import './live.css'

const types = [{ value: 'Warmup', label: 'Échauffement', short: 'Éch.' }, { value: 'Normal', label: 'Normal', short: 'Normal' }, { value: 'DropSet', label: 'Drop set', short: 'Drop' }, { value: 'Failure', label: 'Échec', short: 'Échec' }]
const typeOptions: V6SegmentOption<string>[] = types.map(option => ({ value: option.value, label: option.short }))
const restPresets: V6SegmentOption<string>[] = [{ value: '30', label: '30 s' }, { value: '60', label: '60 s' }, { value: '90', label: '90 s' }, { value: '120', label: '2 min' }, { value: '180', label: '3 min' }]
const wheelMinutes = Array.from({ length: 11 }, (_, value) => ({ value, text: String(value) }))
const wheelSeconds = [0, 15, 30, 45].map(value => ({ value, text: String(value).padStart(2, '0') }))
const idleTimer = createRestTimer()
const WEIGHT_STEP = 2.5
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
const kg = (value: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value)
const typeShort = (type: string) => types.find(option => option.value === type)?.short ?? type
const supersetLetter = (group: number) => String.fromCharCode(64 + group)
const conflictMessage = (count: number) => count === 0 ? 'Elle a été supprimée depuis un autre écran. Recrée une séance pour enregistrer cet exercice, ou abandonne ce brouillon.' : count === 1 ? 'Elle a été supprimée depuis un autre écran. Ta série reste sur cet appareil : recrée une séance pour l’enregistrer, ou abandonne ce brouillon.' : `Elle a été supprimée depuis un autre écran. Tes ${count} séries restent sur cet appareil : recrée une séance pour les enregistrer, ou abandonne ce brouillon.`

/** Shows an exercise in the « séance en cours » mini-bar: a free session at once, a programme session from its first set. */
function enterLiveExercise(draft: LiveExerciseDraft, { sessionKey, href, free }: { sessionKey: string; href: string; free: boolean }) {
  if (!(free || draft.sets.length > 0 || readLiveSession()?.sessionKey === sessionKey)) return
  openLiveSession({ owner: owner(), sessionKey, href, storageKey: draft.storageKey, exerciseName: draft.exerciseName, setsDone: draft.sets.length, targetSets: Math.max(draft.targetSets, draft.sets.length) })
}

/** True while this page is the one on screen (Ionic keeps stacked pages mounted). */
function usePageActive() {
  const [active, setActive] = useState(true)
  useIonViewWillEnter(() => setActive(true))
  useIonViewWillLeave(() => setActive(false))
  return active
}

export function LiveWorkoutPage() {
  const history = useHistory()
  const queryClient = useQueryClient()
  const location = useLocation()
  const { draftId } = useParams<{ draftId?: string }>()
  const [drafts, setDrafts] = useState<LiveExerciseDraft[]>([])
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const active = usePageActive()
  const finishing = useRef(false)
  useEffect(() => { if (!draftId) history.replace(`/live/${crypto.randomUUID()}`) }, [draftId, history])
  const refresh = useCallback(async () => { if (draftId) setDrafts((await draftStore.list(owner(), sessionPrefix(draftId))).sort((a, b) => a.savedAtUtc.localeCompare(b.savedAtUtc))) }, [draftId])
  useEffect(() => { const load = async () => refresh(); void load() }, [refresh, location.key])
  // Leaving this page (back to the tabs) keeps the session in the mini-bar.
  useEffect(() => {
    const last = drafts.at(-1)
    if (!draftId || !active || !last || finishing.current) return
    openLiveSession({ owner: owner(), sessionKey: sessionPrefix(draftId).slice(0, -1), href: `/live/${draftId}`, storageKey: last.storageKey, exerciseName: last.exerciseName, setsDone: last.sets.length, targetSets: Math.max(last.targetSets, last.sets.length) })
  }, [active, drafts, draftId])
  async function changeGroup(draft: LiveExerciseDraft, value: string) {
    try { await persistDraft({ ...draft, supersetGroupId: value ? Number(value) : null }, true); await refresh() }
    catch { setError('Impossible de sauvegarder le groupe sur cet appareil.') }
  }
  async function addExercises(exercises: Exercise[]) {
    setCatalogOpen(false)
    if (!draftId || !exercises.length) return
    try {
      for (const exercise of exercises) {
        const key = freeKey(draftId, exercise.id)
        if (!await draftStore.get(owner(), key)) await draftStore.put(owner(), key, createDraft(key, draftId, exercise))
      }
      await refresh()
      if (exercises.length === 1) history.push(`/live/${draftId}/exercises/${exercises[0].id}`)
    } catch { setError('Impossible d’ajouter l’exercice sur cet appareil.') }
  }
  async function finish() {
    setBusy(true)
    try { await liveQueue.syncPending(owner()); await queryClient.invalidateQueries(); finishing.current = true; closeLiveSession(); history.replace('/tabs/today') }
    catch { setError('Impossible de terminer la séance. Réessaie.'); setBusy(false) }
  }
  const setCount = drafts.reduce((sum, item) => sum + item.sets.length, 0)
  return <IonPage>
    <IonContent fullscreen><main className="live-page">
      <V6Header title="Séance libre" subtitle="Séance en cours" backHref="/tabs/today" avatar={false}
        action={<V6Button variant="text" onClick={() => void finish()} disabled={busy}>{busy ? 'Synchronisation…' : 'Terminer'}</V6Button>} />
      <p className="live-summary">{drafts.length} exercice{drafts.length > 1 ? 's' : ''} · {setCount} série{setCount > 1 ? 's' : ''}</p>
      <p className="live-intro">Ajoute tes exercices au fil de la séance. Chaque série est conservée sur cet appareil et synchronisée dès que possible.</p>
      {drafts.length ? <section aria-label="Exercices de la séance" className="live-list">{drafts.map((draft, index) => {
        const starts = draft.supersetGroupId && drafts[index - 1]?.supersetGroupId !== draft.supersetGroupId
        const continues = draft.supersetGroupId && drafts[index + 1]?.supersetGroupId === draft.supersetGroupId
        return <div key={draft.storageKey} className={`live-exercise-card ${draft.supersetGroupId ? 'is-superset' : ''} ${continues ? 'superset-continues' : ''}`}>
          {starts && <div className="live-group"><strong>Superset {supersetLetter(draft.supersetGroupId!)}</strong><span>enchaîne sans repos</span></div>}
          <button type="button" className="live-card-link" onClick={() => history.push(`/live/${draftId}/exercises/${draft.exerciseId}`)}>
            <ExerciseThumb exercise={{ gifUrl: draft.gifUrl }} size={48} />
            <span className="live-card-link__text"><strong>{draft.exerciseName}</strong><span>{draft.sets.length} série{draft.sets.length > 1 ? 's' : ''} · {draft.syncConflict ? 'Sync bloquée' : draft.pendingSync ? 'Sync en attente' : 'Enregistré'}</span></span>
            <IonIcon icon={chevronForwardOutline} aria-hidden="true" />
          </button>
          <label className="live-superset">Superset<select value={draft.supersetGroupId ?? ''} onChange={event => void changeGroup(draft, event.target.value)} aria-label={`Groupe superset de ${draft.exerciseName}`}><option value="">Aucun</option><option value="1">A</option><option value="2">B</option><option value="3">C</option></select></label>
        </div>
      })}</section> : <V5State title="À toi de jouer" message="Choisis ton premier exercice pour commencer la séance en direct." />}
      {error && <div role="alert"><V5State title="Enregistrement interrompu" message={error} error /></div>}
    </main></IonContent>
    <V6StickyAction><V6Button onClick={() => setCatalogOpen(true)}>Ajouter un exercice</V6Button></V6StickyAction>
    <CatalogSheet open={catalogOpen} onClose={() => setCatalogOpen(false)} onAdd={exercises => void addExercises(exercises)} exclude={drafts.map(item => item.exerciseId)} />
  </IonPage>
}

export function ExerciseLivePage() {
  const history = useHistory()
  const location = useLocation()
  const queryClient = useQueryClient()
  const params = useParams<{ draftId?: string; programId?: string; sessionId?: string; exerciseId: string }>()
  const exerciseId = Number(params.exerciseId)
  const [showRpe] = useShowRpe()
  const free = Boolean(params.draftId)
  const sessionId = Number(params.sessionId)
  const key = free ? freeKey(params.draftId!, exerciseId) : routineKey(sessionId, exerciseId)
  const sessionKey = key.slice(0, key.lastIndexOf(':'))
  const back = free ? `/live/${params.draftId}` : `/tabs/programs/${params.programId}/sessions/${sessionId}`
  const [draft, setDraft] = useState<LiveExerciseDraft | null>(null)
  const draftRef = useRef<LiveExerciseDraft | null>(null)
  const saveSequence = useRef(0)
  const saveChain = useRef<Promise<unknown>>(Promise.resolve())
  const showDraft = (value: LiveExerciseDraft) => { draftRef.current = value; setDraft(value) }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pad, setPad] = useState<'weight' | 'reps' | null>(null)
  const [padOpening, setPadOpening] = useState(0)
  const [demoOpen, setDemoOpen] = useState(false)
  const [timerSheet, setTimerSheet] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const active = usePageActive()
  const finishing = useRef(false)
  const session = useLiveSession()
  const timer = session?.sessionKey === sessionKey ? session.timer : idleTimer
  const setTimer = (update: (current: RestTimer) => RestTimer) => updateLiveTimer(sessionKey, update)
  const now = useNow(timer.state === 'running')
  const exerciseQuery = useQuery({ queryKey: ['live', 'exercise', exerciseId], queryFn: () => apiRequest<Exercise>(`api/exercises/${exerciseId}`), enabled: Number.isInteger(exerciseId) })
  const historyQuery = useQuery({ queryKey: ['live', 'history', exerciseId], queryFn: () => apiRequest<HistoryEntry[]>(`api/exercises/${exerciseId}/history`), enabled: Number.isInteger(exerciseId) })
  const programQuery = useQuery({ queryKey: ['live', 'program', params.programId], queryFn: () => apiRequest<Program>(`api/programs/${params.programId}`), enabled: !free })
  const workoutsQuery = useQuery({ queryKey: ['live', 'workouts'], queryFn: () => apiRequest<Workout[]>('api/workoutsessions'), enabled: !free })
  const programSession = programQuery.data?.sessions.find(item => Number(item.id) === sessionId)
  const programExercise = programSession?.exercises.find(item => Number(item.exerciseId) === exerciseId)
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const saved = await draftStore.get(owner(), key)
        if (cancelled) return
        if (saved) { showDraft(saved); setLoading(false); return }
        if (!exerciseQuery.data || (!free && (!programSession || !programExercise))) {
          if (exerciseQuery.isError || programQuery.isError) { setError('Vérifie ta connexion, puis réessaie.'); setLoading(false) }
          return
        }
        const created = createDraft(key, free ? params.draftId! : crypto.randomUUID(), exerciseQuery.data, free ? null : sessionId, programSession?.name ?? null, programExercise?.targetSets ?? 3, programExercise?.restSeconds ?? 90)
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
  }, [key, free, params.draftId, exerciseId, exerciseQuery.data, exerciseQuery.isError, programQuery.isError, programSession, programExercise, workoutsQuery.data, sessionId])

  const pathname = location.pathname
  useEffect(() => {
    if (draft && active && !finishing.current) enterLiveExercise(draft, { sessionKey, href: pathname, free })
  }, [draft, active, sessionKey, pathname, free])

  const remaining = Math.min(timer.durationMs, remainingRestMs(timer, now))
  const restRunning = timer.state === 'running' && remaining > 0

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
  // Steppers read the latest draft: a held key repeats faster than React re-renders.
  const stepWeight = (direction: -1 | 1) => { const current = draftRef.current; if (current) void save({ weightCurrent: Math.max(0, current.weightCurrent + direction * WEIGHT_STEP) }) }
  const stepReps = (direction: -1 | 1) => { const current = draftRef.current; if (current) void save({ repsCurrent: Math.max(0, current.repsCurrent + direction) }) }
  async function addSet() {
    const current = draftRef.current
    if (!current || current.repsCurrent < 1 || saving) return
    setSaving(true); setError('')
    const record = detectPersonalRecord([...(historyQuery.data ?? []).flatMap(entry => entry.sets.map(set => ({ weight: set.weight, repetitions: set.repetitions }))), ...current.sets], current.weightCurrent, current.repsCurrent)
    const set: LiveSetDraft = { id: 0, weight: current.weightCurrent, repetitions: current.repsCurrent, setType: current.setType, rpe: current.rpe }
    try {
      const updated = { ...current, sets: [...current.sets, set], pendingSync: true, revision: current.revision + 1 }
      showDraft(updated)
      enterLiveExercise(updated, { sessionKey, href: pathname, free: true })
      const sequence = ++saveSequence.current
      const operation = saveChain.current.then(() => persistDraft(updated, true))
      saveChain.current = operation.catch(() => undefined)
      const result = await operation
      if (sequence === saveSequence.current) showDraft(result)
      setPad(null)
      if (record.isPersonalRecord) setNotice(record.isFirst ? `Premier 1RM estimé : ${kg(record.achieved)} kg` : `1RM estimé ${kg(record.achieved)} kg · +${kg(record.achieved - record.previousBest)} kg`)
      if (current.restSeconds > 0) { setTimer(() => startRestTimer(current.restSeconds * 1000)); setTimerSheet(0.25) }
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
  function changeRest(seconds: number) {
    const current = draftRef.current
    if (!current || seconds === current.restSeconds) return
    void save({ restSeconds: seconds })
    setTimer(value => setRestDuration(value, seconds * 1000))
  }
  async function resolve(recreate: boolean) {
    const result = await liveQueue.resolveConflict(owner(), key, recreate)
    if (result) showDraft(result)
    else { if (readLiveSession()?.storageKey === key) closeLiveSession(); history.replace(back) }
  }
  async function finish() {
    setSaving(true)
    try { await saveChain.current; await liveQueue.syncPending(owner()); await queryClient.invalidateQueries(); finishing.current = true; closeLiveSession(); history.replace('/tabs/today') }
    catch { setError('Impossible de terminer la séance. Réessaie.'); setSaving(false) }
  }
  const openPad = (field: 'weight' | 'reps') => { setPad(field); setPadOpening(value => value + 1) }

  const setNumber = (draft?.sets.length ?? 0) + 1
  const targetSets = Math.max(draft?.targetSets ?? 0, setNumber)
  const previous = draft ? lastTimeSet(historyQuery.data ?? [], draft.sets.length, new Date().toLocaleDateString('sv-SE')) : null
  const oneRm = draft ? estimateOneRm(draft.weightCurrent, draft.repsCurrent, true) : 0
  const restMinutes = Math.floor((draft?.restSeconds ?? 0) / 60)
  const restSeconds = Math.round(((draft?.restSeconds ?? 0) % 60) / 15) * 15 % 60
  const subtitle = draft ? `${draft.sessionName ?? 'Séance libre'}${draft.supersetGroupId ? ` · superset ${supersetLetter(draft.supersetGroupId)}` : ''}` : undefined

  return <IonPage>
    <IonContent fullscreen><main className="live-page">
      <V6Header title={draft?.exerciseName ?? exerciseQuery.data?.name ?? 'Exercice'} subtitle={subtitle} backHref={back} backLabel="Séance" avatar={false}
        action={draft && <V6Button variant="text" onClick={() => void finish()} disabled={saving}>Terminer</V6Button>} />
      {loading && !draft ? <V6Skeleton /> : error && !draft ? <V5State title="Impossible de charger l’exercice" message={error} error onRetry={() => window.location.reload()} /> : draft && <>
        {notice && <div className="live-pr" role="status"><img src={medalIcon} alt="" /><div><strong>Nouveau record personnel&nbsp;!</strong><span>{notice}</span></div></div>}
        <SyncStatus draft={draft} />
        {draft.syncConflict && <V5State title="Séance introuvable sur le serveur" message={conflictMessage(draft.sets.length)} error><V6Button onClick={() => void resolve(true)}>Recréer la séance</V6Button><V6Button variant="secondary" onClick={() => void resolve(false)}>Abandonner le brouillon</V6Button></V5State>}
        <section className="live-serie" aria-label={`Série ${setNumber} sur ${targetSets}`}>
          <h2>Série {setNumber} / {targetSets}</h2>
          {previous && <p>Dernière fois, série {previous.number} : {kg(previous.weight)} kg × {previous.repetitions} reps</p>}
        </section>
        {draft.gifUrl && <button type="button" className="live-demo" onClick={() => setDemoOpen(true)}><ExerciseThumb exercise={{ gifUrl: draft.gifUrl }} size={48} /><span><strong>Voir le mouvement</strong><small>Ouvrir la démonstration</small></span><IonIcon icon={playCircleOutline} aria-hidden="true" /></button>}
        <section className="live-entry" aria-label="Saisie de série">
          <V6Stepper label="Poids (kg)" value={kg(draft.weightCurrent)} unit="kg" onStep={stepWeight} onOpenPad={() => openPad('weight')} atMin={draft.weightCurrent <= 0}
            decreaseLabel="Diminuer le poids de 2,5 kg" increaseLabel="Augmenter le poids de 2,5 kg" valueLabel={`Poids ${kg(draft.weightCurrent)} kg, saisie précise`} />
          <V6Stepper label="Répétitions" value={String(draft.repsCurrent)} unit="reps" onStep={stepReps} onOpenPad={() => openPad('reps')} atMin={draft.repsCurrent <= 0}
            decreaseLabel="Retirer une répétition" increaseLabel="Ajouter une répétition" valueLabel={`${draft.repsCurrent} répétitions, saisie précise`} />
          <p className="live-onerm">1RM estimé : <strong>{oneRm > 0 ? `${kg(oneRm)} kg` : '—'}</strong></p>
          <V6Segment label="Type de série" value={draft.setType} options={typeOptions} onChange={value => void save({ setType: value })} />
          {showRpe && <div className="live-rpe" role="group" aria-label="RPE"><span>RPE</span>{[6, 7, 8, 9, 10].map(value => <button type="button" key={value} className={draft.rpe === value ? 'active' : ''} aria-pressed={draft.rpe === value} onClick={() => void save({ rpe: draft.rpe === value ? null : value })}>{value}</button>)}</div>}
        </section>
        <section className="live-sets" aria-label="Séries">
          <h2>Séries validées · glisser pour supprimer</h2>
          {draft.sets.map((set, index) => <V6SetRow key={index} number={index + 1} done onDelete={() => void deleteSet(index)}>
            <SetSummary set={set} />
          </V6SetRow>)}
          <V6SetRow key={draft.sets.length} number={setNumber} done={false} busy={saving || draft.repsCurrent < 1} onValidate={() => void addSet()} validateLabel={`Valider la série ${setNumber}`}>
            <SetSummary set={{ id: 0, weight: draft.weightCurrent, repetitions: draft.repsCurrent, setType: draft.setType, rpe: draft.rpe }} next />
          </V6SetRow>
        </section>
        <V6List header="Repos et notes">
          <V6Item icon={timerOutline} title="Minuteur de repos" detail={restRunning ? 'En cours' : 'Repos prévu entre deux séries'} value={restRunning ? formatRest(remaining) : clock(draft.restSeconds)} onClick={() => setTimerSheet(0.5)} />
          <label className="live-notes"><span>Notes de l’exercice</span><textarea rows={2} value={draft.notes ?? ''} onChange={event => void save({ notes: event.target.value })} onBlur={() => void save({}, true)} placeholder="Repères, ressenti…" /></label>
        </V6List>
        {error && <div role="alert"><V5State title="Enregistrement interrompu" message={error} error /></div>}
      </>}
    </main></IonContent>
    {draft && <V6StickyAction><V6Button onClick={() => void addSet()} disabled={saving || draft.repsCurrent < 1}>{saving ? 'Enregistrement…' : `Valider la série ${setNumber}`}</V6Button></V6StickyAction>}
    {draft && <>
      <ExerciseDemoSheet exercise={demoOpen ? { name: draft.exerciseName, gifUrl: draft.gifUrl, instructionsFr: draft.instructions } : null} onClose={() => setDemoOpen(false)} />
      <V6Sheet isOpen={pad !== null} onDismiss={() => setPad(null)} title="Saisie précise" className="live-pad-sheet" breakpoints={[0, 0.5, 1]} initialBreakpoint={0.5}>
        <V6Keypad key={padOpening} active={pad ?? 'weight'} onActiveChange={id => setPad(id as 'weight' | 'reps')}
          fields={[{ id: 'weight', label: 'Poids (kg)', value: draft.weightCurrent, decimals: 2 }, { id: 'reps', label: 'Répétitions', value: draft.repsCurrent, decimals: 0 }]}
          onChange={(id, value) => void save(id === 'weight' ? { weightCurrent: Math.max(0, value) } : { repsCurrent: Math.max(0, Math.floor(value)) })}
          submitLabel="Valider la série" onSubmit={() => void addSet()} submitDisabled={saving || draft.repsCurrent < 1} />
      </V6Sheet>
      <V6Sheet isOpen={timerSheet !== null} onDismiss={() => setTimerSheet(null)} title="Minuteur de repos" className="live-timer-sheet"
        breakpoints={[0, 0.25, 0.5]} initialBreakpoint={timerSheet ?? 0.5} backdropBreakpoint={0.5}>
        <div className="live-timer">
          <div className="live-timer__clock">
            <span role="timer" aria-label="Temps de repos restant">{formatRest(timer.state === 'idle' ? draft.restSeconds * 1000 : remaining)}</span>
            {remaining > 0 && <V6Button variant="icon" icon={timer.state === 'running' ? pauseOutline : playOutline} aria-label={timer.state === 'running' ? 'Mettre en pause' : 'Reprendre'}
              onClick={() => setTimer(value => value.state === 'running' ? pauseRestTimer(value) : resumeRestTimer(value))} />}
          </div>
          <p className="live-timer__caption">{timer.state === 'idle' ? 'prêt' : remaining === 0 ? 'Repos terminé' : timer.state === 'paused' ? 'en pause' : 'restantes'} · repos prévu {clock(draft.restSeconds)}</p>
          <div className="live-timer__actions">
            {remaining > 0
              ? <V6Button variant="secondary" onClick={() => { setTimer(() => createRestTimer()); setTimerSheet(null) }}>Passer le repos</V6Button>
              : <V6Button variant="secondary" onClick={() => setTimer(() => startRestTimer(draft.restSeconds * 1000))}>Lancer le repos</V6Button>}
            <V6Button onClick={() => setTimer(value => addRestTime(value, 30_000))}>+ 30 s</V6Button>
          </div>
          <V6Segment label="Durée du repos" value={String(draft.restSeconds)} options={restPresets} onChange={value => changeRest(Number(value))} />
          <V6WheelPicker label="Repos prévu" onChange={(id, value) => changeRest(id === 'minutes' ? value * 60 + restSeconds : restMinutes * 60 + value)}
            columns={[{ id: 'minutes', label: 'Minutes', unit: 'min', value: restMinutes, options: wheelMinutes }, { id: 'seconds', label: 'Secondes', unit: 's', value: restSeconds, options: wheelSeconds }]} />
          <p className="live-timer__next">Prochaine série · {kg(draft.weightCurrent)} kg × {draft.repsCurrent} reps{draft.rpe ? ` · RPE ${draft.rpe}` : ''}</p>
        </div>
      </V6Sheet>
    </>}
  </IonPage>
}

/** Type badge, load and RPE of a set (V5 motifs). */
function SetSummary({ set, next = false }: { set: LiveSetDraft; next?: boolean }) {
  return <>
    <span className={`live-badge live-badge--${set.setType.toLowerCase()}`}>{typeShort(set.setType)}</span>
    <strong className={next ? 'live-set-load is-next' : 'live-set-load'}>{kg(set.weight)} kg <span>×</span> {set.repetitions}</strong>
    {set.rpe && <small className="live-badge live-badge--rpe">RPE {set.rpe}</small>}
  </>
}
