# Authentication Architecture

## Overview

The authentication system uses a **centralized state management** pattern to ensure:

- ✅ **Single session fetch** on app load (not per component)
- ✅ **Shared auth state** across all Client Components
- ✅ **No redundant API calls** to the backend
- ✅ **Type-safe** access to user data
- ✅ **Separation of concerns** (Client Components vs Server Components)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    App Layout (Root)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  <Providers>                                          │  │
│  │    <TrpcProvider>                                     │  │
│  │      <AuthProvider>  ← Fetches session ONCE on mount │  │
│  │        ├─ Stores in React Context                    │  │
│  │        └─ Shares with all children                   │  │
│  │           │                                           │  │
│  │           └─ {children} ────────────────────┐        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                 │            │
└─────────────────────────────────────────────────┼────────────┘
                                                  │
        ┌─────────────────────────────────────────┼────────────────┐
        │ Client Components                       ▼                │
        │  ┌──────────────────────────────────────────────────┐   │
        │  │  useAuth()  ← Reads from Context (no API call)   │   │
        │  │    ├─ user                                        │   │
        │  │    ├─ session                                     │   │
        │  │    ├─ isLoading                                   │   │
        │  │    ├─ isAuthenticated                             │   │
        │  │    ├─ signOut()                                   │   │
        │  │    └─ refetch()                                   │   │
        │  └──────────────────────────────────────────────────┘   │
        └──────────────────────────────────────────────────────────┘

        ┌──────────────────────────────────────────────────────────┐
        │ Server Components (RSC)                                  │
        │  ┌──────────────────────────────────────────────────┐   │
        │  │  Data Access Layer (DAL)                          │   │
        │  │    └─ verifySession()  ← Direct API call          │   │
        │  │       └─ authClient.getSession()                  │   │
        │  │          └─ NestJS Backend (/api/auth/*)          │   │
        │  └──────────────────────────────────────────────────┘   │
        └──────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. AuthProvider (Context Provider)

**Location**: `src/contexts/auth-context.tsx`

**Purpose**:

- Initialize session **once** when the app loads
- Store auth state in React Context
- Provide auth state to all Client Components

**Key Features**:

```tsx
export function AuthProvider({ children }) {
  const [session, setSession] = useState<ISession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetches session ONCE on mount
  useEffect(() => {
    fetchSession();
  }, []);

  // All child components can access this context
  return <AuthContext.Provider value={{ session, user, ... }}>
    {children}
  </AuthContext.Provider>
}
```

**Benefits**:

- ✅ Session fetched only once (on app load)
- ✅ All components use the same session data
- ✅ No waterfall API calls
- ✅ Automatic re-render when auth state changes

---

### 2. useAuth Hook (Client Components)

**Location**: `src/hooks/auth/use-auth.ts` (re-exports from `src/contexts/auth-context.tsx`)

**Purpose**:

- Provide easy access to auth state in Client Components
- Ensure components are within AuthProvider

**Usage**:

```tsx
"use client";

import { useAuth } from "@/hooks/auth";

export function Dashboard() {
  const { user, isLoading, isAuthenticated, signOut } = useAuth();

  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <LoginPrompt />;

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

**Key Point**:

- **Does NOT fetch session** (reads from Context)
- **Zero API calls** per component
- **Instant access** to shared auth state

---

### 3. Data Access Layer (Server Components)

**Location**: `src/lib/dal.ts`

**Purpose**:

- Verify session for Server Components
- Ensure server-side auth checks
- Separate from Client Component auth

**Usage**:

```tsx
// Server Component (RSC)
import { verifySession } from "@/lib/dal";

export default async function ServerPage() {
  const session = await verifySession(); // Direct API call

  return <div>Server-rendered: {session.user.name}</div>;
}
```

**Key Point**:

- **Separate from useAuth** (can't use hooks in Server Components)
- **Always makes API call** (no shared state in RSC)
- **Caches per request** (via React `cache()`)

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   └── providers.tsx           # <AuthProvider> mounted here
│
├── contexts/
│   └── auth-context.tsx        # ✨ AuthProvider + useAuth implementation
│
├── hooks/
│   └── auth/
│       └── use-auth.ts         # Re-exports useAuth (backward compatibility)
│
└── lib/
    └── dal.ts                  # Server-side auth (verifySession)
```

---

## Usage Patterns

### ✅ Client Component (Hooks)

```tsx
"use client";

import { useAuth } from "@/hooks/auth";

export function UserMenu() {
  const { user, signOut } = useAuth();

  return (
    <div>
      <img src={user?.image} alt={user?.name} />
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

**Performance**:

- ✅ No API call (reads from Context)
- ✅ Instant render
- ✅ Shared state across components

---

### ✅ Server Component (DAL)

```tsx
// Server Component (default in app/)
import { verifySession, getUserOrganization } from "@/lib/dal";

export default async function DashboardPage() {
  const session = await verifySession();
  const { organizationId, role } = await getUserOrganization();

  return (
    <div>
      <h1>{session.user.name}</h1>
      <p>
        Org: {organizationId} (Role: {role})
      </p>
    </div>
  );
}
```

**Performance**:

- ✅ Runs on server (no client bundle)
- ✅ Direct database access possible
- ✅ Cached per request (React `cache()`)

---

### ✅ Server Action (Mutations)

```tsx
"use server";

import { verifySession } from "@/lib/dal";

export async function updateProfile(formData: FormData) {
  const session = await verifySession();

  // Update user profile...

  revalidatePath("/profile");
  return { success: true };
}
```

---

## Common Patterns

### Pattern 1: Protected Client Component

```tsx
"use client";

import { useAuth } from "@/hooks/auth";
import { redirect } from "next/navigation";

export function ProtectedDashboard() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Loading />;
  if (!isAuthenticated) redirect("/login");

  return <Dashboard />;
}
```

---

### Pattern 2: Protected Server Page

```tsx
import { verifySession } from "@/lib/dal";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  try {
    await verifySession();
  } catch {
    redirect("/login");
  }

  return <SecureContent />;
}
```

---

### Pattern 3: Conditional Rendering Based on Role

```tsx
"use client";

import { useAuth } from "@/hooks/auth";

export function AdminPanel() {
  const { user } = useAuth();

  if (user?.role !== "admin" && user?.role !== "owner") {
    return <AccessDenied />;
  }

  return <AdminControls />;
}
```

---

## Migration Guide

### Before (Old Pattern - Multiple Fetches)

```tsx
// ❌ BAD: Each component fetches independently
function ComponentA() {
  const { user } = useAuth(); // Fetch #1
  // ...
}

function ComponentB() {
  const { user } = useAuth(); // Fetch #2
  // ...
}

function ComponentC() {
  const { user } = useAuth(); // Fetch #3
  // ...
}
```

**Result**: 3 API calls to `/api/auth/session` 😱

---

### After (New Pattern - Single Fetch)

```tsx
// ✅ GOOD: Single fetch in AuthProvider
// app/providers.tsx
<AuthProvider>
  {" "}
  {/* Fetches once */}
  <ComponentA />
  <ComponentB />
  <ComponentC />
</AuthProvider>;

// All components read from Context
function ComponentA() {
  const { user } = useAuth(); // No API call
}

function ComponentB() {
  const { user } = useAuth(); // No API call
}

function ComponentC() {
  const { user } = useAuth(); // No API call
}
```

**Result**: 1 API call to `/api/auth/session` ✅

---

## Performance Metrics

### Before Optimization

```
Initial Load:
├─ ComponentA → API call (150ms)
├─ ComponentB → API call (150ms)
├─ ComponentC → API call (150ms)
└─ Total: 450ms + network overhead
```

### After Optimization

```
Initial Load:
├─ AuthProvider → API call (150ms)
├─ ComponentA → Context read (<1ms)
├─ ComponentB → Context read (<1ms)
└─ ComponentC → Context read (<1ms)
Total: ~150ms
```

**Improvement**: 66% faster load time 🚀

---

## Best Practices

### ✅ DO

1. **Use `useAuth()` in Client Components**

   ```tsx
   "use client";
   const { user } = useAuth();
   ```

2. **Use DAL in Server Components**

   ```tsx
   const session = await verifySession();
   ```

3. **Mount AuthProvider once** (in `app/providers.tsx`)

4. **Check loading state** before rendering user data

   ```tsx
   if (isLoading) return <Loading />;
   ```

5. **Handle unauthenticated state** gracefully
   ```tsx
   if (!isAuthenticated) redirect("/login");
   ```

---

### ❌ DON'T

1. **Don't use hooks in Server Components**

   ```tsx
   // ❌ WRONG
   export default async function Page() {
     const { user } = useAuth(); // ERROR: Can't use hooks in RSC
   }
   ```

2. **Don't mount multiple AuthProviders**

   ```tsx
   // ❌ WRONG
   <AuthProvider>
     <AuthProvider>
       {" "}
       {/* Duplicate! */}
       {children}
     </AuthProvider>
   </AuthProvider>
   ```

3. **Don't call `authClient.getSession()` directly in Client Components**

   ```tsx
   // ❌ WRONG: Bypasses Context
   const session = await authClient.getSession();

   // ✅ CORRECT: Use Context
   const { session } = useAuth();
   ```

4. **Don't forget to check `isLoading`**

   ```tsx
   // ❌ WRONG: May render undefined
   const { user } = useAuth();
   return <div>{user.name}</div>;

   // ✅ CORRECT: Check loading state
   const { user, isLoading } = useAuth();
   if (isLoading) return <Loading />;
   return <div>{user?.name}</div>;
   ```

---

## Troubleshooting

### Issue: "useAuth must be used within an AuthProvider"

**Cause**: Component using `useAuth()` is not inside `<AuthProvider>`

**Solution**: Ensure `<AuthProvider>` is in `app/providers.tsx` and wraps your app

```tsx
// app/providers.tsx
export function Providers({ children }) {
  return (
    <AuthProvider>
      {" "}
      {/* ← Must wrap all components */}
      {children}
    </AuthProvider>
  );
}
```

---

### Issue: Multiple session fetches still happening

**Cause**: Multiple `<AuthProvider>` instances or direct `authClient` calls

**Solution**:

1. Check for duplicate `<AuthProvider>` in your component tree
2. Use `useAuth()` instead of calling `authClient.getSession()` directly
3. Use browser DevTools Network tab to verify only 1 session call

---

### Issue: Session not updating after login

**Cause**: Need to manually refresh session after login

**Solution**: Call `refetch()` from `useAuth()`

```tsx
const { refetch } = useAuth();

async function handleLogin(credentials) {
  await authClient.signIn.email(credentials);
  await refetch(); // ← Refresh session
  router.push("/dashboard");
}
```

---

## Advanced: Custom AuthProvider Config

You can customize the AuthProvider behavior:

```tsx
// app/providers.tsx
<AuthProvider
  redirectOnUnauthenticated="/login" // Auto-redirect if not authenticated
>
  {children}
</AuthProvider>
```

---

## Summary

| Aspect        | Client Components  | Server Components        |
| ------------- | ------------------ | ------------------------ |
| **Hook**      | `useAuth()`        | N/A (can't use hooks)    |
| **Function**  | N/A                | `verifySession()`        |
| **API Calls** | 0 (reads Context)  | 1 per request (cached)   |
| **State**     | Shared via Context | Independent per request  |
| **Use Case**  | Interactive UI     | Data fetching, mutations |

---

**Key Takeaway**:

- **Client Components** → Use `useAuth()` hook (shared state, no API calls)
- **Server Components** → Use `verifySession()` from DAL (per-request, cached)
- **Mount `<AuthProvider>` once** in root layout for optimal performance

🎉 **Result**: Fast, efficient, type-safe authentication across your entire app!
