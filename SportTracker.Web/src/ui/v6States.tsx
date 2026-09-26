import type { ReactNode } from 'react'
import { IonIcon, IonSkeletonText } from '@ionic/react'
import { alertCircleOutline, informationCircleOutline } from 'ionicons/icons'
import './v6States.css'

/* V6 kit · lot 5 (connexion, profil, états): inline states, status pill, state page, loading skeletons. */

/**
 * Inline state inside a page (V6 · 25): icon, title, message and a short status line.
 * `alert` keeps the V5 identity for errors: nav-ink contour and icon, never red.
 */
export function V6Notice({ tone = 'info', icon, title, message, meta, children }: {
  tone?: 'info' | 'alert'; icon?: string; title: ReactNode; message?: ReactNode; meta?: ReactNode; children?: ReactNode
}) {
  return <section className={`v6-notice v6-notice--${tone}`} role={tone === 'alert' ? 'alert' : 'status'}>
    <header className="v6-notice__head"><IonIcon icon={icon ?? (tone === 'alert' ? alertCircleOutline : informationCircleOutline)} aria-hidden="true" /><strong>{title}</strong></header>
    {message && <p className="v6-notice__message">{message}</p>}
    {meta && <p className="v6-notice__meta">{meta}</p>}
    {children}
  </section>
}

/** One status line in a glass pill: sync state, « Brouillon enregistré · 12:04 », « Données locales intactes ». */
export function V6StatusPill({ icon, children, end, live = true }: { icon: string; children: ReactNode; end?: ReactNode; live?: boolean }) {
  return <p className="v6-status-pill" role={live ? 'status' : undefined}>
    <IonIcon icon={icon} aria-hidden="true" /><span className="v6-status-pill__label">{children}</span>{end}
  </p>
}

/** Native state page without a header (404): glass icon tile, large Foruner title, text, then its actions. */
export function V6StatePage({ icon, title, message, children }: { icon: string; title: string; message: ReactNode; children?: ReactNode }) {
  return <section className="v6-state-page">
    <span className="v6-state-page__tile" aria-hidden="true"><IonIcon icon={icon} /></span>
    <h1>{title}</h1>
    <p className="v6-state-page__message">{message}</p>
    <div className="v6-state-page__actions">{children}</div>
  </section>
}

/** Row of small skeleton tiles (stats), same size as V6StatTiles: the layout does not jump when the data lands. */
export function V6SkeletonTiles({ count = 3 }: { count?: number }) {
  return <div className="v6-skeleton-tiles" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => <div key={index} className="v6-skeleton-tiles__tile">
      <IonSkeletonText animated className="v6-skeleton__bar v6-skeleton__bar--title" />
      <IonSkeletonText animated className="v6-skeleton__bar" />
      <IonSkeletonText animated className="v6-skeleton__bar v6-skeleton__bar--short" />
    </div>)}
  </div>
}
