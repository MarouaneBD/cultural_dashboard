'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { KpiGrid } from '@/components/kpi/KpiGrid'
import { DeptOverview } from '@/components/kpi/DeptOverview'
import { DivisionStats } from '@/components/kpi/DivisionStats'
import { DrillDownModal } from '@/components/kpi/DrillDownModal'
import { ExecutiveSummary } from '@/components/narrative/ExecutiveSummary'
import { ExportButton } from '@/components/ExportButton'
import { DepartmentDashboard } from '@/components/department/DepartmentDashboard'
import { DEPT_MAP } from '@/lib/departments'
import { DEPT_DASHBOARDS } from '@/data/departments/registry'
import type { KpiWithVariance, PillarId } from '@/types'

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-[12px] transition-colors"
      style={{ color: 'var(--ink-muted)' }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-muted)')}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        {/* RTL: arrow points right (back = forward in LTR) */}
        <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      جميع الإدارات
    </button>
  )
}

export function DashboardContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [selectedKpi, setSelectedKpi] = useState<KpiWithVariance | null>(null)

  const pillarParam = params.get('pillar') as PillarId | null
  const activeDept = pillarParam ? DEPT_MAP[pillarParam] : null
  const title = activeDept?.labelAr ?? 'لوحة تحكم قطاع الثقافة'

  function goHome() {
    const next = new URLSearchParams(params.toString())
    next.delete('pillar')
    router.push(`/dashboard?${next.toString()}`)
  }

  return (
    <AppShell
      title={title}
      actions={<Suspense fallback={null}><ExportButton /></Suspense>}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {pillarParam ? (
          /* ── Dept detail view ── */
          <>
            <BackButton onClick={goHome} />
            <DepartmentDashboard config={DEPT_DASHBOARDS[pillarParam]} pillarId={pillarParam} />
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
            <Suspense fallback={
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Array.from({ length: 7 }).map((_, i) => (
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
