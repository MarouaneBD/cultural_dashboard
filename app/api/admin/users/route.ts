import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth-utils'
import type { UserRole } from '@prisma/client'

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

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') return null
  return session
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      mustChangePassword: true,
      assignedPillarId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { username, name, role, password, assignedPillarId } = await req.json() as {
    username?: string
    name?: string
    role?: UserRole
    password?: string
    assignedPillarId?: string | null
  }

  if (!username || !password || !role) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }

  if (assignedPillarId && assignedPillarId.trim() && !VALID_PILLAR_IDS.has(assignedPillarId)) {
    return NextResponse.json({ error: 'قسم غير صالح' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json({ error: 'اسم المستخدم مستخدم بالفعل' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: {
      username,
      name: name || null,
      role,
      passwordHash,
      mustChangePassword: true,
      assignedPillarId: assignedPillarId || null,
    },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      mustChangePassword: true,
      assignedPillarId: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}
