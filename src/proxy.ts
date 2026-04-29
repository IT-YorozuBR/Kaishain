import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import type { UserRole } from '@/lib/db/schema';

const publicRoutes = ['/login'];

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function getRoleHome(role: UserRole) {
  if (role === 'GESTOR') {
    return '/avaliar';
  }

  return '/funcionarios';
}

export const proxy = auth((request) => {
  const isAuthenticated = Boolean(request.auth);
  const pathname = request.nextUrl.pathname;
  const role = request.auth?.user?.role;

  if (!isAuthenticated && !isPublicRoute(pathname)) {
    const loginUrl = new URL('/login', request.nextUrl);
    loginUrl.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`);

    return NextResponse.redirect(loginUrl);
  }

  if (!role) {
    return NextResponse.next();
  }

  if (isAuthenticated && (isPublicRoute(pathname) || pathname === '/')) {
    return NextResponse.redirect(new URL(getRoleHome(role), request.nextUrl));
  }

  if (role === 'GESTOR' && pathname.startsWith('/funcionarios')) {
    return NextResponse.redirect(new URL('/avaliar', request.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|icon.png|.*\\..*).*)'],
};
