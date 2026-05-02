import { NextRequest, NextResponse } from 'next/server'
import { parseExcelFile } from '@/lib/excel'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
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

  let imported = 0
  for (const row of valid) {
    await prisma.actual.create({
      data: {
        kpiId: row.kpiId,
        period: row.period as any,
        year: row.year,
        value: row.value,
        region: row.region,
        facility: row.facility,
      },
    })
    imported++
  }

  return NextResponse.json({ imported, errors })
}
