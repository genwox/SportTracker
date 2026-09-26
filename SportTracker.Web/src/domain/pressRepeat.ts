type Timers = { setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout; setInterval: typeof setInterval; clearInterval: typeof clearInterval }

/**
 * Press-and-hold repetition of a stepper, like the iOS stepper: a tap is one step when the finger lifts;
 * held for `delay` (400 ms) it steps, then every `interval` (80 ms) until released.
 * `cancel` (the finger starts scrolling the page) drops the pending tap. Timers are injectable for tests.
 */
export function createPressRepeat(step: () => void, { delay = 400, interval = 80 } = {}, timers: Timers = globalThis) {
  let wait: ReturnType<typeof setTimeout> | undefined
  let repeat: ReturnType<typeof setInterval> | undefined
  let pressed = false
  const clear = () => {
    if (wait !== undefined) timers.clearTimeout(wait)
    if (repeat !== undefined) timers.clearInterval(repeat)
    wait = repeat = undefined
  }
  return {
    start() {
      clear()
      pressed = true
      wait = timers.setTimeout(() => { wait = undefined; step(); repeat = timers.setInterval(step, interval) }, delay)
    },
    /** Finger lifted: a short press counts as one tap. */
    release() {
      if (pressed && repeat === undefined) step()
      pressed = false
      clear()
    },
    cancel() { pressed = false; clear() },
    get repeating() { return repeat !== undefined },
  }
}
