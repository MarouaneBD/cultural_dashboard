import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeYtd } from '@/lib/kpi'

export const dynamic = 'force-dynamic'

/** Revenue KPIs are identified by owner = 'درهم' — they are financial metrics,
 *  not activity counts, so they are separated from the activity rings chart. */
const REVENUE_OWNER = 'درهم'

export interface CategoryTotal {
  category: string
  total: number    // YTD actual
  target: number   // annual target (sum across all KPIs in this category)
  color: string
}

export interface TotalsResponse {
  categories: CategoryTotal[]
  revenue: { total: number; target: number } | null
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
    let revActual = 0
    let revTarget = 0

    for (const kpi of kpis) {
      const category = kpi.owner?.trim()
      if (!category) continue

      // Exclude generic "نشاط" category — not a meaningful segment
      if (category === 'نشاط') continue

      // Revenue KPIs — accumulate separately, skip from activity chart
      const isRevenue = category === REVENUE_OWNER

      const quarterMap: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number>> = {}
      for (const a of kpi.actuals) {
        if (['Q1', 'Q2', 'Q3', 'Q4'].includes(a.period)) {
          quarterMap[a.period as 'Q1' | 'Q2' | 'Q3' | 'Q4'] = Number(a.value)
        }
      }
      const ytd = computeYtd(quarterMap, kpi.activityType)

      const annual = kpi.targets.find(t => t.period === 'ANNUAL')
      const targetVal = annual
        ? Math.round(Number(annual.value))
        : kpi.targets.reduce((s, t) => s + Math.round(Number(t.value)), 0)

      if (isRevenue) {
        if (ytd !== null) revActual += Math.round(ytd)
        revTarget += targetVal
        continue
      }

      // Activity categories
      if (ytd !== null) {
        actualMap.set(category, (actualMap.get(category) ?? 0) + Math.round(ytd))
      }
      if (targetVal > 0) {
        targetMap.set(category, (targetMap.get(category) ?? 0) + targetVal)
      }
    }

    const allCategories = new Set([...actualMap.keys(), ...targetMap.keys()])

    const categories: CategoryTotal[] = Array.from(allCategories)
      .map(category => ({
        category,
        total:  actualMap.get(category)  ?? 0,
        target: targetMap.get(category)  ?? 0,
      }))
      .filter(d => (d.total > 0 || d.target > 0) && d.category !== 'أخرى')
      .sort((a, b) => b.total - a.total)
      .map((d, i) => ({ ...d, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))

    const revenue = (revActual > 0 || revTarget > 0)
      ? { total: revActual, target: revTarget }
      : null

    return NextResponse.json({ categories, revenue } satisfies TotalsResponse)
  } catch (err) {
    console.error('GET /api/stats/totals failed', err)
    return NextResponse.json({ categories: [], revenue: null }, { status: 500 })
  }
}
