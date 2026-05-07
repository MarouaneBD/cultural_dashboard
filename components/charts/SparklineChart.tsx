'use client'

import type { VarianceColor } from '@/types'

const BAR_COLORS: Record<VarianceColor, { fill: string; track: string }> = {
  green: { fill: '#22c55e', track: '#bbf7d0' },
  amber: { fill: '#f59e0b', track: '#fde68a' },
  red:   { fill: '#ef4444', track: '#fecaca' },
}

interface SparklineChartProps {
  data: number[]
  color: VarianceColor
}

export function SparklineChart({ data, color }: SparklineChartProps) {
  if (!data.length) return null

  const max = Math.max(...data)
  const { fill, track } = BAR_COLORS[color]

  return (
    <div className="flex items-end gap-[2px] w-full h-full">
      {data.map((v, i) => {
        const heightPct = max > 0 ? Math.max((v / max) * 100, 8) : 8
        const isLast = i === data.length - 1
        return (
          <div
            key={i}
            className="flex-1 rounded-t-[3px] min-h-[4px]"
            style={{
              height: `${heightPct}%`,
              background: isLast ? fill : track,
            }}
          />
        )
      })}
    </div>
  )
}
