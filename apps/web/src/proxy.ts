import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CallbackUrlSchema } from "@repo/schema";
import { isAuthenticatedAction } from "./lib/auth/actions";

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
  ];

  // Check if the path is public
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Check for auth session cookie (better-auth)
  // In production with useSecureCookies: true, cookie name is prefixed with __Secure-
  const sessionToken = await isAuthenticatedAction(request.cookies);

  // If the user is not authenticated and trying to access a protected route
  if (!sessionToken && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/authentication/login";

    // Validate callback URL
    const validationResult = CallbackUrlSchema.safeParse(pathname);

    if (validationResult.success) {
      // Add callback URL as query parameter (will be stored in sessionStorage by login page)
      url.searchParams.set("callbackUrl", pathname);
    } else {
      // Invalid URL, don't set callback
      console.warn("Invalid callback URL attempted:", pathname);
    }

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
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - .well-known (ACME challenges, security.txt, etc)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc)
     */
    "/((?!_next/static|_next/image|.well-known|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
