'use client'

import { formatValue, formatVariancePct } from '@/lib/kpi'
import { SparklineChart } from '@/components/charts/SparklineChart'
import type { KpiWithVariance } from '@/types'

// Fixed accent — never changes based on performance
const CARD_COLOR = '#0891b2'

interface KpiCardProps {
  kpi: KpiWithVariance
  onClick?: () => void
}

export function KpiCard({ kpi, onClick }: KpiCardProps) {
  const { variance, unit } = kpi
  const fillPct = Math.min(Math.max(variance.pct, 0), 100)

  return (
    <button
      onClick={onClick}
      className="w-full text-right rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-[3px] flex flex-col gap-3 border"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        borderTop: `3px solid ${CARD_COLOR}`,
        boxShadow: 'var(--card-shadow)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--card-shadow)')}
    >
      {/* Header: KPI name */}
      <p className="text-[13px] leading-snug text-right" style={{ color: 'var(--ink-soft)' }}>
        {kpi.nameAr}
      </p>

      {/* Body: sparkline + big number */}
      <div className="flex items-end justify-between gap-2">
        <div className="h-10 flex-shrink-0" style={{ width: '88px' }}>
          <SparklineChart data={kpi.sparkline} color={CARD_COLOR} />
        </div>
        <p
          className="font-fraunces font-medium text-[38px] leading-none flex-shrink-0"
          style={{ color: 'var(--ink)', letterSpacing: '-.02em' }}
        >
          {formatValue(variance.actual, unit)}
        </p>
      </div>

      {/* Footer: progress bar + labels */}
      <div className="flex flex-col gap-1.5 pt-3 border-t" style={{ borderColor: 'var(--hair)' }}>
        <div className="flex items-center justify-between">
          <span className="font-jb text-[11px] font-medium" style={{ color: CARD_COLOR }}>
            {formatVariancePct(variance.pct)}
          </span>
          <span className="font-jb text-[10px]" style={{ color: 'var(--ink-muted)' }}>
            المستهدف {formatValue(variance.target, unit)}
          </span>
        </div>

        <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'var(--hair)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${fillPct}%`, background: CARD_COLOR, transition: 'width .4s ease' }}
          />
        </div>
      </div>
    </button>
  )
}
