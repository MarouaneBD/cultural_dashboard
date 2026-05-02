'use client'

import type { VarianceColor } from '@/types'

interface SparklineChartProps {
  data: number[]
  color: VarianceColor
}

// Stub — full implementation in Task 7
export function SparklineChart({ data, color }: SparklineChartProps) {
  return <div data-testid="sparkline-stub" aria-hidden="true" />
}
