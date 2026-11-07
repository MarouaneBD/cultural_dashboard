import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma, withAuditUser } from '@/lib/prisma'
import { Period } from '@prisma/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

  let approved = 0

  try {
    await withAuditUser(session.user.id, () =>
      prisma.$transaction(async tx => {
        // Fetch pending rows INSIDE the transaction for a consistent snapshot
        const pendingRows = await tx.submissionRow.findMany({
          where: { submissionId: id, status: 'PENDING' },
        })

        if (pendingRows.length === 0) return

        for (const row of pendingRows) {
          // Atomic per-row claim — skips rows already processed by a concurrent single-approve
          const claimed = await tx.submissionRow.updateMany({
            where: { id: row.id, status: 'PENDING' },
            data: { status: 'APPROVED', reviewedAt: new Date(), reviewedBy: session.user.id },
          })
          if (claimed.count === 0) continue

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

          approved++
        }

        // Auto-close if no PENDING rows remain (handles partial concurrent approvals)
        const stillPending = await tx.submissionRow.count({
          where: { submissionId: id, status: 'PENDING' },
        })
        if (stillPending === 0) {
          await tx.uploadSubmission.update({
            where: { id },
            data: { status: 'APPROVED' },
          })
        }
      }, { timeout: 30000 })
    )
  } catch (err) {
    console.error('[approve-all] transaction failed', err)
    return NextResponse.json({ error: 'فشل معالجة الطلبات' }, { status: 500 })
  }

  return NextResponse.json({ approved })
}
