import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeVariance } from '@/lib/kpi'
import type { KpiWithVariance } from '@/types'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const year = parseInt(searchParams.get('year') ?? '2026')
  const period = searchParams.get('period') ?? 'ANNUAL'

  const kpis = await prisma.kpiRegistry.findMany({
    include: {
      targets: { where: { year } },
      actuals: { where: { year }, orderBy: { period: 'asc' } },
    },
  })

  const result: KpiWithVariance[] = kpis.map(kpi => {
    const target = kpi.targets.find(t => t.period === period) ?? kpi.targets[0]
    const actual = kpi.actuals.find(a => a.period === period) ?? kpi.actuals[kpi.actuals.length - 1]
    const targetVal = target?.value ?? 0
    const actualVal = actual?.value ?? 0

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'] as const
    const sparkline = quarters.map(q => {
      const a = kpi.actuals.find(x => x.period === q)
      return a?.value ?? 0
    })

    return {
      id: kpi.id,
      nameAr: kpi.nameAr,
      pillar: kpi.pillar as KpiWithVariance['pillar'],
      unit: kpi.unit as KpiWithVariance['unit'],
      variance: computeVariance(actualVal, targetVal),
      sparkline,
    }
  })

  return NextResponse.json(result)
}
