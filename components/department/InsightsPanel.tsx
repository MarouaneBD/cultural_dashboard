'use client'

import type { Insight } from '@/lib/insights'

const COLOR_STYLES: Record<string, { bg: string; border: string; dot: string; text: string }> = {
  green: { bg: '#f0fdf4', border: '#bbf7d0', dot: '#16a34a', text: '#15803d' },
  amber: { bg: '#fffbeb', border: '#fde68a', dot: '#d97706', text: '#b45309' },
  red:   { bg: '#fef2f2', border: '#fecaca', dot: '#dc2626', text: '#b91c1c' },
}

interface Props {
  insights: Insight[]
}

export function InsightsPanel({ insights }: Props) {
  if (!insights.length) return null

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-lg flex items-center justify-center text-[12px]"
            style={{ background: 'rgba(15,64,36,.07)', color: 'var(--gold)' }}
          >
            ✦
          </span>
          <span
            className="font-space font-semibold text-[11px] tracking-[.1em] uppercase"
            style={{ color: 'var(--ink)' }}
          >
            تحليل ذكي
          </span>
        </div>
        <span
          className="font-jb text-[9.5px] px-2 py-0.5 rounded-full"
          style={{ background: 'var(--bg-alt)', color: 'var(--ink-muted)' }}
        >
          مشتق من البيانات
        </span>
      </div>

      {/* Insight list */}
      <ul className="flex flex-col gap-2.5">
        {insights.map((ins, i) => {
          const s = COLOR_STYLES[ins.color]
          return (
            <li
              key={i}
              className="flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-right"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 mt-[5px]"
                style={{ background: s.dot }}
              />
              <span
                className="font-cairo text-[12.5px] leading-relaxed"
                style={{ color: s.text }}
              >
                {ins.text}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
