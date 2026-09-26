import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { IonIcon, IonSearchbar } from '@ionic/react'
import { addOutline, backspaceOutline, barbellOutline, checkmarkOutline, playSkipForwardOutline, removeOutline, timerOutline } from 'ionicons/icons'
import { keypadNumber, keypadText, pressKey, type KeypadKey } from '../domain/keypad'
import { usePressRepeat } from './v6Hooks'
import { V6SlidingRow } from './v6'
import './v6Live.css'

/* ── Stepper ─────────────────────────────────────────────────────────────── */

/** Big − / + stepper (52 pt keys, + in citron). Touching the value opens the keypad sheet. */
export function V6Stepper({ label, value, unit, onStep, onOpenPad, decreaseLabel, increaseLabel, valueLabel, atMin = false }: {
  label: string; value: string; unit: string; onStep: (direction: -1 | 1) => void; onOpenPad: () => void
  decreaseLabel: string; increaseLabel: string; valueLabel: string; atMin?: boolean
}) {
  const minus = usePressRepeat(() => onStep(-1))
  const plus = usePressRepeat(() => onStep(1))
  return <div className="v6-stepper" role="group" aria-label={label}>
    <span className="v6-stepper__label">{label}</span>
    <div className="v6-stepper__row">
      <button type="button" className="v6-stepper__key" aria-label={decreaseLabel} aria-disabled={atMin || undefined} {...minus}><IonIcon icon={removeOutline} aria-hidden="true" /></button>
      <button type="button" className="v6-stepper__value" aria-label={valueLabel} onClick={onOpenPad}><strong>{value}</strong><small>{unit}</small></button>
      <button type="button" className="v6-stepper__key v6-stepper__key--plus" aria-label={increaseLabel} {...plus}><IonIcon icon={addOutline} aria-hidden="true" /></button>
    </div>
  </div>
}

/* ── Keypad ──────────────────────────────────────────────────────────────── */

export type V6KeypadField = { id: string; label: string; value: number; decimals: number }

const keys: KeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'back']

/**
 * Home-made numeric keypad (never the system keyboard: the fields are inputmode="none" and read-only).
 * The first key after choosing a field replaces its value; « , » for decimals, ⌫ to erase.
 * A hardware keyboard works too (digits, comma or dot, backspace, Entrée).
 */
export function V6Keypad({ fields, active, onActiveChange, onChange, submitLabel, onSubmit, submitDisabled }: {
  fields: V6KeypadField[]; active: string; onActiveChange: (id: string) => void; onChange: (id: string, value: number) => void
  submitLabel: string; onSubmit: () => void; submitDisabled?: boolean
}) {
  const [typing, setTyping] = useState<{ id: string; text: string } | null>(null)
  const field = fields.find(item => item.id === active) ?? fields[0]
  const text = (item: V6KeypadField) => typing?.id === item.id ? typing.text : keypadText(item.value, item.decimals)
  const press = (key: KeypadKey) => {
    const fresh = typing?.id !== field.id
    const next = pressKey(text(field), key, field.decimals, fresh)
    setTyping({ id: field.id, text: next })
    onChange(field.id, keypadNumber(next))
  }
  const choose = (id: string) => { if (id !== active) { setTyping(null); onActiveChange(id) } }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const key = /^[0-9]$/.test(event.key) ? event.key as KeypadKey : event.key === ',' || event.key === '.' ? ',' : event.key === 'Backspace' ? 'back' : null
    if (key) { event.preventDefault(); press(key) } else if (event.key === 'Enter' && !submitDisabled) { event.preventDefault(); onSubmit() }
  }
  return <div className="v6-keypad">
    <div className="v6-keypad__fields">
      {fields.map(item => <label key={item.id} className={`v6-keypad__field ${item.id === field.id ? 'is-active' : ''}`}>
        <span>{item.label}</span>
        <input readOnly inputMode="none" value={text(item)} aria-label={item.label} onFocus={() => choose(item.id)} onClick={() => choose(item.id)} onKeyDown={onKeyDown} />
      </label>)}
    </div>
    <div className="v6-keypad__keys" role="group" aria-label="Pavé numérique">
      {keys.map(key => <button key={key} type="button" className={`v6-keypad__key ${key === 'back' ? 'v6-keypad__key--back' : ''}`}
        aria-label={key === 'back' ? 'Effacer' : key === ',' ? 'Virgule' : key} disabled={key === ',' && !field.decimals}
        onPointerDown={event => event.preventDefault()} onClick={() => press(key)}>
        {key === 'back' ? <IonIcon icon={backspaceOutline} aria-hidden="true" /> : key}
      </button>)}
    </div>
    <button type="button" className="v6-keypad__submit" onClick={onSubmit} disabled={submitDisabled}>{submitLabel}</button>
  </div>
}

/* ── Set row ─────────────────────────────────────────────────────────────── */

/**
 * One set of the live list. The next set shows an empty circle: tapping it validates the set
 * (the row fills in citron, a check pops in, the rest timer starts). A validated set is removed
 * by swiping it to the left.
 */
export function V6SetRow({ number, done, children, onValidate, validateLabel, onDelete, busy = false }: {
  number: number; done: boolean; children: ReactNode; onValidate?: () => void; validateLabel?: string; onDelete?: () => void; busy?: boolean
}) {
  return <V6SlidingRow className={`v6-set-row ${done ? 'is-done' : 'is-next'}`} disabled={!done} onDelete={done ? onDelete : undefined}
    deleteAriaLabel={`Supprimer la série ${number}`}>
    <div className="v6-set-row__content">
      <span className="v6-set-row__number">{number}</span>
      <div className="v6-set-row__body">{children}</div>
      {done
        ? <span className="v6-set-row__circle is-checked" role="img" aria-label={`Série ${number} validée`}><IonIcon icon={checkmarkOutline} aria-hidden="true" /></span>
        : <button type="button" className="v6-set-row__circle" aria-label={validateLabel ?? `Valider la série ${number}`} disabled={busy} onClick={onValidate}><span aria-hidden="true" /></button>}
    </div>
  </V6SlidingRow>
}

/* ── Wheel picker ────────────────────────────────────────────────────────── */

export type V6WheelColumn = { id: string; label: string; unit: string; value: number; options: { value: number; text: string }[] }

const WHEEL_ROW = 36

/** One wheel column: native momentum scroll snapped to 36 pt rows; the value is read once the wheel stops. */
function WheelColumn({ column, onChange }: { column: V6WheelColumn; onChange: (id: string, value: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const settle = useRef(0)
  const index = Math.max(0, column.options.findIndex(option => option.value === column.value))
  // Align on the value, also once the wheel gets laid out (a page or sheet mounted hidden has no height yet).
  useEffect(() => {
    const scroller = ref.current
    if (!scroller) return
    const align = () => { if (scroller.clientHeight && Math.round(scroller.scrollTop / WHEEL_ROW) !== index) scroller.scrollTop = index * WHEEL_ROW }
    align()
    const observer = new ResizeObserver(align)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [index])
  useEffect(() => () => window.clearTimeout(settle.current), [])
  const pick = (next: number) => {
    const option = column.options[Math.min(column.options.length - 1, Math.max(0, next))]
    if (option && option.value !== column.value) onChange(column.id, option.value)
  }
  const onScroll = () => {
    window.clearTimeout(settle.current)
    if (!ref.current?.clientHeight) return
    settle.current = window.setTimeout(() => { if (ref.current) pick(Math.round(ref.current.scrollTop / WHEEL_ROW)) }, 120)
  }
  const scrollTo = (next: number) => ref.current?.scrollTo({ top: next * WHEEL_ROW, behavior: 'smooth' })
  return <div className="v6-wheel__column">
    <div ref={ref} className="v6-wheel__scroller" role="listbox" aria-label={column.label} tabIndex={0} onScroll={onScroll}
      onKeyDown={event => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); pick(index + (event.key === 'ArrowUp' ? -1 : 1)) } }}>
      <div className="v6-wheel__spacer" aria-hidden="true" />
      {column.options.map((option, position) => <div key={option.value} role="option" aria-selected={position === index}
        className={`v6-wheel__option ${position === index ? 'is-selected' : ''}`} onClick={() => scrollTo(position)}>{option.text}</div>)}
      <div className="v6-wheel__spacer" aria-hidden="true" />
    </div>
    <span className="v6-wheel__unit" aria-hidden="true">{column.unit}</span>
  </div>
}

/** iOS-style wheel (min / s…): three visible rows, a selection band behind the middle one, faded edges. */
export function V6WheelPicker({ label, columns, onChange }: { label: string; columns: V6WheelColumn[]; onChange: (id: string, value: number) => void }) {
  return <div className="v6-wheel" role="group" aria-label={label}>
    <span className="v6-wheel__band" aria-hidden="true" />
    {columns.map(column => <WheelColumn key={column.id} column={column} onChange={onChange} />)}
  </div>
}

/* ── Search bar ──────────────────────────────────────────────────────────── */

/** iOS search field: « Annuler » while focused, results filtered 250 ms after the last key. 16 px text (no zoom). */
export function V6Searchbar({ value, onChange, placeholder = 'Rechercher' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <IonSearchbar className="v6-searchbar" value={value} placeholder={placeholder} showCancelButton="focus" cancelButtonText="Annuler"
    debounce={250} enterkeyhint="search" onIonInput={event => onChange(String(event.detail.value ?? ''))} onIonCancel={() => onChange('')} />
}

/* ── Live mini-bar ───────────────────────────────────────────────────────── */

/**
 * « Séance en cours » bar above the tab bar (music-player style): exercise, set and session chrono,
 * rest countdown. A tap reopens the live workout; ⏭ skips the rest.
 */
export function V6LiveMiniBar({ title, detail, rest, progress, onOpen, onSkip }: {
  title: string; detail: string; rest?: string | null; progress: number; onOpen: () => void; onSkip?: () => void
}) {
  return <div className="v6-live-bar">
    <button type="button" className="v6-live-bar__open" onClick={onOpen} aria-label={`Rouvrir la séance en cours : ${title}, ${detail}${rest ? `, repos ${rest}` : ''}`}>
      <span className="v6-live-bar__tile" aria-hidden="true"><IonIcon icon={barbellOutline} /></span>
      <span className="v6-live-bar__text"><strong>{title}</strong><small>{detail}</small></span>
      {rest && <span className="v6-live-bar__rest" aria-hidden="true"><IonIcon icon={timerOutline} />{rest}</span>}
    </button>
    {rest && onSkip && <button type="button" className="v6-live-bar__skip" onClick={onSkip} aria-label="Passer le repos"><IonIcon icon={playSkipForwardOutline} aria-hidden="true" /></button>}
    <span className="v6-live-bar__progress" aria-hidden="true"><i style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }} /></span>
  </div>
}
