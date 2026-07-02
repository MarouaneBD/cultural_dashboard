import { NextRequest, NextResponse } from 'next/server'
import { Period, Pillar } from '@prisma/client'
import { isActivityFile, parseActivityFile, parseExcelFile } from '@/lib/excel'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  let session: { user: { role: string } } | null = null
  try {
    session = await auth() as any
  } catch (err) {
    console.error('[upload] auth() threw', err)
    return NextResponse.json({ error: 'خطأ في التحقق من الجلسة' }, { status: 500 })
  }

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  // ── Parse form data ──────────────────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch (err) {
    console.error('[upload] formData() threw', err)
    return NextResponse.json({ error: 'تعذّر قراءة بيانات النموذج' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const dryRun = formData.get('dryRun') === 'true'

  if (!file) {
    return NextResponse.json({ error: 'الملف مطلوب' }, { status: 400 })
  }

  // ── Read buffer ──────────────────────────────────────────────────────────────
  let buffer: ArrayBuffer
  try {
    buffer = await file.arrayBuffer()
  } catch (err) {
    console.error('[upload] arrayBuffer() threw', err)
    return NextResponse.json({ error: 'تعذّر قراءة الملف' }, { status: 400 })
  }

  try {
    // ── Activity format ────────────────────────────────────────────────────────
    if (isActivityFile(buffer)) {
      const { rows, errors } = parseActivityFile(buffer)

      if (dryRun) {
        return NextResponse.json({ dryRun: true, rows, errors })
      }

      let created = 0
      let updated = 0
      const dbErrors: Array<{ row: number; message: string }> = []

      try {
        await prisma.$transaction(async (tx: TxClient) => {
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            try {
              const existing = await tx.kpiRegistry.findUnique({
                where: { nameAr_pillar: { nameAr: row.nameAr, pillar: row.pillar as Pillar } },
              })

              const kpi = await tx.kpiRegistry.upsert({
                where: { nameAr_pillar: { nameAr: row.nameAr, pillar: row.pillar as Pillar } },
                create: { nameAr: row.nameAr, pillar: row.pillar as Pillar, unit: 'COUNT', owner: row.category, activityType: row.activityType },
                update: { activityType: row.activityType, ...(row.category ? { owner: row.category } : {}) },
              })

              if (row.target2026 !== undefined) {
                await tx.target.upsert({
                  where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: 2026 } },
                  create: { kpiId: kpi.id, period: 'ANNUAL' as Period, year: 2026, value: row.target2026 },
                  update: { value: row.target2026 },
                })
              }

              if (row.actual2025 !== undefined) {
                await tx.actual.upsert({
                  where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: 2025 } },
                  create: { kpiId: kpi.id, period: 'ANNUAL' as Period, year: 2025, value: row.actual2025 },
                  update: { value: row.actual2025 },
                })
              }

              for (const [q, val] of Object.entries(row.actuals)) {
                if (val !== undefined) {
                  await tx.actual.upsert({
                    where: { kpiId_period_year: { kpiId: kpi.id, period: q as Period, year: 2026 } },
                    create: { kpiId: kpi.id, period: q as Period, year: 2026, value: val },
                    update: { value: val },
                  })
                }
              }

              if (existing) { updated++ } else { created++ }
            } catch (err) {
              console.error('[upload] row failed', i + 2, err)
              dbErrors.push({ row: i + 2, message: `خطأ في حفظ النشاط: ${row.nameAr}` })
            }
          }
        }, { timeout: 50000 })
      } catch (err) {
        console.error('[upload] transaction failed', err)
        return NextResponse.json({ error: 'فشل حفظ البيانات' }, { status: 500 })
      }

      return NextResponse.json({ created, updated, errors: [...errors, ...dbErrors] })
    }

    // ── Legacy format ──────────────────────────────────────────────────────────
    const { valid, errors } = parseExcelFile(buffer)

    if (dryRun) {
      return NextResponse.json({ dryRun: true, preview: valid, errors })
    }

    const dbErrors: Array<{ row: number; message: string }> = []
    let imported = 0

    try {
      await prisma.$transaction(async (tx: TxClient) => {
        for (let i = 0; i < valid.length; i++) {
          const row = valid[i]
          try {
            await tx.actual.create({
              data: {
                kpiId: row.kpiId,
                period: row.period as Period,
                year: row.year,
                value: row.value,
                region: row.region,
                facility: row.facility,
              },
            })
            imported++
          } catch {
            dbErrors.push({ row: i + 2, message: `خطأ في حفظ البيانات: ${row.kpiId}` })
          }
        }
      }, { timeout: 50000 })
    } catch (err) {
      console.error('[upload] legacy transaction failed', err)
      return NextResponse.json({ error: 'فشل حفظ البيانات' }, { status: 500 })
    }

    return NextResponse.json({ imported, errors: [...errors, ...dbErrors] })
  } catch (err) {
    console.error('[upload] unhandled error', err)
    return NextResponse.json({ error: `خطأ في معالجة الملف: ${String(err)}` }, { status: 500 })
  }
}
