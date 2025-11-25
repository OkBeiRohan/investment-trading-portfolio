# GitHub Copilot Instructions - Web Dashboard

## Role & Context

You are working on the **Web Dashboard** - the Next.js frontend application for the investment trading portfolio system. This is the user-facing interface for monitoring trades, managing strategies, and viewing performance metrics.

## Application Overview

**Purpose**: Trading dashboard and user interface
**Port**: 3000
**Stack**: Next.js 15 (App Router), React, TypeScript, TailwindCSS, tRPC, NextAuth

**Key Features**:

- Real-time trading dashboard with live updates
- Portfolio performance visualization (charts, tables)
- Strategy configuration and management
- Trade history and analytics
- User authentication and profile management
- Responsive design (desktop + mobile)

## Architecture Rules

### 1. Shared Package Usage

**ALWAYS use shared packages for type safety:**

```typescript
// ✅ CORRECT - Use shared packages
import { type TradingSignal, type Position } from '@repo/schema';
import { trpc } from '@/lib/trpc';

// ❌ WRONG - Local type definitions
interface TradingSignal { ... } // NEVER
```

### 2. tRPC Client Setup

**Type-safe API calls with tRPC:**

```typescript
// lib/trpc.ts
import { createTRPCNext } from "@trpc/next";
import { type AppRouter } from "@repo/trpc-router";

export const trpc = createTRPCNext<AppRouter>({
  config({ ctx }) {
    return {
      links: [
        httpBatchLink({
          url: process.env.NEXT_PUBLIC_API_URL + "/trpc",
          headers() {
            return {
              authorization: getAuthToken(),
            };
          },
        }),
      ],
    };
  },
  ssr: false,
});

// Usage in components
const { data, isLoading } = trpc.portfolio.getPositions.useQuery();
```

### 3. Next.js App Router Structure

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── (dashboard)/
│   ├── layout.tsx              # Dashboard layout with sidebar
│   ├── page.tsx                # Main dashboard
│   ├── portfolio/
│   │   └── page.tsx            # Portfolio overview
│   ├── trades/
│   │   └── page.tsx            # Trade history
│   ├── strategies/
│   │   └── page.tsx            # Strategy management
│   └── settings/
│       └── page.tsx            # User settings
├── api/
│   └── auth/
│       └── [...nextauth]/
│           └── route.ts        # NextAuth configuration
├── layout.tsx                  # Root layout
└── providers.tsx               # Context providers
```

### 4. Authentication with NextAuth

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const res = await fetch(`${process.env.API_URL}/auth/login`, {
          method: "POST",
          body: JSON.stringify(credentials),
          headers: { "Content-Type": "application/json" },
        });
        const user = await res.json();
        if (res.ok && user) return user;
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };
```

### 5. Protected Routes

```typescript
// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/portfolio/:path*", "/trades/:path*"],
};
```

## UI Components

### 1. Component Structure

```typescript
// components/dashboard/PositionCard.tsx
'use client';

import { type Position } from '@repo/schema';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface PositionCardProps {
  position: Position;
  onClose?: (id: string) => void;
}

export function PositionCard({ position, onClose }: PositionCardProps) {
  const pnlClass = position.pnl >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{position.strategy}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">{position.instrument}</p>
          <p className={`text-lg font-bold ${pnlClass}`}>
            {position.pnl >= 0 ? '+' : ''}₹{position.pnl.toFixed(2)}
          </p>
          <p className="text-sm">{position.pnlPercent.toFixed(2)}%</p>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 2. Real-Time Updates

```typescript
// Use tRPC subscriptions for real-time data
const trpcUtils = trpc.useUtils();

useEffect(() => {
  const interval = setInterval(() => {
    // Invalidate and refetch
    trpcUtils.portfolio.getPositions.invalidate();
  }, 5000); // Poll every 5 seconds

  return () => clearInterval(interval);
}, [trpcUtils]);

// Or use WebSocket subscriptions
const { data: liveData } = trpc.trading.subscribeToSignals.useSubscription();
```

### 3. Charts with Recharts

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export function PerformanceChart({ data }: { data: any[] }) {
  return (
    <LineChart width={800} height={400} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="pnl" stroke="#8884d8" />
      <Line type="monotone" dataKey="equity" stroke="#82ca9d" />
    </LineChart>
  );
}
```

## Styling Guidelines

### TailwindCSS Best Practices

```typescript
// Use Tailwind utility classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
  <button className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
    Action
  </button>
</div>

// Use custom components for reusable styles
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border border-gray-300 hover:bg-gray-100',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-sm',
        lg: 'h-12 px-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

## State Management

### Use React Query (via tRPC)

```typescript
// Fetching data
const { data, isLoading, error } = trpc.portfolio.getPositions.useQuery();

// Mutations
const { mutate: closePosition } = trpc.portfolio.closePosition.useMutation({
  onSuccess: () => {
    trpcUtils.portfolio.getPositions.invalidate();
  },
});
```

### Local State with Zustand (Optional)

```typescript
import { create } from "zustand";

interface DashboardState {
  selectedTimeframe: "1D" | "1W" | "1M" | "1Y";
  setTimeframe: (tf: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedTimeframe: "1D",
  setTimeframe: (tf) => set({ selectedTimeframe: tf }),
}));
```

## Performance Optimization

### 1. Code Splitting

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false,
});
```

### 2. Image Optimization

```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority
/>
```

### 3. Memoization

```typescript
import { useMemo } from "react";

const expensiveCalculation = useMemo(() => {
  return positions.reduce((acc, pos) => acc + pos.pnl, 0);
}, [positions]);
```

## Testing

```typescript
import { render, screen } from '@testing-library/react';
import { PositionCard } from './PositionCard';

describe('PositionCard', () => {
  it('renders position data', () => {
    const position = {
      id: '1',
      strategy: 'LONG_STRADDLE',
      instrument: 'NIFTY50',
      pnl: 1500,
      pnlPercent: 5.2,
    };

    render(<PositionCard position={position} />);
    expect(screen.getByText('LONG_STRADDLE')).toBeInTheDocument();
    expect(screen.getByText('+₹1500.00')).toBeInTheDocument();
  });
});
```

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3004
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<your-secret>
```

## Code Quality Standards

- **TypeScript Strict Mode**: Always enabled
- **ESLint**: Must pass with no errors
- **Prettier**: Auto-format all code
- **Accessibility**: Follow WCAG 2.1 AA standards
- **Tests**: Critical user flows covered

## When Making Changes

1. ✅ Use @repo/schema for all types
2. ✅ Use tRPC for API calls (type-safe)
3. ✅ Implement proper loading states
4. ✅ Handle errors gracefully
5. ✅ Add loading skeletons
6. ✅ Test on mobile devices
7. ✅ Optimize images and assets
8. ✅ Use semantic HTML

## Common Anti-Patterns to Avoid

❌ Defining types locally (use @repo/schema)  
❌ Direct API calls (use tRPC)  
❌ Missing loading states  
❌ No error boundaries  
❌ Inline styles instead of Tailwind  
❌ Unoptimized images  
❌ Missing accessibility attributes  
❌ Client-side data fetching without caching

## Documentation

Keep these files updated:

- `README.md` - Quick start, project overview
- `docs/COMPONENTS.md` - Component library
- `docs/ROUTING.md` - Route structure

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [TailwindCSS](https://tailwindcss.com/docs)
- [tRPC](https://trpc.io/docs)
- [NextAuth.js](https://next-auth.js.org/)
