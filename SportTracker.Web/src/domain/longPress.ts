type Timers = { setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout }

/**
 * Long press of a row (iOS context menu): held still for `delay` (500 ms) it fires once; moving more than
 * `tolerance` (10 px, the page starts scrolling) or lifting the finger earlier cancels it. The tap that
 * follows a long press is swallowed (`consumeClick`), so the row does not also navigate.
 */
export function createLongPress(onLongPress: () => void, { delay = 500, tolerance = 10 } = {}, timers: Timers = globalThis) {
  let wait: ReturnType<typeof setTimeout> | undefined
  let origin: { x: number; y: number } | null = null
  let fired = false
  const clear = () => { if (wait !== undefined) timers.clearTimeout(wait); wait = undefined; origin = null }
  return {
    start(x: number, y: number) {
      clear()
      fired = false
      origin = { x, y }
      wait = timers.setTimeout(() => { wait = undefined; origin = null; fired = true; onLongPress() }, delay)
    },
    move(x: number, y: number) {
      if (origin && Math.hypot(x - origin.x, y - origin.y) > tolerance) clear()
    },
    cancel: clear,
    /** Right click, or Android's long press: open the menu at once. */
    fire() { clear(); fired = true; onLongPress() },
    /** True (once) when the click comes right after a long press. */
    consumeClick() { const was = fired; fired = false; return was },
  }
}
