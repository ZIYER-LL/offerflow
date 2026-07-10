import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = process.env.AUTH_SECRET || 'offerflow-dev-secret-do-not-use-in-production';

const publicPaths = ['/', '/login', '/register'];
const apiAuthPaths = ['/api/auth'];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (apiAuthPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  if (publicPaths.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('next-auth.session-token')?.value
    || request.cookies.get('__Secure-next-auth.session-token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
