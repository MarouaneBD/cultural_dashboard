'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { DEPARTMENTS } from '@/lib/departments'
import { HEX_COLORS } from '@/lib/kpi'
import { SparklineChart } from '@/components/charts/SparklineChart'
import type { KpiWithVariance, VarianceColor } from '@/types'

// Dummy monthly sparkline per dept (Jan–Mar, Q1) — replaced once real data flows in.
// Values represent monthly performance %; last value drives the card color.
const DUMMY_SPARKLINES: Record<string, number[]> = {
  EDUCATION:           [89, 93, 97],  // green
  FAMILY_CULTURE:      [88, 92, 96],  // green
  ISLAMIC_INFO_CENTER: [80, 84, 85],  // amber
  AL_BIRR_MALE:        [65, 72, 78],  // red
  AL_BIRR_FEMALE:      [72, 79, 85],  // amber
  ORPHANS:             [90, 92, 95],  // amber/green boundary
  SCIENTIFIC_PROGRAMS: [62, 70, 79],  // red
}

const PCT_COLORS = {
  green: '#16a34a',
  amber: '#d97706',
  red:   '#dc2626',
} as const

function overallColor(pct: number): VarianceColor {
  if (pct > 95) return 'green'
  if (pct >= 85) return 'amber'
  return 'red'
}

function DeptCard({
  dept,
  kpis,
}: {
  dept: typeof DEPARTMENTS[number]
  kpis: KpiWithVariance[]
}) {
  const hasKpis = kpis.length > 0

  // Use real avg when KPIs are loaded, otherwise fall back to last dummy value
  const dummySparkline = DUMMY_SPARKLINES[dept.id] ?? [60, 70, 80, 90]
  const avgPct = hasKpis
    ? kpis.reduce((sum, k) => sum + k.variance.pct, 0) / kpis.length
    : dummySparkline[dummySparkline.length - 1]

  const color = overallColor(avgPct)
  const topColor = HEX_COLORS[color]
  const fillPct = Math.min(Math.max(avgPct, 0), 100)

  // Use real sparkline when available, else dummy (3 values = Jan/Feb/Mar of Q1)
  const sparklineData = hasKpis
    ? kpis.slice(-3).map(k => k.variance.pct)
    : dummySparkline

  return (
    <Link
      href={`/dashboard?pillar=${dept.id}`}
      className="block rounded-2xl border transition-all hover:-translate-y-[3px] flex flex-col gap-3 p-5"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        borderTop: `3px solid ${topColor}`,
        boxShadow: 'var(--card-shadow)',
        textDecoration: 'none',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--card-shadow)')}
    >
      {/* Header: icon + dept name */}
      <div className="flex items-start justify-between gap-2">
        <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>{dept.icon}</span>
        <p
          className="font-cairo text-[13px] font-semibold leading-snug text-right"
          style={{ color: 'var(--ink)' }}
        >
          {dept.labelAr}
        </p>
      </div>

      {/* Body: sparkline + big Fraunces % */}
      <div className="flex items-end justify-between gap-2">
        <div className="h-10 flex-shrink-0" style={{ width: '88px' }}>
          <SparklineChart data={sparklineData} color={color} />
        </div>
        <p
          className="font-fraunces font-medium leading-none flex-shrink-0"
          style={{
            fontSize: '36px',
            color: 'var(--ink)',
            letterSpacing: '-.02em',
          }}
        >
          {avgPct.toFixed(0)}%
        </p>
      </div>

      {/* Footer: variance label + KPI count + progress bar */}
      <div
        className="flex flex-col gap-1.5 pt-3 border-t"
        style={{ borderColor: 'var(--hair)' }}
      >
        <div className="flex items-center justify-between">
          <span
            className="font-jb text-[11px] font-medium"
            style={{ color: PCT_COLORS[color] }}
          >
            {avgPct.toFixed(1)}%
          </span>
          <span className="font-jb text-[10px]" style={{ color: 'var(--ink-muted)' }}>
            {hasKpis ? `${kpis.length} مؤشر` : 'بيانات تجريبية'}
          </span>
        </div>

        {/* Progress track */}
        <div
          className="h-1 w-full rounded-full overflow-hidden"
          style={{ background: 'var(--hair)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${fillPct}%`,
              background: topColor,
              transition: 'width .4s ease',
            }}
          />
        </div>
      </div>
    </Link>
  )
}

export function DeptOverview() {
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'
  const period = params.get('period') ?? 'ANNUAL'

  const { data: kpis, isLoading } = useQuery<KpiWithVariance[]>({
    queryKey: ['kpis', year, period],
    queryFn: () =>
      fetch(`/api/kpis?year=${year}&period=${period}`).then(r => {
        if (!r.ok) throw new Error(`API ${r.status}`)
        return r.json()
      }),
  })

  const byDept = Object.fromEntries(
    DEPARTMENTS.map(d => [
      d.id,
      (kpis ?? []).filter(k => k.pillar === d.id),
    ])
  )

  return (
    <div>
      <p
        className="font-space font-semibold text-[10px] tracking-[.14em] uppercase mb-4"
        style={{ color: 'var(--ink-muted)' }}
      >
        الإدارات
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {DEPARTMENTS.map(dept => (
          <DeptCard
            key={dept.id}
            dept={dept}
            kpis={isLoading ? [] : (byDept[dept.id] ?? [])}
          />
        ))}
      </div>
    </div>
  )
}
