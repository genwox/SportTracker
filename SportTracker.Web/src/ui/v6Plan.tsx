import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react'
import {
  createAnimation, IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonList, IonModal, IonReorder, IonReorderGroup, IonTextarea,
} from '@ionic/react'
import { addOutline, chevronForwardOutline, removeOutline, reorderThreeOutline, trashOutline } from 'ionicons/icons'
import { usePressRepeat, useV6LongPress } from './v6Hooks'
import './v6Plan.css'

/* ── Session row ─────────────────────────────────────────────────────────── */

/**
 * Glass card row of a list of sessions or programmes: icon tile, title, detail, V5 badges, chevron.
 * Tap opens it (push); a long press opens its context menu.
 */
export function V6SessionRow({ tile, tileColor, title, detail, badges, onClick, onLongPress, ariaLabel }: {
  tile: ReactNode; tileColor?: string; title: ReactNode; detail?: ReactNode; badges?: ReactNode
  onClick?: () => void; onLongPress?: () => void; ariaLabel?: string
}) {
  const { handlers, guard } = useV6LongPress(onLongPress)
  return <IonItem className="v6-session-row" button={Boolean(onClick)} detail={false} lines="none" onClick={guard(onClick)} aria-label={ariaLabel} {...handlers}>
    <span slot="start" className="v6-session-row__tile" style={tileColor ? { '--v6-tile': tileColor } as React.CSSProperties : undefined} aria-hidden="true">{tile}</span>
    <div className="v6-session-row__text">
      <strong>{title}</strong>
      {detail && <small>{detail}</small>}
      {badges && <span className="v6-session-row__badges">{badges}</span>}
    </div>
    {onClick && <IonIcon slot="end" icon={chevronForwardOutline} className="v6-session-row__chevron" aria-hidden="true" />}
  </IonItem>
}

/* ── Badge ───────────────────────────────────────────────────────────────── */

export type V6BadgeTone = 'action' | 'surface' | 'warmup' | 'dropset' | 'failure' | 'ink'

/** V5 badge (set type, status, superset), 8 pt radius. */
export function V6Badge({ tone = 'surface', children }: { tone?: V6BadgeTone; children: ReactNode }) {
  return <span className={`v6-badge v6-badge--${tone}`}>{children}</span>
}

/* ── Reorder list ────────────────────────────────────────────────────────── */

/**
 * Rows moved with their ≡ handle (IonReorderGroup). The dragged row lifts (shadow, scale 1.03);
 * `onReorder(from, to)` receives the move once the finger lifts.
 */
export function V6ReorderList({ label, onReorder, disabled = false, children }: {
  label: string; onReorder: (from: number, to: number) => void; disabled?: boolean; children: ReactNode
}) {
  return <IonList className="v6-reorder-list" lines="none" aria-label={label}>
    <IonReorderGroup disabled={disabled} onIonReorderEnd={event => {
      const { from, to } = event.detail
      event.detail.complete()
      if (from !== to) onReorder(from, to)
    }}>{children}</IonReorderGroup>
  </IonList>
}

/**
 * One row of a V6ReorderList: number (or thumbnail), title, detail, ≡ handle on the right.
 * Swipe left to « Retirer » (system red); the callback asks for confirmation.
 */
export function V6ReorderRow({ number, leading, title, detail, extra, onClick, onRemove, removeLabel = 'Retirer', removeAriaLabel, selected = false, reorderLabel, className = '' }: {
  number?: number; leading?: ReactNode; title: ReactNode; detail?: ReactNode; extra?: ReactNode; onClick?: () => void
  onRemove?: () => void; removeLabel?: string; removeAriaLabel?: string; selected?: boolean; reorderLabel: string; className?: string
}) {
  const ref = useRef<HTMLIonItemSlidingElement>(null)
  const remove = () => { void ref.current?.close(); onRemove?.() }
  const body = <><span className="v6-reorder-row__title">{title}</span>{detail && <small>{detail}</small>}</>
  return <IonItemSliding ref={ref} className={`v6-reorder-row ${selected ? 'is-selected' : ''} ${className}`} disabled={!onRemove}>
    <IonItem className="v6-reorder-row__item" lines="none" detail={false}>
      <div slot="start" className="v6-reorder-row__leading">{leading ?? <span className="v6-reorder-row__number" aria-hidden="true">{number}</span>}</div>
      <div className="v6-reorder-row__text">
        {onClick ? <button type="button" className="v6-reorder-row__main" aria-pressed={selected || undefined} onClick={onClick}>{body}</button> : <div className="v6-reorder-row__main">{body}</div>}
        {extra}
      </div>
      <IonReorder slot="end" className="v6-reorder-row__handle" aria-label={reorderLabel}><IonIcon icon={reorderThreeOutline} aria-hidden="true" /></IonReorder>
    </IonItem>
    {onRemove && <IonItemOptions side="end" onIonSwipe={remove}>
      <IonItemOption color="danger" expandable className="v6-sliding__delete" onClick={remove}><IonIcon slot="top" icon={trashOutline} />
        {removeAriaLabel ? <><span aria-hidden="true">{removeLabel}</span><span className="v6-visually-hidden">{removeAriaLabel}</span></> : removeLabel}</IonItemOption>
    </IonItemOptions>}
  </IonItemSliding>
}

/* ── Context menu ────────────────────────────────────────────────────────── */

export type V6ContextAction = { label: string; icon: string; onSelect: () => void; destructive?: boolean; disabled?: boolean }

const menuCurve = 'cubic-bezier(0.32, 0.72, 0, 1)'
function menuAnimation(base: HTMLElement) {
  const root = base.shadowRoot ?? base
  const backdrop = createAnimation().addElement(root.querySelector('ion-backdrop')!).fromTo('opacity', '0.01', 'var(--backdrop-opacity)')
  const wrapper = createAnimation().addElement(root.querySelector('.modal-wrapper')!)
    .keyframes([{ offset: 0, opacity: '0', transform: 'scale(0.94)' }, { offset: 1, opacity: '1', transform: 'scale(1)' }])
  return createAnimation().addElement(base).easing(menuCurve).duration(250).addAnimation([backdrop, wrapper])
}
const menuEnter = (base: HTMLElement) => menuAnimation(base)
const menuLeave = (base: HTMLElement) => menuAnimation(base).duration(200).direction('reverse')

/**
 * iOS context menu (long press): blurred backdrop, a preview of the row, then its actions in a glass list
 * (destructive ones in system red). Tapping outside closes it.
 */
export function V6ContextMenu({ isOpen, onDismiss, label, preview, actions }: {
  isOpen: boolean; onDismiss: () => void; label: string; preview?: ReactNode; actions: V6ContextAction[]
}) {
  const modal = useRef<HTMLIonModalElement>(null)
  const pending = useRef<(() => void) | null>(null)
  const choose = (action: V6ContextAction) => { pending.current = action.onSelect; void modal.current?.dismiss() }
  return <IonModal ref={modal} isOpen={isOpen} className="v6-context-menu" enterAnimation={menuEnter} leaveAnimation={menuLeave}
    onWillDismiss={onDismiss} onDidDismiss={() => { const run = pending.current; pending.current = null; run?.() }}>
    <div className="v6-context-menu__stage" onClick={event => { if (event.target === event.currentTarget) void modal.current?.dismiss() }}>
      {preview && <div className="v6-context-menu__preview" aria-hidden="true">{preview}</div>}
      <div className="v6-context-menu__list" role="menu" aria-label={label}>
        {actions.map(action => <button key={action.label} type="button" role="menuitem" disabled={action.disabled}
          className={`v6-context-menu__action ${action.destructive ? 'is-destructive' : ''}`} onClick={() => choose(action)}>
          <span>{action.label}</span><IonIcon icon={action.icon} aria-hidden="true" />
        </button>)}
      </div>
    </div>
  </IonModal>
}

/* ── Form rows ───────────────────────────────────────────────────────────── */

/** List row with a compact − / + stepper (44 pt keys, hold to repeat) for small integers: sets, repetitions. */
export function V6StepperItem({ label, value, min = 0, max = 999, step = 1, format, onChange }: {
  label: string; value: number; min?: number; max?: number; step?: number; format?: (value: number) => string; onChange: (value: number) => void
}) {
  const valueRef = useRef(value)
  useEffect(() => { valueRef.current = value })
  const move = (direction: -1 | 1) => {
    const next = Math.min(max, Math.max(min, valueRef.current + direction * step))
    if (next !== valueRef.current) { valueRef.current = next; onChange(next) }
  }
  const minus = usePressRepeat(() => move(-1))
  const plus = usePressRepeat(() => move(1))
  return <IonItem className="v6-item v6-stepper-item" lines="inset">
    <div className="v6-stepper-item__label">{label}</div>
    <div slot="end" className="v6-stepper-item__control" role="group" aria-label={label}>
      <button type="button" className="v6-stepper-item__key" aria-label={`Diminuer ${label.toLocaleLowerCase('fr')}`} aria-disabled={value <= min || undefined} {...minus}><IonIcon icon={removeOutline} aria-hidden="true" /></button>
      <output className="v6-stepper-item__value" aria-live="polite">{format ? format(value) : value}</output>
      <button type="button" className="v6-stepper-item__key" aria-label={`Augmenter ${label.toLocaleLowerCase('fr')}`} aria-disabled={value >= max || undefined} {...plus}><IonIcon icon={addOutline} aria-hidden="true" /></button>
    </div>
  </IonItem>
}

type TextareaProps = Omit<ComponentProps<typeof IonTextarea>, 'label' | 'onIonInput' | 'onChange' | 'value'>

/** Multi-line form row (objective, notes): fixed label on the left, grows with its text, 16 px (no iOS zoom). */
export function V6TextareaItem({ label, value, onChange, ...props }: TextareaProps & { label: string; value: string; onChange: (value: string) => void }) {
  return <IonItem className="v6-item v6-input-item">
    <IonTextarea {...props} className="v6-input v6-textarea" label={label} labelPlacement="fixed" autoGrow rows={1} value={value}
      onIonInput={event => onChange(String(event.detail.value ?? ''))} />
  </IonItem>
}
