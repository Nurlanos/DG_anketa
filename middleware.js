import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard only
  if (!pathname.startsWith('/dashboard')) return NextResponse.next();

  const auth = request.headers.get('authorization');
  if (auth) {
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded);
      const [user, pwd] = decoded.split(':');
      if (user === 'admin' && pwd === 'astana1234') {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Documentolog Dashboard"',
    },
  });
}

export const config = {
  matcher: ['/dashboard'],
};
