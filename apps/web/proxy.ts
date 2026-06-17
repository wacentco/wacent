import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/']
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Let all API routes (NextAuth, logout, etc.) pass through untouched
  if (pathname.startsWith('/api/')) return NextResponse.next()

  const token = request.cookies.get('wc_token')?.value
  const role = request.cookies.get('wc_role')?.value

  // Redirect logged-in users away from auth pages
  if (token && AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.redirect(new URL(role === 'admin' ? '/admin' : '/devices', request.url))
  }

  // Redirect unauthenticated users away from protected pages
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith('/docs') || pathname.startsWith('/pricing'))
  if (!token && !isPublic) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (token) {
    // Admin can only access /admin/* — redirect elsewhere to /admin
    if (role === 'admin' && !pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // Non-admin cannot access /admin/* — redirect to /devices
    if (role !== 'admin' && pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/devices', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
