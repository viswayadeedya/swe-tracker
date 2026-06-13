import { NextRequest, NextResponse } from 'next/server';

const PUBLIC = ['/login', '/api/auth/'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow login page and auth API routes
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();

  const session = req.cookies.get('sprint_auth')?.value;
  const secret  = process.env.AUTH_SECRET ?? 'sprint-default-secret';

  if (session !== secret) {
    // API calls → 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Page visits → redirect to /login
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
