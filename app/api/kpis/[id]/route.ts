import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeVariance } from '@/lib/kpi'
import { Period } from '@prisma/client'
import type { DrillDownRow } from '@/types'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = req.nextUrl
  const year = parseInt(searchParams.get('year') ?? '2026')
  const period = (searchParams.get('period') ?? 'ANNUAL') as Period

  try {
    const [actuals, target] = await Promise.all([
      prisma.actual.findMany({
        where: { kpiId: id, year },
        orderBy: { region: 'asc' },
      }),
      prisma.target.findFirst({
        where: { kpiId: id, period, year },
      }),
    ])

    const targetVal = target?.value ?? 0

    // Group actuals by region
    const regionMap = new Map<string, number>()
    for (const a of actuals) {
      if (!a.region) continue
      regionMap.set(a.region, (regionMap.get(a.region) ?? 0) + a.value)
    }

    const rows: DrillDownRow[] = Array.from(regionMap.entries()).map(
      ([region, actual]) => ({
        region,
        actual,
        target: targetVal,
        variance: computeVariance(actual, targetVal),
      })
    )

    return NextResponse.json(rows)
  } catch (err) {
    console.error(`GET /api/kpis/${id} failed`, err)
    return NextResponse.json({ error: 'خطأ في تحميل التفاصيل' }, { status: 500 })
  }
}
