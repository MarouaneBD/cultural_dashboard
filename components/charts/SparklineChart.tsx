'use client'

import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts'
import type { VarianceColor } from '@/types'

const STROKE_COLOR: Record<VarianceColor, string> = {
  green: '#059669',
  amber: '#d97706',
  red: '#dc2626',
}

interface SparklineChartProps {
  data: number[]
  color: VarianceColor
}

export function SparklineChart({ data, color }: SparklineChartProps) {
  const chartData = data.map((v, i) => ({ q: `Q${i + 1}`, v }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={STROKE_COLOR[color]}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 11, direction: 'rtl' }}
          formatter={(val) => [
            typeof val === 'number' ? val.toLocaleString('en') : String(val ?? ''),
            'القيمة',
          ]}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
