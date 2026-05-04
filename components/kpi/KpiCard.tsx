'use client'

import { COLOR_CLASSES, formatValue, formatVariancePct } from '@/lib/kpi'
import { SparklineChart } from '@/components/charts/SparklineChart'
import type { KpiWithVariance } from '@/types'

const RING_COLORS = {
  green: { arc: '#22c55e', track: '#dcfce7', text: '#166534' },
  amber: { arc: '#f59e0b', track: '#fef3c7', text: '#92400e' },
  red:   { arc: '#ef4444', track: '#fee2e2', text: '#991b1b' },
} as const

const CIRCUMFERENCE = 2 * Math.PI * 15 // r=15 → ≈94.25

interface KpiCardProps {
  kpi: KpiWithVariance
  onClick?: () => void
}

export function KpiCard({ kpi, onClick }: KpiCardProps) {
  const { variance, unit } = kpi
  const colorClass = COLOR_CLASSES[variance.color]
  const ring = RING_COLORS[variance.color]
  const arcLength = Math.max(0, Math.min(variance.pct / 100, 1)) * CIRCUMFERENCE

  return (
    <button
      onClick={onClick}
      className={`w-full text-right rounded-xl border p-5 transition-shadow hover:shadow-md cursor-pointer ${colorClass}`}
    >
      <div className="flex items-center justify-between mb-4">
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" style={{ flexShrink: 0 }}>
          <circle cx="20" cy="20" r="15" fill="none" stroke={ring.track} strokeWidth="6" />
          <circle
            cx="20" cy="20" r="15"
            fill="none"
            stroke={ring.arc}
            strokeWidth="6"
            strokeDasharray={`${arcLength} ${CIRCUMFERENCE}`}
            strokeLinecap="round"
            transform="rotate(-90 20 20)"
          />
          <text x="20" y="24" textAnchor="middle" fontSize="8.5" fontWeight="700" fill={ring.text}>
            {formatVariancePct(variance.pct)}
          </text>
        </svg>
        <p className="text-sm font-semibold leading-snug flex-1 ms-2">{kpi.nameAr}</p>
      </div>

      <div className="flex items-end justify-between">
        <div className="w-24 h-12 flex-shrink-0">
          <SparklineChart data={kpi.sparkline} color={variance.color} />
        </div>
        <p className="text-3xl font-bold tabular-nums">
          {formatValue(variance.actual, unit)}
        </p>
      </div>

      <div className="mt-3 pt-3 border-t border-current/20 flex justify-between items-center">
        <span className="text-sm font-semibold tabular-nums">
          {formatValue(variance.target, unit)}
        </span>
        <span className="text-xs opacity-70">المستهدف</span>
      </div>
    </button>
  )
}
