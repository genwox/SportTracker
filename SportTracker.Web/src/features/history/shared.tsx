/* eslint-disable react-refresh/only-export-components -- date helpers and the mutations stay beside the history page shell */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { IonContent, IonPage } from '@ionic/react'
import { ApiError, apiRequest } from '../../api/client'
import { cloudOfflineOutline, syncOutline } from 'ionicons/icons'
import { V5Refresher, V5State, V6Badge, V6Button, V6Header, V6Item, V6List, V6Notice, V6Sheet, V6StickyAction, V6WheelPicker } from '../../ui'
import { useV6ActionSheet, useV6Toast } from '../../ui/v6Feedback'
import { cardioKey, dayLabel, durationMinutes, workoutsKey, type Cardio, type Workout } from './data'
import { cardioTitle, duplicateCardio, duplicateWorkout, minutesLabel } from './historyData'
import './history.css'

/* ── Layout ──────────────────────────────────────────────────────────────── */

/** Sheets and menus render next to IonContent (like the Carnets and live pages): inside the scroller the page could paint over them. */
const OverlayHost = createContext<HTMLElement | null>(null)
export function Overlay({ children }: { children: ReactNode }) {
  const host = useContext(OverlayHost)
  return host ? createPortal(children, host) : null
}

/** History page shell: V6 header (large title that condenses), pull to refresh, sticky action n° 1, overlay host. */
export function Page({ title, subtitle, backHref, backLabel, action, extra, refresh, footer, children }: {
  title: string; subtitle?: string; backHref?: string; backLabel?: string; action?: ReactNode; extra?: ReactNode
  refresh?: () => Promise<unknown>; footer?: ReactNode; children: ReactNode
}) {
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  return <IonPage>
    <OverlayHost.Provider value={host}>
      <IonContent fullscreen>
        {refresh && <V5Refresher onRefresh={refresh} />}
        <main className="history-page"><V6Header title={title} subtitle={subtitle} backHref={backHref} backLabel={backLabel} avatar={!backHref} action={action} extra={extra} />{children}</main>
      </IonContent>
      {footer && <V6StickyAction>{footer}</V6StickyAction>}
      <div ref={setHost} className="history-overlays" />
    </OverlayHost.Provider>
  </IonPage>
}

export const errorText = (error: unknown, what = 'Cette séance') => error instanceof ApiError && error.status === 404 ? `${what} est introuvable ou inaccessible.` : 'Vérifie ta connexion, puis réessaie.'
export function QueryError({ title, error, what, retry }: { title: string; error: unknown; what?: string; retry: () => void }) {
  return <V5State title={title} message={errorText(error, what)} error onRetry={retry} />
}

/** Section header: Foruner title, like « Mes programmes » on the Carnets. */
export function SectionTitle({ children }: { children: ReactNode }) { return <h2 className="history-section-title">{children}</h2> }

/* ── Duration wheel ──────────────────────────────────────────────────────── */

const hourOptions = Array.from({ length: 10 }, (_, value) => ({ value, text: String(value) }))
const minuteOptions = Array.from({ length: 60 }, (_, value) => ({ value, text: String(value).padStart(2, '0') }))

/** Duration at the wheel (h / min) in a 50 % sheet: cardio outing (08) and dated workout (05, 21). */
export function DurationSheet({ isOpen, value, onClose, onSave, label = 'Durée de la sortie' }: { isOpen: boolean; value: { hours: number; minutes: number }; onClose: () => void; onSave: (value: { hours: number; minutes: number }) => void; label?: string }) {
  const [draft, setDraft] = useState(value)
  const [opened, setOpened] = useState(false)
  if (isOpen !== opened) { setOpened(isOpen); if (isOpen) setDraft(value) }
  return <V6Sheet isOpen={isOpen} onDismiss={onClose} title="Durée" subtitle={minutesLabel(draft.hours * 60 + draft.minutes)} breakpoints={[0, 0.5]} initialBreakpoint={0.5} backdropBreakpoint={0} className="history-duration-sheet">
    <V6WheelPicker label={label} onChange={(column, next) => setDraft(current => ({ ...current, [column]: next }))}
      columns={[{ id: 'hours', label: 'Heures', unit: 'h', value: draft.hours, options: hourOptions }, { id: 'minutes', label: 'Minutes', unit: 'min', value: draft.minutes, options: minuteOptions }]} />
    <V6Button onClick={() => onSave(draft)}>Valider</V6Button>
  </V6Sheet>
}

/* ── Save failure (25 · Erreur d’enregistrement) ────────────────────────── */

export type SaveFailure = 'offline' | 'server' | 'missing'
export const saveFailureOf = (error: unknown): SaveFailure => error instanceof ApiError ? error.status === 404 ? 'missing' : 'server' : 'offline'

/** Calls `retry` when the network comes back after an offline failure (« la synchronisation reprendra automatiquement »). */
export function useRetryWhenOnline(failure: SaveFailure | null, retry: () => void) {
  const latest = useRef(retry)
  useEffect(() => { latest.current = retry })
  useEffect(() => {
    if (failure !== 'offline') return
    const onOnline = () => latest.current()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [failure])
}

/**
 * In-page state of a failed save (V6 · 25): the server did not answer, the entry stays on this device, what waits
 * for the sync. Never red: nav-ink contour and icons. The page footer offers « Garder en local » / « Réessayer ».
 */
export function SaveFailureState({ failure, online, noun, pending }: {
  failure: SaveFailure; online: boolean; noun: 'séance' | 'sortie'; pending: { title: string; detail: string }[]
}) {
  const missing = failure === 'missing'
  return <>
    <V6Notice tone="alert" icon={failure === 'offline' ? cloudOfflineOutline : undefined}
      title={missing ? `${noun === 'séance' ? 'Séance introuvable' : 'Sortie introuvable'} sur le serveur` : 'Le serveur n’a pas répondu'}
      message={missing ? `Elle a peut-être été supprimée depuis un autre appareil. Ta saisie reste enregistrée sur cet appareil.` : `Ta ${noun} reste enregistrée sur cet appareil.`}
      meta={missing ? 'Gardée en local' : !online ? 'Hors ligne · sync en attente' : 'Sync en attente · tu peux réessayer maintenant'} />
    <V6List header="En attente de synchronisation" note={failure === 'offline'
      ? 'Aucune donnée n’est perdue : la synchronisation reprendra automatiquement au retour du réseau.'
      : 'Aucune donnée n’est perdue : ta saisie reste sur cet appareil.'}>
      {pending.map((item, index) => <V6Item key={`${item.title}-${index}`} icon={syncOutline} title={item.title} detail={item.detail}
        value={index === 0 ? <V6Badge tone="action">{pending.length}</V6Badge> : undefined} />)}
    </V6List>
  </>
}

/* ── Dates ───────────────────────────────────────────────────────────────── */

export const today = () => new Date().toLocaleDateString('sv-SE')
export const monday = (date: Date) => { const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()); start.setDate(start.getDate() - (start.getDay() + 6) % 7); return start }
export const dateKey = (date: Date) => date.toLocaleDateString('sv-SE')
export const shortDate = (date?: string) => date ? dayLabel(date, { day: 'numeric', month: 'short' }).replace('.', '') : ''
export const longDate = (date?: string) => date ? dayLabel(date, { day: 'numeric', month: 'long' }) : ''
export const durationLabel = (value?: string) => { const minutes = Math.floor(durationMinutes(value)); return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}` : `${minutes} min` }

/* ── Mutations: delete (with action sheet) and duplicate ─────────────────── */

type Kind = 'workout' | 'cardio'
const endpoint = (kind: Kind) => kind === 'workout' ? 'api/workoutsessions' : 'api/cardiosessions'

/** Every cache fed by the sessions: history lists and details, Aujourd’hui, Profil, Carnets statuses, live PR history. */
export function useInvalidateSessions() {
  const cache = useQueryClient()
  return () => Promise.all([
    cache.invalidateQueries({ queryKey: ['history'] }), cache.invalidateQueries({ queryKey: ['today'] }),
    cache.invalidateQueries({ queryKey: ['profile'] }), cache.invalidateQueries({ queryKey: ['live', 'workouts'] }),
  ])
}

/**
 * Delete and duplicate a workout or a cardio outing. Delete asks first in an action sheet (system red),
 * removes the row from the cache at once and puts it back if the server refuses.
 */
export function useSessionActions(kind: Kind) {
  const cache = useQueryClient(), actions = useV6ActionSheet(), toast = useV6Toast(), invalidate = useInvalidateSessions()
  const key = kind === 'workout' ? workoutsKey : cardioKey
  const noun = kind === 'workout' ? 'Séance' : 'Sortie'
  const remove = useMutation({
    mutationFn: (id: number) => apiRequest<void>(`${endpoint(kind)}/${id}`, { method: 'DELETE' }),
    onMutate: async (id: number) => {
      await cache.cancelQueries({ queryKey: key })
      const previous = cache.getQueryData<(Workout | Cardio)[]>(key)
      cache.setQueryData<(Workout | Cardio)[]>(key, current => current?.filter(item => Number(item.id) !== id))
      return { previous }
    },
    onError: (_error, _id, context) => { if (context?.previous) cache.setQueryData(key, context.previous); void toast.error('Suppression impossible', 'Vérifie ta connexion, puis réessaie.') },
    onSuccess: (_result, id) => { cache.removeQueries({ queryKey: ['history', kind, String(id)] }); void toast.success(`${noun} supprimée`) },
    onSettled: () => invalidate(),
  })
  const duplicate = useMutation({
    mutationFn: (item: Workout | Cardio) => apiRequest<Workout | Cardio>(endpoint(kind), { method: 'POST', body: kind === 'workout' ? duplicateWorkout(item as Workout) : duplicateCardio(item as Cardio) }),
    onSuccess: async () => { await invalidate(); void toast.success(`${noun} dupliquée`, 'La copie est datée d’aujourd’hui.') },
    onError: () => void toast.error('Duplication impossible', 'Vérifie ta connexion, puis réessaie.'),
  })
  const title = (item: Workout | Cardio) => kind === 'workout' ? (item as Workout).name || 'Séance musculation' : cardioTitle(item as Cardio)
  /** Resolves true once the deletion is confirmed (the request then runs in the background). */
  const confirmDelete = async (item: Workout | Cardio) => {
    const confirmed = await actions.confirm({
      title: `Supprimer « ${title(item)} » ?`, message: kind === 'workout' ? 'Ses exercices et ses séries seront supprimés. Tes carnets ne changent pas.' : 'Cette sortie disparaîtra de ton historique.',
      confirmText: kind === 'workout' ? 'Supprimer la séance' : 'Supprimer la sortie',
    })
    if (confirmed) remove.mutate(Number(item.id))
    return confirmed
  }
  return { confirmDelete, duplicate: (item: Workout | Cardio) => duplicate.mutate(item), title }
}
