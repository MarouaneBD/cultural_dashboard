'use client'

import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Building2, BarChart3, CheckCircle2, AlertCircle, XCircle, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { KpiWithVariance } from '@/types'

const PERIOD_LABELS: Record<string, string> = {
  ANNUAL: 'سنوي',
  Q1: 'الربع الأول',
  Q2: 'الربع الثاني',
  Q3: 'الربع الثالث',
  Q4: 'الربع الرابع',
}

type StatItem = {
  labelAr: string
  value: string
  Icon: LucideIcon
  note: string
  highlight?: boolean
  color?: string
  bgColor?: string
}

function buildStats(kpis: KpiWithVariance[]): StatItem[] {
  const green  = kpis.filter(k => k.variance.color === 'green').length
  const amber  = kpis.filter(k => k.variance.color === 'amber').length
  const red    = kpis.filter(k => k.variance.color === 'red').length
  const avg    = kpis.length
    ? Math.round(kpis.reduce((s, k) => s + k.variance.pct, 0) / kpis.length)
    : 0

  return [
    {
      labelAr: 'الوحدات التنظيمية',
      value: '8',
      Icon: Building2,
      note: 'departments',
    },
    {
      labelAr: 'المؤشرات',
      value: String(kpis.length),
      Icon: BarChart3,
      note: 'kpis',
    },
    {
      labelAr: 'على المسار',
      value: String(green),
      Icon: CheckCircle2,
      note: 'on-track',
      color: '#4ade80',
      bgColor: 'rgba(74,222,128,.18)',
    },
    {
      labelAr: 'تحتاج متابعة',
      value: String(amber),
      Icon: AlertCircle,
      note: 'at-risk',
      color: '#fbbf24',
      bgColor: 'rgba(251,191,36,.18)',
    },
    {
      labelAr: 'تحتاج تدخل',
      value: String(red),
      Icon: XCircle,
      note: 'critical',
      color: '#f87171',
      bgColor: 'rgba(248,113,113,.18)',
    },
    {
      labelAr: 'نسبة الإنجاز',
      value: `${avg}٪`,
      Icon: TrendingUp,
      note: 'completion',
      highlight: true,
    },
  ]
}

const SKELETON_STATS: StatItem[] = [
  { labelAr: 'الإدارات', value: '8', Icon: Building2, note: 'departments' },
  { labelAr: 'المؤشرات', value: '—', Icon: BarChart3, note: 'kpis' },
  { labelAr: 'على المسار', value: '—', Icon: CheckCircle2, note: 'on-track' },
  { labelAr: 'تحتاج متابعة', value: '—', Icon: AlertCircle, note: 'at-risk' },
  { labelAr: 'تحتاج تدخل', value: '—', Icon: XCircle, note: 'critical' },
  { labelAr: 'نسبة الإنجاز', value: '—', Icon: TrendingUp, note: 'completion', highlight: true },
]

export function DivisionStats() {
  const searchParams = useSearchParams()
  const year   = searchParams.get('year')   ?? '2026'
  const period = searchParams.get('period') ?? 'ANNUAL'
  const periodLabel = PERIOD_LABELS[period] ?? period

  const { data: kpis } = useQuery<KpiWithVariance[]>({
    queryKey: ['kpis', year, period],
    queryFn: () =>
      fetch(`/api/kpis?year=${year}&period=${period}`).then(r => {
        if (!r.ok) throw new Error(`API ${r.status}`)
        return r.json()
      }),
  })

  const stats = kpis ? buildStats(kpis) : SKELETON_STATS

  return (
    <div
      className="rounded-2xl overflow-hidden mb-6"
      style={{
        background: 'var(--sidebar-bg)',
        boxShadow: '0 4px 28px rgba(0,0,0,.20)',
      }}
    >
      {/* Header strip */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,.09)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-md flex items-center justify-center text-[10px]"
            style={{ background: 'rgba(184,130,42,.22)', color: 'var(--gold)' }}
          >
            ✦
          </span>
          <span
            className="font-space font-semibold text-[10.5px] tracking-[.12em] uppercase"
            style={{ color: 'var(--gold)' }}
          >
            نظرة عامة على القطاع
          </span>
        </div>
        <span
          className="font-jb text-[10px]"
          style={{ color: 'rgba(255,255,255,.40)' }}
        >
          {year} · {periodLabel}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6">
        {stats.map((s, i) => (
          <div
            key={s.note}
            className="flex flex-col items-center justify-center gap-2 py-5 px-3 text-center"
            style={{
              borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,.08)' : 'none',
            }}
          >
            {/* Icon chip */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: s.bgColor ?? (s.highlight ? 'rgba(184,130,42,.20)' : 'rgba(255,255,255,.10)'),
              }}
            >
              <s.Icon
                size={15}
                strokeWidth={2}
                color={s.color ?? (s.highlight ? 'var(--gold)' : 'rgba(255,255,255,.80)')}
              />
            </div>

            {/* Value */}
            <span
              className="font-fraunces font-medium leading-none"
              style={{
                fontSize: '24px',
                color: s.color ?? (s.highlight ? 'var(--gold)' : '#ffffff'),
                letterSpacing: '-.02em',
              }}
            >
              {s.value}
            </span>

            {/* Label */}
            <span
              className="font-cairo text-[10.5px] leading-tight"
              style={{ color: 'rgba(255,255,255,.60)' }}
            >
              {s.labelAr}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
