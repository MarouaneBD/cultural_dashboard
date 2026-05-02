'use client'

import { AppShell } from '@/components/layout/AppShell'
import { KpiGrid } from '@/components/kpi/KpiGrid'
import { useState, Suspense } from 'react'
import type { KpiWithVariance } from '@/types'

export default function DashboardPage() {
  const [selectedKpi, setSelectedKpi] = useState<KpiWithVariance | null>(null)

  return (
    <AppShell title="لوحة المتابعة التنفيذية">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* ExecutiveSummary added in Task 13 */}
        <Suspense fallback={<div className="h-40 rounded-xl bg-slate-100 animate-pulse" />}>
          <KpiGrid onKpiClick={setSelectedKpi} />
        </Suspense>
        {/* DrillDownModal added in Task 9 */}
      </div>
    </AppShell>
  )
}
