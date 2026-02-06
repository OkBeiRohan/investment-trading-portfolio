import { QueryClient, dehydrate, DehydratedState } from "@tanstack/react-query";

export type PrefetchFn = (queryClient: QueryClient) => Promise<void>;

/**
 * Utility for prefetching multiple queries in Server Components.
 *
 * Usage:
 * ```tsx
 * const dehydratedState = await prefetchQueries(async (queryClient) => {
 *   await queryClient.prefetchQuery({
 *     queryKey: ['dashboard', 'balance'],
 *     queryFn: () => getBalance(),
 *   });
 *   await queryClient.prefetchQuery({
 *     queryKey: ['dashboard', 'transactions'],
 *     queryFn: () => getTransactions(),
 *   });
 * });
 * ```
 *
 * @param prefetchFn - Function that prefetches queries using the provided QueryClient
 * @returns Dehydrated state to pass to QueryHydrator
 */
export async function prefetchQueries(
  prefetchFn: PrefetchFn
): Promise<DehydratedState> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });

  await prefetchFn(queryClient);

  return dehydrate(queryClient);
}

/**
 * Prefetch a single query and return dehydrated state.
 *
 * Usage:
 * ```tsx
 * const dehydratedState = await prefetchQuery(
 *   ['dashboard', 'balance'],
 *   () => getBalance()
 * );
 * ```
 */
export async function prefetchQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>
): Promise<DehydratedState> {
  return prefetchQueries(async (queryClient) => {
    await queryClient.prefetchQuery({ queryKey, queryFn });
  });
}
