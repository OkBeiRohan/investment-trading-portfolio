import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define public paths that don't require authentication
  const publicPaths = [
    "/authentication/login",
    "/authentication/register",
    "/authentication/forgot-password",
    "/authentication/reset-password",
    "/authentication/verify-email",
    "/authentication/verify-phone",
    "/authentication/magic-link",
    "/authentication/passkey",
    "/api/auth", // Allow auth API calls
  ];

  // Check if the path is public
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Check for auth session cookie (better-auth default)
  const sessionToken = request.cookies.get("better-auth.session_token")?.value;

  // If the user is not authenticated and trying to access a protected route
  if (!sessionToken && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/authentication/login";
    url.searchParams.set("callbackUrl", pathname); // Optional: preserve redirect
    return NextResponse.redirect(url);
  }

  // If the user is authenticated and trying to access auth pages (login/register)
  // Redirect them to the dashboard
  if (
    sessionToken &&
    (pathname === "/authentication/login" ||
      pathname === "/authentication/register")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (handled above, but good to exclude from heavy processing if possible, though we need to allow it)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - .well-known (ACME challenges, security.txt, etc)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc)
     */
    "/((?!_next/static|_next/image|.well-known|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
