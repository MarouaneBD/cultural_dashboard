'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { CategoryTotal } from '@/app/api/stats/totals/route'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}ك`
  return n.toLocaleString('en')
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as CategoryTotal
  return (
    <div
      className="rounded-xl px-3 py-2 text-right"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--card-shadow)',
        fontSize: 12,
        minWidth: 140,
      }}
    >
      <p className="font-cairo font-semibold mb-0.5" style={{ color: 'var(--ink)' }}>{d.category}</p>
      <p className="font-jb" style={{ color: d.color, fontWeight: 600 }}>{fmt(d.total)}</p>
    </div>
  )
}

export function BeneficiaryChart() {
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'

  const { data, isLoading } = useQuery<CategoryTotal[]>({
    queryKey: ['stats-totals', year],
    queryFn: () =>
      fetch(`/api/stats/totals?year=${year}`).then(r => {
        if (!r.ok) throw new Error(`API ${r.status}`)
        return r.json()
      }),
  })

  const totals = data ?? []
  const grandTotal = totals.reduce((s, d) => s + d.total, 0)

  if (isLoading) {
    return (
      <div className="rounded-2xl border p-5 animate-pulse" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
        <div className="h-4 w-40 rounded mb-4" style={{ background: 'var(--bg-alt)' }} />
        <div className="h-52 rounded-xl" style={{ background: 'var(--bg-alt)' }} />
      </div>
    )
  }

  if (!totals.length) return null

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* Header */}
      <p
        className="font-space font-semibold text-[10px] tracking-[.14em] uppercase mb-4"
        style={{ color: 'var(--ink-muted)' }}
      >
        إجمالي المستفيدين حسب الفئة · {year}
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        {/* Donut */}
        <div className="flex-shrink-0 mx-auto sm:mx-0" style={{ width: 180, height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={totals}
                dataKey="total"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                strokeWidth={0}
                paddingAngle={2}
              >
                {totals.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Centre label */}
          <div className="relative" style={{ marginTop: -108, marginBottom: 20, textAlign: 'center', pointerEvents: 'none' }}>
            <p className="font-fraunces font-medium leading-none" style={{ fontSize: 22, color: 'var(--ink)', letterSpacing: '-.02em' }}>
              {fmt(grandTotal)}
            </p>
            <p className="font-cairo text-[10px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>إجمالي</p>
          </div>
        </div>

        {/* Legend list */}
        <ul className="flex-1 flex flex-col gap-2.5 min-w-0">
          {totals.map((d, i) => {
            const pct = grandTotal > 0 ? Math.round((d.total / grandTotal) * 100) : 0
            return (
              <li key={i} className="flex items-center gap-2.5">
                <span
                  className="flex-shrink-0 rounded-sm"
                  style={{ width: 10, height: 10, background: d.color }}
                />
                <span className="font-cairo text-[12px] leading-snug flex-1 truncate text-right" style={{ color: 'var(--ink)' }}>
                  {d.category}
                </span>
                <span className="font-jb text-[11px] flex-shrink-0" style={{ color: d.color, fontWeight: 600 }}>
                  {fmt(d.total)}
                </span>
                <span className="font-jb text-[10px] flex-shrink-0 w-8 text-left" style={{ color: 'var(--ink-muted)' }}>
                  {pct}%
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
