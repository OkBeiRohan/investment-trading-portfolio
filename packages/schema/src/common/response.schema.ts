import { z } from "zod";

/**
 * Success Response Schema
 */
export const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type SuccessResponse = z.infer<typeof successResponseSchema>;

/**
 * Error Response Schema
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string(),
  statusCode: z.number().optional(),
  timestamp: z.date().optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Generic Paginated Response Schema Factory
 */
export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T
) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      totalPages: z.number(),
      hasMore: z.boolean(),
    }),
  });
