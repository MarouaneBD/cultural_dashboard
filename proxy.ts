import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Not logged in → login page
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Already logged in + visiting /login → dashboard
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Must change password → force redirect (unless already there)
  if (session.user.mustChangePassword && pathname !== '/change-password') {
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
