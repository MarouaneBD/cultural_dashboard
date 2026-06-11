'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'

export async function signInAction(username: string, password: string) {
  // Diagnostic mode — returns error details instead of generic 'invalid'
  try {
    const { prisma } = await import('@/lib/prisma')
    const { verifyPassword } = await import('@/lib/auth-utils')
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return `diag:user_not_found:${username}`
    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) return 'diag:password_mismatch'
  } catch (e) {
    return `diag:db_error:${String(e).slice(0, 200)}`
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

