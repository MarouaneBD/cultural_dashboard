'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { DEPARTMENTS } from '@/lib/departments'
import { SparklineChart } from '@/components/charts/SparklineChart'
import type { KpiWithVariance } from '@/types'

function DeptCard({
  dept,
  kpis,
}: {
  dept: typeof DEPARTMENTS[number]
  kpis: KpiWithVariance[]
}) {
  const hasKpis = kpis.length > 0
  const color = dept.color

  const avgPct = hasKpis
    ? kpis.reduce((sum, k) => sum + k.variance.pct, 0) / kpis.length
    : 0

  const sparklineData = hasKpis
    ? kpis.slice(-4).map(k => k.variance.pct)
    : []

  const fillPct = Math.min(Math.max(avgPct, 0), 100)

  return (
    <Link
      href={`/dashboard?pillar=${dept.id}`}
      className="block rounded-2xl border transition-all hover:-translate-y-[3px] flex flex-col gap-3 p-5"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        borderTop: `3px solid ${color}`,
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

      {/* Body: sparkline + big % (only when real data exists) */}
      <div className="flex items-end justify-between gap-2">
        <div className="h-10 flex-shrink-0" style={{ width: '88px' }}>
          {sparklineData.length > 0
            ? <SparklineChart data={sparklineData} color={color} />
            : <div className="w-full h-full rounded" style={{ background: `${color}18` }} />
          }
        </div>
        <p
          className="font-fraunces font-medium leading-none flex-shrink-0"
          style={{ fontSize: '36px', color: 'var(--ink)', letterSpacing: '-.02em' }}
        >
          {hasKpis ? `${avgPct.toFixed(0)}%` : '—'}
        </p>
      </div>

      {/* Footer: progress bar + KPI count */}
      <div className="flex flex-col gap-1.5 pt-3 border-t" style={{ borderColor: 'var(--hair)' }}>
        <div className="flex items-center justify-between">
          <span className="font-jb text-[11px] font-medium" style={{ color }}>
            {hasKpis ? `${avgPct.toFixed(1)}%` : '—'}
          </span>
          <span className="font-jb text-[10px]" style={{ color: 'var(--ink-muted)' }}>
            {hasKpis ? `${kpis.length} نشاط` : 'لا توجد بيانات'}
          </span>
        </div>

        <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'var(--hair)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${fillPct}%`, background: color, transition: 'width .4s ease' }}
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
  const { data: session, status } = useSession()

  const { data: kpis, isLoading } = useQuery<KpiWithVariance[]>({
    queryKey: ['kpis', year, period],
    queryFn: () =>
      fetch(`/api/kpis?year=${year}&period=${period}`).then(r => {
        if (!r.ok) throw new Error(`API ${r.status}`)
        return r.json()
      }),
  })

  const byDept = Object.fromEntries(
    DEPARTMENTS.map(d => [d.id, (kpis ?? []).filter(k => k.pillar === d.id)])
  )

  // Assigned EDITOR sees only their department; everyone else sees all
  const role = status !== 'loading' ? (session?.user as any)?.role as string | undefined : undefined
  const assignedPillarId = (session?.user as any)?.assignedPillarId as string | null | undefined
  const visibleDepts = (role === 'EDITOR' && assignedPillarId)
    ? DEPARTMENTS.filter(d => d.id === assignedPillarId)
    : DEPARTMENTS

  return (
    <div>
      <p
        className="font-space font-semibold text-[10px] tracking-[.14em] uppercase mb-4"
        style={{ color: 'var(--ink-muted)' }}
      >
        الوحدات التنظيمية
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visibleDepts.map(dept => (
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
