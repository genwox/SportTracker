import { describe, expect, it } from 'vitest'
import strengthCasesJson from '../../../Docs/test-cases/strength-math.json?raw'
import { detectPersonalRecord, estimateOneRm, type StrengthSet } from './strengthMath'

const cases = JSON.parse(strengthCasesJson) as {
  estimateCases: { name: string; weight: number; reps: number; round: boolean; expected: number }[]
  recordCases: { name: string; historySets: StrengthSet[]; todaySets: StrengthSet[]; weight: number; reps: number;
    expectedPreviousBest: number; expectedAchieved: number; expectedIsPersonalRecord: boolean; expectedIsFirst: boolean }[]
}
describe('shared strength cases', () => {
  for (const item of cases.estimateCases) it(item.name, () => expect(estimateOneRm(item.weight, item.reps, item.round)).toBeCloseTo(item.expected, 10))
  for (const item of cases.recordCases) it(item.name, () => {
    const result = detectPersonalRecord([...item.historySets, ...item.todaySets], item.weight, item.reps)
    expect(result.previousBest).toBeCloseTo(item.expectedPreviousBest, 10)
    expect(result.achieved).toBeCloseTo(item.expectedAchieved, 10)
    expect(result.isPersonalRecord).toBe(item.expectedIsPersonalRecord)
    expect(result.isFirst).toBe(item.expectedIsFirst)
  })
})
