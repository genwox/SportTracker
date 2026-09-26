import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import {
  IonButton, IonContent, IonFooter, IonIcon, IonInput, IonItem, IonItemOption, IonItemOptions, IonItemSliding,
  IonList, IonModal, IonSegment, IonSegmentButton, IonSkeletonText, IonSpinner, IonTabBar, IonTabButton, IonToggle,
  IonToolbar,
} from '@ionic/react'
import { useQuery } from '@tanstack/react-query'
import { alertCircleOutline, checkmarkDoneOutline, chevronBackOutline, copyOutline, personOutline, trashOutline } from 'ionicons/icons'
import { getGoalEmail } from '../features/today/weeklyGoal'
import { backLabelFor, v6Tabs } from './v6Nav'
import './v6.css'

/* ── Header ──────────────────────────────────────────────────────────────── */

export function V6BackButton({ href, label = backLabelFor(href) }: { href: string; label?: string }) {
  return <IonButton fill="clear" routerLink={href} routerDirection="back" className="v6-back">
    <IonIcon slot="start" icon={chevronBackOutline} aria-hidden="true" /><span>{label}</span>
  </IonButton>
}

/** Initial of the signed-in account, shared with the weekly goal lookup (one cached /manage/info call). */
function useAccountInitial() {
  const query = useQuery({ queryKey: ['me', 'email'], queryFn: getGoalEmail, staleTime: Infinity })
  return query.data?.charAt(0).toUpperCase() || null
}

export function V6Avatar() {
  const initial = useAccountInitial()
  return <IonButton fill="clear" routerLink="/tabs/profile" aria-label="Profil" className="v6-avatar">
    <span className="v6-avatar__disc" aria-hidden="true">{initial ?? <IonIcon icon={personOutline} />}</span>
  </IonButton>
}

/**
 * Large title that scrolls away under a sticky 44 pt toolbar, like an iOS large-title navigation bar.
 * Once the large title has gone under the bar, the bar turns into the dark frosted strip validated on
 * iPhone (#315E5ECC, keeps the white status bar readable) and shows the small centred title.
 * Rendered inside the page's scrolling <main>: the bar sticks for the whole page.
 */
export function V6Header({ title, subtitle, backHref, backLabel, avatar = true, extra, action }: {
  title: string; subtitle?: string; backHref?: string; backLabel?: string; avatar?: boolean; extra?: ReactNode; action?: ReactNode
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const largeRef = useRef<HTMLDivElement>(null)
  const condensed = useCondensed(barRef, largeRef)
  const display = title.replace(/\//g, '/​')
  return <>
    <div ref={barRef} className={`v6-header-bar ${condensed ? 'is-condensed' : ''}`}>
      <div className="v6-header-bar__start">{backHref && <V6BackButton href={backHref} label={backLabel} />}</div>
      <div className="v6-header-bar__title" aria-hidden="true">{display}</div>
      <div className="v6-header-bar__end">{action}{avatar && <V6Avatar />}</div>
    </div>
    <header ref={largeRef} className="v6-header-large">
      <h1 className={title.length > 14 ? 'is-long' : undefined}>{display}</h1>
      {subtitle && <p>{subtitle}</p>}
      {extra}
    </header>
  </>
}

/** True once the large title has scrolled under the sticky bar. */
function useCondensed(barRef: React.RefObject<HTMLElement | null>, largeRef: React.RefObject<HTMLElement | null>) {
  const [condensed, setCondensed] = useState(false)
  useEffect(() => {
    const content = barRef.current?.closest('ion-content') as HTMLIonContentElement | null
    let scroller: HTMLElement | undefined
    let frame = 0
    const measure = () => {
      frame = 0
      const bar = barRef.current?.getBoundingClientRect()
      const large = largeRef.current?.querySelector('h1')?.getBoundingClientRect()
      if (!bar || !large || (scroller?.scrollTop ?? 0) <= 0) { setCondensed(false); return }
      setCondensed(large.bottom <= bar.bottom + 2)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure) }
    let cancelled = false
    void content?.getScrollElement?.().then(element => {
      if (cancelled) return
      scroller = element
      element.addEventListener('scroll', onScroll, { passive: true })
      measure()
    })
    return () => { cancelled = true; if (frame) cancelAnimationFrame(frame); scroller?.removeEventListener('scroll', onScroll) }
  }, [barRef, largeRef])
  return condensed
}

/* ── Tab bar ─────────────────────────────────────────────────────────────── */

/** Three translucent tabs; the active one gets the citron pill behind its icon. Must be a direct child of IonTabs. */
export function V6TabBar() {
  return <IonTabBar slot="bottom" translucent className="v6-tab-bar">
    {v6Tabs.map(({ tab, href, label, icon }) =>
      <IonTabButton key={tab} tab={tab} href={href} aria-label={label}>
        <span className="v6-tab-bar__pill" aria-hidden="true"><IonIcon icon={icon} /></span>
        <span className="v6-tab-bar__label">{label}</span>
      </IonTabButton>)}
  </IonTabBar>
}

/* ── Segmented control ───────────────────────────────────────────────────── */

export type V6SegmentOption<T extends string> = { value: T; label: string }

/** iOS segmented control (2 to 5 options). The 44 pt touch zone is the button; the dark pill is inset by 4 pt. */
export function V6Segment<T extends string>({ value, options, onChange, label }: {
  value: T; options: readonly V6SegmentOption<NoInfer<T>>[]; onChange: (value: NoInfer<T>) => void; label: string
}) {
  return <IonSegment value={value} aria-label={label} className="v6-segment"
    onIonChange={event => { if (event.detail.value != null) onChange(String(event.detail.value) as T) }}>
    {options.map(option => <IonSegmentButton key={option.value} value={option.value}><span>{option.label}</span></IonSegmentButton>)}
  </IonSegment>
}

/* ── Chips ───────────────────────────────────────────────────────────────── */

/** Filter chip: a 32 pt pill inside a 44 pt button, so the touch target stays at iOS size. */
export function V6Chip({ selected = false, onClick, children }: { selected?: boolean; onClick?: () => void; children: ReactNode }) {
  return <button type="button" className={`v6-chip ${selected ? 'is-selected' : ''}`} aria-pressed={selected} onClick={onClick}><span>{children}</span></button>
}

export function V6ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="v6-chip-row" role="group" aria-label={label}>{children}</div>
}

/* ── Toggle ──────────────────────────────────────────────────────────────── */

export function V6Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  return <IonToggle className="v6-toggle" checked={checked} disabled={disabled} aria-label={label} onIonChange={event => onChange(event.detail.checked)} />
}

/* ── Inset grouped list ──────────────────────────────────────────────────── */

export function V6List({ header, note, children, className = '' }: { header?: string; note?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`v6-list-group ${className}`}>
    {header && <h2 className="v6-list-group__header">{header}</h2>}
    <IonList inset lines="inset" className="v6-list">{children}</IonList>
    {note && <p className="v6-list-group__note">{note}</p>}
  </section>
}

type ItemNav = { routerLink?: string; onClick?: () => void }

/** 52 pt row: optional icon tile, title + detail, trailing value, toggle or chevron. */
export function V6Item({ icon, title, detail, value, end, routerLink, onClick, error }: ItemNav & {
  icon?: string; title: ReactNode; detail?: ReactNode; value?: ReactNode; end?: ReactNode; error?: boolean
}) {
  const navigates = Boolean(routerLink || onClick)
  return <IonItem className="v6-item" button={navigates} detail={navigates && !end} routerLink={routerLink} onClick={onClick}>
    {icon && <span slot="start" className="v6-item__tile" aria-hidden="true"><IonIcon icon={icon} /></span>}
    <div className="v6-item__text"><strong>{title}</strong>{detail && <small>{detail}</small>}</div>
    {value != null && <span slot="end" className="v6-item__value">{value}</span>}
    {error && <IonIcon slot="end" icon={alertCircleOutline} className="v6-item__alert" aria-label="Erreur" />}
    {end && <div slot="end" className="v6-item__end">{end}</div>}
  </IonItem>
}

type InputProps = Omit<ComponentProps<typeof IonInput>, 'label' | 'onIonInput' | 'onChange' | 'value' | 'errorText'>

/** Form row: fixed label on the left, 16 px field (no iOS zoom), clear button, error in ink under the field. */
export function V6InputItem({ label, value, onChange, error, helper, ...props }: InputProps & {
  label: string; value: string; onChange: (value: string) => void; error?: string | null; helper?: string
}) {
  return <IonItem className="v6-item v6-input-item">
    <IonInput {...props} className={`v6-input ${error ? 'ion-invalid ion-touched' : ''}`} label={label} labelPlacement="fixed"
      clearInput value={value} errorText={error ?? undefined} helperText={helper}
      onIonInput={event => onChange(String(event.detail.value ?? ''))} />
  </IonItem>
}

/* ── Sliding row ─────────────────────────────────────────────────────────── */

/**
 * Swipe left for Supprimer (system red, full swipe triggers it), swipe right for Dupliquer / Terminer.
 * The callbacks decide on confirmation (use useV6ActionSheet for a session).
 */
export function V6SlidingRow({ children, onDelete, deleteLabel = 'Supprimer', onDuplicate, onFinish, disabled }: {
  children: ReactNode; onDelete?: () => void; deleteLabel?: string; onDuplicate?: () => void; onFinish?: () => void; disabled?: boolean
}) {
  const ref = useRef<HTMLIonItemSlidingElement>(null)
  const run = (action?: () => void) => { void ref.current?.close(); action?.() }
  return <IonItemSliding ref={ref} className="v6-sliding" disabled={disabled}>
    {(onDuplicate || onFinish) && <IonItemOptions side="start">
      {onDuplicate && <IonItemOption className="v6-sliding__duplicate" onClick={() => run(onDuplicate)}><IonIcon slot="top" icon={copyOutline} />Dupliquer</IonItemOption>}
      {onFinish && <IonItemOption className="v6-sliding__finish" onClick={() => run(onFinish)}><IonIcon slot="top" icon={checkmarkDoneOutline} />Terminer</IonItemOption>}
    </IonItemOptions>}
    <IonItem className="v6-sliding__row" lines="none">{children}</IonItem>
    {onDelete && <IonItemOptions side="end" onIonSwipe={() => run(onDelete)}>
      <IonItemOption color="danger" expandable className="v6-sliding__delete" onClick={() => run(onDelete)}><IonIcon slot="top" icon={trashOutline} />{deleteLabel}</IonItemOption>
    </IonItemOptions>}
  </IonItemSliding>
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */

type V6ButtonProps = Omit<ComponentProps<typeof IonButton>, 'fill' | 'expand'> & {
  variant?: 'primary' | 'secondary' | 'icon' | 'text'; loading?: boolean; icon?: string
}

/** Kit button: primary (citron), secondary (white veil), 44 pt icon, or text. Pressed = scale 0.97. */
export function V6Button({ variant = 'primary', loading = false, icon, disabled, className = '', children, ...props }: V6ButtonProps) {
  const block = variant === 'primary' || variant === 'secondary'
  return <IonButton {...props} fill="clear" expand={block ? 'block' : undefined} disabled={disabled || loading}
    className={`v6-button v6-button--${variant} ${loading ? 'is-loading' : ''} ${className}`} aria-busy={loading || undefined}>
    {loading ? <IonSpinner name="crescent" slot={children ? 'start' : undefined} aria-hidden="true" /> : icon && <IonIcon slot={children ? 'start' : 'icon-only'} icon={icon} aria-hidden="true" />}
    {children}
  </IonButton>
}

/** Action n° 1 stuck to the bottom of the page (1 or 2 buttons), above the tab bar or the home indicator. Place it after IonContent. */
export function V6StickyAction({ children }: { children: ReactNode }) {
  return <IonFooter translucent className="v6-sticky"><IonToolbar><div className="v6-sticky__row">{children}</div></IonToolbar></IonFooter>
}

/* ── Sheet ───────────────────────────────────────────────────────────────── */

/** Sheet with detents (25 / 50 / 100 %): drag the sheet or tap its handle to change detent (iOS grabber), 40 % nav-ink backdrop, « Fermer » text button. */
export function V6Sheet({ isOpen, onDismiss, title, breakpoints = [0, 0.5, 1], initialBreakpoint = 0.5, closeLabel = 'Fermer', children }: {
  isOpen: boolean; onDismiss: () => void; title: string; breakpoints?: number[]; initialBreakpoint?: number; closeLabel?: string; children: ReactNode
}) {
  const modal = useRef<HTMLIonModalElement>(null)
  return <IonModal ref={modal} isOpen={isOpen} onDidDismiss={onDismiss} breakpoints={breakpoints} initialBreakpoint={initialBreakpoint}
    backdropBreakpoint={Math.min(...breakpoints.filter(b => b > 0))} handle handleBehavior="cycle" className="v6-sheet">
    <IonContent className="v6-sheet__content">
      <header className="v6-sheet__header"><h2>{title}</h2><V6Button variant="text" onClick={() => { void modal.current?.dismiss() }}>{closeLabel}</V6Button></header>
      <div className="v6-sheet__body">{children}</div>
    </IonContent>
  </IonModal>
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */

/** Card skeletons shown only while the cache is empty (never a full-page spinner). */
export function V6Skeleton({ count = 2 }: { count?: number }) {
  return <div className="v6-skeleton" role="status" aria-label="Chargement en cours">
    <span className="v6-visually-hidden">Chargement en cours…</span>
    {Array.from({ length: count }, (_, index) => <div className="v6-skeleton__card" key={index} aria-hidden="true">
      <IonSkeletonText animated className="v6-skeleton__bar v6-skeleton__bar--title" />
      <IonSkeletonText animated className="v6-skeleton__bar" />
      <IonSkeletonText animated className="v6-skeleton__bar v6-skeleton__bar--short" />
    </div>)}
  </div>
}
