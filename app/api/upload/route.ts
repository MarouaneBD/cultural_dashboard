import { NextRequest, NextResponse } from 'next/server'
import { Period } from '@prisma/client'
import { parseExcelFile } from '@/lib/excel'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  // TODO: enforce EDITOR/ADMIN role check once auth (Phase 2) is wired
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const dryRun = formData.get('dryRun') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'الملف مطلوب' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
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
      } catch (err) {
        dbErrors.push({ row: i + 2, message: `خطأ في حفظ البيانات: ${row.kpiId}` })
      }
    }

    return NextResponse.json({ imported, errors: [...errors, ...dbErrors] })
  } catch (err) {
    console.error('POST /api/upload failed', err)
    return NextResponse.json({ error: 'خطأ في معالجة الملف' }, { status: 500 })
  }
}
