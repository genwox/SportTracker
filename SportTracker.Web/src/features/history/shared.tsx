/* eslint-disable react-refresh/only-export-components -- pure date helpers stay beside the history page shell */
import type { ReactNode } from 'react'
import { IonContent, IonPage, IonRouterLink } from '@ionic/react'
import { V5Card, V5Refresher } from '../../ui'
import { dayLabel, durationMinutes } from './data'
import './history.css'

export function Page({ children }: { children: ReactNode }) {
  return <IonPage><IonContent fullscreen><main className="history-page">{children}</main></IonContent></IonPage>
}
export const Refresh = V5Refresher
export function NavCard({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return <IonRouterLink routerLink={href} className={`history-link ${className}`}><V5Card>{children}</V5Card></IonRouterLink>
}
export function SectionTitle({ children }: { children: ReactNode }) { return <h2 className="history-section-title">{children}</h2> }
export const today = () => new Date().toLocaleDateString('sv-SE')
export const monday = (date: Date) => { const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()); start.setDate(start.getDate() - (start.getDay() + 6) % 7); return start }
export const dateKey = (date: Date) => date.toLocaleDateString('sv-SE')
export const detailDate = (date?: string) => date ? dayLabel(date, { weekday: 'long', day: 'numeric', month: 'long' }) : ''
export const durationLabel = (value?: string) => { const minutes = Math.floor(durationMinutes(value)); return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}` : `${minutes} min` }
