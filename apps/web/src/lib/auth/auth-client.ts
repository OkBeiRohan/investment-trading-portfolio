import {
  AuthClient,
  createAuthClientInstance,
} from "@repo/authentication/client";

export const authClient: AuthClient = createAuthClientInstance({
  basePath: "/api/auth",
});
