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
      className="font-space font-medium text-xs px-3 py-1.5 rounded-md border transition-colors"
      style={{
        borderColor: 'var(--border)',
        background: 'transparent',
        color: 'var(--ink-soft)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--card-bg)'
        e.currentTarget.style.borderColor = 'var(--ink)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      تصدير PDF
    </a>
  )
}
