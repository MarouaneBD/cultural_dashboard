'use client'

import { useSearchParams } from 'next/navigation'

export function ExportButton() {
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'
  const period = params.get('period') ?? 'ANNUAL'

  return (
    <a
      href={`/api/export/pdf?year=${year}&period=${period}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
    >
      تصدير PDF
    </a>
  )
}
