import NextAuth from 'next-auth'
import { authConfig } from './auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  const isAuthPage = pathname === '/login' || pathname === '/change-password'

  // Not logged in → allow auth pages, redirect everything else to login
  if (!session) {
    if (isAuthPage) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // From here session is guaranteed non-null

  // Already logged in → skip login page
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Must change password → force redirect (unless already there or calling an API)
  if (session.user.mustChangePassword && pathname !== '/change-password' && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/change-password', req.url))
  }

  // Non-admin trying to access /admin/* routes
  if (pathname.startsWith('/admin') && session.user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // VIEWER trying to access /upload
  if (pathname.startsWith('/upload') && session.user.role === 'VIEWER') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|dabs-logo.png|api/auth).*)',
  ],
}
