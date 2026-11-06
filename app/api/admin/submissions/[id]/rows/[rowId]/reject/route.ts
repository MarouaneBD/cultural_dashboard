import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; rowId: string }> }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  const { id, rowId } = await params
  const { comment } = await req.json() as { comment?: string }

  if (!comment || comment.trim().length < 10) {
    return NextResponse.json({ error: 'سبب الرفض مطلوب (10 أحرف على الأقل)' }, { status: 400 })
  }

  const row = await prisma.submissionRow.findUnique({ where: { id: rowId } })
  if (!row) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  if (row.submissionId !== id) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  if (row.status !== 'PENDING') {
    return NextResponse.json({ error: 'الصف ليس في حالة انتظار' }, { status: 400 })
  }

  await prisma.$transaction(async tx => {
    await tx.submissionRow.update({
      where: { id: rowId },
      data: {
        status: 'REJECTED',
        adminComment: comment.trim(),
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
      },
    })

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

  return NextResponse.json({ ok: true })
}
