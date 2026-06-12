'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'

export async function signInAction(username: string, password: string) {
  try {
    const { prisma } = await import('@/lib/prisma')
    const { verifyPassword } = await import('@/lib/auth-utils')
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return `FAIL:no_user_${username}` as const
    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) return 'FAIL:bad_password' as const
    // credentials are valid — now sign in
  } catch (e) {
    return `FAIL:db_${String(e).slice(0, 150)}` as const
  }

  try {
    await signIn('credentials', { username, password, redirectTo: '/dashboard' })
  } catch (err) {
    if (err instanceof AuthError) return 'FAIL:auth_error' as const
    throw err
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: '/login' })
}

