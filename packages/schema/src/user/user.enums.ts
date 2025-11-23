import { z } from "zod";

/**
 * User Role Enum
 */
export const userRoleEnum = z.enum(["Investor", "Trader", "Admin"]);
export type UserRole = z.infer<typeof userRoleEnum>;

/**
 * Sort Order Enum
 */
export const sortOrderEnum = z.enum(["asc", "desc"]);
export type SortOrder = z.infer<typeof sortOrderEnum>;

/**
 * User Sort By Fields Enum
 */
export const userSortByEnum = z.enum([
  "createdAt",
  "updatedAt",
  "email",
  "firstName",
  "lastName",
  "lastLoginAt",
]);
export type UserSortBy = z.infer<typeof userSortByEnum>;
