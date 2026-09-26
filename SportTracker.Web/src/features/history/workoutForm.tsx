import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { IonIcon, IonReorder, IonTextarea, useIonRouter } from '@ionic/react'
import { useLocation, useParams } from 'react-router-dom'
import {
  addOutline, checkmarkCircleOutline, layersOutline, playCircleOutline, reorderThreeOutline, syncOutline,
  timerOutline, trashOutline, unlinkOutline,
} from 'ionicons/icons'
import { apiRequest } from '../../api/client'
import {
  ExerciseDemoSheet, ExerciseThumb, V6Badge, V6Button, V6ContextMenu, V6InputItem, V6Item, V6Keypad, V6List, V6ReorderList, V6Segment,
  V6Sheet, V6Skeleton, V6SlidingRow, V6StatusPill, type V6ContextAction, type V6SegmentOption,
} from '../../ui'
import { useV6ActionSheet, useV6Toast } from '../../ui/v6Feedback'
import { useOnline, useV6BackHref, useV6LongPress } from '../../ui/v6Hooks'
import { draftTime } from '../../domain/formDraft'
import { CatalogSheet } from '../live/CatalogSheet'
import { useShowRpe } from '../profile/preferences'
import { setTypeBadge } from '../programs/programData'
import { frNumber, type Workout } from './data'
import { minutesLabel, plural } from './historyData'
import {
  DurationSheet, Overlay, Page, QueryError, SaveFailureState, longDate, saveFailureOf, today, useInvalidateSessions, useRetryWhenOnline, useSessionActions,
  type SaveFailure,
} from './shared'
import { useFormDraft } from './useFormDraft'
import {
  emptyForm, formExercise, formFromWorkout, isWorkoutForm, linkWithPrevious, moveExercise, newSet, setCount, supersetLetter, unlinkSuperset,
  validateForm, withoutExercise, workoutPayload, type ExerciseLite, type FormErrors, type FormExercise, type FormSet, type WorkoutForm,
} from './workoutFormData'

/*
 * « Nouvelle séance » (V6 · 05) and « Modifier la séance » (V6 · 21): one editor for a dated workout.
 * Exercises reordered with ≡, sets swiped left to delete and tapped to edit (keypad sheet), supersets and removal
 * from a long press, the session deleted from an action sheet. What is typed is kept in a local draft; a failed
 * save shows the offline state of V6 · 25 (no red), keeps the draft and retries when the network comes back.
 */

const detailPath = (id: number | string | undefined) => `/tabs/history/workouts/${id}`
const setTypeOptions: V6SegmentOption<string>[] = ['Éch.', 'Normal', 'Drop', 'Échec'].map((label, value) => ({ value: String(value), label }))
const rpeOptions = (current: number | null): V6SegmentOption<string>[] =>
  [{ value: '0', label: '–' }, ...[...new Set([...(current && current < 6 ? [current] : []), 6, 7, 8, 9, 10])].map(value => ({ value: String(value), label: String(value) }))]
const kg = (value: number) => frNumber(value, 2)
const exerciseName = (item: FormExercise) => item.exercise?.name || `Exercice ${item.exerciseId}`

export function NewWorkoutSessionPage() {
  const { pathname } = useLocation()
  return <WorkoutFormPage fallbackBack={pathname.startsWith('/tabs/history') ? '/tabs/history/workouts' : '/tabs/programs'} />
}

export function EditWorkoutSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const session = useQuery({ queryKey: ['history', 'workout', sessionId], queryFn: () => apiRequest<Workout>(`api/workoutsessions/${sessionId}`) })
  if (!session.data) return <Page title="Modifier la séance" backHref={detailPath(sessionId)}>
    {session.isError ? <QueryError title="Impossible de charger la séance" error={session.error} retry={() => void session.refetch()} /> : <V6Skeleton count={3} caption="Chargement de ta séance…" />}
  </Page>
  return <WorkoutFormPage key={sessionId} initial={session.data} fallbackBack={detailPath(sessionId)} />
}

type SetRef = { item: string; set: string }

function WorkoutFormPage({ initial, fallbackBack }: { initial?: Workout; fallbackBack: string }) {
  const router = useIonRouter(), toast = useV6Toast(), sheet = useV6ActionSheet(), invalidate = useInvalidateSessions(), online = useOnline()
  const sessionActions = useSessionActions('workout')
  const [showRpe] = useShowRpe()
  const editing = initial?.id != null
  const backHref = useV6BackHref(fallbackBack)
  const draft = useFormDraft('workout', editing ? String(initial.id) : null, isWorkoutForm)
  const [form, setForm] = useState<WorkoutForm>(() => draft.restored?.value ?? (initial ? formFromWorkout(initial) : emptyForm(today())))
  const [touched, setTouched] = useState(false)
  const [newType, setNewType] = useState('1')
  const [errors, setErrors] = useState<FormErrors>({})
  const [failure, setFailure] = useState<SaveFailure | null>(null)
  const [catalog, setCatalog] = useState(false)
  const [wheel, setWheel] = useState(false)
  const [editingSet, setEditingSet] = useState<SetRef | null>(null)
  const [padField, setPadField] = useState('weight')
  const [menu, setMenu] = useState<string | null>(null)
  const [demo, setDemo] = useState<ExerciseLite | null>(null)

  const change = (update: (current: WorkoutForm) => WorkoutForm) => { setTouched(true); setForm(update) }
  const { save: saveDraft } = draft
  useEffect(() => { if (touched) saveDraft(form) }, [form, touched, saveDraft])
  const updateItem = (key: string, update: (item: FormExercise) => FormExercise) => change(current => ({ ...current, items: current.items.map(item => item.key === key ? update(item) : item) }))
  const updateSet = (ref: SetRef, values: Partial<FormSet>) => updateItem(ref.item, item => ({ ...item, sets: item.sets.map(set => set.key === ref.set ? { ...set, ...values } : set) }))

  const leave = (to = backHref) => router.canGoBack() ? router.goBack() : router.push(to, 'back', 'replace')
  const save = useMutation({
    mutationFn: (body: Workout) => editing
      ? apiRequest<void>(`api/workoutsessions/${initial.id}`, { method: 'PUT', body }).then(() => null)
      : apiRequest<Workout>('api/workoutsessions', { method: 'POST', body }),
    onSuccess: async created => {
      draft.clear()
      setFailure(null)
      await invalidate()
      void toast.success(editing ? 'Séance modifiée' : 'Séance enregistrée')
      if (editing) leave(detailPath(initial.id))
      else router.push(created?.id ? detailPath(created.id) : '/tabs/history/workouts', 'forward', 'replace')
    },
    onError: error => {
      draft.flush(form)
      const kind = saveFailureOf(error)
      setFailure(kind)
      void toast.error('Enregistrement impossible', 'Ta séance reste enregistrée sur cet appareil.', kind === 'missing' ? undefined : () => submitRef.current())
    },
  })
  function submit() {
    const next = validateForm(form)
    setErrors(next)
    if (Object.keys(next).length) return
    save.mutate(workoutPayload(form, initial))
  }
  const submitRef = useRef(submit)
  useEffect(() => { submitRef.current = submit })
  useRetryWhenOnline(failure, submit)

  const keepLocal = () => {
    draft.flush(form)
    void toast.success('Brouillon gardé sur cet appareil', editing ? 'Rouvre « Modifier la séance » pour le reprendre.' : 'Il t’attend dans « Nouvelle séance ».')
    leave()
  }
  const discardDraft = () => { draft.clear(); setTouched(false); setForm(initial ? formFromWorkout(initial) : emptyForm(today())); setFailure(null); setErrors({}) }
  const removeSession = async () => {
    if (!initial || !(await sessionActions.confirmDelete(initial))) return
    draft.clear()
    router.push('/tabs/history/workouts', 'back', 'replace')
  }
  const removeExercise = async (item: FormExercise) => {
    const confirmed = await sheet.confirm({ title: `Retirer « ${exerciseName(item)} » ?`, message: `${plural(item.sets.length, 'série')} ${item.sets.length > 1 ? 'seront retirées' : 'sera retirée'} de la séance.`, confirmText: 'Retirer l’exercice' })
    if (confirmed) change(current => withoutExercise(current, item.key))
  }

  const menuItem = form.items.find(item => item.key === menu)
  const menuIndex = form.items.findIndex(item => item.key === menu)
  const menuActions = (item: FormExercise, index: number): V6ContextAction[] => {
    const previous = form.items[index - 1]
    return [
      ...(item.exercise?.gifUrl ? [{ label: 'Voir le mouvement', icon: playCircleOutline, onSelect: () => setDemo(item.exercise) }] : []),
      ...(previous && (!item.supersetGroupId || item.supersetGroupId !== previous.supersetGroupId)
        ? [{ label: `Superset avec ${exerciseName(previous)}`, icon: layersOutline, onSelect: () => change(current => linkWithPrevious(current, index)) }] : []),
      ...(item.supersetGroupId ? [{ label: `Sortir du superset ${supersetLetter(item.supersetGroupId)}`, icon: unlinkOutline, onSelect: () => change(current => unlinkSuperset(current, index)) }] : []),
      { label: 'Retirer l’exercice', icon: trashOutline, destructive: true, onSelect: () => void removeExercise(item) },
    ]
  }

  const setItem = editingSet ? form.items.find(item => item.key === editingSet.item) : undefined
  const setIndex = setItem?.sets.findIndex(set => set.key === editingSet?.set) ?? -1
  const current = setItem?.sets[setIndex]
  const name = form.name.trim()
  const subtitle = editing ? [name || initial.name, longDate(form.date)].filter(Boolean).join(' · ') : `Séance du ${longDate(form.date) || 'jour'}`
  const status = failure ? null : draft.savedAt
    ? <V6StatusPill icon={checkmarkCircleOutline} end={draft.restored && !touched ? <V6Button variant="text" className="wf-discard" onClick={discardDraft}>{editing ? 'Annuler' : 'Effacer'}</V6Button> : undefined}>
      {draft.restored && !touched ? 'Brouillon repris' : 'Brouillon enregistré'} · {draftTime(draft.savedAt)}</V6StatusPill>
    : <V6StatusPill icon={syncOutline}>Brouillon gardé sur cet appareil pendant la saisie</V6StatusPill>
  const footer = failure
    ? <><V6Button variant="secondary" onClick={keepLocal}>Garder en local</V6Button><V6Button loading={save.isPending} disabled={failure === 'missing'} onClick={submit}>Réessayer</V6Button></>
    : <V6Button loading={save.isPending} onClick={submit}>{editing ? 'Enregistrer' : 'Enregistrer la séance'}</V6Button>

  return <Page title={editing ? 'Modifier la séance' : 'Nouvelle séance'} subtitle={subtitle} backHref={backHref} footer={footer}>
    {failure && <SaveFailureState failure={failure} online={online} noun="séance" pending={[
      { title: 'Séance', detail: `${name || 'Sans nom'} · ${plural(setCount(form), 'série')}` },
      ...form.items.filter(item => item.notes.trim()).map(item => ({ title: 'Note', detail: `${exerciseName(item)} · note d’exercice` })),
    ]} />}
    {status}
    <form className="history-form" onSubmit={event => { event.preventDefault(); submit() }} noValidate>
      <V6List>
        <V6InputItem label="Nom" value={form.name} onChange={value => change(current => ({ ...current, name: value }))} placeholder="Ex. Haut du corps" autocapitalize="sentences" maxlength={100} error={errors.name} />
        <V6InputItem label="Date" type="date" value={form.date} onChange={value => change(current => ({ ...current, date: value }))} error={errors.date} />
        <V6Item icon={timerOutline} title="Durée" value={minutesLabel(form.minutes)} onClick={() => setWheel(true)} error={!!errors.duration} />
      </V6List>
      {errors.duration && <p className="wf-error" role="alert">⚠︎ {errors.duration}</p>}
      <section className="history-form__group" aria-label="Type des nouvelles séries">
        <h2 className="history-form__label">Type de série</h2>
        <V6Segment label="Type des nouvelles séries" value={newType} options={setTypeOptions} onChange={setNewType} />
      </section>
      {form.items.length > 0 && <V6ReorderList label="Exercices de la séance" onReorder={(from, to) => change(current => moveExercise(current, from, to))}>
        {form.items.map((item, index) => <ExerciseCard key={item.key} item={item} index={index} previous={form.items[index - 1]} showRpe={showRpe}
          onMenu={() => setMenu(item.key)} onDemo={() => setDemo(item.exercise)}
          onEditSet={set => { setPadField('weight'); setEditingSet({ item: item.key, set: set.key }) }}
          onDeleteSet={set => updateItem(item.key, entry => ({ ...entry, sets: entry.sets.filter(value => value.key !== set.key) }))}
          onAddSet={() => updateItem(item.key, entry => ({ ...entry, sets: [...entry.sets, newSet(Number(newType), entry.sets.at(-1))] }))}
          onNotes={notes => updateItem(item.key, entry => ({ ...entry, notes }))} />)}
      </V6ReorderList>}
      {errors.items && <p className="wf-error" role="alert">⚠︎ {errors.items}</p>}
      <V6Button variant="secondary" icon={addOutline} onClick={() => setCatalog(true)}>Ajouter un exercice</V6Button>
      {form.items.length > 0 && <p className="history-hint">Touche une série pour la modifier, glisse-la à gauche pour la supprimer. ≡ réordonne ; appui long sur un exercice pour un superset ou le retirer.</p>}
      {editing && <V6Button variant="text" className="history-delete" onClick={() => void removeSession()}>Supprimer la séance</V6Button>}
      <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
    </form>
    <Overlay>
      <CatalogSheet open={catalog} onClose={() => setCatalog(false)} exclude={form.items.map(item => item.exerciseId)}
        onAdd={exercises => { setCatalog(false); change(current => ({ ...current, items: [...current.items, ...exercises.map(exercise => formExercise(exercise, Number(newType)))] })) }} />
      <DurationSheet isOpen={wheel} label="Durée de la séance" value={{ hours: Math.floor(form.minutes / 60), minutes: form.minutes % 60 }} onClose={() => setWheel(false)}
        onSave={value => { change(current => ({ ...current, minutes: value.hours * 60 + value.minutes })); setWheel(false); setErrors(previous => ({ ...previous, duration: undefined })) }} />
      <V6Sheet isOpen={!!current} onDismiss={() => setEditingSet(null)} title={current && setItem ? `Série ${setIndex + 1} · ${exerciseName(setItem)}` : 'Série'}
        breakpoints={[0, 0.8, 1]} initialBreakpoint={0.8} className="wf-set-sheet">
        {current && editingSet && <>
          <V6Segment label="Type de série" value={String(current.setType)} options={setTypeOptions} onChange={value => updateSet(editingSet, { setType: Number(value) })} />
          {showRpe && <V6Segment label="RPE" value={String(current.rpe ?? 0)} options={rpeOptions(current.rpe)} onChange={value => updateSet(editingSet, { rpe: Number(value) || null })} />}
          <V6Keypad key={editingSet.set} active={padField} onActiveChange={setPadField}
            fields={[{ id: 'weight', label: 'Poids (kg)', value: current.weight, decimals: 2 }, { id: 'reps', label: 'Répétitions', value: current.repetitions, decimals: 0 }]}
            onChange={(id, value) => updateSet(editingSet, id === 'weight' ? { weight: Math.max(0, value) } : { repetitions: Math.max(0, Math.floor(value)) })}
            submitLabel="Valider" onSubmit={() => setEditingSet(null)} submitDisabled={current.repetitions < 1} />
        </>}
      </V6Sheet>
      <V6ContextMenu isOpen={!!menuItem} onDismiss={() => setMenu(null)} label={menuItem ? exerciseName(menuItem) : 'Exercice'} actions={menuItem ? menuActions(menuItem, menuIndex) : []}
        preview={menuItem && <div className="history-menu-preview"><strong>{exerciseName(menuItem)}</strong><small>{plural(menuItem.sets.length, 'série')}</small></div>} />
      <ExerciseDemoSheet exercise={demo} onClose={() => setDemo(null)} />
    </Overlay>
  </Page>
}

/** One exercise: superset label, thumbnail (demo), name (long press = menu), ≡ handle, its sets, note, « Ajouter une série ». */
function ExerciseCard({ item, index, previous, showRpe, onMenu, onDemo, onEditSet, onDeleteSet, onAddSet, onNotes }: {
  item: FormExercise; index: number; previous?: FormExercise; showRpe: boolean; onMenu: () => void; onDemo: () => void
  onEditSet: (set: FormSet) => void; onDeleteSet: (set: FormSet) => void; onAddSet: () => void; onNotes: (notes: string) => void
}) {
  const { handlers, guard } = useV6LongPress(onMenu)
  const name = exerciseName(item)
  const group = item.supersetGroupId
  const startsSuperset = group != null && previous?.supersetGroupId !== group
  return <article className={`wf-exercise ${group ? 'is-superset' : ''}`} aria-label={name}>
    {startsSuperset && <p className="history-superset__label"><V6Badge tone="action">Superset {supersetLetter(group)}</V6Badge><span>enchaîné sans repos</span></p>}
    <header className="wf-exercise__head">
      {item.exercise?.gifUrl ? <button type="button" className="history-thumb" onClick={onDemo} aria-label={`Voir le mouvement : ${name}`}>
        <ExerciseThumb exercise={item.exercise} size={44} /><span aria-hidden="true">▶</span></button>
        : <span className="history-thumb"><ExerciseThumb exercise={item.exercise} size={44} /></span>}
      <button type="button" className="history-exercise__title" onClick={guard(onMenu)} {...handlers} aria-label={`${index + 1}. ${name} : options`}>
        <strong>{name}</strong><small>{plural(item.sets.length, 'série')} · glisser pour supprimer</small>
      </button>
      <IonReorder className="wf-exercise__handle" aria-label={`Déplacer ${name}`}><IonIcon icon={reorderThreeOutline} aria-hidden="true" /></IonReorder>
    </header>
    <div className="wf-sets">
      {item.sets.map((set, setIndex) => {
        const type = setTypeBadge(set.setType)
        return <V6SlidingRow key={set.key} className="wf-set-row" onDelete={() => onDeleteSet(set)} deleteAriaLabel={`Supprimer la série ${setIndex + 1} de ${name}`}>
          <button type="button" className="wf-set" onClick={() => onEditSet(set)} aria-label={`Modifier la série ${setIndex + 1} : ${type.label}, ${kg(set.weight)} kg × ${set.repetitions}${set.rpe ? `, RPE ${set.rpe}` : ''}`}>
            <span className="history-sets__number">{setIndex + 1}</span>
            <V6Badge tone={type.key === 'Normal' ? 'ink' : type.tone}>{type.label}</V6Badge>
            <strong className="wf-set__load">{kg(set.weight)} kg <span>×</span> {set.repetitions}</strong>
            {showRpe && set.rpe != null ? <span className="wf-set__rpe">RPE {set.rpe}</span> : <span />}
          </button>
        </V6SlidingRow>
      })}
    </div>
    <label className="wf-note"><span>Note d’exercice</span>
      <IonTextarea className="wf-note__field" value={item.notes} autoGrow rows={1} placeholder="Repères, ressenti…" aria-label={`Note d’exercice : ${name}`}
        onIonInput={event => onNotes(String(event.detail.value ?? ''))} />
    </label>
    <V6Button variant="text" icon={addOutline} className="wf-add-set" onClick={onAddSet}>Ajouter une série</V6Button>
  </article>
}
