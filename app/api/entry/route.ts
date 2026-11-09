import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma, withAuditUser } from '@/lib/prisma'
import { REPORTING_YEAR } from '@/lib/config'
import { VALID_PILLAR_IDS, DEPARTMENTS } from '@/lib/departments'
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

type PostBody = {
  pillar: string
  period: string
  year: number
  tableType: string
  rows: { kpiId: string; value: number }[]
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  if (session.user.role === 'VIEWER') return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  let body: PostBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  }

  const { pillar, period, year, tableType, rows } = body

  if (!VALID_PILLAR_IDS.has(pillar)) return NextResponse.json({ error: 'قسم غير صالح' }, { status: 400 })
  if (!['ACTUAL', 'TARGET'].includes(tableType)) return NextResponse.json({ error: 'نوع غير صالح' }, { status: 400 })
  if (tableType === 'ACTUAL' && !VALID_PERIODS.has(period)) {
    return NextResponse.json({ error: 'فترة غير صالحة' }, { status: 400 })
  }
  if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ error: 'لا توجد صفوف' }, { status: 400 })
  if (isNaN(year)) return NextResponse.json({ error: 'سنة غير صالحة' }, { status: 400 })

  // EDITOR scope guard
  if (session.user.role === 'EDITOR' && session.user.assignedPillarId !== pillar) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  // Validate row values
  for (const row of rows) {
    if (typeof row.value !== 'number' || isNaN(row.value) || row.value < 0) {
      return NextResponse.json({ error: 'قيم غير صالحة' }, { status: 400 })
    }
  }

  // Verify all kpiIds belong to the requested pillar
  const kpiIds = [...new Set(rows.map(r => r.kpiId))]
  const validKpis = await prisma.kpiRegistry.findMany({
    where: { id: { in: kpiIds }, pillar: pillar as Pillar },
    select: { id: true, nameAr: true },
  })
  if (validKpis.length !== kpiIds.length) {
    return NextResponse.json({ error: 'مؤشرات غير صالحة' }, { status: 400 })
  }
  const kpiNameMap = new Map(validKpis.map(k => [k.id, k.nameAr]))

  const entryPeriod: Period = tableType === 'TARGET' ? 'ANNUAL' : (period as Period)
  const dept = DEPARTMENTS.find(d => d.id === pillar)
  const deptLabel = dept?.labelAr ?? pillar

  const { direct, queued } = await withAuditUser(session.user.id, () =>
    prisma.$transaction(async (tx) => {
      let submissionId: string | null = null
      let direct = 0
      let queued = 0

      for (const row of rows) {
        const kpiNameAr = kpiNameMap.get(row.kpiId) ?? ''

        if (tableType === 'TARGET') {
          const existing = await tx.target.findUnique({
            where: { kpiId_period_year: { kpiId: row.kpiId, period: 'ANNUAL', year } },
            select: { value: true },
          })
          if (!submissionId) {
            const sub = await tx.uploadSubmission.create({
              data: {
                submitterId: session.user.id,
                filename: `إدخال مستهدفات ${deptLabel} - ${year}`,
                status: 'PENDING',
              },
            })
            submissionId = sub.id
          }
          await tx.submissionRow.create({
            data: {
              submissionId: submissionId!,
              kpiId: row.kpiId,
              kpiNameAr,
              period: 'ANNUAL',
              year,
              newValue: row.value,
              oldValue: existing ? Number(existing.value) : 0,
              tableType: 'TARGET',
              status: 'PENDING',
            },
          })
          queued++
        } else {
          const existing = await tx.actual.findUnique({
            where: { kpiId_period_year: { kpiId: row.kpiId, period: entryPeriod, year } },
            select: { value: true },
          })

          if (existing) {
            if (!submissionId) {
              const sub = await tx.uploadSubmission.create({
                data: {
                  submitterId: session.user.id,
                  filename: `إدخال بيانات ${deptLabel} - ${entryPeriod} ${year}`,
                  status: 'PENDING',
                },
              })
              submissionId = sub.id
            }
            await tx.submissionRow.create({
              data: {
                submissionId: submissionId!,
                kpiId: row.kpiId,
                kpiNameAr,
                period: entryPeriod,
                year,
                newValue: row.value,
                oldValue: Number(existing.value),
                tableType: 'ACTUAL',
                status: 'PENDING',
              },
            })
            queued++
          } else {
            await tx.actual.upsert({
              where: { kpiId_period_year: { kpiId: row.kpiId, period: entryPeriod, year } },
              update: { value: row.value },
              create: { kpiId: row.kpiId, period: entryPeriod, year, value: row.value },
            })
            direct++
          }
        }
      }

      return { direct, queued }
    })
  )

  return NextResponse.json({ direct, queued })
}
