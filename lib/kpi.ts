import type { KpiVariance, VarianceColor } from '@/types'
import type { ActivityType } from '@prisma/client'

export const HEX_COLORS: Record<VarianceColor, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red:   '#ef4444',
}

export const ROW_CLASSES: Record<VarianceColor, string> = {
  green: 'text-emerald-700 bg-emerald-50',
  amber: 'text-amber-700 bg-amber-50',
  red:   'text-red-700 bg-red-50',
}

export function getVarianceColor(pct: number): VarianceColor {
  if (pct > 95) return 'green'
  if (pct >= 85) return 'amber'
  return 'red'
}

export function computeVariance(actual: number, target: number): KpiVariance {
  if (target === 0) return { actual, target, pct: 0, color: 'red' }
  const pct = (actual / target) * 100
  return { actual, target, pct, color: getVarianceColor(pct) }
}

export function formatVariancePct(pct: number): string {
  return `${pct.toFixed(1)}%`
}

export function formatValue(value: number, unit: 'PERCENT' | 'COUNT' | 'CURRENCY'): string {
  if (unit === 'PERCENT') return `${value.toFixed(1)}%`
  if (unit === 'CURRENCY') return value.toLocaleString('en') + ' د.إ'
  return value.toLocaleString('en')
}

/**
 * Computes the YTD value from available quarterly actuals.
 *
 * cumulative    → sum of all quarters present
 * monthly_variance → value of the last quarter present (in Q1–Q4 order)
 *
 * Returns null if no quarters have data.
 */
export function computeYtd(
  quarters: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number>>,
  type: ActivityType
): number | null {
  const ordered = (['Q1', 'Q2', 'Q3', 'Q4'] as const)
    .map(q => quarters[q])
    .filter((v): v is number => v != null)

  if (ordered.length === 0) return null

  return type === 'CUMULATIVE'
    ? ordered.reduce((a, b) => a + b, 0)
    : ordered[ordered.length - 1]
}
