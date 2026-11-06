import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { id } = await params

  const submission = await prisma.uploadSubmission.findUnique({
    where: { id },
    include: {
      submitter: { select: { id: true, username: true, name: true } },
      rows: { orderBy: { id: 'asc' } },
    },
  })

  if (!submission) {
    return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  }

  return NextResponse.json({
    id: submission.id,
    filename: submission.filename,
    uploadedAt: submission.uploadedAt.toISOString(),
    status: submission.status,
    submitter: submission.submitter,
    pendingCount: submission.rows.filter(r => r.status === 'PENDING').length,
    totalCount: submission.rows.length,
    rows: submission.rows.map(r => ({
      id: r.id,
      kpiId: r.kpiId,
      kpiNameAr: r.kpiNameAr,
      period: r.period,
      year: r.year,
      newValue: r.newValue,
      oldValue: r.oldValue,
      tableType: r.tableType,
      status: r.status,
      adminComment: r.adminComment,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
    })),
  })
}
