import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeYtd } from '@/lib/kpi'

export const dynamic = 'force-dynamic'

const CATEGORY_COLORS = [
  '#0891b2', '#7c3aed', '#059669', '#d97706',
  '#be185d', '#0369a1', '#6d28d9', '#dc2626',
  '#0f766e', '#92400e',
]

export interface CategoryTotal {
  category: string
  total: number
  color: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const year = parseInt(searchParams.get('year') ?? '2026')

  try {
    const kpis = await prisma.kpiRegistry.findMany({
      where: { unit: 'COUNT' },
      include: {
        actuals: { where: { year } },
      },
    })

    // Group by owner (category), sum YTD per KPI
    const map = new Map<string, number>()

    for (const kpi of kpis) {
      const category = kpi.owner?.trim() || 'أخرى'
      const quarterMap: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number>> = {}
      for (const a of kpi.actuals) {
        if (['Q1', 'Q2', 'Q3', 'Q4'].includes(a.period)) {
          quarterMap[a.period as 'Q1' | 'Q2' | 'Q3' | 'Q4'] = Number(a.value)
        }
      }
      const ytd = computeYtd(quarterMap, kpi.activityType)
      if (ytd !== null && ytd > 0) {
        map.set(category, (map.get(category) ?? 0) + Math.round(ytd))
      }
    }

    // Sort by total desc, assign colors
    const result: CategoryTotal[] = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, total], i) => ({
        category,
        total,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }))

    return NextResponse.json(result)
  } catch (err) {
    console.error('GET /api/stats/totals failed', err)
    return NextResponse.json([], { status: 500 })
  }
}
