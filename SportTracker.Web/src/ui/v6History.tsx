import type { ReactNode } from 'react'
import { IonIcon } from '@ionic/react'
import { trophyOutline } from 'ionicons/icons'
import './v6History.css'

/* V6 kit · lot 4 (Historique, Progrès, cardio): V5 charts in V6 glass cards, stat tiles, record banner. */

/** Glass card with a Foruner title on the left and a short caption on the right (« 6 sem. », « kg × reps »). */
export function V6ChartCard({ title, caption, children, className = '' }: { title: string; caption?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`v6-chart-card ${className}`}>
    <header className="v6-chart-card__head"><h2>{title}</h2>{caption && <span>{caption}</span>}</header>
    {children}
  </section>
}

export type V6Bar = { key: string; label: string; value: number; highlight?: boolean; title?: string; color?: string }

/**
 * V5 bar chart: dark bars, the highlighted one in citron (current week, record, this outing).
 * A value of 0 draws a 4 pt stub, like the empty days of the design. Scrolls sideways past ~8 bars.
 */
export function V6Bars({ bars, label, showValues = false, compact = false }: { bars: V6Bar[]; label: string; showValues?: boolean; compact?: boolean }) {
  const max = Math.max(0, ...bars.map(bar => bar.value))
  return <div className={`v6-bars ${compact ? 'v6-bars--compact' : ''}`} role="img" aria-label={label}>
    {bars.map(bar => <div key={bar.key} className="v6-bars__column" title={bar.title}>
      {showValues && <strong>{bar.value > 0 ? bar.value : ''}</strong>}
      <span className="v6-bars__track"><i className={bar.highlight ? 'is-highlight' : bar.value <= 0 ? 'is-empty' : undefined}
        style={{ height: bar.value <= 0 || max <= 0 ? undefined : `${Math.max(8, bar.value / max * 100)}%`, background: bar.color }} /></span>
      <small>{bar.label}</small>
    </div>)}
  </div>
}

/** Row of 2 or 3 glass tiles: big Foruner value (its unit smaller, so « 38,7 km » fits a third of the width), small label under it. */
export function V6StatTiles({ tiles }: { tiles: { value: ReactNode; unit?: string; label: string }[] }) {
  return <div className={`v6-stat-tiles v6-stat-tiles--${tiles.length}`}>
    {tiles.map(tile => <div key={tile.label} className="v6-stat-tile"><strong>{tile.value}{tile.unit && <small> {tile.unit}</small>}</strong><span>{tile.label}</span></div>)}
  </div>
}

/** V5 record banner: trophy tile, title, detail, citron « PR » badge. */
export function V6RecordBanner({ title, detail }: { title: string; detail?: ReactNode }) {
  return <section className="v6-record-banner" role="note">
    <span className="v6-record-banner__icon" aria-hidden="true"><IonIcon icon={trophyOutline} /></span>
    <span className="v6-record-banner__text"><strong>{title}</strong>{detail && <small>{detail}</small>}</span>
    <span className="v6-record-banner__badge">PR</span>
  </section>
}
