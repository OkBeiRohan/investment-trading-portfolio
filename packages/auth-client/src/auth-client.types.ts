import type { createAuthClientInstance } from "./auth-client.config";

export type AuthClient = ReturnType<typeof createAuthClientInstance>;
