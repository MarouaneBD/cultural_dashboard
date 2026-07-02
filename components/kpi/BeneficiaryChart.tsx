'use client'

import type React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import type { CategoryTotal } from '@/app/api/stats/totals/route'

// ── Category routing config ────────────────────────────────────────────────
// Patterns matched with category.includes(pattern) — adjust to match your data
const STAKEHOLDER_PATTERNS = [
  'طالب', 'طلاب',
  'معلم', 'معلمين',
  'يتيم', 'أيتام', 'ايتام',
  'ختم',
  'مستفيد',
  'مسلم جديد', 'مسلمون', 'مسلم ج', 'أسلم',
]
const STANDALONE_PATTERNS = [
  'حلقة',
  'اصدار', 'إصدار',
]

// Fixed segment colors for the stakeholder donut (matches brand palette)
const SEGMENT_COLORS = [
  '#0f4024',  // dark green
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
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}ك`
  return n.toLocaleString('en')
}

// ── Multi-segment stacked-circles donut ────────────────────────────────────
interface Segment { value: number; color: string; label: string }

function MultiDonut({
  segments,
  size = 140,
  sw = 14,
}: {
  segments: Segment[]
  size?: number
  sw?: number
}) {
  const r = (size - sw) / 2
  const cx = size / 2
  const circ = 2 * Math.PI * r
  const total = segments.reduce((s, seg) => s + seg.value, 0)

  // Build slice positions
  let offset = 0
  const slices = segments.map(seg => {
    const dash = total > 0 ? (seg.value / total) * circ : 0
    const entry = { ...seg, dash, dashoffset: -offset }
    offset += dash
    return entry
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(35,34,31,.07)" strokeWidth={sw} />
      {/* Segments — each layer starts where the previous ended */}
      {slices.map((s, i) => (
        <circle
          key={i}
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={sw}
          strokeDasharray={`${s.dash.toFixed(2)} ${(circ - s.dash).toFixed(2)}`}
          strokeDashoffset={s.dashoffset.toFixed(2)}
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: 'stroke-dasharray .5s ease' }}
        />
      ))}
    </svg>
  )
}

// ── Single-arc progress donut (for standalone cards) ───────────────────────
function SingleArcDonut({
  pct,
  color,
  size = 88,
  sw = 9,
}: {
  pct: number
  color: string
  size?: number
  sw?: number
}) {
  const r = (size - sw) / 2
  const cx = size / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(pct / 100, 1) * circ

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(35,34,31,.07)" strokeWidth={sw} />
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={`${dash.toFixed(2)} ${(circ - dash).toFixed(2)}`}
        strokeDashoffset="0"
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: 'stroke-dasharray .5s ease' }}
      />
    </svg>
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
  const SIZE = 140

  const segments: Segment[] = items.map(d => ({
    value: d.total,
    color: d.segColor,
    label: d.category,
  }))

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-4"
      style={{
        background: 'var(--card-bg)',
        borderColor: 'var(--border)',
        borderTop: '3px solid #0f4024',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* Section label */}
      <p
        className="font-space font-semibold text-[10px] tracking-[.14em] uppercase"
        style={{ color: 'var(--ink-muted)' }}
      >
        أصحاب المصلحة · {year}
      </p>

      {/* Donut + legend */}
      <div className="flex items-center gap-5">
        {/* Donut with centre label */}
        <div style={{ position: 'relative', flexShrink: 0, width: SIZE, height: SIZE }}>
          <MultiDonut segments={segments} size={SIZE} sw={14} />
          <div
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <span
              className="font-fraunces font-medium leading-none"
              style={{ fontSize: 24, color: 'var(--ink)', letterSpacing: '-.02em' }}
            >
              {fmt(total)}
            </span>
            <span
              className="font-cairo text-[10px] mt-1"
              style={{ color: 'var(--ink-muted)' }}
            >
              إجمالي
            </span>
          </div>
        </div>

        {/* Legend */}
        <ul className="flex-1 flex flex-col gap-2.5 min-w-0">
          {items.map((d, i) => (
            <li key={i} className="flex items-center gap-2 min-w-0">
              <span
                className="flex-shrink-0 rounded-full"
                style={{ width: 8, height: 8, background: d.segColor }}
              />
              <span
                className="font-cairo text-[12px] leading-snug text-right flex-1 truncate"
                style={{ color: 'var(--ink)' }}
              >
                {d.category}
              </span>
              <span
                className="font-jb text-[11px] font-medium flex-shrink-0"
                style={{ color: d.segColor }}
              >
                {fmt(d.total)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── Standalone category card ───────────────────────────────────────────────
function StandaloneCard({ item }: { item: CategoryTotal }) {
  const { color } = item
  const pct = item.target > 0 ? Math.min((item.total / item.target) * 100, 100) : 0
  const SIZE = 88

  return (
    <div
      className="rounded-2xl border p-4 flex flex-col gap-3"
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
      {/* Header */}
      <p
        className="font-cairo text-[13px] leading-snug text-right"
        style={{ color: 'var(--ink-soft)' }}
      >
        {item.category}
      </p>

      {/* Donut + big number side by side */}
      <div className="flex items-center justify-between gap-3">
        <div style={{ position: 'relative', flexShrink: 0, width: SIZE, height: SIZE }}>
          <SingleArcDonut pct={pct} color={color} size={SIZE} sw={9} />
          {/* % in centre */}
          <div
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <span
              className="font-jb text-[13px] font-bold"
              style={{ color, letterSpacing: '-.01em' }}
            >
              {Math.round(pct)}%
            </span>
          </div>
        </div>

        <p
          className="font-fraunces font-medium leading-none flex-shrink-0"
          style={{ fontSize: '32px', color: 'var(--ink)', letterSpacing: '-.02em' }}
        >
          {fmt(item.total)}
        </p>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-2 border-t"
        style={{ borderColor: 'var(--hair)' }}
      >
        <span className="font-jb text-[11px] font-medium" style={{ color }}>
          {Math.round(pct)}%
        </span>
        <span className="font-jb text-[10px]" style={{ color: 'var(--ink-muted)' }}>
          المستهدف {fmt(item.target)}
        </span>
      </div>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
      <div
        className="rounded-2xl border p-5 animate-pulse"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', borderTop: '3px solid var(--hair)', height: 220 }}
      />
      <div className="flex flex-col gap-4">
        {[0, 1].map(i => (
          <div
            key={i}
            className="rounded-2xl border p-4 animate-pulse flex-1"
            style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', borderTop: '3px solid var(--hair)' }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────
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

  if (isLoading) return <Skeleton />

  const totals = data ?? []
  if (!totals.length) return null

  // Route each category
  const stakeholderItems = totals
    .filter(d => !matchesAny(d.category, STANDALONE_PATTERNS))
    .map((d, i) => ({ ...d, segColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }))

  const standaloneItems = totals.filter(d => matchesAny(d.category, STANDALONE_PATTERNS))

  const hasStakeholders = stakeholderItems.some(d => d.total > 0)

  if (!hasStakeholders && !standaloneItems.length) return null

  return (
    <div
      className="grid gap-4 grid-cols-1"
      style={
        hasStakeholders && standaloneItems.length
          ? { gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' } as React.CSSProperties
          : undefined
      }
    >
      {hasStakeholders && (
        <StakeholdersCard items={stakeholderItems} year={year} />
      )}

      {standaloneItems.length > 0 && (
        <div className="flex flex-col gap-4">
          {standaloneItems.map(item => (
            <StandaloneCard key={item.category} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
