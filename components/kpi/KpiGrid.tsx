'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { KpiCard } from './KpiCard'
import type { KpiWithVariance, PillarId } from '@/types'

const PILLAR_LABELS: Record<PillarId, string> = {
  ISLAMIC_EDUCATION: 'التعليم الإسلامي',
  HOLY_QURAN: 'القرآن الكريم',
  TEACHER_SPONSORSHIP: 'كفالة المعلمين',
  UNIVERSITY_SPONSORSHIP: 'المنح الجامعية',
}

const PILLAR_ORDER: PillarId[] = [
  'ISLAMIC_EDUCATION',
  'HOLY_QURAN',
  'TEACHER_SPONSORSHIP',
  'UNIVERSITY_SPONSORSHIP',
]

interface KpiGridProps {
  onKpiClick?: (kpi: KpiWithVariance) => void
}

export function KpiGrid({ onKpiClick }: KpiGridProps) {
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'
  const period = params.get('period') ?? 'ANNUAL'

  const { data: kpis, isLoading, error } = useQuery<KpiWithVariance[]>({
    queryKey: ['kpis', year, period],
    queryFn: () =>
      fetch(`/api/kpis?year=${year}&period=${period}`).then(r => {
        if (!r.ok) throw new Error('Failed to fetch KPIs')
        return r.json()
      }),
  })

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        تعذّر تحميل بيانات المؤشرات. يرجى المحاولة مجدداً.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        {PILLAR_ORDER.map(pillar => (
          <section key={pillar}>
            <div className="h-4 w-32 bg-slate-100 rounded animate-pulse mb-3" />
            <div className="grid grid-cols-2 gap-4">
              {[0, 1].map(i => (
                <div key={i} className="h-40 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {PILLAR_ORDER.map(pillar => {
        const pillarKpis = (kpis ?? []).filter(k => k.pillar === pillar)
        if (!pillarKpis.length) return null
        return (
          <section key={pillar}>
            <h3 className="text-sm font-semibold text-slate-500 mb-3 border-b border-[--border] pb-2">
              {PILLAR_LABELS[pillar]}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {pillarKpis.map(kpi => (
                <KpiCard
                  key={kpi.id}
                  kpi={kpi}
                  onClick={() => onKpiClick?.(kpi)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
