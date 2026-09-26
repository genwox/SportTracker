import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useIonRouter } from '@ionic/react'
import { useLocation, useParams } from 'react-router-dom'
import { addOutline, checkmarkCircleOutline, speedometerOutline, timerOutline } from 'ionicons/icons'
import { apiRequest } from '../../api/client'
import {
  V5State, V6Bars, V6Button, V6ChartCard, V6InputItem, V6Item, V6List, V6RecordBanner, V6Segment, V6Skeleton, V6StatTiles, V6StatusPill,
} from '../../ui'
import { useV6Toast } from '../../ui/v6Feedback'
import { useOnline, useV6BackHref } from '../../ui/v6Hooks'
import { draftTime } from '../../domain/formDraft'
import { cardioName, durationMinutes, frNumber, numberOf, useCardio, type Cardio } from './data'
import {
  cardioRecords, cardioTitle, cardioTotals, cardioTypes, durationParts, minutesLabel, newestFirst, paceLabel, parseDecimal, toTimeSpan, weeklyTotals,
} from './historyData'
import { cardioPath, useSessionRows } from './rows'
import {
  DurationSheet, Overlay, Page, QueryError, SaveFailureState, durationLabel, longDate, saveFailureOf, shortDate, today, useInvalidateSessions, useRetryWhenOnline,
  useSessionActions, type SaveFailure,
} from './shared'
import { useFormDraft } from './useFormDraft'

const activityOptions = cardioTypes.map(type => ({ value: String(type), label: cardioName(type) }))
const filterOptions = [{ value: 'all', label: 'Tout' }, ...activityOptions]

/* ── 07 · Séances cardio ─────────────────────────────────────────────────── */

export function CardioSessionsPage() {
  const router = useIonRouter()
  const cardio = useCardio()
  const [filter, setFilter] = useState('all')
  const rows = useSessionRows({ cardio: cardio.data, variant: 'cardio' })
  const shown = newestFirst(cardio.data ?? []).filter(session => filter === 'all' || String(numberOf(session.type)) === filter)
  const weeks = weeklyTotals(shown, session => numberOf(session.distance), 4)
  const recent = shown.filter(session => (session.date ?? '').slice(0, 10) >= weeks[0].start)
  const totals = cardioTotals(recent)
  const footer = <V6Button icon={addOutline} onClick={() => router.push(filter === 'all' ? '/tabs/history/cardio/new' : `/tabs/history/cardio/new?type=${filter}`)}>Nouvelle séance cardio</V6Button>
  return <Page title="Cardio" subtitle="Course, vélo, natation, marche" backHref="/tabs/history" refresh={() => cardio.refetch()} footer={footer}>
    <V6Segment label="Filtrer par activité" value={filter} options={filterOptions} onChange={setFilter} />
    {!cardio.data ? cardio.isError ? <QueryError title="Impossible de charger tes sorties" error={cardio.error} retry={() => void cardio.refetch()} /> : <V6Skeleton count={3} />
      : !cardio.data.length ? <V5State title="Première sortie" message="Enregistre ta première sortie cardio." /> : <>
        <V6StatTiles tiles={[
          { value: frNumber(totals.km), unit: 'km', label: 'distance · 4 sem.' },
          { value: minutesLabel(totals.minutes).replace(' h ', 'h').replace(' min', ''), unit: totals.minutes < 60 ? 'min' : undefined, label: 'temps' },
          { value: totals.pace || '–', label: 'allure /km' },
        ]} />
        <V6ChartCard title="Volume hebdomadaire" caption="4 sem.">
          <V6Bars label="Kilomètres par semaine sur quatre semaines" bars={weeks.map(week => ({ key: week.start, label: week.label, value: Math.round(week.value * 10) / 10, highlight: week.current, title: `${week.label} : ${frNumber(week.value)} km` }))} />
        </V6ChartCard>
        {shown.length ? <section className="history-list" aria-label="Sorties cardio">{shown.map(rows.cardioRow)}</section>
          : <V5State title={`Aucune sortie en ${cardioName(Number(filter)).toLocaleLowerCase('fr')}`} message="Choisis une autre activité." />}
      </>}
    {rows.contextMenu}
  </Page>
}

/* ── 09 · Détail séance cardio ───────────────────────────────────────────── */

export function CardioSessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  // IonRouterOutlet can pick the parameter route for /cardio/new: keep the new form reachable here.
  return sessionId === 'new' ? <NewCardioSessionPage /> : <CardioDetail sessionId={sessionId} />
}

const useCardioSession = (sessionId: string, enabled = true) =>
  useQuery({ queryKey: ['history', 'cardio', sessionId], queryFn: () => apiRequest<Cardio>(`api/cardiosessions/${sessionId}`), enabled })

function CardioDetail({ sessionId }: { sessionId: string }) {
  const router = useIonRouter()
  const backHref = useV6BackHref('/tabs/history/cardio')
  const session = useCardioSession(sessionId), list = useCardio()
  const cardio = session.data
  const others = (list.data ?? []).filter(item => String(item.id) !== sessionId)
  const all = cardio ? [...others, cardio] : others
  const gain = cardio ? cardioRecords(all).get(numberOf(cardio.id)) : undefined
  const sameType = cardio ? newestFirst(all.filter(item => numberOf(item.type) === numberOf(cardio.type))).reverse() : []
  const position = sameType.findIndex(item => String(item.id) === sessionId)
  const outings = sameType.slice(Math.max(0, position - 7), position + 1)
  const minutes = durationMinutes(cardio?.duration), km = numberOf(cardio?.distance)
  const footer = cardio && <V6Button onClick={() => router.push(`${cardioPath(sessionId)}/edit`)}>Modifier la sortie</V6Button>
  return <Page title={cardio ? cardioTitle(cardio) : 'Sortie'} subtitle={cardio ? `${longDate(cardio.date)} · ${durationLabel(cardio.duration)}` : undefined}
    backHref={backHref} refresh={() => Promise.all([session.refetch(), list.refetch()])} footer={footer}>
    {!cardio ? session.isError ? <QueryError title="Impossible de charger la sortie" error={session.error} what="Cette sortie" retry={() => void session.refetch()} /> : <V6Skeleton count={2} /> : <>
      <V6StatTiles tiles={[
        { value: frNumber(km), unit: 'km', label: 'distance' },
        { value: paceLabel(minutes, km) || '–', label: 'allure /km' },
        { value: frNumber(numberOf(cardio.elevationGain), 0), unit: 'm', label: 'dénivelé' },
      ]} />
      {outings.length >= 2 && <V6ChartCard title={`Tes sorties · ${cardioName(cardio.type)}`} caption="km">
        <V6Bars label={`Distance des dernières sorties ${cardioName(cardio.type).toLocaleLowerCase('fr')}`} showValues
          bars={outings.map(item => ({ key: String(item.id), label: shortDate(item.date), value: Math.round(numberOf(item.distance) * 10) / 10, highlight: String(item.id) === sessionId, title: `${longDate(item.date)} : ${frNumber(numberOf(item.distance))} km` }))} />
      </V6ChartCard>}
      {gain != null && <V6RecordBanner title="Record : plus longue sortie" detail={`${cardioName(cardio.type)} · ${frNumber(km)} km · battu de ${frNumber(gain)} km`} />}
    </>}
  </Page>
}

/* ── 08 · Nouvelle séance cardio (and « Modifier la sortie ») ────────────── */

export function NewCardioSessionPage() {
  const type = Number(new URLSearchParams(useLocation().search).get('type'))
  return <CardioForm initial={{ type: cardioTypes.includes(type as never) ? type : 0 }} />
}

export function EditCardioSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const session = useCardioSession(sessionId)
  if (!session.data) return <Page title="Modifier la sortie" backHref={cardioPath(sessionId)}>
    {session.isError ? <QueryError title="Impossible de charger la sortie" error={session.error} what="Cette sortie" retry={() => void session.refetch()} /> : <V6Skeleton count={2} />}
  </Page>
  return <CardioForm key={sessionId} initial={session.data} />
}

type Errors = Partial<Record<'name' | 'date' | 'duration' | 'distance' | 'elevation', string>>

type CardioValues = { type: string; name: string; date: string; hours: number; minutes: number; distance: string; elevation: string }
const isCardioValues = (value: unknown): value is CardioValues => {
  const form = value as CardioValues | null
  return !!form && ['type', 'name', 'date', 'distance', 'elevation'].every(key => typeof form[key as keyof CardioValues] === 'string')
    && typeof form.hours === 'number' && typeof form.minutes === 'number'
}

function CardioForm({ initial }: { initial: Cardio }) {
  const router = useIonRouter(), toast = useV6Toast(), invalidate = useInvalidateSessions(), online = useOnline()
  const editing = initial.id != null
  const detail = editing ? cardioPath(initial.id) : null
  const backHref = useV6BackHref(detail ?? '/tabs/history/cardio')
  const actions = useSessionActions('cardio')
  // What is typed is kept on this device until the server has it (V6 · 25).
  const draft = useFormDraft('cardio', editing ? String(initial.id) : null, isCardioValues)
  const [values, setValues] = useState<CardioValues>(() => draft.restored?.value ?? {
    type: String(numberOf(initial.type)), name: initial.name ?? '', date: (initial.date ?? today()).slice(0, 10),
    ...(editing ? durationParts(initial.duration) : { hours: 0, minutes: 30 }),
    distance: editing ? String(numberOf(initial.distance)).replace('.', ',') : '', elevation: editing ? String(numberOf(initial.elevationGain)) : '',
  })
  const [touched, setTouched] = useState(false)
  const { save: saveDraft } = draft
  useEffect(() => { if (touched) saveDraft(values) }, [values, touched, saveDraft])
  const set = <K extends keyof CardioValues>(key: K) => (value: CardioValues[K]) => { setTouched(true); setValues(current => ({ ...current, [key]: value })) }
  const { type, name, date, distance, elevation } = values
  const [wheel, setWheel] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState<SaveFailure | null>(null)
  const km = parseDecimal(distance), minutes = values.hours * 60 + values.minutes
  const leave = () => { if (router.canGoBack()) router.goBack(); else router.push(backHref, 'back', 'replace') }
  const save = useMutation({
    mutationFn: (body: Cardio) => editing
      ? apiRequest<void>(`api/cardiosessions/${initial.id}`, { method: 'PUT', body: { ...body, id: initial.id } }).then(() => null)
      : apiRequest<Cardio>('api/cardiosessions', { method: 'POST', body }),
    onSuccess: async created => {
      draft.clear()
      setFailure(null)
      await invalidate()
      void toast.success(editing ? 'Sortie modifiée' : 'Sortie enregistrée')
      if (editing) { if (router.canGoBack()) router.goBack(); else router.push(detail!, 'back', 'replace') } else router.push(created?.id ? cardioPath(created.id) : '/tabs/history/cardio', 'forward', 'replace')
    },
    onError: error => {
      draft.flush(values)
      const kind = saveFailureOf(error)
      setFailure(kind)
      void toast.error('Enregistrement impossible', 'Ta sortie reste enregistrée sur cet appareil.', kind === 'missing' ? undefined : submit)
    },
  })
  function submit() {
    const climb = parseDecimal(elevation)
    const next: Errors = {}
    if (!name.trim()) next.name = 'Indique le nom de ta sortie.'
    if (!date) next.date = 'Indique la date.'
    if (minutes < 1) next.duration = 'La durée doit être d’au moins une minute.'
    if (!Number.isFinite(km)) next.distance = 'Distance en kilomètres, par ex. 8,2.'
    if (!Number.isFinite(climb)) next.elevation = 'Dénivelé en mètres, par ex. 120.'
    setErrors(next)
    if (Object.keys(next).length) return
    const time = editing && (initial.date ?? '').slice(0, 10) === date ? (initial.date ?? '').slice(10) || 'T00:00:00' : 'T00:00:00'
    save.mutate({ name: name.trim(), type: Number(type), date: `${date}${time}`, duration: toTimeSpan(values.hours, values.minutes), distance: km, elevationGain: climb })
  }
  useRetryWhenOnline(failure, submit)
  const keepLocal = () => { draft.flush(values); void toast.success('Brouillon gardé sur cet appareil', editing ? 'Rouvre « Modifier la sortie » pour le reprendre.' : 'Il t’attend dans « Nouvelle séance cardio ».'); leave() }
  const remove = async () => { if (await actions.confirmDelete(initial)) router.push('/tabs/history/cardio', 'back', 'replace') }
  const footer = failure
    ? <><V6Button variant="secondary" onClick={keepLocal}>Garder en local</V6Button><V6Button loading={save.isPending} disabled={failure === 'missing'} onClick={submit}>Réessayer</V6Button></>
    : <V6Button loading={save.isPending} onClick={submit}>{editing ? 'Enregistrer' : 'Enregistrer la sortie'}</V6Button>
  return <Page title={editing ? 'Modifier la sortie' : 'Nouvelle sortie'} subtitle={`Cardio · ${date ? longDate(date) : 'sans date'}`} backHref={backHref} footer={footer}>
    {failure && <SaveFailureState failure={failure} online={online} noun="sortie"
      pending={[{ title: 'Sortie', detail: [name.trim() || cardioName(Number(type)), Number.isFinite(km) && km > 0 ? `${frNumber(km)} km` : null, minutesLabel(minutes)].filter(Boolean).join(' · ') }]} />}
    {!failure && draft.savedAt && touched && <V6StatusPill icon={checkmarkCircleOutline}>Brouillon enregistré · {draftTime(draft.savedAt)}</V6StatusPill>}
    {!failure && draft.restored && !touched && <V6StatusPill icon={checkmarkCircleOutline}>Brouillon repris · {draftTime(draft.restored.savedAt)}</V6StatusPill>}
    <form className="history-form" onSubmit={event => { event.preventDefault(); submit() }} noValidate>
      <section className="history-form__group" aria-label="Type d’activité">
        <h2 className="history-form__label">Type d’activité</h2>
        <V6Segment label="Type d’activité" value={type} options={activityOptions} onChange={set('type')} />
      </section>
      <V6List header="Mesures" note={errors.duration}>
        <V6Item icon={timerOutline} title="Durée" value={minutesLabel(minutes)} onClick={() => setWheel(true)} error={!!errors.duration} />
        <V6InputItem label="Distance (km)" value={distance} onChange={set('distance')} inputmode="decimal" placeholder="0" error={errors.distance} />
        <V6InputItem label="Dénivelé (m)" value={elevation} onChange={set('elevation')} inputmode="numeric" placeholder="0" error={errors.elevation} />
        <V6Item icon={speedometerOutline} title="Allure" value={Number.isFinite(km) && paceLabel(minutes, km) ? `${paceLabel(minutes, km)} /km` : '–'} detail="calculée" />
      </V6List>
      <V6List header="Sortie">
        <V6InputItem label="Nom" value={name} onChange={set('name')} placeholder="Ex. Sortie longue" error={errors.name} autocapitalize="sentences" />
        <V6InputItem label="Date" type="date" value={date} onChange={set('date')} error={errors.date} />
      </V6List>
      {editing && <V6Button variant="text" className="history-delete" onClick={() => void remove()}>Supprimer la sortie</V6Button>}
      <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
    </form>
    <Overlay><DurationSheet isOpen={wheel} value={{ hours: values.hours, minutes: values.minutes }} onClose={() => setWheel(false)} onSave={value => { setTouched(true); setValues(current => ({ ...current, ...value })); setWheel(false); setErrors(current => ({ ...current, duration: undefined })) }} /></Overlay>
  </Page>
}

