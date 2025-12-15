import { TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import type { AuthClient } from "@repo/authentication/client";
import type { AppRouter } from "../server";

/**
 * Auth Link for tRPC Client
 *
 * Automatically handles 401 Unauthorized errors by:
 * 1. Attempting to refresh the session
 * 2. Retrying the original request if refresh succeeds
 * 3. Redirecting to login if refresh fails
 *
 * This prevents users from seeing cryptic 401 errors when their session expires.
 *
 * @param authClient - Better Auth client instance
 * @returns tRPC link that handles authentication errors
 */
export const authLink = (authClient: AuthClient): TRPCLink<AppRouter> => {
  return () => {
    return ({ next, op }) => {
      return observable((observer) => {
        const subscription = next(op).subscribe({
          next(result) {
            observer.next(result);
          },
          async error(err) {
            // Check if error is 401 Unauthorized
            if (
              err.data?.httpStatus === 401 ||
              err.data?.code === "UNAUTHORIZED"
            ) {
              try {
                // Attempt to refresh the session by calling getSession
                // Better Auth automatically refreshes the session if refresh token is valid
                const session = await authClient.getSession({
                  fetchOptions: {
                    credentials: "include",
                  },
                });

                if (session?.data) {
                  // Session refresh successful, RETRY the original request
                  console.log(
                    "[tRPC Auth Link] Session refreshed, retrying request"
                  );
                  next(op).subscribe(observer);
                } else {
                  // Session refresh failed, user is truly logged out
                  console.error(
                    "[tRPC Auth Link] Session refresh failed, redirecting to login"
                  );
                  observer.error(err);

                  // Redirect to login page (only in browser)
                  if (typeof window !== "undefined") {
                    window.location.href = "/authentication/login";
                  }
                }
              } catch (refreshError) {
                // Refresh request itself failed (network error, etc.)
                console.error(
                  "[tRPC Auth Link] Session refresh error:",
                  refreshError
                );
                observer.error(err);

                // Redirect to login page (only in browser)
                if (typeof window !== "undefined") {
                  window.location.href = "/authentication/login";
                }
              }
            } else {
              // Not a 401 error, bubble up normally
              observer.error(err);
            }
          },
          complete() {
            observer.complete();
          },
        });

        return subscription;
      });
    };
  };
};
