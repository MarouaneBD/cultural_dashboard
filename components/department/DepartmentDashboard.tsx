'use client'

import { Upload } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { LastYearReview } from './LastYearReview'
import { CurrentYearTracker } from './CurrentYearTracker'
import { InsightsPanel } from './InsightsPanel'
import { generateInsights } from '@/lib/insights'
import { DEPT_DASHBOARDS } from '@/data/departments/registry'
import type { DeptData } from '@/types/department'
import type { PillarId } from '@/types'

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

  const { data: dbData } = useQuery<DeptData | null>({
    queryKey: ['dept', pillarId],
    queryFn: () =>
      fetch(`/api/departments/${pillarId}`).then(r => {
        if (!r.ok) throw new Error(`API ${r.status}`)
        return r.json()
      }),
  })

  const data = dbData ?? staticData
  const insights = generateInsights(data)

  return (
    <div className="space-y-8">
      {/* ── Page header ─────────────────────────────────────────────────── */}
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
              {data.lastYear.year} — {data.currentYear.year} · لوحة الأداء
            </p>
          </div>
        </div>

        {/* Upload button — disabled placeholder */}
        <button
          disabled
          title="رفع ملف البيانات — قريباً"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium cursor-not-allowed opacity-50"
          style={{ background: 'var(--bg-alt)', color: 'var(--ink-muted)', border: '1px solid var(--border)' }}
        >
          <Upload size={14} />
          <span>رفع ملف البيانات</span>
        </button>
      </div>

      {/* ── Last year review ─────────────────────────────────────────────── */}
      <LastYearReview
        data={data.lastYear}
        currentYear={data.currentYear}
        accentColor={color}
      />

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div className="border-t" style={{ borderColor: 'var(--border)' }} />

      {/* ── Current year tracker ─────────────────────────────────────────── */}
      <CurrentYearTracker data={data.currentYear} accentColor={color} />

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div className="border-t" style={{ borderColor: 'var(--border)' }} />

      {/* ── Insights ─────────────────────────────────────────────────────── */}
      <InsightsPanel insights={insights} />
    </div>
  )
}
