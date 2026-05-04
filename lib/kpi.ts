import type { KpiVariance, VarianceColor } from '@/types'

export const COLOR_CLASSES: Record<VarianceColor, string> = {
  green: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  amber: 'text-amber-700 bg-amber-50 border-amber-200',
  red: 'text-red-700 bg-red-50 border-red-200',
}

export const COLOR_DOT: Record<VarianceColor, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
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
