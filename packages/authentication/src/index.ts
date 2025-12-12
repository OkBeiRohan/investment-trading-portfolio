export * from "./adapters";
export * from "./client";
export * from "./auth.module";
export * from "./services/auth.service";
export {
  AuthGuard,
  Session,
  AllowAnonymous,
  OptionalAuth,
  Roles,
  Hook,
  BeforeHook,
  AfterHook,
  type AuthHookContext,
  AuthService as BetterAuthService,
} from "@thallesp/nestjs-better-auth";
