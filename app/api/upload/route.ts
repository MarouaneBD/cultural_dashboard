import { NextRequest, NextResponse } from 'next/server'
import { Period, Pillar } from '@prisma/client'
import { isActivityFile, parseActivityFile, parseExcelFile } from '@/lib/excel'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const dryRun = formData.get('dryRun') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'الملف مطلوب' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()

    // ── Activity format ──────────────────────────────────────────────────────
    if (isActivityFile(buffer)) {
      const { rows, errors } = parseActivityFile(buffer)

      if (dryRun) {
        return NextResponse.json({ dryRun: true, rows, errors })
      }

      let created = 0
      let updated = 0
      const dbErrors: Array<{ row: number; message: string }> = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        try {
          await prisma.$transaction(async tx => {
            const existing = await (tx as any).kpiRegistry.findUnique({
              where: { nameAr_pillar: { nameAr: row.nameAr, pillar: row.pillar as Pillar } },
            })

            const kpi = await (tx as any).kpiRegistry.upsert({
              where: { nameAr_pillar: { nameAr: row.nameAr, pillar: row.pillar as Pillar } },
              create: { nameAr: row.nameAr, pillar: row.pillar as Pillar, unit: 'COUNT', owner: row.category },
              update: row.category ? { owner: row.category } : {},
            })

            existing ? updated++ : created++

            if (row.target2026 !== undefined) {
              await (tx as any).target.upsert({
                where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: 2026 } },
                create: { kpiId: kpi.id, period: 'ANNUAL' as Period, year: 2026, value: row.target2026 },
                update: { value: row.target2026 },
              })
            }

            if (row.actual2025 !== undefined) {
              await (tx as any).actual.upsert({
                where: { kpiId_period_year: { kpiId: kpi.id, period: 'ANNUAL', year: 2025 } },
                create: { kpiId: kpi.id, period: 'ANNUAL' as Period, year: 2025, value: row.actual2025 },
                update: { value: row.actual2025 },
              })
            }

            for (const [q, val] of Object.entries(row.actuals)) {
              if (val !== undefined) {
                await (tx as any).actual.upsert({
                  where: { kpiId_period_year: { kpiId: kpi.id, period: q as Period, year: 2026 } },
                  create: { kpiId: kpi.id, period: q as Period, year: 2026, value: val },
                  update: { value: val },
                })
              }
            }
          })
        } catch (err) {
          dbErrors.push({ row: i + 2, message: `خطأ في حفظ النشاط: ${row.nameAr}` })
        }
      }

      return NextResponse.json({ created, updated, errors: [...errors, ...dbErrors] })
    }

    // ── Legacy format ────────────────────────────────────────────────────────
    const { valid, errors } = parseExcelFile(buffer)

    if (dryRun) {
      return NextResponse.json({ dryRun: true, preview: valid, errors })
    }

    const dbErrors: Array<{ row: number; message: string }> = []
    let imported = 0

    for (let i = 0; i < valid.length; i++) {
      const row = valid[i]
      try {
        await prisma.actual.create({
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

    return NextResponse.json({ imported, errors: [...errors, ...dbErrors] })
  } catch (err) {
    console.error('POST /api/upload failed', err)
    return NextResponse.json({ error: 'خطأ في معالجة الملف' }, { status: 500 })
  }
}
