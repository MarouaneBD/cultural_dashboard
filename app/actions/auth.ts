'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'

export async function signInAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  try {
    await signIn('credentials', {
      username,
      password,
      redirectTo: '/dashboard',
    })
    return null
  } catch (err: any) {
    if (err instanceof AuthError) return 'invalid'
    throw err   // re-throws NEXT_REDIRECT → 303 full-page reload
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: '/login' })
}
