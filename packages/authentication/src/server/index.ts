export * from "./auth.config";
export * from "./auth.types";
export { createBetterAuthInstance } from "./auth.config";
export type { BetterAuthServerConfig } from "./auth.config";
export type { Auth, Session, User } from "./auth.types";
export { betterAuth } from "better-auth";
export { organization, twoFactor } from "better-auth/plugins";
export { passkey } from "@better-auth/passkey";
