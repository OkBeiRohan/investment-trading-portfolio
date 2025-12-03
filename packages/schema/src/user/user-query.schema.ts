import { z } from "zod";
import { userPublicSchema } from "./user.schema";
import { userRoleEnum } from "./user.schema";

/**
 * User Query/Filter Schema
 */
export const userQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  search: z.string().optional(), // Search in email, firstName, lastName
  role: userRoleEnum.optional(),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
  country: z.string().length(2).optional(),
  createdAfter: z.iso.datetime().or(z.date()).optional(),
  createdBefore: z.iso.datetime().or(z.date()).optional(),
});

export type UserQuery = z.infer<typeof userQuerySchema>;

/**
 * Paginated Users Response Schema
 */
export const paginatedUsersSchema = z.object({
  users: z.array(userPublicSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    hasMore: z.boolean(),
  }),
});

export type PaginatedUsers = z.infer<typeof paginatedUsersSchema>;
