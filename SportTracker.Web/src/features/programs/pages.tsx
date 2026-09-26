import { createContext, useContext, useRef, useState, type ReactNode, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { IonContent, IonIcon, IonItemOption, IonItemOptions, IonItemSliding, IonPage, useIonRouter } from '@ionic/react'
import { useLocation, useParams } from 'react-router-dom'
import {
  addCircleOutline, addOutline, checkmarkOutline, copyOutline, createOutline, openOutline, playOutline, readerOutline, trashOutline,
} from 'ionicons/icons'
import type { components } from '../../api/schema'
import { ApiError, apiRequest } from '../../api/client'
import {
  ExerciseDemoSheet, ExerciseThumb, V5Refresher, V5State, V6Badge, V6Button, V6ContextMenu, V6Header,
  V6InputItem, V6Item, V6List, V6ReorderList, V6ReorderRow, V6SessionRow, V6Sheet, V6Skeleton, V6StepperItem, V6StickyAction,
  V6TextareaItem, V6WheelPicker, type V6ContextAction,
} from '../../ui'
import { useV6ActionSheet, useV6Toast } from '../../ui/v6Feedback'
import { useWorkouts } from '../history/data'
import { CatalogSheet } from '../live/CatalogSheet'
import {
  activeProgramId, doneThisWeek, duplicateProgram, formatRestLong, lastSetsOf, lastWorkoutFor, moveItem, nextSession, num, programPayload,
  programTotals, programWeek, sessionStatus, sessionTotals, sortedExercises, sortedSessions, supersetNames, supersetsOf, withSession,
  type PlannedExercise, type Program, type ProgramSession, type Workout,
} from './programData'
import { programKey, programsKey, useProgram, useProgramDetails, usePrograms } from './programQueries'
import './programs.css'

export { ExerciseHistoryPage, NewWorkoutSessionPage } from './workoutPages'

type Exercise = components['schemas']['Exercise']
type ExerciseLite = Pick<Exercise, 'name' | 'gifUrl' | 'instructionsFr'> & { id?: number | string; muscleGroups?: (number | string)[] | null; equipment?: string | null }

const colors = ['#4A90D9', '#E57C3A', '#5BBD72', '#D94A6B', '#9B59B6', '#1ABC9C', '#E74C3C', '#F1C40F']
const colorNames: Record<string, string> = { '#4A90D9': 'bleu', '#E57C3A': 'orange', '#5BBD72': 'vert', '#D94A6B': 'framboise', '#9B59B6': 'violet', '#1ABC9C': 'turquoise', '#E74C3C': 'rouge', '#F1C40F': 'jaune' }
const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`
const programPath = (programId: string | number) => `/tabs/programs/${programId}`
const sessionPath = (programId: string | number, sessionId: string | number) => `${programPath(programId)}/sessions/${sessionId}`
const livePath = (programId: string | number, sessionId: string | number, exerciseId: string | number) => `/live/programs/${programId}/sessions/${sessionId}/exercises/${exerciseId}`
const errorText = (error: unknown) => error instanceof ApiError && error.status === 404 ? 'Introuvable ou inaccessible.' : 'Vérifie ta connexion, puis réessaie.'
const schema = (exercise: PlannedExercise) => `${num(exercise.targetSets)} × ${num(exercise.targetRepsMin)}–${num(exercise.targetRepsMax)} reps · repos ${num(exercise.restSeconds)} s`

/* ── Data ────────────────────────────────────────────────────────────────── */

/** PUT with an optimistic cache: a reorder or a removal shows at once and is rolled back if the server refuses it. */
function useSaveProgram(programId: string) {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (program: Program) => apiRequest<void>(`api/programs/${programId}`, { method: 'PUT', body: programPayload(program) }),
    onMutate: async (program: Program) => {
      await cache.cancelQueries({ queryKey: programKey(programId) })
      const previous = cache.getQueryData<Program>(programKey(programId))
      cache.setQueryData(programKey(programId), program)
      return { previous }
    },
    onError: (_error, _program, context) => { if (context?.previous) cache.setQueryData(programKey(programId), context.previous) },
    onSettled: () => Promise.all([cache.invalidateQueries({ queryKey: programsKey }), cache.invalidateQueries({ queryKey: ['live', 'program'] })]),
  })
}

/* ── Layout ──────────────────────────────────────────────────────────────── */

/** Sheets and menus render next to IonContent, like the live pages: inside the scroller the page could paint over them. */
const OverlayHost = createContext<HTMLElement | null>(null)
function Overlay({ children }: { children: ReactNode }) {
  const host = useContext(OverlayHost)
  return host ? createPortal(children, host) : null
}

function Page({ title, subtitle, backHref, backLabel, action, extra, refresh, footer, contentRef, children }: {
  title: string; subtitle?: string; backHref?: string; backLabel?: string; action?: ReactNode; extra?: ReactNode
  refresh?: () => Promise<unknown>; footer?: ReactNode; contentRef?: Ref<HTMLIonContentElement>; children: ReactNode
}) {
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  return <IonPage>
    <OverlayHost.Provider value={host}>
      <IonContent fullscreen ref={contentRef}>
        {refresh && <V5Refresher onRefresh={refresh} />}
        <main className="programs-page"><V6Header title={title} subtitle={subtitle} backHref={backHref} backLabel={backLabel} avatar={!backHref} action={action} extra={extra} />{children}</main>
      </IonContent>
      {footer && <V6StickyAction>{footer}</V6StickyAction>}
      <div ref={setHost} className="programs-overlays" />
    </OverlayHost.Provider>
  </IonPage>
}

function QueryState({ error, retry }: { error: unknown; retry: () => void }) {
  return <V5State title="Impossible de charger les données" message={errorText(error)} error onRetry={retry} />
}

/** Section title: Foruner on the Carnets list (10), small caps list header elsewhere (12 to 14), like the design. */
function SectionTitle({ children, display = false }: { children: ReactNode; display?: boolean }) {
  return <div className={`program-section ${display ? 'program-section--display' : ''}`}><h2>{children}</h2></div>
}

function StatusBadge({ done }: { done: boolean }) {
  return done ? <V6Badge tone="action"><IonIcon icon={checkmarkOutline} aria-hidden="true" />Fait</V6Badge> : <V6Badge tone="surface">À faire</V6Badge>
}

/* ── 10 · Carnets ────────────────────────────────────────────────────────── */

export function ProgramsPage() {
  const router = useIonRouter(), cache = useQueryClient(), actions = useV6ActionSheet(), toast = useV6Toast()
  const list = usePrograms(), workouts = useWorkouts()
  const programs = useProgramDetails(list.data)
  const done = doneThisWeek(workouts.data ?? [])
  const active = activeProgramId(programs, workouts.data ?? [])
  const [menu, setMenu] = useState<Program | null>(null)
  const refresh = () => Promise.all([list.refetch(), workouts.refetch(), cache.invalidateQueries({ queryKey: programsKey })])

  const row = (program: Program, withMenu = true) => {
    const totals = programTotals(program), week = programWeek(program, done)
    const superset = (program.sessions ?? []).some(session => supersetNames(lastWorkoutFor(num(session.id), workouts.data ?? [])).length > 0)
    const badges = <>
      {num(program.id) === active && <V6Badge tone="action">Actif</V6Badge>}
      {superset && <V6Badge tone="surface">Superset</V6Badge>}
      {week.total > 0 && <V6Badge tone="surface">{week.percent} % de la semaine</V6Badge>}
    </>
    return <V6SessionRow key={num(program.id)} tile={<IonIcon icon={readerOutline} />} tileColor={program.colorHex || colors[0]} title={program.name}
      detail={program.sessions?.length ? `${plural(totals.sessions, 'séance')} · ${plural(totals.exercises, 'exercice')}` : program.objective || 'Carnet vide'}
      badges={badges} onClick={withMenu ? () => router.push(programPath(num(program.id))) : undefined} onLongPress={withMenu ? () => setMenu(program) : undefined} />
  }

  const duplicate = useMutation({
    mutationFn: (program: Program) => apiRequest<Program>('api/programs', { method: 'POST', body: duplicateProgram(program) }),
    onSuccess: async () => { await cache.invalidateQueries({ queryKey: programsKey }); void toast.success('Carnet dupliqué') },
    onError: () => void toast.error('Duplication impossible', 'Vérifie ta connexion, puis réessaie.'),
  })
  const remove = useMutation({
    mutationFn: (program: Program) => apiRequest<void>(`api/programs/${num(program.id)}`, { method: 'DELETE' }),
    onSuccess: async (_result, program) => {
      cache.setQueryData<Program[]>(programsKey, current => current?.filter(item => num(item.id) !== num(program.id)))
      cache.removeQueries({ queryKey: programKey(num(program.id)) })
      await cache.invalidateQueries({ queryKey: programsKey })
      void toast.success('Carnet supprimé')
    },
    onError: () => void toast.error('Suppression impossible', 'Vérifie ta connexion, puis réessaie.'),
  })
  const menuActions = (program: Program): V6ContextAction[] => [
    { label: 'Ouvrir le carnet', icon: openOutline, onSelect: () => router.push(programPath(num(program.id))) },
    { label: 'Nouvelle séance', icon: addCircleOutline, onSelect: () => router.push(`${programPath(num(program.id))}/sessions/new`) },
    { label: 'Dupliquer', icon: copyOutline, onSelect: () => duplicate.mutate(program) },
    { label: 'Supprimer le carnet', icon: trashOutline, destructive: true, onSelect: async () => {
      if (await actions.confirm({ title: `Supprimer « ${program.name} » ?`, message: 'Ses séances et ses schémas cibles seront supprimés. Tes séances enregistrées restent dans l’historique.', confirmText: 'Supprimer le carnet' })) remove.mutate(program)
    } },
  ]

  const footer = <V6Button icon={addOutline} onClick={() => router.push('/tabs/programs/new')}>{list.data?.length === 0 ? 'Créer mon carnet' : 'Nouveau carnet'}</V6Button>
  return <Page title="Tes carnets" subtitle={list.data ? `${plural(list.data.length, 'programme')} · schémas cibles` : 'Tes programmes d’entraînement'} refresh={refresh} footer={footer}>
    {!list.data ? list.isError ? <QueryState error={list.error} retry={() => void list.refetch()} /> : <V6Skeleton count={3} />
      : !programs.length ? <V5State title="Premier carnet" message="Organise tes séances pour les retrouver facilement." />
        : <section className="program-list" aria-labelledby="programs-title"><SectionTitle display><span id="programs-title">Mes programmes</span></SectionTitle>{programs.map(program => row(program))}</section>}
    <Overlay><V6ContextMenu isOpen={!!menu} onDismiss={() => setMenu(null)} label={menu?.name ?? 'Carnet'} preview={menu && row(menu, false)} actions={menu ? menuActions(menu) : []} /></Overlay>
  </Page>
}

/* ── 11 · Nouveau carnet ─────────────────────────────────────────────────── */

let sessionKey = 0
const newSessionRow = () => ({ key: ++sessionKey, name: '' })

export function NewProgramPage() {
  const router = useIonRouter(), cache = useQueryClient(), toast = useV6Toast()
  const [name, setName] = useState(''), [objective, setObjective] = useState(''), [colorHex, setColorHex] = useState(colors[0])
  const [sessions, setSessions] = useState(() => [newSessionRow()]), [submitted, setSubmitted] = useState(false)
  const save = useMutation({
    mutationFn: (program: Program) => apiRequest<Program>('api/programs', { method: 'POST', body: program }),
    onSuccess: async created => {
      await cache.invalidateQueries({ queryKey: programsKey })
      void toast.success('Carnet créé')
      router.push(created.id ? programPath(num(created.id)) : '/tabs/programs', 'forward', 'replace')
    },
  })
  function submit() {
    setSubmitted(true)
    if (!name.trim() || sessions.some(session => !session.name.trim())) return
    const program: Program = { name: name.trim(), objective: objective.trim(), colorHex, sessions: sessions.map((session, order) => ({ name: session.name.trim(), order, exercises: [] })) }
    save.mutate(program, { onError: () => void toast.error('Création impossible', 'Vérifie ta connexion : tes valeurs sont conservées.', submit) })
  }
  const cancel = () => router.canGoBack() ? router.goBack() : router.push('/tabs/programs', 'back', 'replace')
  return <Page title="Nouveau carnet" subtitle="Structure ton programme" backHref="/tabs/programs" footer={<V6Button onClick={submit} loading={save.isPending}>{save.isPending ? 'Création…' : 'Créer le carnet'}</V6Button>}>
    <form className="program-form" onSubmit={event => { event.preventDefault(); submit() }}>
      <V6List header="Détails du carnet">
        <V6InputItem label="Nom" value={name} onChange={setName} placeholder="Ex. Push Pull Legs" autocapitalize="sentences" maxlength={100}
          error={submitted && !name.trim() ? 'Indique le nom du carnet.' : null} />
        <V6TextareaItem label="Objectif" value={objective} onChange={setObjective} placeholder="Facultatif" autocapitalize="sentences" />
      </V6List>
      <section className="program-colors-group" aria-labelledby="program-color-title">
        <h2 id="program-color-title" className="v6-list-group__header">Couleur du carnet</h2>
        <div className="program-colors">{colors.map(color => <button type="button" key={color} className="program-color" onClick={() => setColorHex(color)}
          aria-label={`Couleur ${colorNames[color]}`} aria-pressed={colorHex === color}><span style={{ backgroundColor: color }} /></button>)}</div>
      </section>
      <V6List header="Séances du carnet" note="Glisse une séance vers la gauche pour la retirer. Les exercices s’ajoutent ensuite, séance par séance.">
        {sessions.map((session, index) => <IonItemSliding key={session.key} disabled={sessions.length < 2}>
          <V6InputItem label={`Séance ${index + 1}`} value={session.name} onChange={value => setSessions(current => current.map(item => item.key === session.key ? { ...item, name: value } : item))}
            placeholder="Ex. Haut du corps" autocapitalize="sentences" maxlength={100} error={submitted && !session.name.trim() ? 'Indique le nom de la séance.' : null} />
          <IonItemOptions side="end"><IonItemOption color="danger" className="v6-sliding__delete" onClick={() => setSessions(current => current.filter(item => item.key !== session.key))}>
            <IonIcon slot="top" icon={trashOutline} /><span aria-hidden="true">Retirer</span><span className="v6-visually-hidden">Retirer la séance {index + 1}</span>
          </IonItemOption></IonItemOptions>
        </IonItemSliding>)}
      </V6List>
      <V6Button variant="secondary" icon={addOutline} onClick={() => setSessions(current => [...current, newSessionRow()])}>Ajouter une séance</V6Button>
      <V6Button variant="text" onClick={cancel}>Annuler</V6Button>
    </form>
  </Page>
}

/* ── 12 · Détail du carnet ───────────────────────────────────────────────── */

const mostCommonRest = (session: ProgramSession) => {
  const counts = new Map<number, number>()
  for (const exercise of session.exercises ?? []) counts.set(num(exercise.restSeconds), (counts.get(num(exercise.restSeconds)) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

export function ProgramDetailPage() {
  const { programId } = useParams<{ programId: string }>()
  const router = useIonRouter(), toast = useV6Toast()
  const query = useProgram(programId), workouts = useWorkouts(), program = query.data
  const sessions = sortedSessions(program), totals = programTotals(program)
  const done = doneThisWeek(workouts.data ?? []), week = programWeek(program, done)
  const lastOf = (session: ProgramSession) => lastWorkoutFor(num(session.id), workouts.data ?? [])
  const supersetCount = sessions.reduce((count, session) => count + supersetNames(lastOf(session)).length, 0)
  const next = nextSession(program, done)
  const active = program && activeProgramId([program], workouts.data ?? []) === num(program.id)
  const save = useSaveProgram(programId)
  const [menu, setMenu] = useState<ProgramSession | null>(null)

  const start = (session: ProgramSession) => {
    const first = sortedExercises(session)[0]
    router.push(first ? livePath(programId, num(session.id), num(first.exerciseId)) : sessionPath(programId, num(session.id)))
  }
  const row = (session: ProgramSession, withMenu = true) => {
    const { exercises } = sessionTotals(session), supersets = supersetNames(lastOf(session)), rest = mostCommonRest(session)
    const detail = [plural(exercises, 'exercice'), ...supersets.map(letter => `superset ${letter}`), rest != null ? `${rest} s` : null].filter(Boolean).join(' · ')
    return <V6SessionRow key={num(session.id)} tile={num(session.order) + 1} title={session.name} detail={detail}
      badges={<StatusBadge done={sessionStatus(session, done) === 'done'} />}
      onClick={withMenu ? () => router.push(sessionPath(programId, num(session.id))) : undefined} onLongPress={withMenu ? () => setMenu(session) : undefined} />
  }
  const duplicate = (session: ProgramSession) => {
    if (!program) return
    const copy: ProgramSession = { name: `${session.name} (copie)`, exercises: sortedExercises(session).map(exercise => ({ ...exercise, id: undefined, workoutProgramSessionId: undefined })) }
    save.mutate(withSession(program, copy), { onSuccess: () => void toast.success('Séance dupliquée'), onError: () => void toast.error('Duplication impossible', 'Vérifie ta connexion, puis réessaie.') })
  }
  const menuActions = (session: ProgramSession): V6ContextAction[] => [
    { label: 'Démarrer en live', icon: playOutline, onSelect: () => start(session), disabled: !session.exercises?.length },
    { label: 'Ouvrir la séance', icon: openOutline, onSelect: () => router.push(sessionPath(programId, num(session.id))) },
    { label: 'Modifier', icon: createOutline, onSelect: () => router.push(`${sessionPath(programId, num(session.id))}?modifier=1`) },
    { label: 'Dupliquer', icon: copyOutline, onSelect: () => duplicate(session) },
  ]

  const footer = !program ? undefined : next
    ? <V6Button icon={playOutline} onClick={() => start(next)}>Démarrer {next.name}</V6Button>
    : <V6Button icon={addOutline} onClick={() => router.push(`${programPath(programId)}/sessions/new`)}>Ajouter une séance</V6Button>
  return <Page title={program?.name || 'Carnet'} subtitle={program ? `${plural(totals.sessions, 'séance')} · ${plural(totals.exercises, 'exercice')}` : undefined}
    backHref="/tabs/programs" extra={active ? <span className="program-header-badges"><V6Badge tone="action">Actif</V6Badge></span> : undefined}
    refresh={() => Promise.all([query.refetch(), workouts.refetch()])} footer={footer}>
    {!program ? query.isError ? <QueryState error={query.error} retry={() => void query.refetch()} /> : <V6Skeleton count={3} /> : <>
      <section className="program-summary" aria-label="Objectif et semaine">
        <p className="program-summary__label">{program.objective ? 'Ton objectif' : 'Cette semaine'}</p>
        {program.objective && <strong className="program-summary__objective">{program.objective}</strong>}
        {week.total > 0 && <div className="program-week">
          <span>Semaine · {week.done} / {plural(week.total, 'séance')}</span>
          <span className="program-week__bar" role="progressbar" aria-label="Séances faites cette semaine" aria-valuemin={0} aria-valuemax={week.total} aria-valuenow={week.done}><i style={{ width: `${week.percent}%` }} /></span>
        </div>}
        <div className="program-stats">
          <span><strong>{totals.exercises}</strong>exercices</span>
          <span><strong>{totals.sets}</strong>séries cibles</span>
          <span><strong>{supersetCount}</strong>superset{supersetCount > 1 ? 's' : ''}</span>
        </div>
      </section>
      <section className="program-list" aria-labelledby="program-sessions-title">
        <SectionTitle><span id="program-sessions-title">Séances du carnet</span></SectionTitle>
        {sessions.length ? sessions.map(session => row(session)) : <V5State title="Aucune séance" message="Ajoute une séance pour commencer à utiliser ce carnet." />}
      </section>
      <V6Button variant="secondary" icon={addOutline} onClick={() => router.push(`${programPath(programId)}/sessions/new`)}>Nouvelle séance</V6Button>
    </>}
    <Overlay><V6ContextMenu isOpen={!!menu} onDismiss={() => setMenu(null)} label={menu?.name ?? 'Séance'} preview={menu && row(menu, false)} actions={menu ? menuActions(menu) : []} /></Overlay>
  </Page>
}

/* ── 13 · Séance du carnet : éditeur ─────────────────────────────────────── */

type EditorItem = {
  key: string; id?: number | string; exerciseId: number; exercise?: ExerciseLite | null
  targetSets: number; targetRepsMin: number; targetRepsMax: number; restSeconds: number
}
type EditorDraft = { name: string; items: EditorItem[]; selected: string | null }

let itemKey = 0
const editorItem = (exercise: PlannedExercise): EditorItem => ({
  key: `item-${++itemKey}`, id: exercise.id, exerciseId: num(exercise.exerciseId), exercise: exercise.exercise,
  targetSets: num(exercise.targetSets) || 3, targetRepsMin: num(exercise.targetRepsMin) || 8, targetRepsMax: num(exercise.targetRepsMax) || 12, restSeconds: num(exercise.restSeconds),
})
const draftFrom = (session?: ProgramSession): EditorDraft => {
  const items = sortedExercises(session).map(editorItem)
  return { name: session?.name ?? '', items, selected: items[0]?.key ?? null }
}
const sessionFrom = (draft: EditorDraft, initial?: ProgramSession): ProgramSession => ({
  ...initial, name: draft.name.trim(),
  exercises: draft.items.map((item, order): PlannedExercise => ({
    id: item.id, workoutProgramSessionId: initial?.id, exerciseId: item.exerciseId, exercise: item.exercise as Exercise | null, order,
    targetSets: item.targetSets, targetRepsMin: item.targetRepsMin, targetRepsMax: item.targetRepsMax, restSeconds: item.restSeconds,
  })),
})
const itemName = (item: EditorItem) => item.exercise?.name || `Exercice ${item.exerciseId}`

const restMinutes = Array.from({ length: 11 }, (_, value) => ({ value, text: String(value) }))
const restSeconds = [0, 15, 30, 45].map(value => ({ value, text: String(value).padStart(2, '0') }))

/** Rest of one exercise at the wheel (sheet at 50 %), like the iOS timer. */
function RestSheet({ item, onClose, onSave }: { item: EditorItem | null; onClose: () => void; onSave: (seconds: number) => void }) {
  const [value, setValue] = useState(item?.restSeconds ?? 90)
  const [shown, setShown] = useState(item?.key)
  if (item && item.key !== shown) { setShown(item.key); setValue(item.restSeconds) }
  const minutes = Math.min(10, Math.floor(value / 60)), seconds = Math.round((value % 60) / 15) * 15 % 60
  return <V6Sheet isOpen={!!item} onDismiss={onClose} title="Repos" subtitle={formatRestLong(minutes * 60 + seconds)} breakpoints={[0, 0.5]} initialBreakpoint={0.5} backdropBreakpoint={0} className="program-rest-sheet">
    <V6WheelPicker label="Durée du repos" onChange={(column, next) => setValue(column === 'min' ? next * 60 + seconds : minutes * 60 + next)}
      columns={[{ id: 'min', label: 'Minutes', unit: 'min', value: minutes, options: restMinutes }, { id: 's', label: 'Secondes', unit: 's', value: seconds, options: restSeconds }]} />
    <V6Button onClick={() => onSave(minutes * 60 + seconds)}>Valider</V6Button>
  </V6Sheet>
}

/**
 * Form of a programme session (13, and 14 in « Modifier »): name, exercises reordered with the ≡ handle and removed
 * by a swipe (confirmed in an action sheet), targets of the selected exercise, rest at the wheel, library in a sheet.
 * The page owns the draft so its sticky action can save it.
 */
function SessionEditor({ draft, change, submitted, onCancel }: {
  draft: EditorDraft; change: (update: (current: EditorDraft) => EditorDraft) => void; submitted: boolean; onCancel: () => void
}) {
  const actions = useV6ActionSheet()
  const [catalog, setCatalog] = useState(false), [restFor, setRestFor] = useState<string | null>(null)
  const selected = draft.items.find(item => item.key === draft.selected)
  const update = (key: string, values: Partial<EditorItem>) => change(current => ({ ...current, items: current.items.map(item => item.key === key ? { ...item, ...values } : item) }))
  const remove = async (item: EditorItem) => {
    const confirmed = await actions.confirm({ title: `Retirer « ${itemName(item)} » ?`, message: 'Il sort de cette séance ; ton historique reste intact.', confirmText: 'Retirer l’exercice' })
    if (confirmed) change(current => {
      const items = current.items.filter(entry => entry.key !== item.key)
      return { ...current, items, selected: current.selected === item.key ? items[0]?.key ?? null : current.selected }
    })
  }
  return <>
    <V6List header="Nom de la séance">
      <V6InputItem label="Nom" value={draft.name} onChange={name => change(current => ({ ...current, name }))} placeholder="Ex. Haut du corps" autocapitalize="sentences" maxlength={100}
        error={submitted && !draft.name.trim() ? 'Indique le nom de la séance.' : null} />
    </V6List>
    {draft.items.length > 0 && <section className="program-list" aria-labelledby="editor-exercises-title">
      <SectionTitle><span id="editor-exercises-title">Exercices · glisser ≡ pour réordonner</span></SectionTitle>
      <V6ReorderList label="Exercices de la séance" onReorder={(from, to) => change(current => ({ ...current, items: moveItem(current.items, from, to) }))}>
        {draft.items.map((item, index) => <V6ReorderRow key={item.key} number={index + 1} title={itemName(item)} selected={item.key === draft.selected}
          detail={item.key === draft.selected ? 'Paramètres ci-dessous' : `${item.targetSets} × ${item.targetRepsMin}–${item.targetRepsMax} · repos ${item.restSeconds} s`}
          onClick={() => change(current => ({ ...current, selected: item.key }))} reorderLabel={`Déplacer ${itemName(item)}`}
          onRemove={() => void remove(item)} removeAriaLabel={`Retirer ${itemName(item)}`} />)}
      </V6ReorderList>
    </section>}
    {selected && <V6List header={`Paramètres · ${itemName(selected)}`}>
      <V6StepperItem label="Séries" value={selected.targetSets} min={1} max={10} onChange={targetSets => update(selected.key, { targetSets })} />
      <V6StepperItem label="Reps min" value={selected.targetRepsMin} min={1} max={50}
        onChange={targetRepsMin => update(selected.key, { targetRepsMin, targetRepsMax: Math.max(targetRepsMin, selected.targetRepsMax) })} />
      <V6StepperItem label="Reps max" value={selected.targetRepsMax} min={1} max={50}
        onChange={targetRepsMax => update(selected.key, { targetRepsMax, targetRepsMin: Math.min(targetRepsMax, selected.targetRepsMin) })} />
      <V6Item title="Repos" value={formatRestLong(selected.restSeconds)} onClick={() => setRestFor(selected.key)} />
    </V6List>}
    {selected && <V6Button variant="text" className="program-remove" onClick={() => void remove(selected)}>Retirer {itemName(selected)}</V6Button>}
    <V6Button variant="secondary" icon={addOutline} onClick={() => setCatalog(true)}>Ajouter un exercice</V6Button>
    <V6Button variant="text" onClick={onCancel}>Annuler</V6Button>
    <Overlay><CatalogSheet open={catalog} onClose={() => setCatalog(false)} exclude={draft.items.map(item => item.exerciseId)}
      onAdd={exercises => {
        setCatalog(false)
        const added = exercises.map(exercise => editorItem({ exerciseId: exercise.id, exercise, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 }))
        change(current => ({ ...current, items: [...current.items, ...added], selected: added.at(-1)?.key ?? current.selected }))
      }} />
    <RestSheet item={draft.items.find(item => item.key === restFor) ?? null} onClose={() => setRestFor(null)}
      onSave={seconds => { if (restFor) update(restFor, { restSeconds: seconds }); setRestFor(null) }} /></Overlay>
  </>
}

function useSessionSubmit(programId: string, program: Program | undefined, initial: ProgramSession | undefined, onSaved: () => void) {
  const save = useSaveProgram(programId), toast = useV6Toast()
  const [submitted, setSubmitted] = useState(false)
  const submit = (draft: EditorDraft) => {
    setSubmitted(true)
    if (!program || !draft.name.trim()) return
    save.mutate(withSession(program, sessionFrom(draft, initial)), {
      onSuccess: () => { void toast.success(initial ? 'Séance enregistrée' : 'Séance créée'); onSaved() },
      onError: () => void toast.error('Sauvegarde impossible', 'Vérifie ta connexion : tes valeurs sont conservées.', () => submit(draft)),
    })
  }
  return { submit, submitted, saving: save.isPending }
}

export function NewProgramSessionPage() {
  const { programId } = useParams<{ programId: string }>()
  const router = useIonRouter(), query = useProgram(programId)
  const [draft, setDraft] = useState<EditorDraft>(() => draftFrom())
  const leave = () => router.canGoBack() ? router.goBack() : router.push(programPath(programId), 'back', 'replace')
  const { submit, submitted, saving } = useSessionSubmit(programId, query.data, undefined, leave)
  return <Page title="Nouvelle séance" subtitle={query.data?.name} backHref={programPath(programId)} backLabel="Carnet"
    footer={query.data && <V6Button onClick={() => submit(draft)} loading={saving}>{saving ? 'Création…' : 'Créer la séance'}</V6Button>}>
    {!query.data ? query.isError ? <QueryState error={query.error} retry={() => void query.refetch()} /> : <V6Skeleton />
      : <SessionEditor draft={draft} change={setDraft} submitted={submitted} onCancel={leave} />}
  </Page>
}

/* ── 14 · Séance du carnet ───────────────────────────────────────────────── */

function LastSets({ workout, exerciseId }: { workout?: Workout; exerciseId: number }) {
  const sets = lastSetsOf(workout, exerciseId)
  if (!sets.length) return null
  return <span className="program-last-sets" aria-label="Dernière fois">
    {sets.map((set, index) => <V6Badge key={index} tone={set.type.tone}>{set.type.label} · {set.weight} kg × {set.repetitions}</V6Badge>)}
  </span>
}

export function ProgramSessionDetailPage() {
  const { programId, sessionId } = useParams<{ programId: string; sessionId: string }>()
  const location = useLocation(), router = useIonRouter(), actions = useV6ActionSheet(), toast = useV6Toast()
  const query = useProgram(programId), workouts = useWorkouts(), program = query.data
  const session = program?.sessions?.find(item => num(item.id) === Number(sessionId))
  const ordered = sortedExercises(session), totals = sessionTotals(session)
  const last = lastWorkoutFor(Number(sessionId), workouts.data ?? []), supersets = supersetsOf(last), supersetCount = supersetNames(last).length
  const done = session ? sessionStatus(session, doneThisWeek(workouts.data ?? [])) === 'done' : false
  const save = useSaveProgram(programId)
  const [demo, setDemo] = useState<ExerciseLite | null>(null)
  const [draft, setDraftState] = useState<EditorDraft | null>(null)
  const [openedEdit, setOpenedEdit] = useState(false)
  if (session && !openedEdit && new URLSearchParams(location.search).has('modifier')) { setOpenedEdit(true); setDraftState(draftFrom(session)) }
  const content = useRef<HTMLIonContentElement>(null)
  // Entering or leaving « Modifier » swaps the whole page: start it from the top.
  const setDraft = (next: EditorDraft | null) => { setDraftState(next); void content.current?.scrollToTop(0) }
  const editor = useSessionSubmit(programId, program, session, () => setDraft(null))

  const saveOrder = (exercises: PlannedExercise[], success?: string) => {
    if (!program || !session) return
    save.mutate(withSession(program, { ...session, exercises }), {
      onSuccess: () => { if (success) void toast.success(success) },
      onError: () => void toast.error('Modification non enregistrée', 'Vérifie ta connexion, puis réessaie.'),
    })
  }
  const remove = async (exercise: PlannedExercise) => {
    const name = exercise.exercise?.name || `Exercice ${exercise.exerciseId}`
    const confirmed = await actions.confirm({ title: `Retirer « ${name} » ?`, message: 'Il sort de cette séance du carnet ; ton historique reste intact.', confirmText: 'Retirer l’exercice' })
    if (confirmed) saveOrder(ordered.filter(item => item !== exercise), 'Exercice retiré')
  }

  if (draft) return <Page title="Modifier la séance" subtitle={session?.name} backHref={programPath(programId)} backLabel="Carnet" contentRef={content}
    footer={<V6Button onClick={() => editor.submit(draft)} loading={editor.saving}>{editor.saving ? 'Enregistrement…' : 'Enregistrer'}</V6Button>}>
    <SessionEditor draft={draft} change={update => setDraftState(current => current && update(current))} submitted={editor.submitted} onCancel={() => setDraft(null)} />
  </Page>

  const first = ordered[0]
  const footer = session && <>
    <V6Button icon={playOutline} disabled={!first} onClick={() => first && router.push(livePath(programId, sessionId, num(first.exerciseId)))}>Démarrer en live</V6Button>
    <V6Button variant="secondary" onClick={() => router.push('/live')}>Séance à vide</V6Button>
  </>
  return <Page title={session?.name || 'Séance'} subtitle={program?.name ? `Carnet ${program.name}` : undefined} backHref={programPath(programId)} backLabel="Carnet"
    action={session ? <V6Button variant="text" onClick={() => setDraft(draftFrom(session))}>Modifier</V6Button> : undefined}
    refresh={() => Promise.all([query.refetch(), workouts.refetch()])} footer={footer} contentRef={content}>
    {!program ? query.isError ? <QueryState error={query.error} retry={() => void query.refetch()} /> : <V6Skeleton count={3} />
      : !session ? <V5State title="Séance introuvable" message="Elle a peut-être été supprimée ou n’est plus accessible." /> : <>
        <section className="program-summary" aria-label="Résumé de la séance">
          <div className="program-summary__head"><h2>Un exercice après l’autre.</h2><StatusBadge done={done} /></div>
          <p className="program-summary__meta">{[plural(totals.exercises, 'exercice'), plural(totals.sets, 'série'), supersetCount ? plural(supersetCount, 'superset') : null].filter(Boolean).join(' • ')}</p>
          {ordered.some(item => item.exercise?.gifUrl) && <p className="program-summary__hint">Touche l’aperçu pour voir le mouvement.</p>}
        </section>
        {!ordered.length ? <V5State title="Aucun exercice" message="Touche « Modifier » pour ajouter tes exercices." /> : <section className="program-list" aria-labelledby="session-exercises-title">
          <SectionTitle><span id="session-exercises-title">Programme de la séance</span></SectionTitle>
          <V6ReorderList label="Exercices de la séance" onReorder={(from, to) => saveOrder(moveItem(ordered, from, to))}>
            {ordered.map((item, index) => {
              const name = item.exercise?.name || `Exercice ${item.exerciseId}`, letter = supersets.get(num(item.exerciseId))
              const continues = letter && supersets.get(num(ordered[index + 1]?.exerciseId)) === letter
              return <V6ReorderRow key={num(item.id) || num(item.exerciseId)} title={name} detail={schema(item)} reorderLabel={`Déplacer ${name}`}
                className={`${letter ? 'is-superset' : ''} ${continues ? 'superset-continues' : ''}`}
                leading={item.exercise?.gifUrl ? <button type="button" className="program-thumb" onClick={() => setDemo(item.exercise ?? null)} aria-label={`Voir le mouvement : ${name}`}>
                  <ExerciseThumb exercise={item.exercise} size={48} /><span className="program-thumb__play" aria-hidden="true">▶</span>
                </button> : <span className="program-thumb"><ExerciseThumb exercise={item.exercise} size={48} /></span>}
                extra={(letter || last) && <>{letter && <V6Badge tone="ink">Superset {letter} · enchaîné sans repos</V6Badge>}<LastSets workout={last} exerciseId={num(item.exerciseId)} /></>}
                onClick={() => router.push(livePath(programId, sessionId, num(item.exerciseId)))}
                onRemove={() => void remove(item)} removeAriaLabel={`Retirer ${name}`} />
            })}
          </V6ReorderList>
          <p className="program-hint">Glisse ≡ pour réordonner, vers la gauche pour retirer.</p>
        </section>}
        <Overlay><ExerciseDemoSheet exercise={demo} onClose={() => setDemo(null)} /></Overlay>
      </>}
  </Page>
}

