'use client'

import type { ReactNode } from 'react'

interface RtlChartProps {
  children: ReactNode
  className?: string
}

/**
 * RTL wrapper for Recharts.
 * Recharts renders in LTR internally. This wrapper uses CSS double-flip:
 * outer scaleX(-1) mirrors the container into LTR space,
 * inner scaleX(-1) un-mirrors the content so it reads correctly,
 * while axis directions and data flow remain left-to-right as Recharts expects.
 */
export function RtlChart({ children, className }: RtlChartProps) {
  return (
    <div
      dir="ltr"
      style={{ transform: 'scaleX(-1)' }}
      className={className}
    >
      <div style={{ transform: 'scaleX(-1)' }}>
        {children}
      </div>
    </div>
  )
}
