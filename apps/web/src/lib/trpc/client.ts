/**
 * tRPC Client
 *
 * Creates the tRPC client for use in Client Components.
 * The AppRouter type is imported from @repo/schema (auto-generated from API).
 */

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@repo/schema/api";

export const trpc = createTRPCReact<AppRouter>();
