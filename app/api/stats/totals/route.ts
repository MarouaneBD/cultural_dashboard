import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeYtd } from '@/lib/kpi'

export const dynamic = 'force-dynamic'

export interface CategoryTotal {
  category: string
  total: number    // YTD actual
  target: number   // annual target (sum across all KPIs in this category)
  color: string
}

const CATEGORY_COLORS = [
  '#0f4024', '#b8822a', '#0891b2', '#7c3aed',
  '#be185d', '#059669', '#0369a1', '#d97706',
]

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const year = parseInt(searchParams.get('year') ?? '2026')

  try {
    const kpis = await prisma.kpiRegistry.findMany({
      where: { unit: 'COUNT' },
      include: {
        actuals:  { where: { year } },
        targets:  { where: { year } },
      },
    })

    const actualMap = new Map<string, number>()
    const targetMap = new Map<string, number>()

    for (const kpi of kpis) {
      const category = kpi.owner?.trim()
      if (!category) continue   // skip KPIs with no category

      // YTD actual
      const quarterMap: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number>> = {}
      for (const a of kpi.actuals) {
        if (['Q1', 'Q2', 'Q3', 'Q4'].includes(a.period)) {
          quarterMap[a.period as 'Q1' | 'Q2' | 'Q3' | 'Q4'] = Number(a.value)
        }
      }
      const ytd = computeYtd(quarterMap, kpi.activityType)
      if (ytd !== null) {
        actualMap.set(category, (actualMap.get(category) ?? 0) + Math.round(ytd))
      }

      // Annual target (prefer ANNUAL row; fall back to sum of quarterly)
      const annual = kpi.targets.find(t => t.period === 'ANNUAL')
      const targetVal = annual
        ? Math.round(Number(annual.value))
        : kpi.targets.reduce((s, t) => s + Math.round(Number(t.value)), 0)
      if (targetVal > 0) {
        targetMap.set(category, (targetMap.get(category) ?? 0) + targetVal)
      }
    }

    // Union of all categories seen in actuals or targets
    const allCategories = new Set([...actualMap.keys(), ...targetMap.keys()])

    const result: CategoryTotal[] = Array.from(allCategories)
      .map(category => ({
        category,
        total:  actualMap.get(category)  ?? 0,
        target: targetMap.get(category)  ?? 0,
      }))
      .filter(d => (d.total > 0 || d.target > 0) && d.category !== 'أخرى')
      .sort((a, b) => b.total - a.total)
      .map((d, i) => ({ ...d, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))

    return NextResponse.json(result)
  } catch (err) {
    console.error('GET /api/stats/totals failed', err)
    return NextResponse.json([], { status: 500 })
  }
}
