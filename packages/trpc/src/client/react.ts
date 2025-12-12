import {
  createTRPCReact,
  CreateTRPCReact,
  httpBatchLink,
} from "@trpc/react-query";
import { QueryClient } from "@tanstack/react-query";
import { AppRouter } from "../server";

export const trpc: CreateTRPCReact<AppRouter, object> = createTRPCReact<
  AppRouter,
  object
>();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export const createTrpcClient = (url: string) => {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url,
        // transformer: superjson,
        // fetch(url, options) {
        //   return fetch(url, {
        //     ...options,
        //     credentials: "include", // Include cookies
        //   });
        // },
      }),
    ],
  });
};
