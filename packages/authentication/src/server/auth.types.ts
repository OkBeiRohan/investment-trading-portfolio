import type { createBetterAuthInstance } from "./auth.config";

export type Auth = ReturnType<typeof createBetterAuthInstance>;

export type Session = Awaited<ReturnType<Auth["api"]["getSession"]>>;
export type User = NonNullable<Session>["user"];

// Helper types for API responses
export type SignInResponse = Awaited<ReturnType<Auth["api"]["signInEmail"]>>;
export type SignUpResponse = Awaited<ReturnType<Auth["api"]["signUpEmail"]>>;
export type SessionResponse = Awaited<ReturnType<Auth["api"]["getSession"]>>;
