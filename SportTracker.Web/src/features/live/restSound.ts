import type { RestTimer } from '../../domain/restTimer'

let context: AudioContext | null = null

/** Must be called synchronously from a user gesture for Safari's autoplay policy. */
export function unlockRestAudio() {
  try {
    const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Audio) return
    context ??= new Audio()
    if (context.state === 'suspended') void context.resume().catch(() => {})
    // A silent first buffer unlocks audio output on iOS.
    const source = context.createBufferSource()
    source.buffer = context.createBuffer(1, 1, context.sampleRate)
    source.connect(context.destination)
    source.start()
  } catch { /* Audio is optional; the timer remains usable. */ }
}

export function playRestSound(): boolean {
  if (!context || context.state !== 'running') return false
  try {
    const start = context.currentTime
    for (const offset of [0, 0.22, 0.44]) {
      const tone = context.createOscillator(), volume = context.createGain()
      tone.frequency.value = 880
      volume.gain.setValueAtTime(0, start + offset)
      volume.gain.linearRampToValueAtTime(0.18, start + offset + 0.015)
      volume.gain.exponentialRampToValueAtTime(0.001, start + offset + 0.16)
      tone.connect(volume); volume.connect(context.destination)
      tone.start(start + offset); tone.stop(start + offset + 0.18)
      tone.onended = () => { tone.disconnect(); volume.disconnect() }
    }
    return true
  } catch { return false }
}

export function isRestDue(timer: RestTimer, now: number) {
  return timer.state === 'running' && timer.endsAt !== null && timer.durationMs > 0 && now >= timer.endsAt
}

// After an extended suspension, finish silently instead of playing an obsolete alert.
export function isRestSoundTimely(timer: RestTimer, now: number) {
  return isRestDue(timer, now) && now - timer.endsAt! <= 10_000
}
