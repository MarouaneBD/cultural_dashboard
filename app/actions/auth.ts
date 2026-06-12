'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'

export async function signInAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const username = formData.get('username') as string | null
  const password = formData.get('password') as string | null

  // Step 1: verify fields arrived
  if (!username || !password) return `DIAG:no_fields`

  // Step 2: verify DB is reachable and user exists
  try {
    const { prisma } = await import('@/lib/prisma')
    const { verifyPassword } = await import('@/lib/auth-utils')
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return `DIAG:no_user:${username}`
    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) return `DIAG:bad_pass`
    // DB + credentials are valid — proceed to NextAuth session creation
  } catch (e) {
    return `DIAG:db_err:${String(e).slice(0, 120)}`
  }

  // Step 3: NextAuth session creation
  try {
    await signIn('credentials', formData)
    return null
  } catch (err) {
    if (err instanceof AuthError) return `DIAG:auth_err:${(err as any).type ?? err.message}`
    throw err
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: '/login' })
}
