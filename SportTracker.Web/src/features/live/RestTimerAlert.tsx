import { useEffect } from 'react'
import { getDraftOwner } from '../../api/tokenStore'
import { refreshRestTimer } from '../../domain/restTimer'
import { isRestSoundEnabled } from '../profile/preferences'
import { readLiveSession, updateLiveTimer } from './liveSession'
import { isRestDue, isRestSoundTimely, playRestSound, unlockRestAudio } from './restSound'

/** One monitor for the whole app, including the live route and all tabs. */
export function RestTimerAlert() {
  useEffect(() => {
    const unlock = () => { if (isRestSoundEnabled()) unlockRestAudio() }
    const tick = () => {
      const session = readLiveSession(), now = Date.now()
      if (!session || session.owner !== getDraftOwner() || !isRestDue(session.timer, now)) return
      // Persist completion before playback: no duplicate on navigation/reload/StrictMode.
      updateLiveTimer(session.sessionKey, timer => refreshRestTimer(timer, now))
      if (!document.hidden && isRestSoundEnabled() && isRestSoundTimely(session.timer, now)) playRestSound()
    }
    window.addEventListener('pointerdown', unlock, { capture: true })
    window.addEventListener('keydown', unlock, { capture: true })
    document.addEventListener('visibilitychange', tick)
    const interval = window.setInterval(tick, 250)
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true })
      window.removeEventListener('keydown', unlock, { capture: true })
      document.removeEventListener('visibilitychange', tick)
      window.clearInterval(interval)
    }
  }, [])
  return null
}
