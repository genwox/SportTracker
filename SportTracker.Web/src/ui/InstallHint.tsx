import { useState } from 'react'

const dismissedKey = 'st-install-hint-dismissed'

function shouldShow() {
  try {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const installed = (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches
    return ios && !installed && localStorage.getItem(dismissedKey) !== '1'
  } catch { return false }
}

/** Safari cannot go full screen by itself: only the home-screen app can. Tell iPhone users how, once. */
export function InstallHint() {
  const [visible, setVisible] = useState(shouldShow)
  if (!visible) return null
  const close = () => { try { localStorage.setItem(dismissedKey, '1') } catch { /* private mode */ } setVisible(false) }
  return <aside className="v5-install-hint" role="note" aria-label="Installer l’application">
    <div><strong>Passe en plein écran</strong><p>Touche <span aria-label="Partager">⬆︎</span> Partager, puis «&nbsp;Sur l’écran d’accueil&nbsp;». SportTracker s’ouvrira comme une app, sans la barre de Safari.</p></div>
    <button type="button" onClick={close} aria-label="Masquer ce conseil">×</button>
  </aside>
}
