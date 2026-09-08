import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * Auth middleware protecting app routes.
 * Redirects unauthenticated users to /login.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public routes that don't require auth
  const publicPaths = ['/login', '/register', '/api/auth'];
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublic) {
    return NextResponse.next();
  }

  // If not authenticated and trying to access protected route
  if (!req.auth) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
