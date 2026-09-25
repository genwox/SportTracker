import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IonRouterLink, IonSelect, IonSelectOption } from '@ionic/react'
import { useHistory, useParams } from 'react-router-dom'
import { apiRequest, ApiError } from '../../api/client'
import { V5Button, V5Card, V5Header, V5Loading, V5State } from '../../ui'
import { cardioKey, cardioName, durationMinutes, frNumber, numberOf, useCardio, type Cardio } from './data'
import { Page, Refresh, NavCard, detailDate, durationLabel, today } from './shared'

export function CardioSessionsPage() {
  const cardio = useCardio()
  return <Page><Refresh onRefresh={() => cardio.refetch()} /><V5Header title="Ton cardio" subtitle="Chaque sortie compte" backHref="/tabs/history" />
    <IonRouterLink routerLink="/tabs/history/cardio/new" className="history-action">+ Nouvelle sortie</IonRouterLink>
    {!cardio.data && cardio.isPending ? <V5Loading /> : cardio.isError && !cardio.data ? <V5State title="Impossible de charger tes sorties" message="Vérifie ta connexion, puis réessaie." error onRetry={() => void cardio.refetch()} />
      : !cardio.data?.length ? <V5State title="Première sortie" message="Enregistre ta première sortie cardio." />
        : <div className="history-stack">{[...cardio.data].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).map(session => <NavCard key={session.id} href={`/tabs/history/cardio/${session.id}`}>
          <div className="history-row"><span className="history-row-icon" aria-hidden="true">↗</span><span className="history-row-copy"><strong>{session.name || cardioName(session.type)}</strong><small>{detailDate(session.date)} · {durationLabel(session.duration)}</small></span>
            <span className="history-distance">{frNumber(numberOf(session.distance))}<small>km</small></span><span aria-hidden="true">›</span></div></NavCard>)}</div>}
  </Page>
}

export function CardioSessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  // IonRouterOutlet can pick the parameter route for /cardio/new even though
  // the explicit route is declared first. Keep the new form reachable here.
  return sessionId === 'new' ? <NewCardioSessionPage /> : <CardioDetail sessionId={sessionId} />
}

function CardioDetail({ sessionId }: { sessionId: string }) {
  const session = useQuery({ queryKey: ['history', 'cardio', sessionId], queryFn: () => apiRequest<Cardio>(`api/cardiosessions/${sessionId}`) })
  const cardio = session.data
  const seconds = cardio && numberOf(cardio.distance) > 0 ? Math.floor(durationMinutes(cardio.duration) * 60 / numberOf(cardio.distance)) : 0
  const message = session.error instanceof ApiError && session.error.status === 404 ? 'Cette sortie est introuvable ou inaccessible.' : 'Vérifie ta connexion, puis réessaie.'
  return <Page><Refresh onRefresh={() => session.refetch()} /><V5Header title={cardio?.name || cardioName(cardio?.type)} subtitle={detailDate(cardio?.date)} backHref="/tabs/history/cardio" />
    {!cardio && session.isPending ? <V5Loading /> : session.isError && !cardio ? <V5State title="Impossible de charger la sortie" message={message} error onRetry={() => void session.refetch()} />
      : cardio && <><V5Card className="history-cardio-hero"><span>{cardioName(cardio.type)}</span><strong>{frNumber(numberOf(cardio.distance))}</strong><small>kilomètres</small></V5Card>
        <div className="history-cardio-stats"><V5Card><strong>{durationLabel(cardio.duration)}</strong><span>durée</span></V5Card>
          {Number.isFinite(seconds) && seconds > 0 && <V5Card><strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong><span>allure /km</span></V5Card>}
          <V5Card><strong>{frNumber(numberOf(cardio.elevationGain), 0)} m</strong><span>dénivelé</span></V5Card></div></>}
  </Page>
}

export function NewCardioSessionPage() {
  const router = useHistory(), client = useQueryClient()
  const [name, setName] = useState(''), [type, setType] = useState(0), [date, setDate] = useState(today())
  const [minutes, setMinutes] = useState('30'), [distance, setDistance] = useState('0'), [elevation, setElevation] = useState('0'), [error, setError] = useState('')
  const create = useMutation({ mutationFn: (body: object) => apiRequest<Cardio>('api/cardiosessions', { method: 'POST', body }),
    onSuccess: async created => { await client.invalidateQueries({ queryKey: cardioKey }); router.replace(created?.id ? `/tabs/history/cardio/${created.id}` : '/tabs/history/cardio') } })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const count = Number(minutes), km = Number(distance), climb = Number(elevation)
    if (!name.trim()) return setError('Indique le nom de ta sortie.')
    if (!date || !Number.isFinite(count) || count < 1) return setError('Indique une date et une durée d’au moins une minute.')
    if (![km, climb].every(value => Number.isFinite(value) && value >= 0)) return setError('La distance et le dénivelé doivent être des nombres positifs ou nuls.')
    setError('')
    const seconds = Math.round(count * 60)
    const duration = `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
    create.mutate({ name: name.trim(), type, date: `${date}T00:00:00`, duration, distance: km, elevationGain: climb }, { onError: () => setError('Vérifie ta connexion, puis réessaie : tes valeurs sont conservées.') })
  }
  return <Page><V5Header title="Nouvelle sortie" subtitle="Cardio" backHref="/tabs/history/cardio" />
    <form className="history-form" onSubmit={submit}><V5Card><label>Nom<input value={name} onChange={event => setName(event.target.value)} placeholder="Ex. Run matinal" /></label>
      <label>Activité<IonSelect interface="action-sheet" value={type} onIonChange={event => setType(Number(event.detail.value))}>{[0, 1, 2, 3].map(value => <IonSelectOption key={value} value={value}>{cardioName(value)}</IonSelectOption>)}</IonSelect></label>
      <div className="history-form-grid"><label>Date<input type="date" value={date} onChange={event => setDate(event.target.value)} required /></label><label>Durée (min)<input type="number" min="1" step="1" value={minutes} onChange={event => setMinutes(event.target.value)} required /></label></div>
      <div className="history-form-grid"><label>Distance (km)<input type="number" min="0" step="0.1" value={distance} onChange={event => setDistance(event.target.value)} /></label><label>Dénivelé (m)<input type="number" min="0" step="1" value={elevation} onChange={event => setElevation(event.target.value)} /></label></div></V5Card>
      {error && <V5State title="Enregistrement impossible" message={error} error />}
      <V5Button type="submit" disabled={create.isPending}>{create.isPending ? 'Enregistrement…' : 'Enregistrer la sortie'}</V5Button><IonRouterLink routerLink="/tabs/history/cardio">Annuler</IonRouterLink></form>
  </Page>
}
