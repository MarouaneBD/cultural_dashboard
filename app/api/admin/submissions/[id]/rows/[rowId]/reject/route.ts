import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma, withAuditUser } from '@/lib/prisma'

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

  // Pre-flight: ownership check only (status is verified atomically inside the transaction)
  const preflight = await prisma.submissionRow.findUnique({ where: { id: rowId } })
  if (!preflight) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  if (preflight.submissionId !== id) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })

  try {
    await withAuditUser(session.user.id, () =>
      prisma.$transaction(async tx => {
        // Atomic claim: only succeeds if the row is still PENDING — eliminates TOCTOU race
        const claimed = await tx.submissionRow.updateMany({
          where: { id: rowId, status: 'PENDING' },
          data: {
            status: 'REJECTED',
            adminComment: comment.trim(),
            reviewedAt: new Date(),
            reviewedBy: session.user.id,
          },
        })
        if (claimed.count === 0) {
          throw Object.assign(new Error('already-processed'), { code: 'NOT_PENDING' })
        }

        // Auto-close submission if no PENDING rows remain
        const remaining = await tx.submissionRow.count({
          where: { submissionId: preflight.submissionId, status: 'PENDING' },
        })
        if (remaining === 0) {
          await tx.uploadSubmission.update({
            where: { id: preflight.submissionId },
            data: { status: 'REJECTED' },
          })
        }
      })
    )
  } catch (err) {
    if ((err as { code?: string }).code === 'NOT_PENDING') {
      return NextResponse.json({ error: 'الصف ليس في حالة انتظار' }, { status: 400 })
    }
    throw err
  }

  return NextResponse.json({ ok: true })
}
