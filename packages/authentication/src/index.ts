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
} from "@thallesp/nestjs-better-auth";
