import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Step 1: verify GET routing works
export async function GET() {
  return NextResponse.json({ ok: true, step: 1, ts: Date.now() })
}

// Step 2: verify POST routing works (no auth, no body)
export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? 'none'

  // Step 3: if ?auth=1, also check session
  let sessionInfo: unknown = 'skipped'
  if (req.nextUrl.searchParams.get('auth') === '1') {
    try {
      const session = await auth() as any
      sessionInfo = session
        ? { role: session.user?.role, id: session.user?.id }
        : null
    } catch (err) {
      sessionInfo = { error: String(err) }
    }
  }

  return NextResponse.json({
    ok: true,
    method: 'POST',
    contentType,
    session: sessionInfo,
    ts: Date.now(),
  })
}
