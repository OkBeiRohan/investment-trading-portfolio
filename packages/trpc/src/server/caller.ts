"use server";

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { cookies, headers } from "next/headers";
import type { AppRouter } from "./index";

/**
 * Server-side tRPC client for use in Server Components and Server Actions
 *
 * This client forwards Next.js cookies to the backend API, ensuring proper authentication.
 * Use this when calling tRPC procedures from:
 * - Server Components (async functions in app/...)
 * - Server Actions (exported async functions with "use server")
 * - Route Handlers (app/api/...)
 *
 * @example Server Component
 * ```tsx
 * import { serverTrpc } from '@repo/trpc/server';
 *
 * export default async function ProfilePage() {
 *   const user = await serverTrpc.user.getProfile.query();
 *   return <Profile user={user} />;
 * }
 * ```
 *
 * @example Server Action
 * ```tsx
 * 'use server';
 * import { serverTrpc } from '@repo/trpc/server';
 *
 * export async function updateProfile(data: UpdateProfileInput) {
 *   return serverTrpc.user.updateProfile.mutate(data);
 * }
 * ```
 */
export const serverTrpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004"}/api/trpc`,
      async headers() {
        // Get all cookies from the current request
        const cookieStore = await cookies();
        const allCookies = cookieStore
          .getAll()
          .map(
            (cookie: { name: string; value: string }) =>
              `${cookie.name}=${cookie.value}`
          )
          .join("; ");

        // Get all request headers
        const requestHeaders = await headers();
        const headerObj: Record<string, string> = {};
        requestHeaders.forEach((value: string, key: string) => {
          headerObj[key] = value;
        });

        return {
          ...headerObj,
          // Override cookie header with all cookies from the request
          cookie: allCookies,
        };
      },
      // transformer: superjson, // Uncomment if using superjson
    }),
  ],
});

/**
 * Get server-side tRPC client with custom headers
 * Use this when you need to pass additional headers beyond cookies
 *
 * @param customHeaders - Additional headers to include
 * @returns tRPC client configured with custom headers
 *
 * @example
 * ```tsx
 * const trpc = getServerTrpc({
 *   'x-request-id': requestId,
 *   'x-organization-id': orgId,
 * });
 * const data = await trpc.organization.getData.query();
 * ```
 */
export function getServerTrpc(customHeaders?: Record<string, string>) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3004"}/api/trpc`,
        async headers() {
          const cookieStore = await cookies();
          const allCookies = cookieStore
            .getAll()
            .map(
              (cookie: { name: string; value: string }) =>
                `${cookie.name}=${cookie.value}`
            )
            .join("; ");

          const requestHeaders = await headers();
          const headerObj: Record<string, string> = {};
          requestHeaders.forEach((value: string, key: string) => {
            headerObj[key] = value;
          });

          return {
            ...headerObj,
            ...customHeaders,
            cookie: allCookies,
          };
        },
      }),
    ],
  });
}
