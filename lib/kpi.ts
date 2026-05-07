import type { KpiVariance, VarianceColor } from '@/types'

export const COLOR_CLASSES: Record<VarianceColor, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  red:   '#ef4444',
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
