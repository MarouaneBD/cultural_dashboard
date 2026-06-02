import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth-utils'
import type { UserRole } from '@prisma/client'

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
    select: { id: true, username: true, name: true, role: true, mustChangePassword: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
  }

  const { username, name, role, password } = await req.json() as {
    username?: string
    name?: string
    role?: UserRole
    password?: string
  }

  if (!username || !password || !role) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json({ error: 'اسم المستخدم مستخدم بالفعل' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: { username, name: name || null, role, passwordHash, mustChangePassword: true },
    select: { id: true, username: true, name: true, role: true, mustChangePassword: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}
