/**
 * API Configuration and Response Schemas
 * Common schemas for API interactions
 */

import { z } from "zod";

// ============================================
// API Configuration Schema
// ============================================

export const apiConfigSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  apiSecret: z.string().min(1, "API secret is required"),
  redirectUri: z.string().url().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  environment: z
    .enum(["production", "sandbox", "development"])
    .default("production"),
  timeout: z.number().default(30000), // milliseconds
  retryAttempts: z.number().default(3),
});

export type ApiConfig = z.infer<typeof apiConfigSchema>;

// ============================================
// API Error Schema
// ============================================

export const apiErrorSchema = z.object({
  errorCode: z.string(),
  message: z.string(),
  propertyPath: z.string().optional(),
  invalidValue: z.any().optional(),
  timestamp: z.date().optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

// ============================================
// API Response Schema
// ============================================

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    status: z.enum(["success", "error"]),
    data: dataSchema.optional(),
    errors: z.array(apiErrorSchema).optional(),
    message: z.string().optional(),
    timestamp: z.date().optional(),
  });

export type ApiResponse<T> = {
  status: "success" | "error";
  data?: T;
  errors?: ApiError[];
  message?: string;
  timestamp?: Date;
};

// ============================================
// Pagination Schema
// ============================================

export const paginationParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationParams = z.infer<typeof paginationParamsSchema>;

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T
) =>
  z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
      hasMore: z.boolean(),
    }),
  });

export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
};
