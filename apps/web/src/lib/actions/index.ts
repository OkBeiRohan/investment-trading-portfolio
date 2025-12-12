/**
 * Server Actions - Public API
 *
 * This module exports all Server Actions that can be called from Client Components.
 * All actions automatically verify authentication, permissions, and input validation.
 *
 * Usage in Client Components:
 *
 * ```typescript
 * 'use client';
 *
 * import { updateStrategyParameters } from '@/lib/actions';
 *
 * export function LiveTunerPanel({ strategyId }: Props) {
 *   const handleUpdate = async () => {
 *     const result = await updateStrategyParameters({
 *       strategyId,
 *       parameters: { stopLoss: 10 }
 *     });
 *
 *     if (result.success) {
 *       toast.success('Parameters updated');
 *     }
 *   };
 *
 *   return <Button onClick={handleUpdate}>Update</Button>;
 * }
 * ```
 *
 * DO NOT import from individual files - always use this index.
 */

// Wealth actions
export * from "./wealth";

// Trading actions
export * from "./trading";

// Account actions
export * from "./account";

// Organization actions
export * from "./organization";

// Admin actions (restricted)
export * from "./admin";
