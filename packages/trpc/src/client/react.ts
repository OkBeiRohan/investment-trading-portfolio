import { createTRPCClient, httpBatchLink } from "@trpc/react-query";
import { AppRouter } from "../server";
import { getQueryClient } from "./query-client";

//: CreateTRPCReact<AppRouter, object>
// export const trpc = createTRPCReact<AppRouter, object>();

export const queryClient = getQueryClient();

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
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
