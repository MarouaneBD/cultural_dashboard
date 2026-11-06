import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const submissions = await prisma.uploadSubmission.findMany({
    orderBy: { uploadedAt: 'desc' },
    take: 100,
    include: {
      submitter: { select: { id: true, username: true, name: true } },
      rows: { select: { id: true, status: true } },
    },
  })

  const result = submissions.map(s => ({
    id: s.id,
    filename: s.filename,
    uploadedAt: s.uploadedAt.toISOString(),
    status: s.status,
    submitter: s.submitter,
    pendingCount: s.rows.filter(r => r.status === 'PENDING').length,
    totalCount: s.rows.length,
    rows: [],
  }))

  return NextResponse.json(result)
}
