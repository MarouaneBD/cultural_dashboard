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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json() as {
    name?: string
    role?: UserRole
    newPassword?: string
    assignedPillarId?: string | null
  }

  if ('assignedPillarId' in body && body.assignedPillarId && body.assignedPillarId.trim() && !VALID_PILLAR_IDS.has(body.assignedPillarId)) {
    return NextResponse.json({ error: 'قسم غير صالح' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name || null
  if (body.role) data.role = body.role
  if (body.newPassword) {
    data.passwordHash = await hashPassword(body.newPassword)
    data.mustChangePassword = true
  }
  if ('assignedPillarId' in body) data.assignedPillarId = body.assignedPillarId || null

  const user = await prisma.user.update({
    where: { id },
    data,
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

  return NextResponse.json(user)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { id } = await params

  // Prevent admin from deleting their own account
  if (id === session.user.id) {
    return NextResponse.json({ error: 'لا يمكنك حذف حسابك الخاص' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
