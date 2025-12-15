import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { userSchema } from "@repo/schema/user";

const t = initTRPC.create();
const publicProcedure = t.procedure;

const appRouter = t.router({
  api: t.router({
    getVersion: publicProcedure.input(z.null().optional()).output(z.object({ version: z.string() })).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    getFrontendUrl: publicProcedure.input(z.null().optional()).output(z.object({ url: z.string() })).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any)
  }),
  user: t.router({
    getUser: publicProcedure.input(z.object({ id: z.string() })).output(userSchema).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    createUser: publicProcedure.input(userSchema).output(userSchema).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any)
  })
});
export type AppRouter = typeof appRouter;

