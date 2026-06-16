// TEMPORARY debug endpoint — remove after login is fixed
import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results: Record<string, unknown> = {}

  // 1. Check env vars (safe — no secrets exposed)
  results.AUTH_SECRET_SET = !!process.env.AUTH_SECRET
  results.DATABASE_URL_SET = !!process.env.DATABASE_URL
  results.NODE_ENV = process.env.NODE_ENV

  // 2. Current session
  try {
    const session = await auth()
    results.session_exists = !!session
    results.session_user_id = session?.user?.id ?? null
    results.session_user_role = session?.user?.role ?? null
    results.session_username = (session?.user as any)?.username ?? null
    results.session_mustChangePassword = (session?.user as any)?.mustChangePassword ?? null
  } catch (err) {
    results.session_error = String(err)
  }

  // 3. Test DB connection
  try {
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({ where: { username: 'admin' } })
    results.db_connected = true
    results.admin_user_exists = !!user
    results.admin_role_in_db = user?.role ?? null
    results.admin_mustChangePassword_in_db = user?.mustChangePassword ?? null
  } catch (err) {
    results.db_connected = false
    results.db_error = String(err)
  }

  return NextResponse.json(results)
}
