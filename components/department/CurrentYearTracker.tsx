'use client'

import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import type { DeptData, TargetProgress } from '@/types/department'

const QUARTER_COLOR: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', string> = {
  Q1: '#6366f1',
  Q2: '#0891b2',
  Q3: '#d97706',
  Q4: '#16a34a',
}

function safePct(num: number, den: number): number {
  return den <= 0 ? 0 : Math.min((num / den) * 100, 100)
}

/** Compact number for chart labels/axis — no thousand comma */
function fmtAxis(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`
  if (n >= 1_000)     return `${Math.round(n / 1_000)} الف`
  return String(Math.round(n))
}

function ActivityCard({
  labelAr, target, current, unit, lowerIsBetter, lastYearValue, quarters, year, accentColor,
  isSelected, onSelect, isDimmed,
}: TargetProgress & {
  year: number
  accentColor: string
  isSelected: boolean
  onSelect: () => void
  isDimmed: boolean
}) {
  const pct = lowerIsBetter
    ? safePct(target, Math.max(current, 1))
    : safePct(current, target)

  const barColor = accentColor

  const fmt = (v: number | null) => {
    if (v == null) return '—'
    if (unit === '%') return `${Math.round(v)}%`
    if (unit === 'AED') return `${Math.round(v).toLocaleString('en')} د.إ`
    return String(Math.round(v))
  }

  return (
    <div
      onClick={onSelect}
      style={{
        background: isSelected ? `${accentColor}0d` : 'var(--card-bg)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        borderInlineStart: isSelected ? `4px solid ${accentColor}` : '1px solid var(--border)',
        overflow: 'hidden',
        boxShadow: 'var(--card-shadow)',
        opacity: isDimmed ? 0.55 : 1,
        transition: 'opacity .2s ease, background .15s ease, border-inline-start .15s ease',
        cursor: 'pointer',
      }}
    >
      {/* Header band */}
      <div style={{ background: 'var(--bg-alt)', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        <p className="font-cairo text-[13px] font-semibold text-right leading-snug" style={{ color: 'var(--ink)' }}>
          {labelAr}
        </p>
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Hero: current year progress — single large number */}
        <div className="rounded-xl text-center" style={{
          background: `${barColor}0f`,
          border: `1px solid ${barColor}30`,
          padding: '12px 10px',
        }}>
          <p className="font-space text-[9px] tracking-[.08em] uppercase mb-1.5" style={{ color: barColor }}>
            {year} حتى الآن
          </p>
          <p className="font-fraunces font-semibold leading-none" style={{ fontSize: 34, color: 'var(--ink)', letterSpacing: '-.02em' }}>
            {fmt(current)}
          </p>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span className="font-jb text-[11px] font-semibold" style={{ color: 'var(--ink-soft)' }}>
              {fmt(current)} من {fmt(target)}
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
          {/* 2025 comparison — below bar, clearly visible */}
          {lastYearValue != null && (
            <p className="font-jb text-[10px] mt-2" style={{ color: 'var(--ink-soft)', textAlign: 'right' }}>
              <span style={{ color: 'var(--ink-muted)' }}>{year - 1}:</span>{' '}
              <span style={{ fontWeight: 600 }}>{fmt(lastYearValue)}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface Props {
  data: DeptData['currentYear']
  accentColor: string
}

interface ChartPoint {
  label: string
  quarterly: number | null
  target: number | null
  prevYear: number
}

function buildTrendChart(
  targets: TargetProgress[],
  selectedLabelAr: string | null,
): { points: ChartPoint[]; hasPrevYear: boolean } {
  const active = selectedLabelAr
    ? targets.filter(t => t.labelAr === selectedLabelAr)
    : targets

  const prevYearAnnual = active.reduce((s, t) => s + (t.lastYearValue ?? 0), 0)
  const prevYearPerQuarter = prevYearAnnual / 4

  const points = (['Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => {
    const hasData = active.some(t => t.quarters.find(x => x.q === q)?.actual != null)
    const totalActual = active.reduce((s, t) => {
      const qd = t.quarters.find(x => x.q === q)
      return qd?.actual != null ? s + qd.actual : s
    }, 0)
    const totalTarget = active.reduce((s, t) => {
      const qd = t.quarters.find(x => x.q === q)
      return s + (qd?.target ?? 0)
    }, 0)
    return {
      label: q,
      quarterly: hasData ? totalActual : null,
      target: totalTarget || null,
      prevYear: prevYearPerQuarter,
    }
  })

  return { points, hasPrevYear: prevYearAnnual > 0 }
}

export function CurrentYearTracker({ data, accentColor }: Props) {
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null)

  const { points: chartData, hasPrevYear } = useMemo(
    () => buildTrendChart(data.targets, selectedActivity),
    [data.targets, selectedActivity],
  )

  return (
    <section className="space-y-5">
      <p className="font-space font-semibold text-[10px] tracking-[.14em] uppercase" style={{ color: 'var(--ink-muted)' }}>
        متابعة التقدم · {data.year}
      </p>

      {/* Quarterly trend chart */}
      <div className="rounded-2xl border p-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
        <div className="flex items-center justify-between mb-3" style={{ flexDirection: 'row-reverse' }}>
          <p className="font-cairo text-[12px] font-semibold text-right" style={{ color: 'var(--ink-soft)' }}>
            {selectedActivity ?? `مقارنة الأداء الفصلي (${data.year - 1}–${data.year})`}
          </p>
          {selectedActivity && (
            <button
              onClick={() => setSelectedActivity(null)}
              className="font-jb text-[10px] px-2 py-0.5 rounded-full"
              style={{
                background: 'var(--bg-alt)',
                border: '1px solid var(--border)',
                color: 'var(--ink-muted)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              × الكل
            </button>
          )}
        </div>
        <div dir="ltr" style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.18)]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={fmtAxis}
              />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                formatter={(v: unknown, name) => [
                  v != null ? Number(v).toLocaleString('en') : '—',
                  name ?? '',
                ]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {/* Previous year — muted reference bar (annual total ÷ 4, distributed equally) */}
              {hasPrevYear && (
                <Bar
                  dataKey="prevYear"
                  name={`${data.year - 1} (تقديري)`}
                  fill={accentColor}
                  fillOpacity={0.30}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={24}
                />
              )}
              {/* Current year quarterly actuals */}
              <Bar
                dataKey="quarterly"
                name={`أرباع ${data.year}`}
                fill={accentColor}
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
                fillOpacity={0.85}
              />
              {/* Quarterly target — dashed line */}
              <Line
                type="monotone"
                dataKey="target"
                name="المستهدف الفصلي"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.targets.map(t => (
          <ActivityCard
            key={t.labelAr}
            {...t}
            year={data.year}
            accentColor={accentColor}
            isSelected={selectedActivity === t.labelAr}
            isDimmed={selectedActivity !== null && selectedActivity !== t.labelAr}
            onSelect={() =>
              setSelectedActivity(prev => (prev === t.labelAr ? null : t.labelAr))
            }
          />
        ))}
      </div>
    </section>
  )
}
