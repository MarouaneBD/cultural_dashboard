'use client'

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'
import type { QuarterlyPoint } from '@/types/department'

interface Props {
  data: QuarterlyPoint[]
  accentColor: string
}

export function QuarterlyBarChart({ data, accentColor }: Props) {
  return (
    <div dir="ltr" style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: -10, bottom: 0 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" vertical={false} />
          <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis domain={[70, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
            formatter={(v) => [`${v}%`]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="4 2" strokeWidth={1} />
          <Bar dataKey="target"   name="المستهدف"  fill="rgba(0,0,0,.08)" radius={[4,4,0,0]} />
          <Bar dataKey="achieved" name="المُنجز"    fill={accentColor}     radius={[4,4,0,0]} opacity={0.9} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
