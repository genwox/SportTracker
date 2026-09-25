export interface StrengthSet { weight: number; repetitions: number; setType?: string }
export interface PersonalRecordResult { previousBest: number; achieved: number; isPersonalRecord: boolean; isFirst: boolean }

// Math.Round(x, 1) in C# uses ties to even.
function roundToEvenTenth(value: number): number {
  const scaled = value * 10
  const floor = Math.floor(scaled)
  const fraction = scaled - floor
  if (Math.abs(fraction - 0.5) < 1e-12) return (floor % 2 === 0 ? floor : floor + 1) / 10
  return Math.round(scaled) / 10
}

export function estimateOneRm(weight: number, reps: number, round: boolean): number {
  if (weight <= 0 || reps <= 0) return 0
  const estimate = weight * (1 + reps / 30)
  return round ? roundToEvenTenth(estimate) : estimate
}

export function detectPersonalRecord(previousSets: readonly StrengthSet[], weight: number, reps: number): PersonalRecordResult {
  const previousBest = Math.max(0, ...previousSets.filter(set => set.weight > 0 && set.repetitions > 0)
    .map(set => estimateOneRm(set.weight, set.repetitions, false)))
  const achieved = estimateOneRm(weight, reps, true)
  const isPersonalRecord = achieved > previousBest + 0.05
  return { previousBest, achieved, isPersonalRecord, isFirst: isPersonalRecord && previousBest === 0 }
}
