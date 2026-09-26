/* eslint-disable react-refresh/only-export-components -- paths and the rows hook stay beside the row components */
import { useState } from 'react'
import { IonIcon, useIonRouter } from '@ionic/react'
import { barbellOutline, bicycleOutline, copyOutline, footstepsOutline, openOutline, pulseOutline, trashOutline, waterOutline } from 'ionicons/icons'
import { V6Badge, V6ContextMenu, V6SessionRow, V6SlidingSessionRow, type V6ContextAction } from '../../ui'
import { frNumber, numberOf, type Cardio, type Workout } from './data'
import { cardioRecords, cardioTitle, plural, setTypeCounts, workoutRecords, workoutSets, type WorkoutRecords } from './historyData'
import { durationLabel, Overlay, shortDate, useSessionActions } from './shared'

/* Session rows of the lists 04, 07 and 17: tap = push, swipe = Supprimer / Dupliquer, long press = context menu. */

export const workoutPath = (id: number | string | undefined) => `/tabs/history/workouts/${id}`
export const cardioPath = (id: number | string | undefined) => `/tabs/history/cardio/${id}`

const cardioIcons: Record<number, string> = { 0: pulseOutline, 1: footstepsOutline, 2: waterOutline, 3: bicycleOutline }
export const cardioIcon = (type?: number) => cardioIcons[numberOf(type)] ?? pulseOutline

type Item = { kind: 'workout'; session: Workout } | { kind: 'cardio'; session: Cardio }

/** « Éch. ×2 », « Normal ×14 »…: the V5 set-type badges of a workout. */
export function SetTypeBadges({ workout }: { workout: Workout }) {
  return <>{setTypeCounts(workout).map(({ type, count }) => <V6Badge key={type.key} tone={type.key === 'Normal' ? 'ink' : type.tone}>{type.label} ×{count}</V6Badge>)}</>
}

/** Rows plus their shared context menu. `records` come from the whole cached list (records need the earlier sessions). */
export function useSessionRows({ workouts = [], cardio = [], variant }: { workouts?: Workout[]; cardio?: Cardio[]; variant: 'workouts' | 'cardio' | 'history' }) {
  const router = useIonRouter()
  const strength = useSessionActions('workout'), outing = useSessionActions('cardio')
  const [menu, setMenu] = useState<Item | null>(null)
  const records = workoutRecords(workouts)
  const cardioBest = cardioRecords(cardio)

  const open = (item: Item) => router.push(item.kind === 'workout' ? workoutPath(item.session.id) : cardioPath(item.session.id))
  const actionsOf = (item: Item) => item.kind === 'workout' ? strength : outing

  const props = (item: Item) => {
    if (item.kind === 'workout') {
      const workout = item.session, record: WorkoutRecords | undefined = records.get(numberOf(workout.id))
      const sets = workoutSets(workout), failures = sets.filter(set => Number(set.setType) === 3).length
      const detail = variant === 'workouts'
        ? `${shortDate(workout.date)} · ${plural(workout.workoutExercises?.length ?? 0, 'exercice')} · ${plural(sets.length, 'série')}`
        : `${shortDate(workout.date)} · ${plural(sets.length, 'série')}${record?.count ? ` · ${plural(record.count, 'record')}` : failures ? ` · ${plural(failures, 'échec')}` : ''}`
      return {
        tile: <IonIcon icon={barbellOutline} />, title: workout.name || 'Séance musculation', detail,
        badges: variant === 'workouts' && sets.length ? <SetTypeBadges workout={workout} /> : undefined,
        value: record?.count ? 'PR' : variant === 'workouts' ? String(sets.length) : failures ? 'Échec' : undefined,
      }
    }
    const session = item.session, distance = numberOf(session.distance)
    const detail = [shortDate(session.date), distance > 0 ? `${frNumber(distance)} km` : '', durationLabel(session.duration)].filter(Boolean).join(' · ')
    const record = cardioBest.has(numberOf(session.id))
    return {
      tile: <IonIcon icon={cardioIcon(numberOf(session.type))} />, title: cardioTitle(session), detail,
      value: variant === 'history' ? distance > 0 ? `${frNumber(distance)} km` : record ? 'PR' : undefined : record ? 'PR' : undefined,
    }
  }

  const row = (item: Item) => {
    const actions = actionsOf(item), name = actions.title(item.session)
    return <V6SlidingSessionRow key={`${item.kind}-${item.session.id}`} {...props(item)}
      onClick={() => open(item)} onLongPress={() => setMenu(item)}
      onDelete={() => void actions.confirmDelete(item.session)} deleteAriaLabel={`Supprimer ${name}`}
      onDuplicate={() => actions.duplicate(item.session)} duplicateAriaLabel={`Dupliquer ${name}`} />
  }

  const menuActions = (item: Item): V6ContextAction[] => [
    { label: item.kind === 'workout' ? 'Ouvrir la séance' : 'Ouvrir la sortie', icon: openOutline, onSelect: () => open(item) },
    { label: 'Dupliquer', icon: copyOutline, onSelect: () => actionsOf(item).duplicate(item.session) },
    { label: item.kind === 'workout' ? 'Supprimer la séance' : 'Supprimer la sortie', icon: trashOutline, destructive: true, onSelect: () => void actionsOf(item).confirmDelete(item.session) },
  ]
  const contextMenu = <Overlay><V6ContextMenu isOpen={!!menu} onDismiss={() => setMenu(null)} label={menu ? actionsOf(menu).title(menu.session) : 'Séance'}
    preview={menu && <V6SessionRow {...props(menu)} />} actions={menu ? menuActions(menu) : []} /></Overlay>

  return {
    workoutRow: (session: Workout) => row({ kind: 'workout', session }),
    cardioRow: (session: Cardio) => row({ kind: 'cardio', session }),
    records, cardioBest, contextMenu,
  }
}
