import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth-utils'
import { authConfig } from './auth.config'
import type { UserRole } from '@prisma/client'

// Simple in-memory rate limiter for the login endpoint.
// Tracks failed attempts per username; suitable for single-instance internal deployments.
// For multi-instance production, replace the Map with a Redis-backed store (e.g. Upstash).
const loginAttempts = new Map<string, { failed: number; windowStart: number }>()
const RATE_WINDOW_MS = 15 * 60 * 1000 // 15-minute sliding window
const MAX_FAILED = 10                  // lockout after 10 consecutive failures

function isRateLimited(username: string): boolean {
  const now = Date.now()
  const record = loginAttempts.get(username)
  if (!record) return false
  if (now - record.windowStart > RATE_WINDOW_MS) {
    loginAttempts.delete(username)
    return false
  }
  return record.failed >= MAX_FAILED
}

function recordFailedAttempt(username: string): void {
  const now = Date.now()
  const record = loginAttempts.get(username)
  if (!record || now - record.windowStart > RATE_WINDOW_MS) {
    loginAttempts.set(username, { failed: 1, windowStart: now })
  } else {
    record.failed++
  }
}

function resetAttempts(username: string): void {
  loginAttempts.delete(username)
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        username: { label: 'اسم المستخدم' },
        password: { label: 'كلمة المرور', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const username = (credentials?.username as string | undefined)?.trim().toLowerCase()
          const password = credentials?.password as string | undefined
          if (!username || !password) return null

          if (isRateLimited(username)) return null

          const user = await prisma.user.findUnique({ where: { username } })
          if (!user) {
            recordFailedAttempt(username)
            return null
          }

          const valid = await verifyPassword(password, user.passwordHash)
          if (!valid) {
            recordFailedAttempt(username)
            return null
          }

          resetAttempts(username)
          return {
            id: user.id,
            username: user.username,
            name: user.name ?? undefined,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
            assignedPillarId: user.assignedPillarId ?? null,
          }
        } catch (err) {
          console.error('[authorize] error:', err)
          return null
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.username = user.username
        token.role = user.role
        token.mustChangePassword = user.mustChangePassword
        token.assignedPillarId = user.assignedPillarId
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.username = token.username as string
      session.user.role = token.role as UserRole
      session.user.mustChangePassword = token.mustChangePassword as boolean
      session.user.assignedPillarId = token.assignedPillarId as string | null
      return session
    },
  },
})
