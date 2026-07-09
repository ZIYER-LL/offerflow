import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const publicPaths = ['/', '/login', '/register'];
  const apiAuthPaths = ['/api/auth'];

  const isPublic = publicPaths.some((p) => nextUrl.pathname === p);
  const isApiAuth = apiAuthPaths.some((p) => nextUrl.pathname.startsWith(p));

  if (isApiAuth) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
