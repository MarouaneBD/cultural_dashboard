'use client'

import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import type { CategoryTotal, TotalsResponse } from '@/app/api/stats/totals/route'

// ── Category routing ───────────────────────────────────────────────────────
const STANDALONE_PATTERNS = ['مستفيد', 'اصدار', 'إصدار']

const SEGMENT_COLORS = [
  '#0f4024',  // dark green  (outermost / largest)
  '#b8822a',  // gold
  '#0891b2',  // cyan
  '#7c3aed',  // violet
  '#be185d',  // pink
  '#059669',  // emerald
  '#0369a1',  // blue
]

function matchesAny(cat: string, patterns: string[]) {
  return patterns.some(p => cat.includes(p))
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)} الف`
  return n.toLocaleString('en')
}

function fmtCard(n: number, category: string): string {
  if (category.includes('اصدار') || category.includes('إصدار')) {
    if (n >= 1_000) return `${Math.round(n / 1_000)} الف`
    return Math.round(n).toLocaleString('en')
  }
  if (category.includes('مستفيد')) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} مليون`
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)} الف`
    return n.toLocaleString('en')
  }
  return fmt(n)
}

function fmtAed(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} مليون`
  if (n >= 1_000)     return `${Math.round(n / 1_000).toLocaleString('en')} الف`
  return n.toLocaleString('en')
}

// ── Concentric rings SVG ───────────────────────────────────────────────────
function ConcentricRings({
  segments,
  total,
  size = 220,
}: {
  segments: Array<{ label: string; value: number; color: string }>
  total: number
  size: number
}) {
  const cx    = size / 2
  const SW    = 9    // stroke width
  const GAP   = 5    // gap between rings
  const STEP  = SW + GAP
  const maxR  = cx - SW / 2 - 6   // leave a small outer margin

  return (
    <div style={{ width: size, maxWidth: '100%', aspectRatio: '1', flexShrink: 0 }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const r    = maxR - i * STEP
          if (r < 12) return null
          const circ = 2 * Math.PI * r
          const pct  = total > 0 ? seg.value / total : 0
          const dash = pct * circ

          return (
            <g key={i}>
              {/* Track */}
              <circle
                cx={cx} cy={cx} r={r}
                fill="none"
                stroke="rgba(35,34,31,.07)"
                strokeWidth={SW}
              />
              {/* Filled arc */}
              <circle
                cx={cx} cy={cx} r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={SW}
                strokeLinecap="round"
                strokeDasharray={`${dash.toFixed(2)} ${(circ - dash).toFixed(2)}`}
                transform={`rotate(-90 ${cx} ${cx})`}
                style={{ transition: 'stroke-dasharray .7s ease' }}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Revenue card ───────────────────────────────────────────────────────────
const REVENUE_COLOR = '#b8822a'  // gold — matches the dirham visual identity

function RevenueCard({ total }: { total: number }) {
  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-3"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        borderTop: `3px solid ${REVENUE_COLOR}`,
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
      {/* Category name */}
      <p className="font-cairo text-[13px] leading-snug text-right" style={{ color: 'var(--ink-soft)' }}>
        الإيرادات
      </p>

      {/* Big number with د.إ sign */}
      <p
        className="font-fraunces font-medium leading-none text-right"
        style={{ fontSize: '38px', color: 'var(--ink)', letterSpacing: '-.02em' }}
      >
        <span className="font-cairo" style={{ fontSize: '22px', color: REVENUE_COLOR, marginLeft: 6 }}>
          د.إ
        </span>
        {fmtAed(total)}
      </p>
    </div>
  )
}

// ── Stakeholders card ──────────────────────────────────────────────────────
function StakeholdersCard({
  items,
  year,
}: {
  items: Array<CategoryTotal & { segColor: string }>
  year: string
}) {
  const total = items.reduce((s, d) => s + d.total, 0)

  const segments = items.map(d => ({
    label: d.category,
    value: d.total,
    color: d.segColor,
  }))

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        borderTop: '3px solid #0f4024',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* Card header */}
      <p
        className="font-space font-semibold text-[10px] tracking-[.14em] uppercase mb-5"
        style={{ color: 'var(--ink-muted)' }}
      >
        أصحاب المصلحة · {year}
      </p>

      {/* Body: rings top on mobile, side-by-side on sm+ */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
        <ConcentricRings segments={segments} total={total} size={220} />

        {/* Legend */}
        <div className="flex-1 flex flex-col min-w-0 w-full">
          <ul className="flex flex-col gap-3">
            {items.map((d, i) => {
              const pct = total > 0 ? Math.round((d.total / total) * 100) : 0
              return (
                <li key={i} className="flex items-center gap-2.5 min-w-0">
                  {/* Ring indicator dot */}
                  <span
                    className="flex-shrink-0 rounded-full"
                    style={{ width: 9, height: 9, background: d.segColor, boxShadow: `0 0 0 2px ${d.segColor}30` }}
                  />
                  {/* Name */}
                  <span
                    className="font-cairo text-[12.5px] leading-snug flex-1 truncate text-right"
                    style={{ color: 'var(--ink)' }}
                  >
                    {d.category}
                  </span>
                  {/* Number */}
                  <span
                    className="font-jb text-[11px] font-semibold flex-shrink-0"
                    style={{ color: d.segColor }}
                  >
                    {fmt(d.total)}
                  </span>
                  {/* Pct badge */}
                  <span
                    className="font-jb text-[10px] flex-shrink-0 rounded-md px-1.5 py-0.5"
                    style={{ background: `${d.segColor}15`, color: d.segColor, minWidth: 36, textAlign: 'center' }}
                  >
                    {pct}%
                  </span>
                </li>
              )
            })}
          </ul>

          {/* Total row */}
          <div
            className="flex items-center justify-between mt-4 pt-3"
            style={{ borderTop: '1px solid var(--hair)' }}
          >
            <span className="font-cairo text-[11px]" style={{ color: 'var(--ink-muted)' }}>
              الإجمالي
            </span>
            <span
              className="font-fraunces font-semibold leading-none"
              style={{ fontSize: 20, color: 'var(--ink)', letterSpacing: '-.02em' }}
            >
              {fmt(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Standalone number card (اصدار / مستفيد) ───────────────────────────────
function StandaloneCard({ item }: { item: CategoryTotal }) {
  const { color } = item

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-3"
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
      {/* Category name */}
      <p className="font-cairo text-[13px] leading-snug text-right" style={{ color: 'var(--ink-soft)' }}>
        {item.category}
      </p>

      {/* Big number */}
      <p
        className="font-fraunces font-medium leading-none text-right"
        style={{ fontSize: '38px', color: 'var(--ink)', letterSpacing: '-.02em' }}
      >
        {fmtCard(item.total, item.category)}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--hair)' }}>
        <span className="font-jb text-[11px] font-medium" style={{ color }}>
          {item.target > 0 ? `${Math.round(Math.min((item.total / item.target) * 100, 100))}%` : '—'}
        </span>
        <span className="font-jb text-[10px]" style={{ color: 'var(--ink-muted)' }}>
          {item.target > 0 ? `المستهدف ${fmt(item.target)}` : 'إجمالي'}
        </span>
      </div>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className={`grid gap-4 grid-cols-1 sm:grid-cols-[2fr_1fr]`}>
        <div className="rounded-2xl border p-5 animate-pulse" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', height: 280 }} />
        <div className="flex flex-col gap-4">
          {[0, 1].map(i => (
            <div key={i} className="rounded-2xl border p-4 animate-pulse flex-1" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export function BeneficiaryChart() {
  const params = useSearchParams()
  const year   = params.get('year') ?? '2026'

  const { data, isLoading } = useQuery<TotalsResponse>({
    queryKey: ['stats-totals', year],
    queryFn: () =>
      fetch(`/api/stats/totals?year=${year}`).then(r => {
        if (!r.ok) throw new Error(`API ${r.status}`)
        return r.json()
      }),
  })

  if (isLoading) return <Skeleton />

  const { categories = [], revenue } = data ?? { categories: [], revenue: null }
  if (!categories.length && !revenue) return null

  const stakeholderItems = categories
    .filter(d => !matchesAny(d.category, STANDALONE_PATTERNS))
    .map((d, i) => ({ ...d, segColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }))

  const standaloneItems = categories.filter(d => matchesAny(d.category, STANDALONE_PATTERNS))

  const hasStakeholders = stakeholderItems.some(d => d.total > 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Activity rings + standalone cards */}
      <div
        className={`grid gap-4 grid-cols-1${hasStakeholders && standaloneItems.length ? ' sm:grid-cols-[2fr_1fr]' : ''}`}
      >
        {hasStakeholders && <StakeholdersCard items={stakeholderItems} year={year} />}

        {standaloneItems.length > 0 && (
          <div className="flex flex-col gap-4">
            {standaloneItems.map(item => (
              <StandaloneCard key={item.category} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Revenue card — full width, below activity section */}
      {revenue && (
        <RevenueCard total={revenue.total} />
      )}
    </div>
  )
}
