import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../server/server";

// Create tRPC React client with proper typing
export const trpc = createTRPCReact<AppRouter>();
