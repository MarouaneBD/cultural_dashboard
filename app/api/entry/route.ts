import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { REPORTING_YEAR } from '@/lib/config'
import { VALID_PILLAR_IDS } from '@/lib/departments'
import type { Pillar, Period } from '@prisma/client'

export type EntryKpiRow = {
  kpiId: string
  nameAr: string
  unit: string
  activityType: string
  currentValue: number | null
  hasPending: boolean
}

const VALID_PERIODS = new Set(['Q1', 'Q2', 'Q3', 'Q4', 'ANNUAL'])

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const pillar = searchParams.get('pillar') ?? ''
  const period = searchParams.get('period') ?? 'Q1'
  const year = parseInt(searchParams.get('year') ?? String(REPORTING_YEAR))
  const tableType = searchParams.get('tableType') ?? 'ACTUAL'

  if (!VALID_PILLAR_IDS.has(pillar)) {
    return NextResponse.json({ error: 'قسم غير صالح' }, { status: 400 })
  }
  if (!VALID_PERIODS.has(period)) {
    return NextResponse.json({ error: 'فترة غير صالحة' }, { status: 400 })
  }
  if (!['ACTUAL', 'TARGET'].includes(tableType)) {
    return NextResponse.json({ error: 'نوع غير صالح' }, { status: 400 })
  }
  if (isNaN(year)) {
    return NextResponse.json({ error: 'سنة غير صالحة' }, { status: 400 })
  }

  // EDITOR scope guard
  if (session.user.role === 'EDITOR' && session.user.assignedPillarId !== pillar) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const entryPeriod: Period = tableType === 'TARGET' ? 'ANNUAL' : (period as Period)

  const kpis = await prisma.kpiRegistry.findMany({
    where: { pillar: pillar as Pillar },
    orderBy: { nameAr: 'asc' },
    select: { id: true, nameAr: true, unit: true, activityType: true },
  })

  const kpiIds = kpis.map(k => k.id)

  const [actuals, targets, pendingRows] = await Promise.all([
    tableType === 'ACTUAL'
      ? prisma.actual.findMany({
          where: { kpiId: { in: kpiIds }, period: entryPeriod, year },
          select: { kpiId: true, value: true },
        })
      : Promise.resolve([]),
    tableType === 'TARGET'
      ? prisma.target.findMany({
          where: { kpiId: { in: kpiIds }, period: 'ANNUAL', year },
          select: { kpiId: true, value: true },
        })
      : Promise.resolve([]),
    prisma.submissionRow.findMany({
      where: {
        kpiId: { in: kpiIds },
        period: entryPeriod,
        year,
        tableType,
        status: 'PENDING',
      },
      select: { kpiId: true },
    }),
  ])

  const actualMap = new Map(actuals.map(a => [a.kpiId, Number(a.value)]))
  const targetMap = new Map(targets.map(t => [t.kpiId, Number(t.value)]))
  const pendingSet = new Set(pendingRows.map(r => r.kpiId))

  const result: EntryKpiRow[] = kpis.map(kpi => {
    const currentValue =
      tableType === 'TARGET'
        ? (targetMap.get(kpi.id) ?? null)
        : (actualMap.get(kpi.id) ?? null)
    return {
      kpiId: kpi.id,
      nameAr: kpi.nameAr,
      unit: kpi.unit,
      activityType: kpi.activityType,
      currentValue,
      hasPending: pendingSet.has(kpi.id),
    }
  })

  return NextResponse.json(result)
}
