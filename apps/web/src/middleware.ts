import { NextRequest, NextResponse } from "next/server";
import { CallbackUrlSchema } from "@repo/schema";
import publicPaths from "./lib/auth/PUBLIC_PATHS";

const AUTH_PAGES = ["/authentication/login", "/authentication/register"];

function hasSessionCookie(request: NextRequest): boolean {
  const cookiePrefix = process.env.APP_NAME || "better-auth";
  const secureToken = request.cookies.get(
    `__Secure-${cookiePrefix}.session_token`
  );
  const regularToken = request.cookies.get(
    `${cookiePrefix}.session_token`
  );
  return !!(secureToken?.value || regularToken?.value);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  const hasSession = hasSessionCookie(request);

  if (!hasSession && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/authentication/login";

    const validationResult = CallbackUrlSchema.safeParse(pathname);
    if (validationResult.success) {
      url.searchParams.set("callbackUrl", pathname);
    } else {
      console.warn("Invalid callback URL attempted:", pathname);
    }

    return NextResponse.redirect(url);
  }

  if (hasSession && AUTH_PAGES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.well-known|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
