import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { IonButton, IonIcon, IonRefresher, IonRefresherContent, IonSkeletonText } from '@ionic/react'
import { arrowBackOutline, personCircleOutline } from 'ionicons/icons'
import './ui.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }

export function V5Button({ secondary = false, className = '', children, ...props }: ButtonProps) {
  return <button className={`v5-button ${secondary ? 'v5-button--secondary' : ''} ${className}`} {...props}>{children}</button>
}

export function V5Card({ className = '', children, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`v5-card ${className}`} {...props}>{children}</section>
}

export function V5Header({ title, subtitle, backHref, avatar = true }: {
  title: string; subtitle?: string; backHref?: string; avatar?: boolean
}) {
  return <header className="v5-header">
    {backHref && <IonButton fill="clear" routerLink={backHref} aria-label="Retour" className="v5-header__back"><IonIcon icon={arrowBackOutline} /></IonButton>}
    <div className="v5-header__copy"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    {avatar && <IonButton fill="clear" routerLink="/tabs/profile" aria-label="Profil" className="v5-header__avatar"><IonIcon icon={personCircleOutline} /></IonButton>}
  </header>
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
