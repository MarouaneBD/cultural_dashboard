import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { computeYtd } from '@/lib/kpi'
import { REPORTING_YEAR } from '@/lib/config'
import { DEPARTMENTS } from '@/lib/departments'
import type { Pillar } from '@prisma/client'

export const dynamic = 'force-dynamic'

/** Revenue KPIs are identified by owner = 'درهم' — they are financial metrics,
 *  not activity counts, so they are separated from the activity rings chart. */
const REVENUE_OWNER = 'درهم'

export interface CategoryTotal {
  category: string
  total: number    // actual for the selected period (YTD for ANNUAL, single quarter otherwise)
  target: number   // target for the selected period
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
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const year   = parseInt(searchParams.get('year')   ?? String(REPORTING_YEAR))
  const period = searchParams.get('period') ?? 'ANNUAL'
  if (isNaN(year)) return NextResponse.json({ error: 'سنة غير صالحة' }, { status: 400 })
  const VALID_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const
  type Quarter = typeof VALID_QUARTERS[number]
  const isQuarter = (VALID_QUARTERS as readonly string[]).includes(period)

  // division is required — prevents cross-sector bleed
  const division = searchParams.get('division')
  const divisionPillars = division
    ? DEPARTMENTS.filter(d => d.division === division).map(d => d.id as Pillar)
    : []
  if (!division || divisionPillars.length === 0) {
    return NextResponse.json({ error: 'قطاع غير صالح' }, { status: 400 })
  }

  try {
    const kpis = await prisma.kpiRegistry.findMany({
      where: {
        unit: 'COUNT',
        showInDashboard: true,
        pillar: { in: divisionPillars },
      },
      take: 500,
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

      let actualVal: number | null
      let targetVal: number

      if (isQuarter) {
        // Single quarter: use the specific quarter's actual and target
        const qActual = kpi.actuals.find(a => a.period === period)
        actualVal = qActual != null ? Math.round(Number(qActual.value)) : null

        const qTarget = kpi.targets.find(t => t.period === period)
        if (qTarget) {
          targetVal = Math.round(Number(qTarget.value))
        } else {
          // Fall back to proportional annual target (÷4) if no per-quarter target exists
          const annual = kpi.targets.find(t => t.period === 'ANNUAL')
          targetVal = annual ? Math.round(Number(annual.value) / 4) : 0
        }
      } else {
        // ANNUAL: compute YTD from quarterly actuals
        const quarterMap: Partial<Record<Quarter, number>> = {}
        for (const a of kpi.actuals) {
          if ((VALID_QUARTERS as readonly string[]).includes(a.period)) {
            quarterMap[a.period as Quarter] = Number(a.value)
          }
        }
        actualVal = computeYtd(quarterMap, kpi.activityType)
        const annual = kpi.targets.find(t => t.period === 'ANNUAL')
        targetVal = annual
          ? Math.round(Number(annual.value))
          : kpi.targets.reduce((s, t) => s + Math.round(Number(t.value)), 0)
      }

      if (isRevenue) {
        if (actualVal !== null) revActual += actualVal
        revTarget += targetVal
        continue
      }

      // Activity categories
      if (actualVal !== null) {
        actualMap.set(category, (actualMap.get(category) ?? 0) + actualVal)
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
