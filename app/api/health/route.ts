import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  let db: 'ok' | 'error' = 'ok'
  let dbError: string | null = null
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (err) {
    db = 'error'
    dbError = err instanceof Error ? err.message : String(err)
  }

  return NextResponse.json({
    status: 'ok',
    db,
    // Surface config gaps without leaking secret values
    env: {
      AUTH_SECRET: process.env.AUTH_SECRET ? 'set' : 'MISSING',
      DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'MISSING',
      DATABASE_SSL_REJECT_UNAUTHORIZED: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? 'not set (defaults to true)',
      NODE_ENV: process.env.NODE_ENV,
    },
    ...(db === 'error' && { dbError }),
  })
}
