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
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  const { id } = await params

  const pendingRows = await prisma.submissionRow.findMany({
    where: { submissionId: id, status: 'PENDING' },
  })

  if (pendingRows.length === 0) {
    return NextResponse.json({ approved: 0 })
  }

  await withAuditUser(session.user.id, () =>
    prisma.$transaction(async tx => {
      for (const row of pendingRows) {
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

        await tx.submissionRow.update({
          where: { id: row.id },
          data: { status: 'APPROVED', reviewedAt: new Date(), reviewedBy: session.user.id },
        })
      }

      await tx.uploadSubmission.update({
        where: { id },
        data: { status: 'APPROVED' },
      })
    })
  )

  return NextResponse.json({ approved: pendingRows.length })
}
