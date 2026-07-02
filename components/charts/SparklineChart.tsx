'use client'

interface SparklineChartProps {
  data: number[]
  color: string   // hex color — always fixed, never variance-based
}

export function SparklineChart({ data, color }: SparklineChartProps) {
  if (!data.length) return null

  const max = Math.max(...data)
  // Track is the same hue at 25% opacity
  const track = `${color}40`

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
              background: isLast ? color : track,
            }}
          />
        )
      })}
    </div>
  )
}
