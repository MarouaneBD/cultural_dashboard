import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const AUTHOR_SELECT = {
  id: true,
  username: true,
  name: true,
} as const

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const { id } = await params

  const comment = await prisma.comment.findUnique({ where: { id } })
  if (!comment) {
    return NextResponse.json({ error: 'الملاحظة غير موجودة' }, { status: 404 })
  }

  const isAuthor = comment.authorId === session.user.id
  const isAdmin = session.user.role === 'ADMIN'
  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { text } = (await req.json()) as { text?: string }
  if (!text?.trim()) {
    return NextResponse.json({ error: 'النص مطلوب' }, { status: 400 })
  }
  if (text.trim().length > 500) {
    return NextResponse.json({ error: 'الملاحظة تتجاوز 500 حرف' }, { status: 400 })
  }

  const updated = await prisma.comment.update({
    where: { id },
    data: { text: text.trim() },
    select: {
      id: true,
      pillarId: true,
      text: true,
      createdAt: true,
      updatedAt: true,
      author: { select: AUTHOR_SELECT },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const { id } = await params

  const comment = await prisma.comment.findUnique({ where: { id } })
  if (!comment) {
    return NextResponse.json({ error: 'الملاحظة غير موجودة' }, { status: 404 })
  }

  const isAuthor = comment.authorId === session.user.id
  const isAdmin = session.user.role === 'ADMIN'
  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  await prisma.comment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
