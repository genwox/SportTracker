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

// A waiting update is applied only when the app is next opened.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode><AppProviders><AppRoutes /></AppProviders></StrictMode>,
)
