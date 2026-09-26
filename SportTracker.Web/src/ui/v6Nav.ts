import { iosTransitionAnimation, type Animation, type TransitionOptions } from '@ionic/core/components'
import { homeOutline, readerOutline, statsChartOutline } from 'ionicons/icons'

/* ── Transitions ─────────────────────────────────────────────────────────── */

/** Ionic's iOS push, shortened from 540 ms to the 350 ms of the V6 design (same curve, same −30 % parallax). */
export function v6NavAnimation(baseEl: HTMLElement, opts: TransitionOptions): Animation {
  return iosTransitionAnimation(baseEl, { ...opts, duration: 350 })
}

const backLabels: [RegExp, string][] = [
  [/^\/tabs\/today\/?$/, 'Aujourd’hui'],
  [/^\/tabs\/programs\/?$/, 'Carnets'],
  [/^\/tabs\/programs\/[^/]+\/?$/, 'Carnet'],
  [/^\/tabs\/programs\/[^/]+\/sessions\/[^/]+\/?$/, 'Séance'],
  [/^\/tabs\/history\/cardio\/?$/, 'Cardio'],
  [/^\/tabs\/history\/cardio\/[^/]+\/?$/, 'Sortie'],
  [/^\/tabs\/history\/workouts\/?$/, 'Séances'],
  [/^\/tabs\/history\/workouts\/[^/]+\/?$/, 'Séance'],
  [/^\/tabs\/history\/progress\/?$/, 'Progrès'],
  [/^\/tabs\/history\/?$/, 'Historique'],
  [/^\/tabs\/profile\/?$/, 'Profil'],
]
/** Label of the page a back button returns to, as iOS shows it next to the chevron. */
export function backLabelFor(href: string): string {
  return backLabels.find(([pattern]) => pattern.test(href))?.[1] ?? 'Retour'
}

export const v6Tabs = [
  { tab: 'today', href: '/tabs/today', label: 'Aujourd’hui', icon: homeOutline },
  { tab: 'programs', href: '/tabs/programs', label: 'Programmes', icon: readerOutline },
  { tab: 'history', href: '/tabs/history', label: 'Historique', icon: statsChartOutline },
] as const

