import { useEffect, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { createRestTimer, remainingRestMs, restProgress } from '../../domain/restTimer'
import { formatElapsed, formatRest } from '../../domain/liveSession'
import { V6LiveMiniBar } from '../../ui'
import { draftStore } from './drafts'
import { owner } from './liveApi'
import { closeLiveSession, updateLiveTimer, useLiveSession, useNow } from './liveSession'

/**
 * Mini-bar « séance en cours » above the tab bar, for as long as the live draft exists.
 * Rendered as a child of IonTabs, in its bottom slot, right before V6TabBar.
 */
export function LiveMiniBar() {
  const history = useHistory()
  const session = useLiveSession()
  const mine = session && session.owner === owner() ? session : null
  const [found, setFound] = useState<string | null>(null)
  const storageKey = mine?.storageKey
  const draftOwner = mine?.owner
  useEffect(() => {
    if (!draftOwner || !storageKey) return
    let active = true
    const check = () => draftStore.get(draftOwner, storageKey).then(draft => {
      if (!active) return
      if (draft) setFound(storageKey); else closeLiveSession()
    }).catch(() => { /* Unreadable store: keep the bar hidden. */ })
    void check()
    window.addEventListener('sporttracker:draft-saved', check)
    return () => { active = false; window.removeEventListener('sporttracker:draft-saved', check) }
  }, [draftOwner, storageKey])
  const now = useNow(Boolean(mine), 1000)
  if (!mine || found !== mine.storageKey) return null
  const remaining = mine.timer.state === 'running' ? remainingRestMs(mine.timer, now) : 0
  const rest = remaining > 0 ? formatRest(remaining) : null
  const setNumber = mine.setsDone + 1
  const progress = rest ? 1 - restProgress(mine.timer, now) : mine.setsDone / Math.max(1, mine.targetSets)
  return <div slot="bottom" className="v6-live-bar-slot">
    <V6LiveMiniBar title={mine.exerciseName} detail={`Série ${setNumber}/${Math.max(mine.targetSets, setNumber)} · séance ${formatElapsed(now - mine.startedAt)}`}
      rest={rest} progress={progress} onOpen={() => history.push(mine.href)} onSkip={() => updateLiveTimer(mine.sessionKey, () => createRestTimer())} />
  </div>
}
