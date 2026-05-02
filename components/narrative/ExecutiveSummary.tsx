'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { generateNarrative } from '@/lib/narrative'
import type { KpiWithVariance } from '@/types'

export function ExecutiveSummary() {
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'
  const period = params.get('period') ?? 'ANNUAL'

  const { data: kpis, error, isLoading } = useQuery<KpiWithVariance[]>({
    queryKey: ['kpis', year, period],
    queryFn: () => fetch(`/api/kpis?year=${year}&period=${period}`).then(r => r.json()),
  })

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm text-red-600">تعذّر تحميل الملخص التنفيذي</p>
      </div>
    )
  }

  if (isLoading) {
    return <div className="h-24 rounded-xl bg-slate-100 animate-pulse" />
  }

  const text = generateNarrative(kpis ?? [])

  const redCount = (kpis ?? []).filter(k => k.variance.color === 'red').length
  const amberCount = (kpis ?? []).filter(k => k.variance.color === 'amber').length
  const greenCount = (kpis ?? []).filter(k => k.variance.color === 'green').length

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {greenCount} على المسار
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            {amberCount} تحتاج متابعة
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            {redCount} تحتاج تدخل
          </span>
        </div>
        <h2 className="text-sm font-semibold text-slate-600">الملخص التنفيذي</h2>
      </div>
      <p className="text-sm leading-relaxed text-slate-700">{text}</p>
    </div>
  )
}
