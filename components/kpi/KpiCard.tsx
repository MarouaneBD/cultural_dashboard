'use client'

import { HEX_COLORS, formatValue, formatVariancePct } from '@/lib/kpi'
import { SparklineChart } from '@/components/charts/SparklineChart'
import type { KpiWithVariance } from '@/types'

const PCT_COLORS = {
  green: '#16a34a',
  amber: '#d97706',
  red:   '#dc2626',
} as const

interface KpiCardProps {
  kpi: KpiWithVariance
  onClick?: () => void
}

export function KpiCard({ kpi, onClick }: KpiCardProps) {
  const { variance, unit } = kpi
  const topColor = HEX_COLORS[variance.color]
  const fillPct = Math.min(Math.max(variance.pct, 0), 100)

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
      {/* Header: KPI name */}
      <p
        className="text-[13px] leading-snug text-right"
        style={{ color: 'var(--ink-soft)' }}
      >
        {kpi.nameAr}
      </p>

      {/* Body: bar sparkline + big number */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex-1 h-10">
          <SparklineChart data={kpi.sparkline} color={variance.color} />
        </div>
        <p
          className="font-fraunces font-medium text-[38px] leading-none flex-shrink-0"
          style={{ color: 'var(--ink)', letterSpacing: '-.02em' }}
        >
          {formatValue(variance.actual, unit)}
        </p>
      </div>

      {/* Footer: progress line + labels */}
      <div
        className="flex flex-col gap-1.5 pt-3 border-t"
        style={{ borderColor: 'var(--hair)' }}
      >
        {/* Labels row */}
        <div className="flex items-center justify-between">
          <span
            className="font-jb text-[11px] font-medium"
            style={{ color: PCT_COLORS[variance.color] }}
          >
            {formatVariancePct(variance.pct)}
          </span>
          <span className="font-jb text-[10px]" style={{ color: 'var(--ink-muted)' }}>
            المستهدف {formatValue(variance.target, unit)}
          </span>
        </div>

        {/* Progress track */}
        <div
          className="h-1 w-full rounded-full overflow-hidden"
          style={{ background: 'var(--hair)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${fillPct}%`,
              background: topColor,
              transition: 'width .4s ease',
            }}
          />
        </div>
      </div>
    </button>
  )
}
