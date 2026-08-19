'use client'

import { useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { KpiGrid } from '@/components/kpi/KpiGrid'
import { DeptOverview } from '@/components/kpi/DeptOverview'
import { DivisionStats } from '@/components/kpi/DivisionStats'
import { DrillDownModal } from '@/components/kpi/DrillDownModal'
import { ExecutiveSummary } from '@/components/narrative/ExecutiveSummary'
import { BeneficiaryChart } from '@/components/kpi/BeneficiaryChart'
import { DEPT_MAP } from '@/lib/departments'
import type { KpiWithVariance, PillarId } from '@/types'

// Lazy-loaded: keeps Recharts + all 7 dept data files out of the initial bundle
const DepartmentDashboard = dynamic(
  () => import('@/components/department/DepartmentDashboard').then(m => ({ default: m.DepartmentDashboard })),
  {
    loading: () => (
      <div className="space-y-8 animate-pulse">
        <div className="h-12 rounded-xl" style={{ background: 'var(--bg-alt)' }} />
        <div className="h-64 rounded-2xl" style={{ background: 'var(--bg-alt)' }} />
        <div className="h-64 rounded-2xl" style={{ background: 'var(--bg-alt)' }} />
      </div>
    ),
    ssr: false,
  }
)

function BackButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 text-[12px] transition-colors"
      style={{ color: 'var(--ink-muted)' }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-muted)')}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        {/* RTL: arrow points right (back = forward in LTR) */}
        <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      الرئيسية
    </Link>
  )
}

export function DashboardContent() {
  const params = useSearchParams()
  const [selectedKpi, setSelectedKpi] = useState<KpiWithVariance | null>(null)

  const pillarParam = params.get('pillar') as PillarId | null
  const activeDept = pillarParam ? DEPT_MAP[pillarParam] : null
  const title = activeDept?.labelAr ?? 'لوحة تحكم قطاع الثقافة'

  const homeHref = (() => {
    const next = new URLSearchParams(params.toString())
    next.delete('pillar')
    const qs = next.toString()
    return qs ? `/dashboard?${qs}` : '/dashboard'
  })()

  return (
    <AppShell
      title={title}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {pillarParam ? (
          /* ── Dept detail view ── */
          <>
            <BackButton href={homeHref} />
            <DepartmentDashboard pillarId={pillarParam} />
          </>
        ) : (
          /* ── Home overview ── */
          <>
            <DivisionStats />
            <Suspense fallback={
              <div className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--bg-alt)' }} />
            }>
              <ExecutiveSummary />
            </Suspense>
            <Suspense fallback={null}>
              <BeneficiaryChart />
            </Suspense>
            <Suspense fallback={
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: 'var(--bg-alt)' }} />
                ))}
              </div>
            }>
              <DeptOverview />
            </Suspense>
          </>
        )}

        {selectedKpi && (
          <Suspense fallback={null}>
            <DrillDownModal kpi={selectedKpi} onClose={() => setSelectedKpi(null)} />
          </Suspense>
        )}
      </div>
    </AppShell>
  )
}
