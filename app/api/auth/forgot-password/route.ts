import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const { username } = await req.json() as { username?: string }

  // Always return 200 — never reveal whether a username exists (prevents enumeration)
  if (!username || typeof username !== 'string' || !username.trim()) {
    return NextResponse.json({ ok: true })
  }

  try {
    await prisma.user.updateMany({
      where: { username: username.trim() },
      data: { passwordResetRequested: true },
    })
  } catch {
    // Silently swallow — same response either way
  }

  return NextResponse.json({ ok: true })
}
