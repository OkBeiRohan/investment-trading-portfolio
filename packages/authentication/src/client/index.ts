export * from "./auth-client.config";
export * from "./auth-client.types";
export * from "./hooks";
export { createAuthClient } from "better-auth/client";
export {
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins";
export { passkeyClient } from "@better-auth/passkey/client";
export { toNextJsHandler } from "better-auth/next-js";
