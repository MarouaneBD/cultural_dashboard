'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'

export async function signInAction(username: string, password: string) {
  // Direct DB probe — bypasses NextAuth to isolate the failure point
  try {
    const { prisma } = await import('@/lib/prisma')
    const { verifyPassword } = await import('@/lib/auth-utils')
    const user = await prisma.user.findUnique({ where: { username } })
    console.error('[probe] user_found:', !!user)
    if (user) {
      const ok = await verifyPassword(password, user.passwordHash)
      console.error('[probe] password_ok:', ok)
    }
  } catch (e) {
    console.error('[probe] error:', String(e))
  }

  try {
    await signIn('credentials', { username, password, redirectTo: '/dashboard' })
  } catch (err) {
    if (err instanceof AuthError) return 'invalid'
    throw err
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: '/login' })
}

