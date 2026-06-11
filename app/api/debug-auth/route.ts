// TEMPORARY debug endpoint — remove after login is fixed
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results: Record<string, unknown> = {}

  // 1. Check env vars (safe — no secrets exposed)
  results.AUTH_URL = process.env.AUTH_URL ?? 'NOT SET'
  results.AUTH_TRUST_HOST = process.env.AUTH_TRUST_HOST ?? 'NOT SET'
  results.AUTH_SECRET_SET = !!process.env.AUTH_SECRET
  results.DATABASE_URL_SET = !!process.env.DATABASE_URL
  results.NODE_ENV = process.env.NODE_ENV

  // 2. Test DB connection
  try {
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({ where: { username: 'admin' } })
    results.db_connected = true
    results.admin_user_exists = !!user
    results.admin_must_change_password = user?.mustChangePassword ?? null
    results.admin_role = user?.role ?? null
  } catch (err) {
    results.db_connected = false
    results.db_error = String(err)
  }

  return NextResponse.json(results)
}
