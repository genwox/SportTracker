import { useState } from 'react'
import { IonContent, IonPage } from '@ionic/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../api/client'
import { useAuth } from '../../api/auth'
import { getDraftOwner } from '../../api/tokenStore'
import { V5Refresher, V5State, V6Bars, V6Button, V6ChartCard, V6Header, V6InputItem, V6Item, V6List, V6Notice, V6Skeleton, V6StatTiles, V6StickyAction } from '../../ui'
import { useV6ActionSheet, useV6Toast } from '../../ui/v6Feedback'
import { Pedometer } from './Pedometer'
import { localDate, parseHealthValue, weightPoints, weightSummary, type HealthKind, type HealthMetric } from './healthData'
import './profile.css'

const number = (value: number) => value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
const day = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
type Form = { date: string; value: string }
const draftKey = (kind: HealthKind) => `st-health-form:v1:${getDraftOwner()}:${kind}`
function readForm(kind: HealthKind): Form {
  try {
    const form = JSON.parse(localStorage.getItem(draftKey(kind)) ?? 'null') as Form | null
    if (form && typeof form.value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(form.date)) return form
  } catch { /* Empty draft. */ }
  return { date: localDate(), value: '' }
}

export function HealthPage({ kind }: { kind: HealthKind }) {
  const weight = kind === 'weight', title = weight ? 'Mon poids' : 'Mes pas'
  const cache = useQueryClient(), toast = useV6Toast(), actions = useV6ActionSheet()
  const query = useQuery({ queryKey: ['health', getDraftOwner()], queryFn: () => apiRequest<HealthMetric[]>('api/healthmetrics'), staleTime: 30_000 })
  const [form, setForm] = useState(() => readForm(kind))
  const [error, setError] = useState(''), [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  const metrics = query.data ?? [], summary = weightSummary(metrics)
  const rows = metrics.filter(m => weight ? m.weightKg !== null : m.steps !== null).sort((a, b) => b.date.localeCompare(a.date))
  const update = (next: Form): boolean => {
    setForm(next); setError(''); setFailed(false)
    try { localStorage.setItem(draftKey(kind), JSON.stringify(next)); return true }
    catch { setError('Ton appareil ne permet pas de conserver la saisie : enregistre-la avant de quitter.'); return false }
  }
  const selectDay = (date: string) => {
    const metric = metrics.find(m => m.date === date), value = weight ? metric?.weightKg : metric?.steps
    update({ date, value: value == null ? '' : String(value).replace('.', ',') })
  }
  const save = async () => {
    if (saving) return
    const value = parseHealthValue(kind, form.value)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || !Number.isFinite(Date.parse(form.date)) || form.date > localDate()) {
      setError('Choisis une date valide, au plus tard aujourd’hui.'); return
    }
    if (value === null) { setError(weight ? 'Indique un poids entre 1 et 500 kg, avec 2 décimales au maximum.' : 'Indique un nombre entier de pas entre 0 et 200 000.'); return }
    setSaving(true)
    try {
      await apiRequest<HealthMetric>(`api/healthmetrics/${kind}/${form.date}`, { method: 'PUT', body: { value } })
      setForm({ date: localDate(), value: '' })
      try { localStorage.removeItem(draftKey(kind)) } catch { /* The server copy is saved. */ }
      setFailed(false); setError('')
      await cache.invalidateQueries({ queryKey: ['health'] })
      void toast.success(weight ? 'Pesée enregistrée' : 'Pas enregistrés', `${day(form.date)} · ${number(value)} ${weight ? 'kg' : 'pas'}`)
    } catch {
      setFailed(true)
      void toast.error('Mesure non enregistrée', 'La saisie est conservée. Réessaie quand la connexion revient.')
    } finally { setSaving(false) }
  }
  const remove = async (date: string) => {
    if (saving || !await actions.confirm({ title: weight ? 'Supprimer cette pesée ?' : 'Supprimer les pas de ce jour ?', message: day(date), confirmText: 'Supprimer' })) return
    setSaving(true)
    try {
      await apiRequest(`api/healthmetrics/${kind}/${date}`, { method: 'DELETE' })
      if (form.date === date) update({ date: localDate(), value: '' })
      await cache.invalidateQueries({ queryKey: ['health'] })
      void toast.success('Mesure supprimée')
    } catch { void toast.error('Suppression impossible', 'Réessaie quand la connexion revient.') }
    finally { setSaving(false) }
  }
  const latestSteps = metrics.find(m => m.date === localDate())?.steps
  return <IonPage>
    <IonContent fullscreen>
      <V5Refresher onRefresh={() => query.refetch()} />
      <main className="health-page">
        <V6Header title={title} subtitle={weight ? 'Tes pesées et leur évolution' : 'Ta marche au fil des jours'} backHref="/tabs/profile" avatar={false} />
        {query.isPending && !query.data && <V6Skeleton count={1} />}
        {query.isError && <V5State error title="Mesures indisponibles" message="Ta saisie reste conservée. Réessaie pour afficher les mesures du compte." onRetry={() => { void query.refetch() }} />}
        {weight ? <V6StatTiles tiles={[
          { value: summary.latest === null ? '—' : number(summary.latest), unit: 'kg', label: 'dernière pesée' },
          { value: summary.change === null ? '—' : `${summary.change > 0 ? '+' : ''}${number(summary.change)}`, unit: 'kg', label: 'depuis la première' },
        ]} /> : <V6StatTiles tiles={[
          { value: latestSteps == null ? '—' : number(latestSteps), label: 'pas aujourd’hui' },
          { value: rows.length, label: 'jours renseignés' },
        ]} />}
        <V6List header={weight ? 'Ajouter ou corriger une pesée' : 'Total de la journée'} note="Une mesure par jour. Enregistrer une date déjà renseignée remplace sa valeur.">
          <V6InputItem label="Date" type="date" value={form.date} max={localDate()} clearInput={false} disabled={saving} onChange={selectDay} />
          <V6InputItem label={weight ? 'Poids (kg)' : 'Pas'} inputmode={weight ? 'decimal' : 'numeric'} type="text" value={form.value} disabled={saving}
            placeholder={weight ? 'Ex. 75,5' : 'Ex. 6500'} error={error} onChange={value => update({ ...form, value })} />
        </V6List>
        {failed && <V6Notice tone="alert" title="Mesure en attente" message="Elle reste dans le formulaire sur cet appareil. Appuie sur Réessayer pour l’envoyer." />}
        {!weight && <Pedometer onUse={pending => {
          if (!query.data) { setError('Charge les mesures avant de reporter les pas pour préserver le total du jour.'); return false }
          const existing = metrics.find(m => m.date === pending.date)?.steps ?? 0
          const base = form.date === pending.date && form.value.trim() !== '' ? parseHealthValue('steps', form.value) : existing
          if (base === null || base + pending.count > 200_000) { setError('Corrige le total de pas avant de reporter cette marche.'); return false }
          return update({ date: pending.date, value: String(base + pending.count) })
        }} />}
        {weight && summary.weights.length > 0 && <V6ChartCard title="Évolution du poids" caption="kg">
          <svg viewBox="0 0 300 130" role="img" aria-label={`Poids de ${number(summary.weights[0].weightKg!)} à ${number(summary.latest!)} kg entre le ${day(summary.weights[0].date)} et le ${day(summary.weights.at(-1)!.date)}`} className="health-weight-chart">
            <polyline points={weightPoints(summary.weights)} fill="none" stroke="currentColor" strokeWidth="3" />
            {weightPoints(summary.weights).split(' ').map((point, index) => {
              const [cx, cy] = point.split(',')
              return <circle key={summary.weights[index].date} cx={cx} cy={cy} r="4"><title>{day(summary.weights[index].date)} · {number(summary.weights[index].weightKg!)} kg</title></circle>
            })}
          </svg>
          <p>{number(summary.weights[0].weightKg!)} → {number(summary.latest!)} kg · {day(summary.weights[0].date)} au {day(summary.weights.at(-1)!.date)}</p>
        </V6ChartCard>}
        {!weight && rows.length > 0 && <V6ChartCard title="Pas par jour" caption="14 derniers relevés">
          <V6Bars label="Pas des derniers jours renseignés" bars={rows.slice(0, 14).reverse().map(row => ({ key: row.date, label: row.date.slice(8), value: row.steps!, highlight: row.date === localDate(), title: `${day(row.date)} · ${number(row.steps!)} pas` }))} />
        </V6ChartCard>}
        {query.data && rows.length === 0 && <V6Notice title={weight ? 'Ta première pesée' : 'Ton premier relevé de pas'} message={weight ? 'Ajoute ton poids pour commencer à suivre son évolution.' : 'Lance une marche ou reporte le total indiqué dans Apple Santé.'} />}
        {rows.length > 0 && <V6List header="Historique" note="Touche une mesure pour la corriger.">
          {rows.map(row => <V6Item key={row.date} title={day(row.date)} value={`${number((weight ? row.weightKg : row.steps)!)} ${weight ? 'kg' : 'pas'}`} onClick={() => selectDay(row.date)}
            end={<V6Button variant="text" disabled={saving} aria-label={`Supprimer ${day(row.date)}`} onClick={event => { event.stopPropagation(); void remove(row.date) }}>Supprimer</V6Button>} />)}
        </V6List>}
        {!weight && <V6List header="Apple Santé et Nike Run Club" note="SportTracker ne lit pas les données Santé depuis Safari. Le podomètre utilise les mouvements reçus pendant que cette page reste ouverte.">
          <V6Item title="Nike Run Club → Apple Santé" detail="NRC peut partager tes courses avec Santé, via le réglage Apple Santé de son profil. Cela ne connecte pas SportTracker." />
          <V6Item title="Pas quotidiens Apple Santé" detail="Consulte Santé › Activité › Nombre de pas, puis reporte le total ici. Une lecture directe demandera une version iOS avec HealthKit." />
        </V6List>}
      </main>
    </IonContent>
    <V6StickyAction><V6Button loading={saving} onClick={() => void save()}>{failed ? 'Réessayer' : weight ? 'Enregistrer la pesée' : 'Enregistrer les pas'}</V6Button></V6StickyAction>
  </IonPage>
}

export function WeightPage() {
  useAuth()
  return <HealthPage key={getDraftOwner()} kind="weight" />
}
export function StepsPage() {
  useAuth()
  return <HealthPage key={getDraftOwner()} kind="steps" />
}
