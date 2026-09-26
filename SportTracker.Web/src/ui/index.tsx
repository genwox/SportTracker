import { useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'
import { IonContent, IonIcon, IonModal, IonRefresher, IonRefresherContent } from '@ionic/react'
import { alertCircleOutline } from 'ionicons/icons'
import './ui.css'

export {
  V6Avatar, V6BackButton, V6Button, V6Chip, V6ChipRow, V6Header, V6InputItem, V6Item, V6List, V6Segment, V6Sheet,
  V6Skeleton, V6SlidingRow, V6StickyAction, V6TabBar, V6Toggle, type V6SegmentOption,
} from './v6'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }

export function V5Button({ secondary = false, className = '', children, ...props }: ButtonProps) {
  return <button className={`v5-button ${secondary ? 'v5-button--secondary' : ''} ${className}`} {...props}>{children}</button>
}

export function V5Card({ className = '', children, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`v5-card ${className}`} {...props}>{children}</section>
}

export function V5State({ title, message, error = false, onRetry, children }: {
  title: string; message?: string; error?: boolean; onRetry?: () => void; children?: ReactNode
}) {
  return <V5Card className={`v5-state ${error ? 'v5-state--error' : ''}`} role={error ? 'alert' : 'status'}>
    <strong>{error && <IonIcon icon={alertCircleOutline} aria-hidden="true" />}{title}</strong>{message && <p>{message}</p>}
    {onRetry && <V5Button onClick={onRetry}>Réessayer</V5Button>}{children}
  </V5Card>
}

export function V5Refresher({ onRefresh }: { onRefresh: () => Promise<unknown> }) {
  return <IonRefresher slot="fixed" onIonRefresh={async event => { try { await onRefresh() } finally { event.detail.complete() } }}><IonRefresherContent /></IonRefresher>
}

type DemoExercise = { name?: string | null; gifUrl?: string | null; instructionsFr?: string | null }

/** Square preview of an exercise's GIF, or a neutral dumbbell when it has none. */
export function ExerciseThumb({ exercise, size = 52 }: { exercise?: DemoExercise | null; size?: number }) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size } as React.CSSProperties
  if (!exercise?.gifUrl || failed) return <span className="v5-thumb v5-thumb--empty" style={style} aria-hidden="true"><span className="v5-tab-icon" style={{ '--v5-icon': 'url(/icons/010-Dumbell.svg)' } as React.CSSProperties} /></span>
  return <img className="v5-thumb" style={style} src={exercise.gifUrl} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
}

/** Bottom sheet showing the movement demo, instead of leaving the app for the raw GIF URL. */
export function ExerciseDemoSheet({ exercise, onClose }: { exercise: DemoExercise | null; onClose: () => void }) {
  return <IonModal isOpen={!!exercise?.gifUrl} onDidDismiss={onClose} initialBreakpoint={0.85} breakpoints={[0, 0.85]} handle className="v5-demo-sheet">
    <IonContent>{exercise && <div className="v5-demo">
      <header><h2>{exercise.name}</h2><button type="button" onClick={onClose} aria-label="Fermer la démonstration">×</button></header>
      {exercise.gifUrl && <img src={exercise.gifUrl} alt={`Démonstration : ${exercise.name ?? 'exercice'}`} />}
      {exercise.instructionsFr && <p>{exercise.instructionsFr}</p>}
    </div>}</IonContent>
  </IonModal>
}

export { V6Keypad, V6LiveMiniBar, V6Searchbar, V6SetRow, V6Stepper, V6WheelPicker, type V6KeypadField, type V6WheelColumn } from './v6Live'
export {
  V6Badge, V6ContextMenu, V6ReorderList, V6ReorderRow, V6SessionRow, V6SlidingSessionRow, V6StepperItem, V6TextareaItem,
  type V6BadgeTone, type V6ContextAction,
} from './v6Plan'
export { V6Bars, V6ChartCard, V6RecordBanner, V6StatTiles, type V6Bar } from './v6History'
export { V6Notice, V6SkeletonTiles, V6StatePage, V6StatusPill } from './v6States'
