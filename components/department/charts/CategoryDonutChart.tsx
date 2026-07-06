'use client'

import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts'
import type { CategorySlice } from '@/types/department'

const PALETTE = ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6']

interface Props {
  data: CategorySlice[]
  accentColor: string
}

export function CategoryDonutChart({ data, accentColor }: Props) {
  const colors = data.map((_, i) =>
    i === 0 ? accentColor : PALETTE[(i) % PALETTE.length]
  )

  return (
    <div dir="ltr" style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="nameAr"
            cx="50%"
            cy="42%"
            innerRadius={55}
            outerRadius={82}
            paddingAngle={3}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
            formatter={(v) => [`${v}%`]}
          />
          <Legend
            layout="horizontal"
            align="center"
            verticalAlign="bottom"
            wrapperStyle={{ fontSize: 11, lineHeight: '22px', paddingTop: 8 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
