import { locales } from "./lib/i18n";

import { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Debug logging
  console.log('Middleware handling path:', pathname);

  // Allow preview and dynamic-lp routes to pass through
  if (pathname.startsWith('/preview/') || pathname.startsWith('/dynamic-lp/')) {
    return;
  }

  const isExit = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Debug logging
  console.log('Is excluded path?', isExit);

  if (isExit) return;

  // Debug logging
  console.log('Redirecting to root');

  request.nextUrl.pathname = `/`;
  return Response.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    // Exclude api routes, static files, images, generator route, and other assets
    '/((?!api|_next/static|_next/image|generator|terms|favicon|.*\\.(?:txt|xml|ico|png|jpg|jpeg|svg|gif|webp|js|css|woff|woff2|ttf|eot)).*)'
  ]
};