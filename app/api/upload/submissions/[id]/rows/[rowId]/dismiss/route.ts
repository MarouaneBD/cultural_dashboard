import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; rowId: string }> }
) {
  const session = await auth()
  if (!session || (session.user.role !== 'EDITOR' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { id: submissionId, rowId } = await params

  // Verify ownership
  const submission = await prisma.uploadSubmission.findUnique({
    where: { id: submissionId },
    select: { submitterId: true },
  })
  if (!submission) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  if (submission.submitterId !== session.user.id) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const row = await prisma.submissionRow.findUnique({ where: { id: rowId } })
  if (!row) return NextResponse.json({ error: 'غير موجود' }, { status: 404 })
  if (row.status !== 'REJECTED') {
    return NextResponse.json({ error: 'يمكن تجاهل الصفوف المرفوضة فقط' }, { status: 400 })
  }

  await prisma.submissionRow.update({
    where: { id: rowId },
    data: { status: 'DISMISSED' },
  })

  return NextResponse.json({ ok: true })
}
