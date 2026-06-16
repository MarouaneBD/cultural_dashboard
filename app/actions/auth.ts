'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'

export async function signInAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  try {
    await signIn('credentials', formData)
    return null
  } catch (err) {
    if (err instanceof AuthError) return 'invalid'
    throw err   // re-throws NEXT_REDIRECT → 303 full-page reload
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: '/login' })
}
