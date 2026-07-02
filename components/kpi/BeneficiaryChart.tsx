'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import type { CategoryTotal } from '@/app/api/stats/totals/route'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}ك`
  return n.toLocaleString('en')
}

// Lightweight SVG donut — shows category's % share of grand total
function MiniDonut({ pct, color }: { pct: number; color: string }) {
  const r = 28
  const size = 72
  const cx = size / 2
  const circumference = 2 * Math.PI * r
  const dash = Math.min(pct / 100, 1) * circumference

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        {/* Track */}
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke="rgba(35,34,31,.07)"
          strokeWidth="7"
        />
        {/* Filled arc */}
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: 'stroke-dasharray .5s ease' }}
        />
      </svg>
      {/* Percentage overlay */}
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          className="font-jb text-[11px] font-bold"
          style={{ color, letterSpacing: '-.01em' }}
        >
          {Math.round(pct)}%
        </span>
      </div>
    </div>
  )
}

function CategoryCard({
  item,
  grandTotal,
}: {
  item: CategoryTotal
  grandTotal: number
}) {
  const pct = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0
  const { color } = item

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 border"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        borderTop: `3px solid ${color}`,
        boxShadow: 'var(--card-shadow)',
        transition: 'box-shadow .18s, transform .18s',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow-hover)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--card-shadow)'
        ;(e.currentTarget as HTMLElement).style.transform = 'none'
      }}
    >
      {/* Header: category name */}
      <p
        className="font-cairo text-[13px] leading-snug text-right"
        style={{ color: 'var(--ink-soft)' }}
      >
        {item.category}
      </p>

      {/* Body: mini donut + big total */}
      <div className="flex items-end justify-between gap-2">
        <MiniDonut pct={pct} color={color} />
        <p
          className="font-fraunces font-medium leading-none flex-shrink-0"
          style={{ fontSize: '34px', color: 'var(--ink)', letterSpacing: '-.02em' }}
        >
          {fmt(item.total)}
        </p>
      </div>

      {/* Footer: pct label + context */}
      <div
        className="flex items-center justify-between pt-3 border-t"
        style={{ borderColor: 'var(--hair)' }}
      >
        <span className="font-jb text-[11px] font-medium" style={{ color }}>
          {pct.toFixed(1)}%
        </span>
        <span className="font-jb text-[10px]" style={{ color: 'var(--ink-muted)' }}>
          من إجمالي المستفيدين
        </span>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl p-5 border animate-pulse"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', borderTop: '3px solid var(--hair)' }}
    >
      <div className="h-3 w-24 rounded mb-3 ms-auto" style={{ background: 'var(--bg-alt)' }} />
      <div className="flex items-end justify-between gap-2">
        <div className="rounded-full" style={{ width: 72, height: 72, background: 'var(--bg-alt)' }} />
        <div className="h-8 w-16 rounded" style={{ background: 'var(--bg-alt)' }} />
      </div>
      <div className="h-2 w-full rounded mt-4" style={{ background: 'var(--bg-alt)' }} />
    </div>
  )
}

export function BeneficiaryChart() {
  const params = useSearchParams()
  const year = params.get('year') ?? '2026'

  const { data, isLoading } = useQuery<CategoryTotal[]>({
    queryKey: ['stats-totals', year],
    queryFn: () =>
      fetch(`/api/stats/totals?year=${year}`).then(r => {
        if (!r.ok) throw new Error(`API ${r.status}`)
        return r.json()
      }),
  })

  const totals = data ?? []
  const grandTotal = totals.reduce((s, d) => s + d.total, 0)

  // Don't render the section at all if there's genuinely no data
  if (!isLoading && !totals.length) return null

  return (
    <div>
      {/* Section label */}
      <p
        className="font-space font-semibold text-[10px] tracking-[.14em] uppercase mb-4"
        style={{ color: 'var(--ink-muted)' }}
      >
        المستفيدون حسب الفئة · {year}
      </p>

      {/* Cards grid */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : totals.map(item => (
              <CategoryCard key={item.category} item={item} grandTotal={grandTotal} />
            ))}
      </div>
    </div>
  )
}
