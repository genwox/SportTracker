import type { components } from '../../api/schema'

export type HealthMetric = Omit<components['schemas']['DailyHealthMetric'], 'date' | 'weightKg' | 'steps'> & { date: string; weightKg: number | null; steps: number | null }
export type HealthKind = 'weight' | 'steps'

export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function parseHealthValue(kind: HealthKind, raw: string): number | null {
  const text = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  const value = Number(text)
  if (kind === 'weight') return value >= 1 && value <= 500 ? value : null
  return Number.isInteger(value) && value >= 0 && value <= 200_000 ? value : null
}

export function weightSummary(metrics: HealthMetric[]) {
  const weights = metrics.filter(m => m.weightKg !== null).sort((a, b) => a.date.localeCompare(b.date))
  const first = weights[0], latest = weights.at(-1)
  return { weights, latest: latest?.weightKg ?? null, change: weights.length > 1 ? Math.round((latest!.weightKg! - first.weightKg!) * 100) / 100 : null }
}

export function weightPoints(weights: HealthMetric[]): string {
  if (!weights.length) return ''
  const values = weights.map(m => m.weightKg!), min = Math.min(...values), max = Math.max(...values)
  const dates = weights.map(m => Date.parse(m.date)), start = dates[0], span = Math.max(1, dates.at(-1)! - start)
  return weights.map((m, index) => `${weights.length === 1 ? 150 : 15 + (dates[index] - start) / span * 270},${max === min ? 65 : 110 - (m.weightKg! - min) / (max - min) * 90}`).join(' ')
}
