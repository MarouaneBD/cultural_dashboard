import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Simple in-memory rate limiter — max 5 requests per IP per 15 minutes.
// Prevents bulk username enumeration via timing or spamming the reset queue.
const forgotAttempts = new Map<string, { count: number; windowStart: number }>()
const WINDOW_MS  = 15 * 60 * 1000
const MAX_REQUESTS = 5

function isRateLimited(ip: string): boolean {
  const now    = Date.now()
  const record = forgotAttempts.get(ip)
  if (!record || now - record.windowStart > WINDOW_MS) {
    forgotAttempts.set(ip, { count: 1, windowStart: now })
    return false
  }
  record.count++
  return record.count > MAX_REQUESTS
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    // Still return 200 — don't reveal the rate limit to enumeration scripts
    return NextResponse.json({ ok: true })
  }

  const body = await req.json() as { username?: unknown }
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : null

  // Always return 200 — never reveal whether a username exists (prevents enumeration)
  if (!username) {
    return NextResponse.json({ ok: true })
  }

  try {
    await prisma.user.updateMany({
      where: { username },
      data: { passwordResetRequested: true },
    })
  } catch {
    // Silently swallow — same response either way to prevent timing attacks
  }

  return NextResponse.json({ ok: true })
}
