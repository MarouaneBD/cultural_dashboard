'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL'] as const
type Quarter = typeof QUARTERS[number]

const LABELS: Record<Quarter, string> = {
  Q1: 'Q1',
  Q2: 'Q2',
  Q3: 'Q3',
  Q4: 'Q4',
  ANNUAL: 'سنوي',
}

export function PeriodControls() {
  const router = useRouter()
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'
  const rawPeriod = params.get('period') ?? 'ANNUAL'
  const period: Quarter = (QUARTERS as readonly string[]).includes(rawPeriod)
    ? (rawPeriod as Quarter)
    : 'ANNUAL'

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    next.set(key, value)
    router.push(`?${next.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={year}
        onChange={e => update('year', e.target.value)}
        dir="ltr"
        className="font-jb text-[11px] rounded-full px-3 py-1 border transition-colors"
        style={{
          background: 'var(--hair)',
          borderColor: 'var(--border)',
          color: 'var(--ink-muted)',
        }}
        aria-label="السنة"
      >
        {[2024, 2025, 2026].map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      {/* Desktop: pill buttons */}
      <div className="hidden sm:flex items-center gap-1">
        {QUARTERS.map(q => (
          <button
            key={q}
            onClick={() => update('period', q)}
            className="font-jb text-[11px] px-3 py-1 rounded-full border transition-colors"
            style={
              period === q
                ? { background: 'var(--accent)', color: '#fdfcfa', borderColor: 'var(--accent)' }
                : { background: 'var(--hair)', borderColor: 'var(--border)', color: 'var(--ink-muted)' }
            }
          >
            {LABELS[q]}
          </button>
        ))}
      </div>

      {/* Mobile: compact select */}
      <select
        value={period}
        onChange={e => update('period', e.target.value)}
        dir="ltr"
        className="sm:hidden font-jb text-[11px] rounded-full px-3 py-1 border transition-colors"
        style={{
          background: 'var(--accent)',
          borderColor: 'var(--accent)',
          color: '#fdfcfa',
        }}
        aria-label="الفترة"
      >
        {QUARTERS.map(q => (
          <option key={q} value={q}>{LABELS[q]}</option>
        ))}
      </select>
    </div>
  )
}
