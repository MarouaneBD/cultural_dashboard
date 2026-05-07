'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { KpiCard } from './KpiCard'
import type { KpiWithVariance, PillarId } from '@/types'

interface KpiGridProps {
  pillar: PillarId
  onKpiClick?: (kpi: KpiWithVariance) => void
}

export function KpiGrid({ pillar, onKpiClick }: KpiGridProps) {
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'
  const period = params.get('period') ?? 'ANNUAL'

  const { data: kpis, isLoading, error } = useQuery<KpiWithVariance[]>({
    queryKey: ['kpis', year, period, pillar],
    queryFn: () =>
      fetch(`/api/kpis?year=${year}&period=${period}&pillar=${pillar}`).then(r => {
        if (!r.ok) throw new Error('Failed to fetch KPIs')
        return r.json()
      }),
  })

  if (error) {
    return (
      <div className="rounded-2xl border p-5 text-sm" style={{ background: '#fff5f5', borderColor: '#fecaca', color: '#dc2626' }}>
        تعذّر تحميل بيانات المؤشرات. يرجى المحاولة مجدداً.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-40 rounded-2xl animate-pulse" style={{ background: 'var(--bg-alt)' }} />
        ))}
      </div>
    )
  }

  const list = kpis ?? []

  if (!list.length) {
    return (
      <div
        className="rounded-2xl border p-10 text-center"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
      >
        <p className="text-2xl mb-3">📋</p>
        <p className="font-cairo text-[14px] font-semibold mb-1" style={{ color: 'var(--ink)' }}>
          لا تتوفر مؤشرات بعد
        </p>
        <p className="font-cairo text-[12px]" style={{ color: 'var(--ink-muted)' }}>
          يمكن إضافة المؤشرات عبر صفحة رفع البيانات
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {list.map(kpi => (
        <KpiCard
          key={kpi.id}
          kpi={kpi}
          onClick={() => onKpiClick?.(kpi)}
        />
      ))}
    </div>
  )
}
