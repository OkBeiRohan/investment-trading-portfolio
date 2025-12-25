# Implementation Checklist & Quick Start Guide

## Investment Trading Portfolio - Frontend Implementation

> **Step-by-step guide to implement the production-ready architecture**

---

## 🚀 Phase 1: Foundation Setup (Week 1)

### 1.1 Project Initialization

```bash
# Clean slate (if starting fresh)
cd apps/web
rm -rf app pages # Remove old structure if exists

# Initialize with latest Next.js
pnpm dlx create-next-app@latest . --typescript --tailwind --app --src-dir=false

# Install core dependencies
pnpm add @trpc/client @trpc/server @trpc/react-query @tanstack/react-query
pnpm add better-auth
pnpm add zod
pnpm add clsx tailwind-merge class-variance-authority
pnpm add lucide-react
pnpm add date-fns
pnpm add zustand

# Install dev dependencies
pnpm add -D @types/node @types/react @types/react-dom
pnpm add -D eslint-config-next
pnpm add -D prettier prettier-plugin-tailwindcss
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
      "@/store/*": ["./store/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 1.4 Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
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
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Investment Trading Portfolio",
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

### 3.1 UI Components (shadcn/ui)

```bash
# Install shadcn/ui
pnpm dlx shadcn-ui@latest init

# Add base components
pnpm dlx shadcn-ui@latest add button
pnpm dlx shadcn-ui@latest add card
pnpm dlx shadcn-ui@latest add input
pnpm dlx shadcn-ui@latest add label
pnpm dlx shadcn-ui@latest add select
pnpm dlx shadcn-ui@latest add dialog
pnpm dlx shadcn-ui@latest add dropdown-menu
pnpm dlx shadcn-ui@latest add tabs
pnpm dlx shadcn-ui@latest add toast
pnpm dlx shadcn-ui@latest add skeleton
pnpm dlx shadcn-ui@latest add alert
pnpm dlx shadcn-ui@latest add badge
pnpm dlx shadcn-ui@latest add separator
pnpm dlx shadcn-ui@latest add sheet
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

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

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    await signIn.phoneNumber({
      phoneNumber: phone,
    });

    router.push("/verify-otp");
  };

  const handleGoogleLogin = async () => {
    await signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  };

  const handleUpstoxLogin = async () => {
    await signIn.social({
      provider: "upstox",
      callbackURL: "/account/linked-accounts",
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        <Tabs defaultValue="email">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="phone">Phone</TabsTrigger>
          </TabsList>

          <TabsContent value="email">
            <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Sign In
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="phone">
            <form onSubmit={handlePhoneLogin} className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Send OTP
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
          >
            Continue with Google
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleUpstoxLogin}
          >
            Connect Upstox Account
          </Button>
        </div>

        <div className="text-center text-sm">
          Don't have an account?{" "}
          <a href="/register" className="underline">
            Sign Up
          </a>
        </div>
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
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

### 5.2 Sidebar Component

```typescript
// components/layout/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Wallet,
  Receipt,
  TrendingUp,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Wealth", href: "/wealth", icon: Wallet },
  { name: "Expenses", href: "/expenses", icon: Receipt },
  { name: "Trading", href: "/trading", icon: TrendingUp },
  { name: "Workspaces", href: "/workspaces", icon: Users },
  { name: "Account", href: "/account", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-card">
      <div className="p-6">
        <h1 className="text-2xl font-bold">ITP</h1>
      </div>

      <nav className="space-y-1 px-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
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

- [ ] Initialize Next.js 16 project with App Router
- [ ] Configure TypeScript and ESLint
- [ ] Set up Tailwind CSS
- [ ] Install and configure Better Auth
- [ ] Set up tRPC client and provider
- [ ] Create root layout and providers
- [ ] Configure middleware for authentication

### Week 2: Authentication & Base Components

- [ ] Implement login page (all methods)
- [ ] Implement registration page
- [ ] Add 2FA setup flow
- [ ] Add passkey registration
- [ ] Install shadcn/ui components
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

### Better Auth

- [Better Auth Docs](https://better-auth.com)
- [Organization Plugin](https://better-auth.com/docs/plugins/organization)

### tRPC

- [tRPC Documentation](https://trpc.io)
- [tRPC with Next.js](https://trpc.io/docs/client/nextjs)

### UI/UX

- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Radix UI](https://www.radix-ui.com)

---

**Status**: Ready for Implementation
**Last Updated**: December 25, 2025
