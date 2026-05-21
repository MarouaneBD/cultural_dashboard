'use client'

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import type { MonthlyPoint, MonthlyProgressPoint } from '@/types/department'

interface Props {
  lastYear: MonthlyPoint[]
  currentYear: MonthlyProgressPoint[]
  lastYearLabel: string
  currentYearLabel: string
  accentColor: string
}

export function MonthlyTrendChart({
  lastYear, currentYear, lastYearLabel, currentYearLabel, accentColor,
}: Props) {
  // Merge by month index so both series share the same X axis
  const data = lastYear.map((ly, i) => {
    const cy = currentYear[i]
    return {
      month: ly.month,
      [lastYearLabel]: ly.value,
      [currentYearLabel]: cy?.actual ?? null,
      target: cy?.target ?? null,
    }
  })

  return (
    <div dir="ltr" style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis domain={[60, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey={lastYearLabel}
            stroke="#94a3b8"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 3"
          />
          <Line
            type="monotone"
            dataKey={currentYearLabel}
            stroke={accentColor}
            strokeWidth={2.5}
            dot={{ r: 3, fill: accentColor }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="target"
            stroke="#f59e0b"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="3 2"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
