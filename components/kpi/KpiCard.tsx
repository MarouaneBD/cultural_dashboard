'use client'

import { COLOR_CLASSES, COLOR_DOT, formatValue, formatVariancePct } from '@/lib/kpi'
import { SparklineChart } from '@/components/charts/SparklineChart'
import type { KpiWithVariance } from '@/types'

interface KpiCardProps {
  kpi: KpiWithVariance
  onClick?: () => void
}

export function KpiCard({ kpi, onClick }: KpiCardProps) {
  const { variance, unit } = kpi
  const colorClass = COLOR_CLASSES[variance.color]
  const dotClass = COLOR_DOT[variance.color]

  return (
    <button
      onClick={onClick}
      className={`w-full text-right rounded-xl border p-5 transition-shadow hover:shadow-md cursor-pointer ${colorClass}`}
    >
      <div className="flex items-start justify-between mb-4">
        <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${dotClass}`} />
        <p className="text-sm font-semibold leading-snug flex-1 mr-2">{kpi.nameAr}</p>
      </div>

      <div className="flex items-end justify-between">
        <div className="w-24 h-12 flex-shrink-0">
          <SparklineChart data={kpi.sparkline} color={variance.color} />
        </div>
        <div className="space-y-1 text-right">
          <p className="text-3xl font-bold tabular-nums">
            {formatValue(variance.actual, unit)}
          </p>
          <p className="text-xs opacity-70">
            المستهدف: {formatValue(variance.target, unit)}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-current/20 flex justify-between items-center">
        <span className="text-sm font-bold tabular-nums">
          {formatVariancePct(variance.pct)}
        </span>
        <span className="text-xs opacity-70">نسبة الإنجاز</span>
      </div>
    </button>
  )
}
