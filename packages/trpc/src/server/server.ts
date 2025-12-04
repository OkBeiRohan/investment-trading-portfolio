import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();
const publicProcedure = t.procedure;

const appRouter = t.router({
  user: t.router({
    getUser: publicProcedure.input(z.object({ id: z.string() })).output(z.object({
      id: z.uuid(),
      email: z.email().toLowerCase(),
      emailVerified: z.boolean().default(false),
      name: z.string().min(1).max(200),
      phoneNumber: z
        .string()
        .regex(/^\+?[1-9]\d{1,14}$/)
        .optional()
        .nullable(),
      phoneVerified: z.boolean().default(false),
      image: z.url().optional().nullable(),
      dateOfBirth: z.date().optional().nullable(),
      country: z.string().length(2).optional().nullable(), // ISO 3166-1 alpha-2
      isActive: z.boolean().default(true),
      isBlocked: z.boolean().default(false),
      role: z
        .array(z.enum(['Investor', 'Trader', 'Admin']))
        .default(['Investor'])
        .refine((arr) => new Set(arr).size === arr.length, {
          message: 'Roles must be unique.',
        }),
      twoFactorEnabled: z.boolean().default(false),
      lastLoginAt: z.date().optional().nullable(),
      passwordChangedAt: z.date().optional().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })).query(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any),
    createUser: publicProcedure.input(z.object({
      id: z.uuid(),
      email: z.email().toLowerCase(),
      emailVerified: z.boolean().default(false),
      name: z.string().min(1).max(200),
      phoneNumber: z
        .string()
        .regex(/^\+?[1-9]\d{1,14}$/)
        .optional()
        .nullable(),
      phoneVerified: z.boolean().default(false),
      image: z.url().optional().nullable(),
      dateOfBirth: z.date().optional().nullable(),
      country: z.string().length(2).optional().nullable(), // ISO 3166-1 alpha-2
      isActive: z.boolean().default(true),
      isBlocked: z.boolean().default(false),
      role: z
        .array(z.enum(['Investor', 'Trader', 'Admin']))
        .default(['Investor'])
        .refine((arr) => new Set(arr).size === arr.length, {
          message: 'Roles must be unique.',
        }),
      twoFactorEnabled: z.boolean().default(false),
      lastLoginAt: z.date().optional().nullable(),
      passwordChangedAt: z.date().optional().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })).output(z.object({
      id: z.uuid(),
      email: z.email().toLowerCase(),
      emailVerified: z.boolean().default(false),
      name: z.string().min(1).max(200),
      phoneNumber: z
        .string()
        .regex(/^\+?[1-9]\d{1,14}$/)
        .optional()
        .nullable(),
      phoneVerified: z.boolean().default(false),
      image: z.url().optional().nullable(),
      dateOfBirth: z.date().optional().nullable(),
      country: z.string().length(2).optional().nullable(), // ISO 3166-1 alpha-2
      isActive: z.boolean().default(true),
      isBlocked: z.boolean().default(false),
      role: z
        .array(z.enum(['Investor', 'Trader', 'Admin']))
        .default(['Investor'])
        .refine((arr) => new Set(arr).size === arr.length, {
          message: 'Roles must be unique.',
        }),
      twoFactorEnabled: z.boolean().default(false),
      lastLoginAt: z.date().optional().nullable(),
      passwordChangedAt: z.date().optional().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })).mutation(async () => "PLACEHOLDER_DO_NOT_REMOVE" as any)
  })
});
export type AppRouter = typeof appRouter;

