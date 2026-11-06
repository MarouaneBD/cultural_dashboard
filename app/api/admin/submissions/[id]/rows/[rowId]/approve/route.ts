import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma, withAuditUser } from '@/lib/prisma'
import { Period } from '@prisma/client'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; rowId: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  const { id, rowId } = await params

  const row = await prisma.submissionRow.findUnique({ where: { id: rowId } })
  if (!row) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  if (row.submissionId !== id) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  if (row.status !== 'PENDING') {
    return NextResponse.json({ error: 'الصف ليس في حالة انتظار' }, { status: 400 })
  }

  await withAuditUser(session.user.id, () =>
    prisma.$transaction(async tx => {
      // Write to live table
      if (row.tableType === 'TARGET') {
        await tx.target.upsert({
          where: { kpiId_period_year: { kpiId: row.kpiId, period: row.period as Period, year: row.year } },
          create: { kpiId: row.kpiId, period: row.period as Period, year: row.year, value: row.newValue },
          update: { value: row.newValue },
        })
      } else {
        await tx.actual.upsert({
          where: { kpiId_period_year: { kpiId: row.kpiId, period: row.period as Period, year: row.year } },
          create: { kpiId: row.kpiId, period: row.period as Period, year: row.year, value: row.newValue },
          update: { value: row.newValue },
        })
      }

      // Mark this row approved
      await tx.submissionRow.update({
        where: { id: rowId },
        data: { status: 'APPROVED', reviewedAt: new Date(), reviewedBy: session.user.id },
      })

      // Auto-dismiss any other PENDING rows for the same kpiId+period+year
      await tx.submissionRow.updateMany({
        where: {
          kpiId: row.kpiId, period: row.period, year: row.year,
          status: 'PENDING', id: { not: rowId },
        },
        data: { status: 'DISMISSED' },
      })

      // Auto-close submission if no PENDING rows remain
      const remaining = await tx.submissionRow.count({
        where: { submissionId: row.submissionId, status: 'PENDING' },
      })
      if (remaining === 0) {
        await tx.uploadSubmission.update({
          where: { id: row.submissionId },
          data: { status: 'APPROVED' },
        })
      }
    })
  )

  return NextResponse.json({ ok: true })
}
