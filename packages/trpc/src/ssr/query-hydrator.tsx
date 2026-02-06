"use client";

import { HydrationBoundary, DehydratedState } from "@tanstack/react-query";
import { PropsWithChildren } from "react";

interface QueryHydratorProps extends PropsWithChildren {
  /**
   * Dehydrated state from server-side prefetching.
   * Use `dehydrate(queryClient)` in Server Components.
   */
  state: DehydratedState;
}

/**
 * Client Component wrapper for hydrating prefetched query data.
 *
 * Usage in Server Component:
 * ```tsx
 * import { QueryHydrator } from "@repo/trpc/ssr";
 * import { QueryClient, dehydrate } from "@tanstack/react-query";
 *
 * export default async function Page() {
 *   const queryClient = new QueryClient();
 *   await queryClient.prefetchQuery({ queryKey: [...], queryFn: ... });
 *
 *   return (
 *     <QueryHydrator state={dehydrate(queryClient)}>
 *       <ClientComponent />
 *     </QueryHydrator>
 *   );
 * }
 * ```
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
 */
export function QueryHydrator({ state, children }: QueryHydratorProps) {
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
