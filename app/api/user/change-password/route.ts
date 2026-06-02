import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth-utils'

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const { newPassword } = (await req.json()) as { newPassword?: string }
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
      { status: 400 }
    )
  }

  const passwordHash = await hashPassword(newPassword)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash, mustChangePassword: false },
  })

  return NextResponse.json({ ok: true })
}
