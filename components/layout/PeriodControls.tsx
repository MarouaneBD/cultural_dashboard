'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL'] as const
type Quarter = typeof QUARTERS[number]

const LABELS: Record<Quarter, string> = {
  Q1: 'ر١',
  Q2: 'ر٢',
  Q3: 'ر٣',
  Q4: 'ر٤',
  ANNUAL: 'سنوي',
}

export function PeriodControls() {
  const router = useRouter()
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'
  const period = (params.get('period') ?? 'ANNUAL') as Quarter

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    next.set(key, value)
    router.push(`?${next.toString()}`)
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <select
        value={year}
        onChange={e => update('year', e.target.value)}
        className="border border-[--border] rounded-md px-3 py-1.5 bg-white text-[--text] text-sm"
        aria-label="السنة"
      >
        {[2024, 2025, 2026].map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <div className="flex border border-[--border] rounded-md overflow-hidden">
        {QUARTERS.map(q => (
          <button
            key={q}
            onClick={() => update('period', q)}
            className={`px-3 py-1.5 text-xs transition-colors ${
              period === q
                ? 'bg-[#0f4024] text-white'
                : 'bg-white hover:bg-slate-50 text-[--text]'
            }`}
          >
            {LABELS[q]}
          </button>
        ))}
      </div>
    </div>
  )
}
