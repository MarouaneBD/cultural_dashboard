import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeVariance } from '@/lib/kpi'
import { DEPARTMENTS } from '@/lib/departments'
import type { KpiWithVariance } from '@/types'
import type { Pillar } from '@prisma/client'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const year = parseInt(searchParams.get('year') ?? '2026')
  const period = searchParams.get('period') ?? 'ANNUAL'
  const pillar = searchParams.get('pillar') ?? undefined
  const division = searchParams.get('division') ?? undefined

  // Build pillar filter: division takes precedence over single pillar param
  let pillarFilter: string[] | undefined
  if (division) {
    pillarFilter = DEPARTMENTS
      .filter(d => d.division === division)
      .map(d => d.id)
  } else if (pillar) {
    pillarFilter = [pillar]
  }

  try {
    const kpis = await prisma.kpiRegistry.findMany({
      where: pillarFilter ? { pillar: { in: pillarFilter as Pillar[] } } : undefined,
      include: {
        targets: { where: { year } },
        actuals: { where: { year }, orderBy: { period: 'asc' } },
      },
    })

    const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const

    const result: KpiWithVariance[] = kpis.map(kpi => {
      const sparkline = QUARTERS.map(q => kpi.actuals.find(x => x.period === q)?.value ?? 0)

      let variance: KpiWithVariance['variance']

      if (period === 'ANNUAL') {
        // Check for an explicit end-of-year ANNUAL actual first
        const annualActual = kpi.actuals.find(a => a.period === 'ANNUAL')
        const annualTarget = kpi.targets.find(t => t.period === 'ANNUAL')?.value ?? 0

        if (annualActual) {
          // Full-year actual exists — compare directly
          variance = computeVariance(annualActual.value, annualTarget)
        } else {
          // No annual actual yet — use quarterly actuals that have been entered
          const qActuals = QUARTERS.map(q => kpi.actuals.find(a => a.period === q)?.value)
            .filter((v): v is number => v != null)

          if (qActuals.length === 0) {
            // No data entered for any quarter — too early to judge
            variance = { actual: 0, target: annualTarget, pct: 0, color: 'neutral' }
          } else {
            // YTD actual: sum for CUMULATIVE, last Q value for MONTHLY_VARIANCE
            const ytdActual = kpi.activityType === 'CUMULATIVE'
              ? qActuals.reduce((a, b) => a + b, 0)
              : qActuals[qActuals.length - 1]

            // Proportional target: scale annual target by fraction of year logged
            const proportionalTarget = annualTarget * (qActuals.length / 4)
            variance = computeVariance(ytdActual, proportionalTarget)
          }
        }
      } else {
        // Quarterly view — compare this quarter's actual vs this quarter's target
        const target = kpi.targets.find(t => t.period === period)
        const actual = kpi.actuals.find(a => a.period === period)
        variance = computeVariance(actual?.value ?? 0, target?.value ?? 0)
      }

      return {
        id: kpi.id,
        nameAr: kpi.nameAr,
        pillar: kpi.pillar as KpiWithVariance['pillar'],
        unit: kpi.unit as KpiWithVariance['unit'],
        variance,
        sparkline,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('GET /api/kpis failed', err)
    return NextResponse.json({ error: 'خطأ في تحميل البيانات' }, { status: 500 })
  }
}
