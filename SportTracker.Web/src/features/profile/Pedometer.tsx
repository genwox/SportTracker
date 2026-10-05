import { useEffect, useRef, useState } from 'react'
import { useIonViewWillLeave } from '@ionic/react'
import { getDraftOwner } from '../../api/tokenStore'
import { createStepDetector, detectStep } from '../../domain/stepCounter'
import { V6Button, V6ChartCard, V6Notice } from '../../ui'
import { localDate } from './healthData'

type MotionPermission = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }
type PendingSteps = { date: string; count: number }
const key = () => `st-pedometer:v1:${getDraftOwner() ?? 'anonymous'}`
function readPending(): PendingSteps {
  try {
    const saved = JSON.parse(localStorage.getItem(key()) ?? 'null') as PendingSteps | null
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved.date) && Number.isInteger(saved.count) && saved.count >= 0 && saved.count <= 200_000) return saved
  } catch { /* Start an empty counter. */ }
  return { date: localDate(), count: 0 }
}

export function Pedometer({ onUse }: { onUse: (steps: PendingSteps) => boolean }) {
  const [pending, setPending] = useState(readPending)
  const pendingRef = useRef(pending)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')
  const stopRef = useRef<() => void>(() => {})
  const mounted = useRef(true)
  const starting = useRef(false)
  const persist = (next: PendingSteps): boolean => {
    try { localStorage.setItem(key(), JSON.stringify(next)) }
    catch { setMessage('Stockage indisponible : garde cette page ouverte et reporte les pas avant de la quitter.'); return false }
    return true
  }
  const update = (next: PendingSteps) => { pendingRef.current = next; persist(next); setPending(next) }

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; stopRef.current() }
  }, [])
  useIonViewWillLeave(() => { stopRef.current(); mounted.current = false })

  const start = async () => {
    if (starting.current) return
    mounted.current = true
    starting.current = true
    setMessage('')
    try {
      if (!window.isSecureContext || typeof DeviceMotionEvent === 'undefined') {
        setMessage('Capteurs indisponibles dans ce navigateur. Tu peux saisir les pas indiqués dans Apple Santé.'); return
      }
      const permission = (DeviceMotionEvent as MotionPermission).requestPermission
      if (permission && await permission.call(DeviceMotionEvent) !== 'granted') {
        setMessage('Accès aux mouvements refusé. Autorise-le dans les réglages du site pour utiliser le podomètre.'); return
      }
      if (!mounted.current) return
      if (pendingRef.current.count > 0 && pendingRef.current.date !== localDate()) {
        setMessage('Reporte d’abord les pas de la marche précédente pour commencer aujourd’hui.'); return
      }
      if (!pendingRef.current.count) update({ date: localDate(), count: 0 })
      let detector = createStepDetector(), received = false
      const motion = (event: DeviceMotionEvent) => {
        if (document.hidden) return
        if (localDate() !== pendingRef.current.date) { stopRef.current(); setMessage('La journée a changé : reporte ces pas avant de relancer.'); return }
        const acceleration = event.accelerationIncludingGravity
        if (!acceleration || acceleration.x === null || acceleration.y === null || acceleration.z === null) return
        received = true
        const next = detectStep(detector, Math.hypot(acceleration.x, acceleration.y, acceleration.z), performance.now())
        detector = next.state
        if (next.step && pendingRef.current.count < 200_000) update({ ...pendingRef.current, count: pendingRef.current.count + 1 })
      }
      const hidden = () => { if (document.hidden) { stopRef.current(); setMessage('Marche mise en pause quand l’app est passée en arrière-plan.'); } }
      const timeout = window.setTimeout(() => {
        if (!received) { stopRef.current(); setMessage('Le navigateur ne fournit pas de données de mouvement. La saisie manuelle reste disponible.'); }
      }, 5000)
      stopRef.current = () => {
        window.removeEventListener('devicemotion', motion)
        document.removeEventListener('visibilitychange', hidden)
        window.clearTimeout(timeout)
        if (mounted.current) setRunning(false)
      }
      window.addEventListener('devicemotion', motion)
      document.addEventListener('visibilitychange', hidden)
      setRunning(true)
    } catch { setMessage('Impossible d’activer les capteurs. Réessaie depuis Safari sur ton téléphone.') }
    finally { starting.current = false }
  }

  return <V6ChartCard title="Podomètre" caption="Estimation">
    <p>Détecte les pas avec les mouvements du téléphone pendant une marche, app ouverte et écran allumé. La précision dépend du téléphone et de sa position.</p>
    <p className="health-counter" aria-live="polite"><strong>{pending.count.toLocaleString('fr-FR')}</strong> pas estimés{running ? ' · en cours' : ''}</p>
    {message && <V6Notice title={message} />}
    <V6Button variant="secondary" onClick={() => { if (running) stopRef.current(); else void start() }}>{running ? 'Arrêter la marche' : 'Démarrer le podomètre'}</V6Button>
    {pending.count > 0 && !running && <V6Button onClick={() => {
      if (onUse(pendingRef.current)) update({ date: localDate(), count: 0 })
    }}>Reporter ces pas dans la journée</V6Button>}
  </V6ChartCard>
}
