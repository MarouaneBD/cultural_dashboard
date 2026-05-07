'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { DEPARTMENTS } from '@/lib/departments'
import { HEX_COLORS } from '@/lib/kpi'
import type { KpiWithVariance, VarianceColor } from '@/types'

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
  const avgPct = hasKpis
    ? kpis.reduce((sum, k) => sum + k.variance.pct, 0) / kpis.length
    : 0
  const color = hasKpis ? overallColor(avgPct) : 'amber'
  const fillColor = HEX_COLORS[color]
  const fillPct = Math.min(Math.max(avgPct, 0), 100)

  return (
    <Link
      href={`/dashboard?pillar=${dept.id}`}
      className="block rounded-2xl border p-5 transition-all hover:-translate-y-[2px]"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        borderTop: `3px solid ${fillColor}`,
        boxShadow: 'var(--card-shadow)',
        textDecoration: 'none',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--card-shadow-hover)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--card-shadow)')}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <span style={{ fontSize: '24px', lineHeight: 1 }}>{dept.icon}</span>
        {hasKpis ? (
          <span
            className="font-jb text-[11px] font-medium"
            style={{ color: fillColor }}
          >
            {avgPct.toFixed(1)}%
          </span>
        ) : (
          <span className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>
            لا تتوفر مؤشرات
          </span>
        )}
      </div>

      {/* Name */}
      <p
        className="font-cairo text-[13px] font-semibold leading-snug mb-3 text-right"
        style={{ color: 'var(--ink)' }}
      >
        {dept.labelAr}
      </p>

      {/* KPI count */}
      <p className="font-jb text-[10px] mb-3 text-right" style={{ color: 'var(--ink-muted)' }}>
        {hasKpis ? `${kpis.length} مؤشر` : 'قيد الإعداد'}
      </p>

      {/* Progress track */}
      <div
        className="h-1 w-full rounded-full overflow-hidden"
        style={{ background: 'var(--hair)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: hasKpis ? `${fillPct}%` : '0%',
            background: fillColor,
          }}
        />
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
      fetch(`/api/kpis?year=${year}&period=${period}`).then(r => r.json()),
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {DEPARTMENTS.map(d => (
          <div
            key={d.id}
            className="h-36 rounded-2xl animate-pulse"
            style={{ background: 'var(--bg-alt)' }}
          />
        ))}
      </div>
    )
  }

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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {DEPARTMENTS.map(dept => (
          <DeptCard key={dept.id} dept={dept} kpis={byDept[dept.id] ?? []} />
        ))}
      </div>
    </div>
  )
}
