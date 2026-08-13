'use client'

import { useQuery } from '@tanstack/react-query'
import { CurrentYearTracker } from './CurrentYearTracker'
import { InsightsPanel } from './InsightsPanel'
import { generateInsights } from '@/lib/insights'
import { DEPT_DASHBOARDS } from '@/data/departments/registry'
import type { DeptData } from '@/types/department'
import type { PillarId } from '@/types'

function PageHeader({ nameAr, icon, color, year }: { nameAr: string; icon: string; color: string; year: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: `${color}18` }}
        >
          {icon}
        </span>
        <div>
          <h1 className="font-cairo text-[17px] font-bold leading-tight" style={{ color: 'var(--ink)' }}>
            {nameAr}
          </h1>
          <p className="font-space text-[10px] tracking-[.1em] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
            2025 — {year} · لوحة الأداء
          </p>
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton({ accentColor }: { accentColor: string }) {
  return (
    <div className="space-y-5">
      {/* Section label */}
      <div className="h-3 w-32 rounded-full animate-pulse" style={{ background: 'var(--hair)' }} />

      {/* Trend chart placeholder */}
      <div
        className="rounded-2xl border p-4 animate-pulse"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', height: 268 }}
      />

      {/* Activity cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="rounded-2xl border animate-pulse"
            style={{
              background: 'var(--card-bg)',
              borderColor: 'var(--border)',
              borderTop: `3px solid ${accentColor}40`,
              height: 200,
            }}
          />
        ))}
      </div>
    </div>
  )
}

export interface DeptConfig {
  nameAr: string
  icon: string
  color: string    // hex accent color for this dept
  data: DeptData
}

interface Props {
  pillarId: PillarId
}

export function DepartmentDashboard({ pillarId }: Props) {
  const config = DEPT_DASHBOARDS[pillarId]
  if (!config) return null
  const { nameAr, icon, color, data: staticData } = config

  const { data: dbData, isLoading } = useQuery<DeptData | null>({
    queryKey: ['dept', pillarId],
    queryFn: () =>
      fetch(`/api/departments/${pillarId}`).then(r => {
        if (!r.ok) throw new Error(`API ${r.status}`)
        return r.json()
      }),
  })

  // Show skeleton until the first fetch resolves — avoids flashing placeholder numbers
  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader nameAr={nameAr} icon={icon} color={color} year={2026} />
        <DashboardSkeleton accentColor={color} />
      </div>
    )
  }

  const data = dbData ?? staticData
  const insights = generateInsights(data)

  return (
    <div className="space-y-8">
      <PageHeader nameAr={nameAr} icon={icon} color={color} year={data.currentYear.year} />

      {/* ── Current year tracker ─────────────────────────────────────────── */}
      <CurrentYearTracker data={data.currentYear} accentColor={color} />

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div className="border-t" style={{ borderColor: 'var(--border)' }} />

      {/* ── Insights ─────────────────────────────────────────────────────── */}
      <InsightsPanel insights={insights} />
    </div>
  )
}
