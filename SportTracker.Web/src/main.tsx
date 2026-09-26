import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'
import '@ionic/react/css/padding.css'
import '@ionic/react/css/float-elements.css'
import '@ionic/react/css/text-alignment.css'
import '@ionic/react/css/text-transformation.css'
import '@ionic/react/css/flex-utils.css'
import '@ionic/react/css/display.css'
import './app/theme.css'
import { AppProviders } from './app/providers'
import { AppRoutes } from './app/routes'
import { hasLiveSession } from './features/live/liveSession'

// Safari on iOS can still pinch-zoom despite the viewport meta; its proprietary gesture events let us refuse it.
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, event => event.preventDefault(), { passive: false })

// A new version is applied when the app is (re)opened, never in the middle of a live workout
// (on /live, or browsing the tabs while the « séance en cours » mini-bar is up).
// Without this, `registerType: 'prompt'` left the new service worker waiting forever and the
// precached old index.html kept being served (Safari even installed it on the home screen).
const launchedAt = Date.now()
const isLive = () => location.pathname === '/live' || location.pathname.startsWith('/live/') || hasLiveSession()
let updateReady = false
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateReady = true
    if (Date.now() - launchedAt < 15_000 && !isLive()) void updateSW(true)
  },
  onRegisteredSW(_url, registration) {
    // iOS resumes a home-screen app instead of relaunching it: look for a new version on each return.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || isLive()) return
      if (updateReady) void updateSW(true)
      else void registration?.update()
    })
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode><AppProviders><AppRoutes /></AppProviders></StrictMode>,
)
