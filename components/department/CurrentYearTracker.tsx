'use client'

import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import type { DeptData, TargetProgress } from '@/types/department'

const QUARTER_COLOR: Record<string, string> = {
  Q1: '#6366f1',
  Q2: '#0891b2',
  Q3: '#d97706',
  Q4: '#16a34a',
}

function ActivityCard({ labelAr, target, current, unit, lowerIsBetter, lastYearValue, quarters }: TargetProgress) {
  const safePct = (num: number, den: number) =>
    den <= 0 ? 0 : Math.min((num / den) * 100, 100)

  const pct = lowerIsBetter
    ? safePct(target, Math.max(current, 1))
    : safePct(current, target)

  const barColor = pct >= 95 ? '#16a34a' : pct >= 80 ? '#d97706' : '#dc2626'

  const fmt = (v: number | null) => {
    if (v == null) return '—'
    if (unit === '%') return `${v}%`
    return v.toLocaleString('en')
  }

  return (
    <div style={{
      background: 'var(--card-bg)', borderRadius: 16,
      border: '1px solid var(--border)', overflow: 'hidden',
      boxShadow: 'var(--card-shadow)',
    }}>
      {/* Header band */}
      <div style={{ background: 'var(--bg-alt)', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        <p className="font-cairo text-[13px] font-semibold text-right leading-snug" style={{ color: 'var(--ink)' }}>
          {labelAr}
        </p>
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Two-column stat row: last year vs current year */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="rounded-xl p-2.5 text-center" style={{ background: 'var(--bg-alt)' }}>
            <p className="font-space text-[9px] tracking-[.08em] uppercase mb-1" style={{ color: 'var(--ink-muted)' }}>
              2025
            </p>
            <p className="font-fraunces font-medium leading-none" style={{ fontSize: 20, color: 'var(--ink-soft)', letterSpacing: '-.02em' }}>
              {fmt(lastYearValue)}
            </p>
          </div>
          <div className="rounded-xl p-2.5 text-center" style={{
            background: `${barColor}0f`,
            border: `1px solid ${barColor}30`,
          }}>
            <p className="font-space text-[9px] tracking-[.08em] uppercase mb-1" style={{ color: barColor }}>
              2026 حتى الآن
            </p>
            <p className="font-fraunces font-medium leading-none" style={{ fontSize: 20, color: 'var(--ink)', letterSpacing: '-.02em' }}>
              {fmt(current)}
            </p>
          </div>
        </div>

        {/* Quarterly horizontal bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {quarters.map(({ q, actual, target: qTarget }) => {
            const qPct = actual != null
              ? lowerIsBetter
                ? safePct(qTarget, Math.max(actual, 1))
                : safePct(actual, qTarget)
              : 0
            const c = QUARTER_COLOR[q]
            return (
              <div key={q} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  className="font-jb text-[10px] font-bold flex-shrink-0"
                  style={{ width: 20, textAlign: 'center', color: actual != null ? c : 'var(--ink-muted)' }}
                >
                  {q}
                </span>
                <div className="flex-1 rounded-full overflow-hidden" style={{ height: 7, background: 'var(--hair)' }}>
                  <div style={{
                    height: '100%',
                    width: `${qPct}%`,
                    background: actual != null ? c : 'transparent',
                    borderRadius: 999,
                  }} />
                </div>
                <span
                  className="font-jb text-[10px] flex-shrink-0"
                  style={{ width: 40, textAlign: 'left', color: actual != null ? 'var(--ink-soft)' : 'var(--ink-muted)' }}
                >
                  {fmt(actual)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Footer: cumulative progress vs annual target */}
        <div style={{ borderTop: '1px solid var(--hair)', paddingTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span className="font-jb text-[10px]" style={{ color: 'var(--ink-muted)' }}>
              المستهدف: {fmt(target)}
            </span>
            <span className="font-jb text-[11px] font-bold" style={{ color: barColor }}>
              {Math.round(pct)}%
            </span>
          </div>
          <div className="rounded-full overflow-hidden" style={{ height: 6, background: 'var(--hair)' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: barColor,
              borderRadius: 999,
              transition: 'width .4s ease',
            }} />
          </div>
          <p className="font-jb text-[9px] mt-1.5" style={{ color: 'var(--ink-muted)', textAlign: 'left' }}>
            {fmt(current)} من {fmt(target)} مستهدف
          </p>
        </div>
      </div>
    </div>
  )
}

interface Props {
  data: DeptData['currentYear']
  accentColor: string
}

export function CurrentYearTracker({ data, accentColor }: Props) {
  const chartData = data.monthlyProgress.map(m => ({
    month: m.month,
    actual: m.actual,
    target: m.target,
  }))

  return (
    <section className="space-y-5">
      <p className="font-space font-semibold text-[10px] tracking-[.14em] uppercase" style={{ color: 'var(--ink-muted)' }}>
        متابعة التقدم · {data.year}
      </p>

      {/* Activity cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.targets.map(t => (
          <ActivityCard key={t.labelAr} {...t} />
        ))}
      </div>

      {/* Monthly progress vs target chart */}
      <div className="rounded-2xl border p-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
        <p className="font-cairo text-[12px] font-semibold mb-3 text-right" style={{ color: 'var(--ink-soft)' }}>
          التقدم الشهري — الفعلي مقابل المستهدف
        </p>
        <div dir="ltr" style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={[70, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => v != null ? [`${v}%`] : ['—']}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="actual" name="الفعلي" fill={accentColor} opacity={0.85} radius={[3,3,0,0]} />
              <Line type="monotone" dataKey="target" name="المستهدف" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
