import { useEffect, useRef, useState } from 'react'
import { useIonRouter } from '@ionic/react'
import type { MouseEvent, PointerEvent } from 'react'
import { createLongPress } from '../domain/longPress'
import { createPressRepeat } from '../domain/pressRepeat'

/* Pointer hooks of the V6 kit (kept apart from the components for React Fast Refresh). */

/** Pointer handlers of a − / + button: tap = one step on release, hold = step after 400 ms then every 80 ms. */
export function usePressRepeat(step: () => void) {
  const stepRef = useRef(step)
  useEffect(() => { stepRef.current = step })
  const repeatRef = useRef<ReturnType<typeof createPressRepeat> | null>(null)
  useEffect(() => () => repeatRef.current?.cancel(), [])
  return {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return
      const repeat = repeatRef.current ??= createPressRepeat(() => stepRef.current())
      repeat.start()
      // Lifting the finger anywhere (even off the button) ends the hold.
      const end = () => { window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', cancel); repeat.release() }
      const cancel = () => { window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', cancel); repeat.cancel() }
      window.addEventListener('pointerup', end)
      window.addEventListener('pointercancel', cancel)
    },
    // Keyboard (Entrée / Espace) has no pointer: its click is the step.
    onClick: (event: MouseEvent) => { if (event.detail === 0) stepRef.current() },
    onContextMenu: (event: MouseEvent) => event.preventDefault(),
  }
}

/**
 * Pointer handlers opening a context menu after 500 ms held still (or on right click / Android long press).
 * `guard` wraps the row's tap so the click that ends a long press does not navigate too.
 */
export function useV6LongPress(onLongPress?: () => void) {
  const callback = useRef(onLongPress)
  useEffect(() => { callback.current = onLongPress })
  const pressRef = useRef<ReturnType<typeof createLongPress> | null>(null)
  useEffect(() => () => pressRef.current?.cancel(), [])
  const press = () => pressRef.current ??= createLongPress(() => callback.current?.())
  const handlers = onLongPress ? {
    onPointerDown: (event: PointerEvent) => { if (event.button === 0) press().start(event.clientX, event.clientY) },
    onPointerMove: (event: PointerEvent) => pressRef.current?.move(event.clientX, event.clientY),
    onPointerUp: () => pressRef.current?.cancel(),
    onPointerCancel: () => pressRef.current?.cancel(),
    onPointerLeave: () => pressRef.current?.cancel(),
    onContextMenu: (event: MouseEvent) => { event.preventDefault(); press().fire() },
  } : {}
  const guard = (action?: () => void) => () => { if (!pressRef.current?.consumeClick()) action?.() }
  return { handlers, guard }
}

/**
 * Where the back button of a detail page goes: the page that pushed it (Historique, Séances, Aujourd’hui…),
 * read once when the page mounts; `fallback` after a reload or a deep link.
 */
export function useV6BackHref(fallback: string) {
  const { routeInfo } = useIonRouter()
  const [href] = useState(() => {
    const from = routeInfo?.pushedByRoute
    return from && from !== routeInfo.pathname && from.startsWith('/tabs/') ? from : fallback
  })
  return href
}
