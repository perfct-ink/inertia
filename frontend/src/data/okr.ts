import type { KeyResult } from '@/types'

// "250 / 1,000 users" for a number key result; null for one linked to an
// initiative, whose measure is its tasks.
export function keyResultMeasure(kr: KeyResult): string | null {
  if (kr.initiative_id != null || kr.target_value == null) return null
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return `${fmt(kr.current_value)} / ${fmt(kr.target_value)}${kr.unit ? ` ${kr.unit}` : ''}`
}

// OKR reviews grade on 0-1; shown with two decimals ("0.70").
export function formatScore(score: number): string {
  return score.toFixed(2)
}
