# Implementation Checklist & Quick Start Guide

## Quantum Investments and Trades - Frontend Implementation

> **Step-by-step guide to implement the production-ready architecture**

---

## 🚀 Phase 1: Foundation Setup (Week 1)

### 1.1 Project Initialization

```bash
# Clean slate (if starting fresh)
cd apps/web
rm -rf app pages # Remove old structure if exists

# Initialize with latest Next.js (Manual setup to avoid default tailwind)
pnpm dlx create-next-app@latest . --typescript --no-tailwind --app --src-dir=false --import-alias "@/*"

# Install core dependencies
pnpm add @trpc/client @trpc/server @trpc/react-query @tanstack/react-query
pnpm add better-auth
pnpm add zod
pnpm add date-fns
pnpm add zustand
pnpm add sass # Optional: If using SASS modules

# Install dev dependencies
pnpm add -D @types/node @types/react @types/react-dom
pnpm add -D eslint-config-next
pnpm add -D prettier
```

### 1.2 Environment Configuration

```bash
# apps/web/.env.local
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3004

# Better Auth
BETTER_AUTH_SECRET=your-32-char-secret-key-here
BETTER_AUTH_URL=http://localhost:3000

# Feature Flags
NEXT_PUBLIC_ENABLE_ADMIN_MODE=true
NEXT_PUBLIC_ENABLE_LEGACY_PLANNING=true
NEXT_PUBLIC_ENABLE_CRYPTO_ASSETS=true
```

### 1.3 TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/types/*": ["./types/*"],
      "@/store/*": ["./store/*"],
      "@/styles/*": ["./styles/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 1.4 Styling Configuration (CSS Modules)

Ensure your `next.config.mjs` supports SASS if you choose to use it.

```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  sassOptions: {
    includePaths: ['./styles'],
  },
};

export default nextConfig;
```

Create a global stylesheet:

```css
/* app/globals.css */
:root {
  --primary-color: #0070f3;
  --secondary-color: #1a1a1a;
  --background-color: #ffffff;
  --text-color: #000000;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
    Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
  background-color: var(--background-color);
  color: var(--text-color);
}
```

---

## 📦 Phase 2: Core Infrastructure (Week 1-2)

### 2.1 Better Auth Setup

```typescript
// lib/auth/client.ts
import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
  plugins: [organizationClient()],
});

// Export all hooks
export const {
  useSession,
  signIn,
  signUp,
  signOut,
  useActiveOrganization,
  useListOrganizations,
  setActiveOrganization,
  $Infer,
} = authClient;
```

```typescript
// app/api/auth/[...auth]/route.ts
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  database: {
    provider: "mongodb",
    url: process.env.DATABASE_URL!,
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    // Upstox OAuth
    upstox: {
      clientId: process.env.UPSTOX_API_KEY!,
      clientSecret: process.env.UPSTOX_API_SECRET!,
      authorizationUrl: "https://api.upstox.com/v2/login/authorization/dialog",
      tokenUrl: "https://api.upstox.com/v2/login/authorization/token",
    },
  },
  plugins: [
    organization({
      async sendInvitationEmail(data) {
        // Send invitation email
        console.log("Send invitation:", data);
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});

export const { GET, POST } = auth.handler;
```

### 2.2 tRPC Setup

```typescript
// lib/trpc/client.ts
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@repo/trpc";

export const trpc = createTRPCReact<AppRouter>();
```

```typescript
// lib/trpc/react.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import { trpc } from "./client";
import superjson from "superjson";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_API_URL}/trpc`,
          transformer: superjson,
          headers() {
            return {
              // Add auth headers
            };
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
```

### 2.3 Root Layout

```typescript
// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/react";
import { Toaster } from "@/components/ui/toaster"; // Custom Toaster implementation

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Quantum Investments and Trades",
  description: "Wealth management and algorithmic trading platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <TRPCProvider>{children}</TRPCProvider>
        <Toaster />
      </body>
    </html>
  );
}
```

### 2.4 Middleware

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ];

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check session
  const sessionCookie = request.cookies.get("better-auth.session_token");

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
```

---

## 🏗️ Phase 3: Base Components (Week 2)

### 3.1 UI Components (Custom Implementation)

Create your own reusable components using CSS Modules.

**Example Button:**

```typescript
// components/ui/Button/index.tsx
import styles from './Button.module.css';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button 
      className={`${styles.button} ${styles[variant]} ${className || ''}`}
      {...props} 
    />
  );
}
```

```css
/* components/ui/Button/Button.module.css */
.button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.primary {
  background-color: var(--primary-color);
  color: white;
}

/* ... other variants */
```

### 3.2 Custom Hooks

```typescript
// hooks/use-auth.ts
"use client";

import { useSession } from "@/lib/auth/client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function useAuth() {
  const session = useSession();
  const router = useRouter();
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!session.data) return;

    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const checkInactivity = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;

      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push("/login?reason=inactivity");
            },
          },
        });
      }
    }, 60000);

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      clearInterval(checkInactivity);
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [session.data, router]);

  return session;
}
```

```typescript
// hooks/use-workspace.ts
"use client";

import { useActiveOrganization } from "@/lib/auth/client";
import { trpc } from "@/lib/trpc/client";

export function useWorkspace() {
  const { data: activeOrg, isPending } = useActiveOrganization();

  const { data: workspace } = trpc.workspaces.get.useQuery(
    { id: activeOrg?.id || "" },
    { enabled: !!activeOrg?.id }
  );

  return {
    workspace,
    activeOrg,
    isLoading: isPending,
    isFamily: workspace?.type === "FAMILY",
    isBusiness: workspace?.type === "BUSINESS",
    isSolo: workspace?.type === "SOLO",
  };
}
```

---

## 🎨 Phase 4: Authentication Pages (Week 2-3)

### 4.1 Login Page

```typescript
// app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn.email({
      email,
      password,
      callbackURL: "/",
    });
    if (!result.error) {
      router.push("/");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Welcome Back</h1>
        <form onSubmit={handleEmailPasswordLogin} className={styles.form}>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit">Sign In</Button>
        </form>
      </div>
    </div>
  );
}
```

---

## 📊 Phase 5: Dashboard Layout (Week 3)

### 5.1 Dashboard Layout

```typescript
// app/(dashboard)/layout.tsx
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.dashboardContainer}>
      <Sidebar />
      <div className={styles.mainContent}>
        <Header />
        <main className={styles.contentArea}>{children}</main>
      </div>
    </div>
  );
}
```

### 5.2 Sidebar Component

```typescript
// components/layout/Sidebar/index.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from './Sidebar.module.css';

const navigation = [
  { name: "Home", href: "/" },
  { name: "Wealth", href: "/wealth" },
  { name: "Expenses", href: "/expenses" },
  { name: "Trading", href: "/trading" },
  { name: "Workspaces", href: "/workspaces" },
  { name: "Account", href: "/account" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <h1>QIT</h1>
      </div>

      <nav className={styles.nav}>
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`${styles.link} ${isActive ? styles.active : ''}`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

---

## ✅ Implementation Checklist

### Week 1: Foundation

- [ ] Initialize Next.js 16 project with App Router (No Tailwind)
- [ ] Configure TypeScript and ESLint
- [ ] Set up CSS Modules (and SASS if desired)
- [ ] Install and configure Better Auth
- [ ] Set up tRPC client and provider
- [ ] Create root layout and providers
- [ ] Configure middleware for authentication

### Week 2: Authentication & Base Components

- [ ] Implement login page (all methods)
- [ ] Implement registration page
- [ ] Add 2FA setup flow
- [ ] Add passkey registration
- [ ] Build base UI components (Button, Input, Card, Modal, etc.)
- [ ] Create custom hooks (useAuth, useWorkspace)
- [ ] Build base layout components (Sidebar, Header)

### Week 3: Dashboard Structure

- [ ] Create dashboard layout with parallel routes
- [ ] Build home dashboard with widgets
- [ ] Implement workspace switcher
- [ ] Add workspace creation flow
- [ ] Create loading states
- [ ] Add error boundaries

### Week 4: Wealth Management (Part 1)

- [ ] Net worth overview page
- [ ] Net worth chart component
- [ ] Asset allocation visualization
- [ ] Investment tracking pages
- [ ] Savings accounts management

### Week 5: Wealth Management (Part 2)

- [ ] Insurance management
- [ ] Debt tracking
- [ ] Real estate portfolio
- [ ] Financial planning tools
- [ ] Goal creation and tracking

### Week 6: Expense Management

- [ ] Transaction list with virtualization
- [ ] Expense analytics dashboard
- [ ] Category management
- [ ] Budget creation
- [ ] Expense splitting
- [ ] Bank statement upload

### Week 7: Trading Module (Part 1)

- [ ] Trading dashboard with Greeks
- [ ] Position management
- [ ] Order history
- [ ] Strategy configuration
- [ ] Real-time updates with WebSockets

### Week 8: Trading Module (Part 2)

- [ ] Analytics dashboard
- [ ] Market insights
- [ ] AI model monitoring
- [ ] Performance reports

### Week 9: Workspace Features

- [ ] Organization management
- [ ] Team creation and management
- [ ] Member invitations
- [ ] Permission management
- [ ] Workspace aggregation views

### Week 10: Admin Dashboard

- [ ] System monitoring
- [ ] User management
- [ ] AI model MRI
- [ ] Compliance dashboard
- [ ] Audit logs

### Week 11: Polish & Testing

- [ ] Add loading skeletons everywhere
- [ ] Implement optimistic updates
- [ ] Add toast notifications
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Performance optimization

### Week 12: Documentation & Deployment

- [ ] Component documentation
- [ ] API documentation
- [ ] User guide
- [ ] Deployment setup
- [ ] CI/CD pipeline

---

## 🎯 Priority Order for MVP

### Must-Have (Weeks 1-6)

1. **Authentication** - All login methods
2. **Dashboard Layout** - Sidebar, header, routing
3. **Wealth Overview** - Net worth, basic visualization
4. **Expense Tracking** - Add transactions, view list
5. **Workspace Creation** - Basic organization setup

### Should-Have (Weeks 7-9)

6. **Trading Dashboard** - View positions, orders
7. **Financial Planning** - Goal creation
8. **Advanced Expenses** - Analytics, budgets
9. **Team Management** - Invite members, assign roles

### Nice-to-Have (Weeks 10-12)

10. **Admin Dashboard** - Full monitoring
11. **Advanced Trading** - Strategy canvas
12. **AI Insights** - Spending recommendations
13. **Reports** - PDF exports

---

## 📝 Code Quality Standards

### Before Committing

- [ ] Run `pnpm lint` - No errors
- [ ] Run `pnpm type-check` - No type errors
- [ ] Run `pnpm test` - All tests pass
- [ ] Check accessibility with Lighthouse
- [ ] Test on mobile viewport
- [ ] Verify loading states work
- [ ] Verify error boundaries work

### Code Review Checklist

- [ ] Uses Server Components by default
- [ ] Client Components only when needed
- [ ] Proper error handling
- [ ] Loading states everywhere
- [ ] Accessible (ARIA labels, keyboard nav)
- [ ] Type-safe (no `any` types)
- [ ] Uses tRPC for API calls
- [ ] Uses Better Auth hooks
- [ ] No database code in frontend

---

## 🚀 Deployment Checklist

### Before Production

- [ ] Set up environment variables
- [ ] Configure custom domain
- [ ] Enable SSL/TLS
- [ ] Set up error monitoring (Sentry)
- [ ] Configure analytics
- [ ] Set up logging
- [ ] Create backup strategy
- [ ] Test in production-like environment
- [ ] Load testing
- [ ] Security audit

---

## 📚 Learning Resources

### Next.js 16

- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Patterns](https://nextjs.org/docs/app)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [CSS Modules](https://nextjs.org/docs/app/building-your-application/styling/css-modules)

### Better Auth

- [Better Auth Docs](https://better-auth.com)
- [Organization Plugin](https://better-auth.com/docs/plugins/organization)

### tRPC

- [tRPC Documentation](https://trpc.io)
- [tRPC with Next.js](https://trpc.io/docs/client/nextjs)

### UI/UX

- [Sass/SCSS](https://sass-lang.com/)
- [CSS Modules Spec](https://github.com/css-modules/css-modules)

---

**Status**: Ready for Implementation
**Last Updated**: December 25, 2025