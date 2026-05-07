'use client'

import { COLOR_CLASSES, formatValue, formatVariancePct } from '@/lib/kpi'
import { SparklineChart } from '@/components/charts/SparklineChart'
import type { KpiWithVariance } from '@/types'

const RING_COLORS = {
  green: { arc: '#22c55e', track: '#dcfce7', text: '#166534' },
  amber: { arc: '#f59e0b', track: '#fef3c7', text: '#92400e' },
  red:   { arc: '#ef4444', track: '#fee2e2', text: '#991b1b' },
} as const

const PCT_COLORS = {
  green: '#16a34a',
  amber: '#d97706',
  red:   '#dc2626',
} as const

const CIRCUMFERENCE = 2 * Math.PI * 15 // r=15 → ≈94.25

interface KpiCardProps {
  kpi: KpiWithVariance
  onClick?: () => void
}

export function KpiCard({ kpi, onClick }: KpiCardProps) {
  const { variance, unit } = kpi
  const ring = RING_COLORS[variance.color]
  const arcLength = Math.max(0, Math.min(variance.pct / 100, 1)) * CIRCUMFERENCE
  const topColor = COLOR_CLASSES[variance.color]

  return (
    <button
      onClick={onClick}
      data-variance={variance.color}
      className="w-full text-right rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-[3px] flex flex-col gap-3 border"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        borderTop: `3px solid ${topColor}`,
        boxShadow: 'var(--card-shadow)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--card-shadow)')}
    >
      {/* Header row: ring + name */}
      <div className="flex items-center justify-between gap-2">
        <svg width="44" height="44" viewBox="0 0 40 40" aria-hidden="true" style={{ flexShrink: 0 }}>
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
          <text x="20" y="24" textAnchor="middle" fontSize="8.5" fontWeight="700" fill={ring.text}
            fontFamily="JetBrains Mono, monospace">
            {formatVariancePct(variance.pct)}
          </text>
        </svg>
        <p
          className="text-[13px] leading-snug flex-1 ms-1"
          style={{ color: 'var(--ink-soft)' }}
        >
          {kpi.nameAr}
        </p>
      </div>

      {/* Body: sparkline + big number */}
      <div className="flex items-end justify-between gap-2">
        <div className="w-24 h-12 flex-shrink-0">
          <SparklineChart data={kpi.sparkline} color={variance.color} />
        </div>
        <p
          className="font-fraunces text-[38px] leading-none"
          style={{ color: 'var(--ink)', letterSpacing: '-.02em' }}
        >
          {formatValue(variance.actual, unit)}
        </p>
      </div>

      {/* Footer: target + variance % */}
      <div
        className="flex justify-between items-center pt-3 border-t"
        style={{ borderColor: 'var(--hair)' }}
      >
        <span
          className="font-jb text-[11px] font-medium"
          style={{ color: PCT_COLORS[variance.color] }}
        >
          {formatVariancePct(variance.pct)}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="font-jb text-[10px]" style={{ color: 'var(--ink-muted)' }}>
            {formatValue(variance.target, unit)}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>المستهدف</span>
        </div>
      </div>
    </button>
  )
}
