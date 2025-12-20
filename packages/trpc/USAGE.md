# tRPC Usage Guide

This package uses the **classic tRPC React Query integration** for a simpler, more intuitive API.

## Setup

### 1. Wrap your app with TrpcProvider

```tsx
// apps/web/src/app/providers.tsx
import { TrpcProvider } from "@repo/trpc";

export function Providers({ children }: { children: React.ReactNode }) {
  return <TrpcProvider>{children}</TrpcProvider>;
}
```

### 2. Import the trpc client

```tsx
import { trpc } from "@repo/trpc";
```

## Usage Examples

### Queries (Fetching Data)

```tsx
"use client";

import { trpc } from "@repo/trpc";

export function UserProfile() {
  // Simple query - no need for useQuery()!
  const { data, isLoading, error } = trpc.usersRouter.getUserProfile.useQuery({
    userId: "123",
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data.name}</div>;
}
```

### Mutations (Creating/Updating Data)

```tsx
"use client";

import { trpc } from "@repo/trpc";

export function CreatePost() {
  const utils = trpc.useUtils();

  // Simple mutation
  const createPost = trpc.postsRouter.create.useMutation({
    onSuccess: () => {
      // Invalidate queries to refetch
      utils.postsRouter.findAll.invalidate();
    },
  });

  const handleSubmit = (image: string, caption: string) => {
    createPost.mutate({ image, caption });
  };

  return (
    <button
      onClick={() => handleSubmit("img.jpg", "Hello!")}
      disabled={createPost.isPending}
    >
      {createPost.isPending ? "Creating..." : "Create Post"}
    </button>
  );
}
```

### Optimistic Updates

```tsx
"use client";

import { trpc } from "@repo/trpc";

export function LikeButton({ postId }: { postId: number }) {
  const utils = trpc.useUtils();

  const likePost = trpc.postsRouter.likePost.useMutation({
    // Update UI immediately (before server responds)
    onMutate: async ({ postId }) => {
      // Cancel outgoing refetches
      await utils.postsRouter.findAll.cancel();

      // Snapshot current value
      const previousPosts = utils.postsRouter.findAll.getData();

      // Optimistically update
      utils.postsRouter.findAll.setData(undefined, (old) => {
        if (!old) return old;

        return old.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              isLiked: !post.isLiked,
              likes: post.isLiked ? post.likes - 1 : post.likes + 1,
            };
          }
          return post;
        });
      });

      return { previousPosts };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousPosts) {
        utils.postsRouter.findAll.setData(undefined, context.previousPosts);
      }
    },

    // Refetch after success/error
    onSettled: () => {
      utils.postsRouter.findAll.invalidate();
    },
  });

  return <button onClick={() => likePost.mutate({ postId })}>Like</button>;
}
```

### Dependent Queries

```tsx
"use client";

import { trpc } from "@repo/trpc";

export function PostComments({ postId }: { postId: number }) {
  // This query only runs when postId exists
  const { data: comments } = trpc.commentsRouter.findByPostId.useQuery(
    { postId },
    {
      enabled: !!postId, // Only fetch when postId is truthy
    }
  );

  return (
    <div>
      {comments?.map((comment) => (
        <div key={comment.id}>{comment.text}</div>
      ))}
    </div>
  );
}
```

### Infinite Queries (Pagination)

```tsx
"use client";

import { trpc } from "@repo/trpc";

export function InfinitePosts() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.postsRouter.findAllPaginated.useInfiniteQuery(
      { limit: 10 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  return (
    <div>
      {data?.pages.map((page, i) => (
        <div key={i}>
          {page.posts.map((post) => (
            <div key={post.id}>{post.caption}</div>
          ))}
        </div>
      ))}

      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
```

### Utils - Manual Cache Manipulation

```tsx
"use client";

import { trpc } from "@repo/trpc";

export function PostActions() {
  const utils = trpc.useUtils();

  const handleRefresh = () => {
    // Invalidate and refetch
    utils.postsRouter.findAll.invalidate();
  };

  const handlePrefetch = () => {
    // Prefetch data for faster navigation
    utils.postsRouter.findAll.prefetch();
  };

  const handleManualUpdate = () => {
    // Manually update cache
    utils.postsRouter.findAll.setData(undefined, (old) => {
      // ... update logic
      return old;
    });
  };

  const handleReset = () => {
    // Reset query to initial state
    utils.postsRouter.findAll.reset();
  };

  return (
    <div>
      <button onClick={handleRefresh}>Refresh</button>
      <button onClick={handlePrefetch}>Prefetch</button>
      <button onClick={handleManualUpdate}>Manual Update</button>
      <button onClick={handleReset}>Reset</button>
    </div>
  );
}
```

## API Reference

### Query Hooks

```tsx
trpc.router.procedure.useQuery(input?, options?)
```

- **Returns**: `{ data, error, isLoading, isFetching, ... }` (standard React Query result)
- **Options**: All [TanStack Query options](https://tanstack.com/query/latest/docs/framework/react/reference/useQuery)

### Mutation Hooks

```tsx
trpc.router.procedure.useMutation(options?)
```

- **Returns**: `{ mutate, mutateAsync, data, error, isPending, ... }`
- **Options**: All [TanStack Mutation options](https://tanstack.com/query/latest/docs/framework/react/reference/useMutation)

### Utils

```tsx
const utils = trpc.useUtils();

// Invalidate (refetch)
utils.router.procedure.invalidate(input?)

// Refetch
utils.router.procedure.refetch(input?)

// Prefetch
utils.router.procedure.prefetch(input?, options?)

// Cancel
utils.router.procedure.cancel(input?)

// Get cached data
const data = utils.router.procedure.getData(input?)

// Set cached data
utils.router.procedure.setData(input, updater)

// Reset query
utils.router.procedure.reset(input?)
```

## Comparison: Classic vs New TanStack Approach

### Classic (What we use - Recommended for most cases)

```tsx
// ✅ Simpler, more intuitive
const posts = trpc.postsRouter.findAll.useQuery();
const createPost = trpc.postsRouter.create.useMutation();
```

### New TanStack (Only if you need advanced features)

```tsx
// ❌ More verbose, requires extra imports
const trpc = useTRPC();
const posts = useQuery(trpc.postsRouter.findAll.queryOptions());
const createPost = useMutation(trpc.postsRouter.create.mutationOptions());
```

**When to use the new approach:**

- Multiple tRPC backends with query key prefixing
- Manual query client access for SSR prefetching
- Advanced React Query patterns with queryOptions

**For 99% of use cases, the classic approach is cleaner and simpler.**

## Server-Side Rendering (SSR)

### Prefetch in Server Components (Next.js App Router)

```tsx
// app/posts/page.tsx (Server Component)
import { createServerSideHelpers } from "@trpc/react-query/server";
import { appRouter } from "@repo/trpc/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { PostsList } from "./posts-list"; // Client Component

export default async function PostsPage() {
  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: {}, // Your tRPC context
  });

  // Prefetch on server
  await helpers.postsRouter.findAll.prefetch();

  return (
    <HydrationBoundary state={dehydrate(helpers.queryClient)}>
      <PostsList />
    </HydrationBoundary>
  );
}
```

## TypeScript Tips

### Infer Types from tRPC

```tsx
import { type RouterOutputs, type RouterInputs } from "@repo/trpc";

// Output types (what the API returns)
type Post = RouterOutputs["postsRouter"]["findAll"][number];
type UserProfile = RouterOutputs["usersRouter"]["getUserProfile"];

// Input types (what you send to the API)
type CreatePostInput = RouterInputs["postsRouter"]["create"];
type LikePostInput = RouterInputs["postsRouter"]["likePost"];
```

## Best Practices

1. **Use `utils` for cache manipulation** instead of direct queryClient access
2. **Implement optimistic updates** for better UX on mutations
3. **Use `enabled` option** to conditionally run queries
4. **Invalidate related queries** after mutations to keep data fresh
5. **Prefetch on hover/mount** for instant navigation
6. **Use error boundaries** to catch query errors
7. **Set `staleTime`** to reduce unnecessary refetches

## Resources

- [tRPC Official Docs](https://trpc.io/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest/docs/framework/react/overview)
- [mguay22's Example](https://github.com/mguay22/fotosnap)
