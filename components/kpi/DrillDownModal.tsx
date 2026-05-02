'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { COLOR_CLASSES, formatVariancePct } from '@/lib/kpi'
import type { KpiWithVariance, DrillDownRow } from '@/types'

interface DrillDownModalProps {
  kpi: KpiWithVariance
  onClose: () => void
}

export function DrillDownModal({ kpi, onClose }: DrillDownModalProps) {
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'
  const period = params.get('period') ?? 'ANNUAL'

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const { data: rows, isLoading, error } = useQuery<DrillDownRow[]>({
    queryKey: ['drill-down', kpi.id, year, period],
    queryFn: () =>
      fetch(`/api/kpis/${kpi.id}?year=${year}&period=${period}`).then(r => {
        if (!r.ok) throw new Error('Failed to load drill-down data')
        return r.json()
      }),
  })

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drill-down-title"
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[--border]">
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="text-slate-400 hover:text-slate-700 text-xl leading-none w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
          <h3 id="drill-down-title" className="font-bold text-lg text-[--text]">{kpi.nameAr}</h3>
        </div>

        {/* Body */}
        <div className="overflow-auto flex-1 p-6">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 text-center py-4">
              تعذّر تحميل التفاصيل الإقليمية.
            </p>
          )}

          {!isLoading && !error && rows && rows.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">
              لا توجد بيانات إقليمية لهذا المؤشر.
            </p>
          )}

          {!isLoading && !error && rows && rows.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 border-b border-[--border]">
                  <th className="text-right pb-3 font-medium">المنطقة</th>
                  <th className="text-right pb-3 font-medium">الفعلي</th>
                  <th className="text-right pb-3 font-medium">المستهدف</th>
                  <th className="text-right pb-3 font-medium">نسبة الإنجاز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border]">
                {rows.map((row, i) => (
                  <tr key={i} className={`${COLOR_CLASSES[row.variance.color]} border-none`}>
                    <td className="py-2.5 font-medium">{row.region}</td>
                    <td className="py-2.5 tabular-nums">
                      {row.actual.toLocaleString('ar-AE')}
                    </td>
                    <td className="py-2.5 tabular-nums">
                      {row.target.toLocaleString('ar-AE')}
                    </td>
                    <td className="py-2.5 font-bold tabular-nums">
                      {formatVariancePct(row.variance.pct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
