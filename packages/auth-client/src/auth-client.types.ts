import type { createAuthClientInstance } from "./auth-client.config";

export type AuthClient = ReturnType<typeof createAuthClientInstance>;

/**
 * Typed session user with all better-auth additionalFields.
 * Use this instead of the raw better-auth User type to get full IntelliSense
 * on custom fields (isDataCollectionEnabled, role, etc.)
 */
export type SessionUser = NonNullable<
  Awaited<ReturnType<AuthClient["getSession"]>>
>["data"]["user"];
