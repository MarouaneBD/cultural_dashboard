'use server'

import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'

export async function signInAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  try {
    await signIn('credentials', { ...Object.fromEntries(formData), redirect: false })
  } catch (err) {
    if (err instanceof AuthError) return 'invalid'
    throw err
  }
  // Hard redirect — forces a full page load so the layout re-fetches the session
  redirect('/dashboard')
}

export async function signOutAction() {
  await signOut({ redirectTo: '/login' })
}
