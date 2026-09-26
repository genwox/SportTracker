import { useEffect, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'
import { IonButton, IonContent, IonIcon, IonModal, IonRefresher, IonRefresherContent, IonSkeletonText } from '@ionic/react'
import { arrowBackOutline } from 'ionicons/icons'
import './ui.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }

export function V5Button({ secondary = false, className = '', children, ...props }: ButtonProps) {
  return <button className={`v5-button ${secondary ? 'v5-button--secondary' : ''} ${className}`} {...props}>{children}</button>
}

export function V5Card({ className = '', children, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`v5-card ${className}`} {...props}>{children}</section>
}

export function V5Header({ title, subtitle, backHref, avatar = true, extra, action }: {
  title: string; subtitle?: string; backHref?: string; avatar?: boolean; extra?: ReactNode; action?: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const scrolled = useContentScrolled(ref)
  return <header ref={ref} className={`v5-header ${scrolled ? 'is-scrolled' : ''}`}>
    {backHref && <IonButton fill="clear" routerLink={backHref} routerDirection="back" aria-label="Retour" className="v5-header__back"><IonIcon icon={arrowBackOutline} /></IonButton>}
    <div className="v5-header__copy"><h1 className={title.length > 14 ? 'is-long' : undefined}>{title.replace(/\//g, '/\u200b')}</h1>{subtitle && <p>{subtitle}</p>}{extra}</div>
    {action}
    {avatar && <IonButton fill="clear" routerLink="/tabs/profile" aria-label="Profil" className="v5-header__avatar"><span className="v5-tab-icon" style={{ '--v5-icon': 'url(/icons/047-user.svg)' } as React.CSSProperties} aria-hidden="true" /></IonButton>}
  </header>
}

/** True once the surrounding IonContent has scrolled, so the sticky header can turn into a frosted bar. */
function useContentScrolled(ref: React.RefObject<HTMLElement | null>) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const content = ref.current?.closest('ion-content') as HTMLIonContentElement | null
    let scroller: HTMLElement | undefined
    const onScroll = () => setScrolled((scroller?.scrollTop ?? 0) > 8)
    let cancelled = false
    void content?.getScrollElement?.().then(element => { if (cancelled) return; scroller = element; element.addEventListener('scroll', onScroll, { passive: true }); onScroll() })
    return () => { cancelled = true; scroller?.removeEventListener('scroll', onScroll) }
  }, [ref])
  return scrolled
}

export function V5State({ title, message, error = false, onRetry, children }: {
  title: string; message?: string; error?: boolean; onRetry?: () => void; children?: ReactNode
}) {
  return <V5Card className={`v5-state ${error ? 'v5-state--error' : ''}`} role={error ? 'alert' : 'status'}>
    <strong>{title}</strong>{message && <p>{message}</p>}
    {onRetry && <V5Button onClick={onRetry}>Réessayer</V5Button>}{children}
  </V5Card>
}

export function V5Refresher({ onRefresh }: { onRefresh: () => Promise<unknown> }) {
  return <IonRefresher slot="fixed" onIonRefresh={async event => { try { await onRefresh() } finally { event.detail.complete() } }}><IonRefresherContent /></IonRefresher>
}

export function V5Loading() {
  return <div className="v5-loading" role="status" aria-label="Chargement en cours">
    <span className="v5-visually-hidden">Chargement en cours…</span>
    <IonSkeletonText animated className="v5-loading__card" />
    <IonSkeletonText animated className="v5-loading__card" />
  </div>
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
