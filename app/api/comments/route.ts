import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const AUTHOR_SELECT = {
  id: true,
  username: true,
  name: true,
} as const

const VALID_PILLAR_IDS = new Set<string>([
  'EDUCATION',
  'FAMILY_CULTURE',
  'ISLAMIC_INFO_CENTER',
  'AL_BIRR_MALE',
  'AL_BIRR_FEMALE',
  'ORPHANS',
  'SCIENTIFIC_PROGRAMS',
  'RESEARCH_PUBLICATIONS',
])

export async function GET(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const pillarId = searchParams.get('pillarId')
  if (!pillarId) {
    return NextResponse.json({ error: 'pillarId مطلوب' }, { status: 400 })
  }
  if (!VALID_PILLAR_IDS.has(pillarId)) {
    return NextResponse.json({ error: 'قسم غير صالح' }, { status: 400 })
  }

  const comments = await prisma.comment.findMany({
    where: { pillarId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      pillarId: true,
      text: true,
      createdAt: true,
      updatedAt: true,
      author: { select: AUTHOR_SELECT },
    },
  })

  return NextResponse.json(comments)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR') {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { pillarId, text } = (await req.json()) as { pillarId?: string; text?: string }

  if (!pillarId || !text?.trim()) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }
  if (!VALID_PILLAR_IDS.has(pillarId)) {
    return NextResponse.json({ error: 'قسم غير صالح' }, { status: 400 })
  }
  if (text.trim().length > 500) {
    return NextResponse.json({ error: 'الملاحظة تتجاوز 500 حرف' }, { status: 400 })
  }

  const comment = await prisma.comment.create({
    data: {
      pillarId,
      text: text.trim(),
      authorId: session.user.id,
    },
    select: {
      id: true,
      pillarId: true,
      text: true,
      createdAt: true,
      updatedAt: true,
      author: { select: AUTHOR_SELECT },
    },
  })

  return NextResponse.json(comment, { status: 201 })
}
