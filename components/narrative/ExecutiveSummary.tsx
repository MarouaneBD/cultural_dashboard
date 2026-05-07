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
      <div
        className="rounded-2xl border p-5"
        style={{ background: '#fff5f5', borderColor: '#fecaca' }}
      >
        <p className="text-sm" style={{ color: '#dc2626' }}>تعذّر تحميل الملخص التنفيذي</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        className="h-20 rounded-2xl animate-pulse"
        style={{ background: 'var(--bg-alt)' }}
      />
    )
  }

  const text = generateNarrative(kpis ?? [])
  const redCount   = (kpis ?? []).filter(k => k.variance.color === 'red').length
  const amberCount = (kpis ?? []).filter(k => k.variance.color === 'amber').length
  const greenCount = (kpis ?? []).filter(k => k.variance.color === 'green').length

  return (
    <div
      className="rounded-2xl border p-5 flex items-start gap-4 mb-6"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* Icon chip */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base border"
        style={{
          background: 'rgba(15,64,36,.07)',
          borderColor: 'rgba(15,64,36,.12)',
        }}
        aria-hidden="true"
      >
        ✦
      </div>

      <div className="flex-1 min-w-0">
        {/* Label */}
        <p
          className="font-space font-semibold text-[10px] tracking-[.12em] uppercase mb-2"
          style={{ color: 'var(--gold)' }}
        >
          الملخص التنفيذي
        </p>

        {/* Status badges */}
        <div className="flex gap-4 text-[11px] mb-2.5" style={{ color: 'var(--ink-muted)' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full inline-block bg-[#22c55e]" />
            {greenCount} على المسار
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full inline-block bg-[#f59e0b]" />
            {amberCount} تحتاج متابعة
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full inline-block bg-[#ef4444]" />
            {redCount} تحتاج تدخل
          </span>
        </div>

        {/* Narrative text */}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
          {text}
        </p>
      </div>
    </div>
  )
}
