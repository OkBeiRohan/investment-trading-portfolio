import type { createAuthClientInstance } from "./auth-client.config";

export type AuthClient = ReturnType<typeof createAuthClientInstance>;

// Infer types from the client
export type InferSession = Awaited<ReturnType<AuthClient["getSession"]>>;
export type InferUser = NonNullable<InferSession["data"]>["user"];
export type InferOrganization = Awaited<
  ReturnType<AuthClient["organization"]["getFullOrganization"]>
>["data"];
