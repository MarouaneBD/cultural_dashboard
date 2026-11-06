import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session || (session.user.role !== 'EDITOR' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const submissions = await prisma.uploadSubmission.findMany({
    where: { submitterId: session.user.id },
    orderBy: { uploadedAt: 'desc' },
    take: 50,
    include: {
      submitter: { select: { id: true, username: true, name: true } },
      rows: { orderBy: { id: 'asc' } },
    },
  })

  return NextResponse.json(submissions.map(s => ({
    id: s.id,
    filename: s.filename,
    uploadedAt: s.uploadedAt.toISOString(),
    status: s.status,
    submitter: s.submitter,
    pendingCount: s.rows.filter(r => r.status === 'PENDING').length,
    totalCount: s.rows.length,
    rows: s.rows.map(r => ({
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
  })))
}
