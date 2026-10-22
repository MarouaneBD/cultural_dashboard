'use client'

/**
 * Sector-overview chart for divisions that don't use beneficiary/revenue metrics.
 * Renders a concentric-rings chart (one ring per department) alongside
 * a headline stat card for each department.
 *
 * Data comes from the same React Query cache as DivisionStats / DeptOverview,
 * so no extra network request is made.
 */

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { DEPARTMENTS } from '@/lib/departments'
import { DEFAULT_DIVISION, type DivisionId } from '@/lib/divisions'
import type { KpiWithVariance } from '@/types'

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtValue(value: number, unit: 'PERCENT' | 'COUNT' | 'CURRENCY'): string {
  if (unit === 'PERCENT') return `${Math.round(value)}٪`
  if (unit === 'CURRENCY') {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} مليون`
    if (value >= 1_000) return `${Math.round(value / 1_000).toLocaleString('en')} الف`
    return value.toLocaleString('en')
  }
  if (value >= 1_000) return value.toLocaleString('en')
  return String(Math.round(value))
}

function avgAchievement(kpis: KpiWithVariance[]): number {
  const rated = kpis.filter(k => k.variance.color !== 'neutral')
  if (!rated.length) return 0
  return Math.round(rated.reduce((s, k) => s + k.variance.pct, 0) / rated.length)
}

// ── Concentric rings SVG ───────────────────────────────────────────────────

function ConcentricRings({
  segments,
  size = 220,
}: {
  segments: Array<{ label: string; pct: number; color: string }>
  size?: number
}) {
  const cx   = size / 2
  const SW   = 10
  const GAP  = 6
  const STEP = SW + GAP
  const maxR = cx - SW / 2 - 6

  return (
    <div style={{ width: size, maxWidth: '100%', aspectRatio: '1', flexShrink: 0 }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const r = maxR - i * STEP
          if (r < 12) return null
          const circ = 2 * Math.PI * r
          const fill = Math.min(Math.max(seg.pct, 0), 100) / 100
          const dash = fill * circ

          return (
            <g key={i}>
              {/* Track */}
              <circle
                cx={cx} cy={cx} r={r}
                fill="none"
                stroke="rgba(35,34,31,.07)"
                strokeWidth={SW}
              />
              {/* Filled arc */}
              <circle
                cx={cx} cy={cx} r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={SW}
                strokeLinecap="round"
                strokeDasharray={`${dash.toFixed(2)} ${(circ - dash).toFixed(2)}`}
                transform={`rotate(-90 ${cx} ${cx})`}
                style={{ transition: 'stroke-dasharray .7s ease' }}
              />
            </g>
          )
        })}

        {/* Centre label */}
        <text
          x={cx} y={cx - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: 28, fontFamily: 'var(--font-fraunces)', fontWeight: 500, fill: 'var(--ink)' }}
        >
          {segments.length > 0 ? `${Math.round(segments.reduce((s, g) => s + g.pct, 0) / segments.length)}` : '—'}
        </text>
        <text
          x={cx} y={cx + 20}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: 12, fontFamily: 'var(--font-cairo)', fill: 'var(--ink-muted)' }}
        >
          متوسط الإنجاز٪
        </text>
      </svg>
    </div>
  )
}

// ── Dept stat card ─────────────────────────────────────────────────────────

function DeptStatCard({
  dept,
  headlineKpi,
  avgPct,
}: {
  dept: { id: string; labelAr: string; icon: string; color: string }
  headlineKpi: KpiWithVariance | undefined
  avgPct: number
}) {
  const color = dept.color
  const fillPct = Math.min(Math.max(avgPct, 0), 100)

  return (
    <div
      className="rounded-2xl border p-4 flex flex-col gap-3"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        borderTop: `3px solid ${color}`,
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* Dept name */}
      <div className="flex items-center gap-2 justify-end">
        <p className="font-cairo text-[12px] font-semibold leading-snug text-right" style={{ color: 'var(--ink)' }}>
          {dept.labelAr}
        </p>
        <span style={{ fontSize: '18px', lineHeight: 1 }}>{dept.icon}</span>
      </div>

      {/* Headline KPI */}
      {headlineKpi && (
        <div className="flex flex-col gap-0.5">
          <p className="font-cairo text-[10.5px] text-right" style={{ color: 'var(--ink-muted)' }}>
            {headlineKpi.nameAr}
          </p>
          <p
            className="font-fraunces font-medium leading-none text-right"
            style={{ fontSize: '26px', color, letterSpacing: '-.02em' }}
          >
            {fmtValue(headlineKpi.variance.actual, headlineKpi.unit)}
            {headlineKpi.unit === 'CURRENCY' && (
              <span className="font-cairo mr-1.5" style={{ fontSize: '13px', color: 'var(--ink-muted)' }}>د.إ</span>
            )}
          </p>
        </div>
      )}

      {/* Progress bar */}
      <div className="flex flex-col gap-1 pt-1 border-t" style={{ borderColor: 'var(--hair)' }}>
        <div className="flex items-center justify-between">
          <span className="font-jb text-[10px]" style={{ color: 'var(--ink-muted)' }}>نسبة الإنجاز</span>
          <span className="font-jb text-[11px] font-semibold" style={{ color }}>{avgPct}٪</span>
        </div>
        <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'var(--hair)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${fillPct}%`, background: color, transition: 'width .4s ease' }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-[2fr_1fr]">
      <div className="rounded-2xl border p-5 animate-pulse" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', height: 260 }} />
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-2xl border p-4 animate-pulse flex-1" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }} />
        ))}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export function DivisionAchievementChart() {
  const params        = useSearchParams()
  const year          = params.get('year')     ?? '2026'
  const period        = params.get('period')   ?? 'ANNUAL'
  const divisionParam = (params.get('division') ?? DEFAULT_DIVISION) as DivisionId
  const periodLabel   = { ANNUAL: 'سنوي', Q1: 'الربع الأول', Q2: 'الربع الثاني', Q3: 'الربع الثالث', Q4: 'الربع الرابع' }[period] ?? period

  const { data: kpis, isLoading } = useQuery<KpiWithVariance[]>({
    queryKey: ['kpis', year, period, divisionParam],
    queryFn: () =>
      fetch(`/api/kpis?year=${year}&period=${period}&division=${divisionParam}`).then(r => {
        if (!r.ok) throw new Error(`API ${r.status}`)
        return r.json()
      }),
  })

  if (isLoading) return <Skeleton />
  if (!kpis?.length) return null

  const depts = DEPARTMENTS.filter(d => d.division === divisionParam)

  const deptStats = depts.map(dept => {
    const deptKpis = kpis.filter(k => k.pillar === dept.id)
    const pct      = avgAchievement(deptKpis)
    // Headline = first COUNT or PERCENT KPI (skip CURRENCY for the number card)
    const headline = deptKpis.find(k => k.unit !== 'CURRENCY') ?? deptKpis[0]
    return { dept, deptKpis, pct, headline }
  })

  const segments = deptStats.map(s => ({
    label: s.dept.labelAr,
    pct:   s.pct,
    color: s.dept.color,
  }))

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-[2fr_1fr]">
      {/* Rings card */}
      <div
        className="rounded-2xl border p-5"
        style={{
          background: 'var(--card-bg)',
          borderColor: 'var(--border)',
          borderTop: '3px solid #0f4024',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {/* Header */}
        <p
          className="font-space font-semibold text-[10px] tracking-[.14em] uppercase mb-5"
          style={{ color: 'var(--ink-muted)' }}
        >
          نسبة الإنجاز · {year} · {periodLabel}
        </p>

        {/* Body */}
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <ConcentricRings segments={segments} size={220} />

          {/* Legend */}
          <ul className="flex flex-col gap-4 flex-1 w-full">
            {deptStats.map((s, i) => (
              <li key={s.dept.id} className="flex items-center gap-3 min-w-0">
                {/* Ring colour dot */}
                <span
                  className="flex-shrink-0 rounded-full"
                  style={{ width: 9, height: 9, background: s.dept.color, boxShadow: `0 0 0 2px ${s.dept.color}30` }}
                />
                {/* Dept name */}
                <span
                  className="font-cairo text-[12.5px] leading-snug flex-1 truncate text-right"
                  style={{ color: 'var(--ink)' }}
                >
                  {s.dept.labelAr}
                </span>
                {/* KPI count */}
                <span className="font-cairo text-[10.5px]" style={{ color: 'var(--ink-muted)', flexShrink: 0 }}>
                  {s.deptKpis.length} مؤشر
                </span>
                {/* Pct */}
                <span
                  className="font-jb text-[14px] font-semibold flex-shrink-0"
                  style={{ color: s.dept.color }}
                >
                  {s.pct}٪
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right column: one stat card per dept */}
      <div className="flex flex-col gap-4">
        {deptStats.map(s => (
          <DeptStatCard
            key={s.dept.id}
            dept={s.dept}
            headlineKpi={s.headline}
            avgPct={s.pct}
          />
        ))}
      </div>
    </div>
  )
}
